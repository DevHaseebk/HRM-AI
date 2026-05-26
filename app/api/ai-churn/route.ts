import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { askGemini, GeminiError } from "@/lib/ai-gemini";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ChurnEmployee {
  id: string;
  full_name: string;
  department: string;
  designation: string;
  joining_date: string | null;
  tenureMonths: number;
  attendanceTrend: "improving" | "stable" | "declining";
  recentLeaves: number;
  monthsSinceIncrement: number | null;
  avgRating: number | null;
  score: number;
  level: "high" | "medium" | "low";
  reason: string;
  recommendation: string;
}

function monthsBetween(startISO: string | null, endISO: string) {
  if (!startISO) return 0;
  const s = new Date(startISO);
  const e = new Date(endISO);
  return (
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth())
  );
}

export async function GET() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [employeesRes, attendanceRes, leavesRes, payrollRes, perfRes] =
    await Promise.all([
      supabaseAdmin
        .from("employees")
        .select("id, full_name, department, designation, joining_date, salary")
        .eq("status", "active"),
      supabaseAdmin
        .from("attendance")
        .select("employee_id, date, status")
        .gte("date", ninetyDaysAgo),
      supabaseAdmin
        .from("leaves")
        .select("employee_id, status, start_date")
        .gte("start_date", ninetyDaysAgo),
      supabaseAdmin
        .from("payroll")
        .select("employee_id, basic_salary, month, year, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("performance")
        .select("employee_id, rating, created_at"),
    ]);

  const employees = employeesRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const leaves = leavesRes.data ?? [];
  const payroll = payrollRes.data ?? [];
  const performance = perfRes.data ?? [];

  // Index helpers
  const attByEmp = new Map<string, typeof attendance>();
  for (const a of attendance) {
    if (!a.employee_id) continue;
    const list = attByEmp.get(a.employee_id) ?? [];
    list.push(a);
    attByEmp.set(a.employee_id, list);
  }
  const leavesByEmp = new Map<string, typeof leaves>();
  for (const l of leaves) {
    if (!l.employee_id) continue;
    const list = leavesByEmp.get(l.employee_id) ?? [];
    list.push(l);
    leavesByEmp.set(l.employee_id, list);
  }
  const payrollByEmp = new Map<string, typeof payroll>();
  for (const p of payroll) {
    if (!p.employee_id) continue;
    const list = payrollByEmp.get(p.employee_id) ?? [];
    list.push(p);
    payrollByEmp.set(p.employee_id, list);
  }
  const perfByEmp = new Map<string, typeof performance>();
  for (const r of performance) {
    if (!r.employee_id) continue;
    const list = perfByEmp.get(r.employee_id) ?? [];
    list.push(r);
    perfByEmp.set(r.employee_id, list);
  }

  // Score each employee
  const scored: Array<Omit<ChurnEmployee, "reason" | "recommendation">> =
    employees.map((emp) => {
      let score = 0;

      const tenureMonths = monthsBetween(emp.joining_date, todayISO);
      // Low tenure → risk
      if (tenureMonths < 6) score += 25;
      else if (tenureMonths < 12) score += 10;

      // Attendance trend
      const empAtt = attByEmp.get(emp.id) ?? [];
      const monthly = new Map<string, { absent: number; total: number }>();
      for (const a of empAtt) {
        const k = a.date.slice(0, 7);
        const m = monthly.get(k) ?? { absent: 0, total: 0 };
        if (a.status === "absent") m.absent++;
        m.total++;
        monthly.set(k, m);
      }
      const months = Array.from(monthly.keys()).sort();
      let attendanceTrend: ChurnEmployee["attendanceTrend"] = "stable";
      if (months.length >= 2) {
        const first = monthly.get(months[0])!;
        const last = monthly.get(months[months.length - 1])!;
        const firstRate = first.total ? 1 - first.absent / first.total : 1;
        const lastRate = last.total ? 1 - last.absent / last.total : 1;
        if (lastRate - firstRate >= 0.1) attendanceTrend = "improving";
        else if (firstRate - lastRate >= 0.1) {
          attendanceTrend = "declining";
          score += 25;
        }
      }

      // Recent leaves
      const recentLeaves = (leavesByEmp.get(emp.id) ?? []).length;
      if (recentLeaves >= 5) score += 15;
      else if (recentLeaves >= 3) score += 8;

      // Increment freshness
      const empPayroll = payrollByEmp.get(emp.id) ?? [];
      let monthsSinceIncrement: number | null = null;
      if (empPayroll.length >= 2) {
        // Compare basic_salary across most-recent two payroll records
        const sorted = [...empPayroll].sort(
          (a, b) =>
            (b.year - a.year) * 12 + (b.month - a.month)
        );
        const last = sorted[0];
        const earliest = sorted[sorted.length - 1];
        const lastSalary = Number(last.basic_salary ?? 0);
        const earliestSalary = Number(earliest.basic_salary ?? 0);
        const monthsSpan =
          (last.year - earliest.year) * 12 + (last.month - earliest.month);
        if (lastSalary === earliestSalary && monthsSpan >= 12) {
          score += 20;
          monthsSinceIncrement = monthsSpan;
        } else {
          monthsSinceIncrement = 0;
        }
      } else if (tenureMonths >= 12 && empPayroll.length <= 1) {
        score += 15;
        monthsSinceIncrement = tenureMonths;
      }

      // Performance
      const empPerf = perfByEmp.get(emp.id) ?? [];
      const avgRating =
        empPerf.length > 0
          ? empPerf.reduce((s, r) => s + Number(r.rating ?? 0), 0) /
            empPerf.length
          : null;
      if (avgRating !== null) {
        if (avgRating < 2.5) score += 20;
        else if (avgRating < 3.5) score += 8;
      }

      const level: ChurnEmployee["level"] =
        score >= 50 ? "high" : score >= 25 ? "medium" : "low";

      return {
        id: emp.id,
        full_name: emp.full_name,
        department: emp.department ?? "—",
        designation: emp.designation ?? "—",
        joining_date: emp.joining_date,
        tenureMonths,
        attendanceTrend,
        recentLeaves,
        monthsSinceIncrement,
        avgRating: avgRating !== null ? Number(avgRating.toFixed(2)) : null,
        score,
        level,
      };
    });

  // Only enrich top risk employees via AI (cap cost)
  const topRisk = scored
    .filter((s) => s.level !== "low")
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  let enriched: ChurnEmployee[] = scored.map((s) => ({
    ...s,
    reason: deterministicReason(s),
    recommendation: deterministicRec(s),
  }));

  if (topRisk.length > 0) {
    const systemPrompt = `You are an HR retention specialist at a Pakistani software company.
For each employee below, write ONE short reason (max 25 words) explaining their churn risk,
and ONE recommended retention action (max 15 words).
Be empathetic, specific, and culturally appropriate (Pakistan).
Return ONLY valid JSON: [{"i":0,"reason":"...","action":"..."}]`;

    const userPayload = topRisk
      .map(
        (s, i) =>
          `${i}. ${s.full_name} (${s.designation}, ${s.department}) — tenure ${s.tenureMonths} months, attendance ${s.attendanceTrend}, ${s.recentLeaves} recent leaves, ${
            s.monthsSinceIncrement
              ? `${s.monthsSinceIncrement} months since increment`
              : "no increment data"
          }, avg rating ${s.avgRating ?? "N/A"}, risk score ${s.score}/100`
      )
      .join("\n");

    try {
      const raw = await askGemini(systemPrompt, userPayload, {
        temperature: 0.4,
        maxOutputTokens: 1800,
      });
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned) as Array<{
        i: number;
        reason: string;
        action: string;
      }>;
      const idToParsed = new Map<string, { reason: string; action: string }>();
      for (const p of parsed) {
        const ref = topRisk[p.i];
        if (ref) idToParsed.set(ref.id, p);
      }
      enriched = enriched.map((s) => {
        const ai = idToParsed.get(s.id);
        return ai
          ? { ...s, reason: ai.reason, recommendation: ai.action }
          : s;
      });
    } catch (err) {
      console.error("[ai-churn] insight generation failed:", err);
      if (err instanceof GeminiError && err.status === 500) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
  }

  enriched.sort((a, b) => b.score - a.score);

  const retentionScore =
    employees.length === 0
      ? 100
      : Math.round(
          (enriched.filter((e) => e.level === "low").length /
            employees.length) *
            100
        );

  const summary = {
    total: employees.length,
    high: enriched.filter((e) => e.level === "high").length,
    medium: enriched.filter((e) => e.level === "medium").length,
    low: enriched.filter((e) => e.level === "low").length,
    retentionScore,
  };

  return NextResponse.json({ employees: enriched, summary });
}

function deterministicReason(s: {
  tenureMonths: number;
  attendanceTrend: string;
  recentLeaves: number;
  monthsSinceIncrement: number | null;
  avgRating: number | null;
}): string {
  const reasons: string[] = [];
  if (s.attendanceTrend === "declining") reasons.push("declining attendance");
  if (s.recentLeaves >= 5) reasons.push("many recent leaves");
  if (s.monthsSinceIncrement && s.monthsSinceIncrement >= 12)
    reasons.push(`no increment in ${s.monthsSinceIncrement} months`);
  if (s.tenureMonths < 6) reasons.push("very low tenure");
  if (s.avgRating !== null && s.avgRating < 2.5) reasons.push("low performance");
  return reasons.length > 0
    ? `Risk indicators: ${reasons.join(", ")}.`
    : "No major risk indicators detected.";
}
function deterministicRec(s: { level: string }) {
  if (s.level === "high") return "Urgent 1-on-1; consider retention package";
  if (s.level === "medium") return "Schedule check-in; revisit goals";
  return "Stable — continue regular engagement";
}
