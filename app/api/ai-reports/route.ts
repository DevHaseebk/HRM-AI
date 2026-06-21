import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { askGemini, GeminiError } from "@/lib/ai-gemini";
import { getCompanyScope } from "@/lib/company-scope";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  const scope = getCompanyScope(request);
  let body: { month?: number; year?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const now = new Date();
  const month = Number(body.month ?? now.getMonth() + 1);
  const year = Number(body.year ?? now.getFullYear());

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  let companyEmployeesQuery = supabaseAdmin
    .from("employees")
    .select("id, full_name, department, status, designation, joining_date, created_at");
  if (scope.shouldScope) companyEmployeesQuery = companyEmployeesQuery.eq("company_id", scope.companyId);
  const companyEmployeesRes = await companyEmployeesQuery;
  const companyEmployees = companyEmployeesRes.data ?? [];
  const employeeIds = companyEmployees.map((employee) => employee.id);
  const safeEmployeeIds = employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"];
  let hiresQuery = supabaseAdmin
    .from("applicants")
    .select("stage, jobs!inner(company_id)")
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd);
  if (scope.shouldScope) hiresQuery = hiresQuery.eq("jobs.company_id", scope.companyId);

  // Fetch everything in parallel
  const [
    employeesRes,
    newJoinersRes,
    exitsRes,
    attendanceRes,
    leavesRes,
    payrollRes,
    hiresRes,
    reviewsRes,
  ] = await Promise.all([
    Promise.resolve({ data: companyEmployees }),
    Promise.resolve({ data: companyEmployees.filter((employee) => employee.joining_date >= monthStart && employee.joining_date < monthEnd) }),
    Promise.resolve({ data: companyEmployees.filter((employee) => employee.status === "inactive" && employee.created_at >= monthStart && employee.created_at < monthEnd) }),
    supabaseAdmin
      .from("attendance")
      .select("status")
      .in("employee_id", safeEmployeeIds)
      .gte("date", monthStart)
      .lt("date", monthEnd),
    supabaseAdmin
      .from("leaves")
      .select("leave_type, status, start_date, end_date")
      .in("employee_id", safeEmployeeIds)
      .gte("start_date", monthStart)
      .lt("start_date", monthEnd),
    supabaseAdmin
      .from("payroll")
      .select("net_salary, basic_salary, deductions, bonuses, status")
      .in("employee_id", safeEmployeeIds)
      .eq("month", month)
      .eq("year", year),
    hiresQuery,
    supabaseAdmin
      .from("performance")
      .select("rating, period")
      .in("employee_id", safeEmployeeIds)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
  ]);

  const employees = employeesRes.data ?? [];
  const newJoiners = newJoinersRes.data ?? [];
  const exits = exitsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const leaves = leavesRes.data ?? [];
  const payroll = payrollRes.data ?? [];
  const hires = hiresRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const totalEmp = employees.filter((e) => e.status === "active").length;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const totalAtt = attendance.length || 1;

  const leavesByType = leaves.reduce<Record<string, number>>((acc, l) => {
    if (l.leave_type) acc[l.leave_type] = (acc[l.leave_type] ?? 0) + 1;
    return acc;
  }, {});

  const totalPayroll = payroll.reduce(
    (sum, p) => sum + Number(p.net_salary ?? 0),
    0
  );

  const reviewsDone = reviews.length;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) /
        reviews.length
      : 0;

  const metrics = {
    period: `${new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" })} ${year}`,
    activeEmployees: totalEmp,
    newJoiners: newJoiners.length,
    exits: exits.length,
    netChange: newJoiners.length - exits.length,
    attendance: {
      totalRecords: attendance.length,
      presentPct: Math.round((presentCount / totalAtt) * 100),
      latePct: Math.round((lateCount / totalAtt) * 100),
      absentPct: Math.round((absentCount / totalAtt) * 100),
    },
    leaves: {
      total: leaves.length,
      byType: leavesByType,
      approved: leaves.filter((l) => l.status === "approved").length,
      pending: leaves.filter((l) => l.status === "pending").length,
    },
    payroll: {
      totalPaidPKR: totalPayroll,
      paidRecords: payroll.filter((p) => p.status === "paid").length,
      pendingRecords: payroll.filter((p) => p.status === "pending").length,
    },
    recruitment: {
      newApplications: hires.length,
      hired: hires.filter((a) => a.stage === "hired").length,
      inInterview: hires.filter((a) => a.stage === "interview").length,
    },
    performance: {
      reviewsCompleted: reviewsDone,
      averageRating: Number(avgRating.toFixed(2)),
    },
  };

  const systemPrompt = `You are a senior HR analyst at a Pakistani software company.
Write a clear, data-driven monthly HR report based on the provided metrics.

Output PLAIN TEXT formatted with UPPERCASE section headings.
Use these sections in order:

EXECUTIVE SUMMARY
(2–3 sentence high-level summary)

KEY METRICS
(bullet list of the most important numbers)

ATTENDANCE & LEAVE TRENDS
(observations + comparison)

RECRUITMENT & RETENTION
(joiners, exits, net change, applicant pipeline)

PAYROLL OVERVIEW
(PKR totals, paid vs pending)

PERFORMANCE HIGHLIGHTS
(reviews done, average rating)

CONCERNS & RISKS
(2–4 risks with reasoning)

RECOMMENDATIONS
(3–5 concrete actions for leadership)

Be professional, concise, and specific to the data. Use PKR symbol for amounts.`;

  const userPayload = `Generate the report for ${metrics.period}.

METRICS:
${JSON.stringify(metrics, null, 2)}`;

  try {
    const report = await askGemini(systemPrompt, userPayload, {
      temperature: 0.5,
      maxOutputTokens: 2048,
    });
    return NextResponse.json({ report, metrics });
  } catch (err) {
    const status = err instanceof GeminiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message, metrics }, { status });
  }
}
