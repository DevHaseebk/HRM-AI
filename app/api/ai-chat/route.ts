import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini, GeminiError, type GeminiContent } from "@/lib/ai-gemini";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Role = "super_admin" | "hr_manager" | "team_lead" | "employee";

type ChatRequest = {
  message: string;
  conversationHistory?: GeminiContent[];
  userRole?: Role;
  userName?: string;
};

/* ──────────────────────────────────────────────────────────
 * Intent detection
 * ──────────────────────────────────────────────────────────*/

interface Intent {
  isEmployeeQuery: boolean;
  isLeaveQuery: boolean;
  isAttendanceQuery: boolean;
  isPayrollQuery: boolean;
  isRecruitmentQuery: boolean;
  isPerformanceQuery: boolean;
  isAnnouncementQuery: boolean;
  isAggregateQuery: boolean;
  timeFrame: "today" | "yesterday" | "week" | "month" | "all";
}

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();

  const has = (...patterns: string[]) =>
    patterns.some((p) => lower.includes(p));

  const timeFrame: Intent["timeFrame"] = has("today", "aaj")
    ? "today"
    : has("yesterday", "kal hua", "kal tha")
    ? "yesterday"
    : has("this week", "iss week", "es week", "is week")
    ? "week"
    : has("month", "mahine", "mahina", "is mahine")
    ? "month"
    : "all";

  return {
    isEmployeeQuery: has(
      "employee", "employees", "staff", "worker", "banda", "bande", "team member"
    ),
    isLeaveQuery: has(
      "leave", "leaves", "chuti", "chutti", "absent", "absentee", "off"
    ),
    isAttendanceQuery: has(
      "attendance", "present", "hazri", "haziri", "late", "on time", "in office"
    ),
    isPayrollQuery: has(
      "salary", "salaries", "payroll", "pay slip", "payslip", "tankhwah",
      "tankhwa", "tanqah", "tankhah", "wage", "compensation"
    ),
    isRecruitmentQuery: has(
      "job", "jobs", "applicant", "applicants", "candidate", "candidates",
      "hiring", "hire", "recruit", "recruitment", "vacancy", "vacancies",
      "position", "positions", "open role"
    ),
    isPerformanceQuery: has(
      "performance", "review", "reviews", "rating", "ratings", "feedback", "goals"
    ),
    isAnnouncementQuery: has(
      "announcement", "announcements", "notice", "notices"
    ),
    isAggregateQuery: has(
      "total", "sum", "count", "kitne", "kitna", "kitni", "how many", "list all",
      "show all", "everyone", "sab", "sare", "average", "summary"
    ),
    timeFrame,
  };
}

/* ──────────────────────────────────────────────────────────
 * Smart employee name resolver — match against actual rows
 * ──────────────────────────────────────────────────────────*/

const NAME_STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been",
  "i","me","my","you","your","we","our","they","them",
  "ki","ka","ke","ko","ne","se","mein","par","tak","aur","ya",
  "hai","hain","tha","the","thi","ho","gaya","gayi","raha","rahi",
  "kya","kyun","kaun","kab","kahan","kaise","kese",
  "kitne","kitna","kitni","kuch","sab","sare","sari",
  "detail","details","batao","btao","bata","bhej","show","tell","about","info","information","full",
  "dikhao","dikha","de","do","please","plz","kindly",
  "today","aaj","yesterday","kal","tomorrow","tomorow","week","month","year","day","date",
  "of","in","on","with","and","to","from","for","by","at","or","as",
  "employee","employees","staff","worker","workers","team","member","members","banda","bande",
  "leave","leaves","chuti","chutti","absent","present","attendance","hazri","haziri","late",
  "salary","salaries","payroll","pay","payslip","tankhwah","tankhwa","wage",
  "job","jobs","applicant","applicants","hiring","recruit","recruitment","position","positions","vacancy",
  "performance","review","rating","feedback","goals",
  "announcement","announcements","notice",
  "pending","approved","rejected","this","that","last","next","first","recent","new",
  "all","total","sum","count","summary","list","everyone",
  "how","many","much","what","which","who","whom","whose","when","where","why",
  "department","departments","designation","manager",
]);

async function findEmployeeMention(
  message: string
): Promise<{ id: string; full_name: string } | null> {
  const lower = message.toLowerCase();

  // Pull active employees (typically small enough to scan)
  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("id, full_name")
    .eq("status", "active");

  if (!employees || employees.length === 0) return null;

  // 1) Try exact full-name substring match first (most specific)
  for (const emp of employees) {
    if (emp.full_name && lower.includes(String(emp.full_name).toLowerCase())) {
      return emp;
    }
  }

  // 2) Token-level match on first/last name — minimum 3 chars, must appear as a whole word
  const tokens = lower
    .split(/[^a-zA-Z\u0600-\u06FF]+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));

  if (tokens.length === 0) return null;

  for (const emp of employees) {
    if (!emp.full_name) continue;
    const nameParts = String(emp.full_name)
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length >= 3);

    for (const part of nameParts) {
      if (tokens.includes(part)) {
        return emp;
      }
    }
  }

  return null;
}

/* ──────────────────────────────────────────────────────────
 * Data fetch
 * ──────────────────────────────────────────────────────────*/

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

async function fetchRelevantData(
  intent: Intent,
  matchedEmployee: { id: string; full_name: string } | null,
  role: Role
) {
  const data: Record<string, any> = {};
  const canSeePayroll = role === "super_admin" || role === "hr_manager";

  // Always-on lightweight stats
  const [
    { count: totalEmployees },
    { count: pendingLeaves },
    { count: openJobs },
  ] = await Promise.all([
    supabaseAdmin.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("leaves").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);
  data.stats = {
    activeEmployees: totalEmployees ?? 0,
    pendingLeaves: pendingLeaves ?? 0,
    openJobs: openJobs ?? 0,
    today: todayISO(),
  };

  /* ───── Per-employee deep-dive ───── */
  if (matchedEmployee) {
    const { data: emp } = await supabaseAdmin
      .from("employees")
      .select("id, full_name, email, phone, department, designation, joining_date, salary, status, cnic")
      .eq("id", matchedEmployee.id)
      .single();

    if (emp) {
      // Hide salary unless authorized
      const safe = canSeePayroll
        ? emp
        : { ...emp, salary: "[restricted]" };
      data.employee = safe;

      const [leavesRes, attRes, perfRes] = await Promise.all([
        supabaseAdmin
          .from("leaves")
          .select("id, leave_type, start_date, end_date, status, reason, created_at")
          .eq("employee_id", emp.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("attendance")
          .select("date, status, check_in, check_out")
          .eq("employee_id", emp.id)
          .gte("date", thirtyDaysAgoISO())
          .order("date", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("performance")
          .select("period, rating, goals, feedback, created_at")
          .eq("employee_id", emp.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      data.employeeLeaves = leavesRes.data ?? [];
      data.employeeAttendance30d = attRes.data ?? [];
      data.employeePerformance = perfRes.data ?? [];

      if (canSeePayroll) {
        const { data: pay } = await supabaseAdmin
          .from("payroll")
          .select("month, year, basic_salary, deductions, bonuses, net_salary, status")
          .eq("employee_id", emp.id)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(6);
        data.employeePayroll = pay ?? [];
      }

      // Attendance summary numbers
      const att = attRes.data ?? [];
      data.employeeAttendanceSummary = {
        present: att.filter((a) => a.status === "present").length,
        absent: att.filter((a) => a.status === "absent").length,
        late: att.filter((a) => a.status === "late").length,
        wfh: att.filter((a) => a.status === "wfh").length,
        windowDays: att.length,
      };
    }
  }

  /* ───── General leaves ───── */
  if (intent.isLeaveQuery && !matchedEmployee) {
    let q = supabaseAdmin
      .from("leaves")
      .select("id, leave_type, start_date, end_date, status, reason, created_at, employees(full_name, department)")
      .order("created_at", { ascending: false })
      .limit(25);

    // status filter from keywords
    const msg = (intent as any)._raw as string | undefined;
    if (msg?.toLowerCase().includes("approved")) q = q.eq("status", "approved");
    else if (msg?.toLowerCase().includes("rejected")) q = q.eq("status", "rejected");
    else if (msg?.toLowerCase().includes("pending")) q = q.eq("status", "pending");

    const { data: leaves } = await q;
    data.leaves = leaves ?? [];
  }

  /* ───── General attendance ───── */
  if (intent.isAttendanceQuery && !matchedEmployee) {
    const date =
      intent.timeFrame === "yesterday"
        ? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
        : todayISO();

    const { data: attendance } = await supabaseAdmin
      .from("attendance")
      .select("status, check_in, check_out, employees(full_name, department)")
      .eq("date", date);
    data.attendanceForDate = { date, records: attendance ?? [] };

    if (attendance) {
      data.attendanceCounts = {
        present: attendance.filter((a) => a.status === "present").length,
        absent: attendance.filter((a) => a.status === "absent").length,
        late: attendance.filter((a) => a.status === "late").length,
        wfh: attendance.filter((a) => a.status === "wfh").length,
      };
    }
  }

  /* ───── General payroll (gated) ───── */
  if (intent.isPayrollQuery && !matchedEmployee) {
    if (!canSeePayroll) {
      data.payrollRestricted = true;
    } else {
      const { data: payroll } = await supabaseAdmin
        .from("payroll")
        .select(
          "month, year, basic_salary, deductions, bonuses, net_salary, status, employees(full_name, department)"
        )
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(25);
      data.payroll = payroll ?? [];

      const totalNet = (payroll ?? []).reduce(
        (sum, p) => sum + Number(p.net_salary ?? 0),
        0
      );
      data.payrollSummary = { totalNet, records: (payroll ?? []).length };
    }
  }

  /* ───── Recruitment ───── */
  if (intent.isRecruitmentQuery) {
    const [{ data: jobs }, { data: applicants }] = await Promise.all([
      supabaseAdmin
        .from("jobs")
        .select("id, title, department, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("applicants")
        .select("id, full_name, email, stage, created_at, jobs(title)")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    data.jobs = jobs ?? [];
    data.applicants = applicants ?? [];
  }

  /* ───── Performance (general) ───── */
  if (intent.isPerformanceQuery && !matchedEmployee) {
    const { data: perf } = await supabaseAdmin
      .from("performance")
      .select("period, rating, feedback, created_at, employees(full_name, department)")
      .order("created_at", { ascending: false })
      .limit(20);
    data.performance = perf ?? [];
  }

  /* ───── Announcements ───── */
  if (intent.isAnnouncementQuery) {
    const { data: ann } = await supabaseAdmin
      .from("announcements")
      .select("title, content, department, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    data.announcements = ann ?? [];
  }

  /* ───── "Last hired employee" — recent joiners ───── */
  if (/last hired|recent hire|naya joiner|recently joined|new joiner/i.test(
    (intent as any)._raw ?? ""
  )) {
    const { data: recent } = await supabaseAdmin
      .from("employees")
      .select("full_name, department, designation, joining_date")
      .eq("status", "active")
      .order("joining_date", { ascending: false })
      .limit(5);
    data.recentJoiners = recent ?? [];
  }

  /* ───── This-month payroll summary ───── */
  if (
    intent.timeFrame === "month" &&
    intent.isPayrollQuery &&
    !matchedEmployee &&
    canSeePayroll
  ) {
    const d = new Date();
    const { data: monthPay } = await supabaseAdmin
      .from("payroll")
      .select("net_salary, status, employees(full_name)")
      .eq("month", d.getMonth() + 1)
      .eq("year", d.getFullYear());
    data.thisMonthPayroll = monthPay ?? [];
    data.thisMonthPayrollTotal = (monthPay ?? []).reduce(
      (sum, p) => sum + Number(p.net_salary ?? 0),
      0
    );
    data.thisMonthLabel = firstOfMonthISO().slice(0, 7);
  }

  return data;
}

/* ──────────────────────────────────────────────────────────
 * Suggested follow-up chips
 * ──────────────────────────────────────────────────────────*/

function buildSuggestions(
  intent: Intent,
  matchedEmployee: { full_name: string } | null,
  data: Record<string, any>
): string[] {
  const out: string[] = [];

  if (matchedEmployee) {
    const fn = matchedEmployee.full_name.split(" ")[0];
    out.push(`Show ${fn}'s leave history`);
    out.push(`Show ${fn}'s attendance this month`);
    out.push(`Show ${fn}'s payroll`);
  } else if (intent.isLeaveQuery) {
    out.push("Show pending leaves by department");
    out.push("Show approved leaves this month");
    out.push("Who has the most leaves this year?");
  } else if (intent.isAttendanceQuery) {
    out.push("Show absent employees today");
    out.push("Show late arrivals this week");
    out.push("Department-wise attendance");
  } else if (intent.isPayrollQuery) {
    out.push("Total payroll this month");
    out.push("Highest paid employees");
    out.push("Pending salary disbursements");
  } else if (intent.isRecruitmentQuery) {
    if ((data.applicants ?? []).length > 0) {
      out.push("Show applicants in interview stage");
    }
    out.push("Show open positions");
    out.push("Recent hires");
  } else if (intent.isPerformanceQuery) {
    out.push("Top rated employees");
    out.push("Show reviews this quarter");
  } else {
    out.push("Aaj kaun absent hai?");
    out.push("Pending leaves dikhao");
    out.push("Kitne open positions hain?");
  }

  return out.slice(0, 3);
}

/* ──────────────────────────────────────────────────────────
 * Main handler
 * ──────────────────────────────────────────────────────────*/

const FALLBACK_REPLY =
  "I couldn't generate a response right now. Please try again in a moment.";

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const userRole = (body.userRole ?? "employee") as Role;
  const userName = body.userName ?? "User";

  // 1) Detect intent + employee mention (db-matched)
  const intent = detectIntent(message);
  (intent as any)._raw = message;
  const matchedEmployee = await findEmployeeMention(message);

  // 2) Fetch contextual data
  let dbData: Record<string, any> = {};
  try {
    dbData = await fetchRelevantData(intent, matchedEmployee, userRole);
  } catch (err) {
    console.error("[ai-chat] data fetch failed:", err);
    dbData = { error: "Data fetch failed" };
  }

  // 3) Build system instruction
  const systemPrompt = `You are HRFlow AI Assistant for a Pakistani software company.

ROLE OF CURRENT USER: ${userRole}
NAME OF CURRENT USER: ${userName}
TODAY'S DATE: ${new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

You have access to real HR data shown in COMPANY_DATA below. Answer using ONLY this data.

GUIDELINES:
- Answer in the same language the user wrote (English / Urdu / Roman Urdu — match their style).
- Be conversational, helpful, and concise. Use short paragraphs, bullet points, or simple tables.
- Show numbers / dates clearly. Use PKR symbol for amounts.
- If an employee was looked up, mention key facts (designation, department, status, joining date) and answer the specific question.
- If COMPANY_DATA does not contain what was asked, say so honestly. Do not invent names, salaries, or dates.
- If \`payrollRestricted\` is true OR \`salary\` is "[restricted]", explain that salary info is restricted for the current role (${userRole}).
- For sensitive HR matters cite Pakistani labour law context when helpful (EOBI, PESSI, Shops & Establishments Ordinance).
- Keep replies under ~250 words unless the user explicitly asks for more.

COMPANY_DATA:
${JSON.stringify(dbData, null, 2)}`;

  // 4) Build contents — strip leading model messages, append current user msg
  const history = (body.conversationHistory ?? []).slice(-10);
  while (history.length > 0 && history[0].role !== "user") history.shift();

  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: [{ text: message }] },
  ];

  // 5) Call Gemini via shared wrapper
  let reply = FALLBACK_REPLY;
  try {
    reply = await callGemini({
      systemPrompt,
      contents,
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
  } catch (err) {
    const status = err instanceof GeminiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Failed to reach AI service";
    return NextResponse.json({ error: message }, { status });
  }

  // 6) Build suggestion chips
  const suggestions = buildSuggestions(intent, matchedEmployee, dbData);

  return NextResponse.json({
    reply,
    suggestions,
    matchedEmployee: matchedEmployee?.full_name ?? null,
    intent: {
      employee: intent.isEmployeeQuery,
      leave: intent.isLeaveQuery,
      attendance: intent.isAttendanceQuery,
      payroll: intent.isPayrollQuery,
      recruitment: intent.isRecruitmentQuery,
    },
  });
}
