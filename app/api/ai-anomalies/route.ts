import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { askGemini, GeminiError } from "@/lib/ai-gemini";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Severity = "high" | "medium" | "low";

interface AnomalyType {
  type:
    | "frequent_late"
    | "excessive_absence"
    | "monday_friday_pattern"
    | "declining_attendance"
    | "perfect_attendance";
  severity: Severity;
  label: string;
}

interface Anomaly extends AnomalyType {
  employeeId: string;
  employeeName: string;
  department: string;
  metric: string;
  insight: string;
  recommendedAction: string;
}

function ninetyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(dateStr: string) {
  // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  return new Date(dateStr).getDay();
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export async function GET() {
  // 1. Pull 90 days of attendance + employees
  const [{ data: employees }, { data: attendance }] = await Promise.all([
    supabaseAdmin
      .from("employees")
      .select("id, full_name, department, designation, email, joining_date")
      .eq("status", "active"),
    supabaseAdmin
      .from("attendance")
      .select("employee_id, date, status")
      .gte("date", ninetyDaysAgoISO()),
  ]);

  if (!employees || !attendance) {
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }

  // 2. Group attendance per employee
  const byEmp = new Map<string, typeof attendance>();
  for (const row of attendance) {
    if (!row.employee_id) continue;
    const list = byEmp.get(row.employee_id) ?? [];
    list.push(row);
    byEmp.set(row.employee_id, list);
  }

  // 3. Detect anomalies
  const candidates: Array<Omit<Anomaly, "insight" | "recommendedAction">> = [];

  for (const emp of employees) {
    const records = byEmp.get(emp.id) ?? [];
    if (records.length === 0) continue;

    const lates = records.filter((r) => r.status === "late");
    const absents = records.filter((r) => r.status === "absent");
    const presents = records.filter(
      (r) => r.status === "present" || r.status === "wfh"
    );

    // Buckets per month
    const monthly = new Map<string, { late: number; absent: number; total: number }>();
    for (const r of records) {
      const k = monthKey(r.date);
      const m = monthly.get(k) ?? { late: 0, absent: 0, total: 0 };
      if (r.status === "late") m.late++;
      if (r.status === "absent") m.absent++;
      m.total++;
      monthly.set(k, m);
    }

    // Frequent late: >5 in any single month
    const latestMonth = Array.from(monthly.keys()).sort().pop();
    if (latestMonth) {
      const m = monthly.get(latestMonth)!;
      if (m.late > 5) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.full_name,
          department: emp.department ?? "—",
          type: "frequent_late",
          severity: m.late > 10 ? "high" : "medium",
          label: "Frequent Late Arrivals",
          metric: `Late ${m.late} times in ${latestMonth}`,
        });
      }
      if (m.absent > 3) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.full_name,
          department: emp.department ?? "—",
          type: "excessive_absence",
          severity: m.absent > 6 ? "high" : "medium",
          label: "Excessive Absences",
          metric: `Absent ${m.absent} days in ${latestMonth}`,
        });
      }
    }

    // Monday/Friday pattern — absent on >=70% of all Mons OR all Fris in window
    const monAbsent = absents.filter((r) => dayOfWeek(r.date) === 1).length;
    const friAbsent = absents.filter((r) => dayOfWeek(r.date) === 5).length;
    const monTotal = records.filter((r) => dayOfWeek(r.date) === 1).length;
    const friTotal = records.filter((r) => dayOfWeek(r.date) === 5).length;
    if (monTotal >= 4 && monAbsent / monTotal >= 0.7) {
      candidates.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        department: emp.department ?? "—",
        type: "monday_friday_pattern",
        severity: "medium",
        label: "Long-Weekend Pattern (Mondays)",
        metric: `Absent on ${monAbsent}/${monTotal} Mondays in last 90 days`,
      });
    } else if (friTotal >= 4 && friAbsent / friTotal >= 0.7) {
      candidates.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        department: emp.department ?? "—",
        type: "monday_friday_pattern",
        severity: "medium",
        label: "Long-Weekend Pattern (Fridays)",
        metric: `Absent on ${friAbsent}/${friTotal} Fridays in last 90 days`,
      });
    }

    // Declining attendance — compare oldest vs newest month attendance %
    const orderedMonths = Array.from(monthly.keys()).sort();
    if (orderedMonths.length >= 2) {
      const first = monthly.get(orderedMonths[0])!;
      const last = monthly.get(orderedMonths[orderedMonths.length - 1])!;
      const firstRate = first.total ? (first.total - first.absent) / first.total : 1;
      const lastRate = last.total ? (last.total - last.absent) / last.total : 1;
      if (firstRate - lastRate >= 0.2) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.full_name,
          department: emp.department ?? "—",
          type: "declining_attendance",
          severity: firstRate - lastRate >= 0.4 ? "high" : "medium",
          label: "Declining Attendance",
          metric: `Attendance dropped from ${Math.round(firstRate * 100)}% to ${Math.round(lastRate * 100)}% month-over-month`,
        });
      }
    }

    // Perfect attendance — no absences, <=1 late, at least 30 records
    if (records.length >= 30 && absents.length === 0 && lates.length <= 1) {
      candidates.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        department: emp.department ?? "—",
        type: "perfect_attendance",
        severity: "low",
        label: "Perfect Attendance",
        metric: `${presents.length} days present, ${lates.length} late, 0 absent (90 days)`,
      });
    }
  }

  // 4. Cap candidates (avoid huge AI bill)
  const top = candidates.slice(0, 30);

  // 5. Single batched Gemini call — generate insights for all anomalies at once
  let enriched: Anomaly[] = top.map((c) => ({
    ...c,
    insight: "(no insight)",
    recommendedAction: "Schedule a 1-on-1 meeting",
  }));

  if (top.length > 0) {
    const systemPrompt = `You are an HR analytics expert at a Pakistani software company.
For each anomaly listed below, write ONE concise insight (max 30 words) explaining what it means,
and ONE recommended action (max 15 words).
Be specific, professional, and culturally aware (Pakistani workplace).
Tone: empathetic but firm. Reward perfect attendance positively.

Return ONLY valid JSON in this exact format (no markdown, no commentary):
[{"i":0,"insight":"...","action":"..."},{"i":1,"insight":"...","action":"..."}]`;

    const userPayload = top
      .map(
        (c, i) =>
          `${i}. ${c.employeeName} (${c.department}) — ${c.label}: ${c.metric}`
      )
      .join("\n");

    try {
      const raw = await askGemini(systemPrompt, userPayload, {
        temperature: 0.4,
        maxOutputTokens: 2048,
      });
      // Strip code fences if Gemini wraps in ```json
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned) as Array<{
        i: number;
        insight: string;
        action: string;
      }>;
      for (const p of parsed) {
        if (typeof p.i === "number" && enriched[p.i]) {
          enriched[p.i] = {
            ...enriched[p.i],
            insight: p.insight ?? enriched[p.i].insight,
            recommendedAction: p.action ?? enriched[p.i].recommendedAction,
          };
        }
      }
    } catch (err) {
      // If Gemini fails or JSON is invalid, fall back to deterministic insights
      console.error("[ai-anomalies] insight generation failed:", err);
      enriched = enriched.map((c) => ({
        ...c,
        insight: defaultInsight(c),
        recommendedAction: defaultAction(c),
      }));
      if (err instanceof GeminiError && err.status === 500) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
  }

  // 6. Sort by severity (high → medium → low) and group
  const severityWeight: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  enriched.sort(
    (a, b) => severityWeight[a.severity] - severityWeight[b.severity]
  );

  const summary = {
    high: enriched.filter((a) => a.severity === "high").length,
    medium: enriched.filter((a) => a.severity === "medium").length,
    low: enriched.filter((a) => a.severity === "low").length,
    total: enriched.length,
    analyzedEmployees: employees.length,
    windowDays: 90,
  };

  return NextResponse.json({ anomalies: enriched, summary });
}

function defaultInsight(a: { label: string; metric: string }): string {
  if (a.label === "Perfect Attendance") {
    return `Excellent — ${a.metric}. Reward-worthy behaviour.`;
  }
  return `${a.label}: ${a.metric}. Requires attention from line manager.`;
}
function defaultAction(a: { type: string }): string {
  if (a.type === "perfect_attendance") return "Recognise publicly; consider bonus";
  if (a.type === "frequent_late") return "Issue verbal warning; review commute";
  if (a.type === "excessive_absence") return "Schedule 1-on-1; verify medical reasons";
  if (a.type === "monday_friday_pattern") return "Discuss long-weekend pattern privately";
  if (a.type === "declining_attendance") return "Check for burnout; offer support";
  return "Schedule a 1-on-1 meeting";
}
