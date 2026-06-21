import type {
  Announcement,
  Applicant,
  AttendanceRecord,
  CompanySettings,
  Employee,
  Job,
  LeaveRecord,
  PayrollRecord,
  PerformanceReview,
} from "./types";
import { getClientAuthHeaders } from "./company-scope";
import {
  announcementToDb,
  applicantToDb,
  attendanceToDb,
  employeeToDb,
  jobToDb,
  leaveToDb,
  mapAnnouncement,
  mapApplicant,
  mapAttendance,
  mapEmployee,
  mapJob,
  mapLeave,
  mapPayroll,
  mapPerformance,
  payrollToDb,
  performanceToDb,
} from "./db-mappers";

export { daysBetween } from "./db-mappers";

async function parseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error || "Request failed");
}

async function apiGet<T>(url: string, mapper: (row: Record<string, unknown>) => T): Promise<T[]> {
  const res = await fetch(url, { headers: getClientAuthHeaders() });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(mapper);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function fetchAllHrmData() {
  const [employees, attendance, leaves, payroll, jobs, applicants, performanceReviews, announcements] =
    await Promise.all([
      apiGet("/api/employees", mapEmployee),
      apiGet("/api/attendance", mapAttendance),
      apiGet("/api/leaves", mapLeave),
      apiGet("/api/payroll", (row) => mapPayroll(row)),
      apiGet("/api/jobs", mapJob),
      apiGet("/api/applicants", mapApplicant),
      apiGet("/api/performance", mapPerformance),
      apiGet("/api/announcements", mapAnnouncement),
    ]);

  return { employees, attendance, leaves, payroll, jobs, applicants, performanceReviews, announcements };
}

export async function createRecord(
  resource:
    | "employees"
    | "attendance"
    | "leaves"
    | "payroll"
    | "jobs"
    | "applicants"
    | "announcements"
    | "performance",
  data: unknown
): Promise<unknown> {
  let body: Record<string, unknown> = data as Record<string, unknown>;

  if (resource === "employees") {
    const employeeInput = data as Record<string, unknown>;
    body = {
      ...employeeToDb(data as unknown as Employee),
      role: employeeInput.role,
      company_id: employeeInput.company_id,
      new_company_name: employeeInput.new_company_name,
    };
  }
  if (resource === "attendance") body = attendanceToDb(data as unknown as AttendanceRecord);
  if (resource === "leaves") body = leaveToDb(data as unknown as LeaveRecord);
  if (resource === "payroll") body = payrollToDb(data as unknown as PayrollRecord);
  if (resource === "jobs") body = jobToDb(data as unknown as Job);
  if (resource === "applicants") body = applicantToDb(data as unknown as Applicant);
  if (resource === "performance") body = performanceToDb(data as unknown as PerformanceReview);
  if (resource === "announcements") body = announcementToDb(data as unknown as Announcement);

  const res = await fetch(`/api/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function updateRecordApi<T>(
  resource: "employees" | "attendance" | "leaves" | "payroll" | "applicants" | "performance",
  id: string,
  data: Partial<T>
): Promise<unknown> {
  let body: Record<string, unknown> = data as Record<string, unknown>;

  if (resource === "employees") body = employeeToDb(data as unknown as Employee);
  if (resource === "attendance") body = attendanceToDb(data as unknown as AttendanceRecord);
  if (resource === "payroll") body = payrollToDb(data as unknown as PayrollRecord);
  if (resource === "applicants") {
    body = { stage: (data as unknown as Applicant).status, notes: (data as unknown as Applicant).experience };
  }
  if (resource === "performance") body = performanceToDb(data as unknown as PerformanceReview);

  const method = resource === "leaves" || resource === "applicants" ? "PUT" : "PUT";
  const res = await fetch(`/api/${resource}/${id}`, {
    method,
    headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
    body: JSON.stringify(
      resource === "leaves"
        ? { status: (data as unknown as LeaveRecord).status, approved_by: (data as unknown as LeaveRecord).approvedBy }
        : body
    ),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function deleteRecordApi(
  resource: "employees" | "announcements",
  id: string
): Promise<void> {
  const res = await fetch(`/api/${resource}/${id}`, {
    method: "DELETE",
    headers: getClientAuthHeaders(),
  });
  if (!res.ok) await parseError(res);
}

export async function updateSettings(data: CompanySettings): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem("hrflow_settings", JSON.stringify(data));
  }
}

export function loadStoredSettings(): CompanySettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("hrflow_settings");
    return raw ? (JSON.parse(raw) as CompanySettings) : null;
  } catch {
    return null;
  }
}

export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
