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

export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapEmployee(row: Record<string, any>): Employee {
  return {
    id: row.id,
    employeeCode: row.cnic ?? `EMP-${String(row.id).slice(0, 8).toUpperCase()}`,
    name: row.full_name,
    email: row.email,
    phone: row.phone ?? "",
    department: row.department ?? "General",
    designation: row.designation ?? "Employee",
    joinDate: row.joining_date ?? row.created_at?.slice(0, 10) ?? "",
    salary: Number(row.salary ?? 0),
    status: row.status === "inactive" ? "inactive" : "active",
    managerId: null,
    location: "Karachi",
    companyId: row.company_id ?? null,
    gender: "—",
  };
}

export function employeeToDb(emp: Partial<Employee>) {
  return {
    full_name: emp.name,
    cnic: emp.employeeCode,
    phone: emp.phone,
    email: emp.email,
    department: emp.department,
    designation: emp.designation,
    joining_date: emp.joinDate,
    salary: emp.salary,
    status: emp.status ?? "active",
    company_id: emp.companyId,
  };
}

export function mapAttendance(row: Record<string, any>): AttendanceRecord {
  const statusMap: Record<string, AttendanceRecord["status"]> = {
    present: "present",
    absent: "absent",
    late: "late",
    half_day: "late",
    wfh: "present",
  };
  const checkIn = row.check_in?.slice(0, 5) ?? null;
  const checkOut = row.check_out?.slice(0, 5) ?? null;
  let hoursWorked = 0;
  if (checkIn && checkOut) {
    const [ih, im] = checkIn.split(":").map(Number);
    const [oh, om] = checkOut.split(":").map(Number);
    hoursWorked = Math.max(Number(((oh * 60 + om - (ih * 60 + im)) / 60).toFixed(1)), 0);
  }
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    checkIn,
    checkOut,
    status: statusMap[row.status] ?? "present",
    hoursWorked,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    distanceFromOffice: row.distance_from_office == null ? null : Number(row.distance_from_office),
    markedBy: row.marked_by ?? "self",
    overrideNote: row.override_note ?? null,
  };
}

export function attendanceToDb(record: Partial<AttendanceRecord>) {
  const reverseMap: Record<AttendanceRecord["status"], string> = {
    present: "present",
    absent: "absent",
    late: "late",
    on_leave: "wfh",
  };
  return {
    employee_id: record.employeeId,
    date: record.date,
    check_in: record.checkIn,
    check_out: record.checkOut,
    status: record.status ? reverseMap[record.status] : "present",
  };
}

export function mapLeave(row: Record<string, any>): LeaveRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: daysBetween(row.start_date, row.end_date),
    reason: row.reason ?? "",
    status: row.status,
    appliedOn: row.created_at?.slice(0, 10) ?? "",
    approvedBy: row.approved_by,
  };
}

export function leaveToDb(record: Partial<LeaveRecord>) {
  return {
    employee_id: record.employeeId,
    leave_type: record.type,
    start_date: record.startDate,
    end_date: record.endDate,
    reason: record.reason,
    status: record.status ?? "pending",
  };
}

export function mapPayroll(row: Record<string, any>): PayrollRecord {
  const monthStr = `${row.year}-${String(row.month).padStart(2, "0")}`;
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: monthStr,
    basicSalary: Number(row.basic_salary ?? 0),
    allowances: Number(row.bonuses ?? 0),
    deductions: Number(row.deductions ?? 0),
    netSalary: Number(row.net_salary ?? 0),
    status: row.status === "paid" ? "paid" : "processing",
    paidOn: row.status === "paid" ? row.created_at?.slice(0, 10) ?? null : null,
  };
}

export function payrollToDb(record: Partial<PayrollRecord>) {
  const [year, month] = (record.month ?? "").split("-").map(Number);
  return {
    employee_id: record.employeeId,
    month,
    year,
    basic_salary: record.basicSalary,
    bonuses: record.allowances ?? 0,
    deductions: record.deductions ?? 0,
    net_salary: record.netSalary,
    status: record.status === "paid" ? "paid" : "pending",
  };
}

export function mapJob(row: Record<string, any>): Job {
  return {
    id: row.id,
    title: row.title,
    department: row.department ?? "",
    location: "Karachi",
    type: "Full-time",
    salaryRange: "Negotiable (PKR)",
    status: row.status === "closed" ? "closed" : "open",
    postedDate: row.created_at?.slice(0, 10) ?? "",
    deadline: "",
    description: row.description ?? "",
  };
}

export function jobToDb(job: Partial<Job>) {
  return {
    title: job.title,
    department: job.department,
    description: [job.description, job.location ? `Location: ${job.location}` : "", job.salaryRange ? `Salary: ${job.salaryRange}` : ""]
      .filter(Boolean)
      .join("\n"),
    requirements: job.type ?? "Full-time",
    status: job.status === "closed" ? "closed" : "open",
  };
}

export function mapApplicant(row: Record<string, any>): Applicant {
  return {
    id: row.id,
    jobId: row.job_id,
    name: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    experience: row.notes ?? "",
    status: row.stage,
    appliedDate: row.created_at?.slice(0, 10) ?? "",
    resumeScore: 70 + (String(row.id).charCodeAt(0) % 25),
  };
}

export function applicantToDb(record: Partial<Applicant>) {
  return {
    job_id: record.jobId,
    full_name: record.name,
    email: record.email,
    phone: record.phone,
    stage: record.status ?? "applied",
    notes: record.experience,
  };
}

export function mapPerformance(row: Record<string, any>): PerformanceReview {
  const goalsNum = Number.parseInt(row.goals, 10) || 3;
  return {
    id: row.id,
    employeeId: row.employee_id,
    period: row.period ?? "",
    rating: row.rating ?? 0,
    goals: goalsNum,
    goalsCompleted: Math.min(Math.floor(goalsNum * 0.75), goalsNum),
    reviewerId: row.reviewer_id ?? "",
    status: "completed",
    comments: row.feedback ?? "",
  };
}

export function performanceToDb(record: Partial<PerformanceReview>) {
  return {
    employee_id: record.employeeId,
    reviewer_id: record.reviewerId,
    period: record.period,
    rating: record.rating,
    goals: String(record.goals ?? 3),
    feedback: record.comments,
  };
}

export function mapAnnouncement(row: Record<string, any>): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? "",
    authorId: row.created_by ?? "",
    priority: "medium",
    createdAt: row.created_at?.slice(0, 10) ?? "",
    department: row.department ?? "All",
  };
}

export function announcementToDb(record: Partial<Announcement>) {
  return {
    title: record.title,
    content: record.content,
    created_by: record.authorId,
    department: record.department?.toLowerCase() === "all" ? "all" : record.department,
  };
}

export function buildDefaultSettings(employees: Employee[]): CompanySettings {
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const designations = Array.from(new Set(employees.map((e) => e.designation).filter(Boolean)));

  return {
    company: {
      name: "HRFlow Pakistan",
      tagline: "Modern HR for Pakistani Organizations",
      address: "Office 12, Clifton Block 5, Karachi, Pakistan",
      phone: "+92 21 3456 7890",
      email: "hr@hrflow.pk",
      website: "https://hrflow.pk",
      currency: "PKR",
      timezone: "Asia/Karachi",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      officeHours: "9:00 AM – 6:00 PM",
    },
    departments: departments.length
      ? departments
      : ["Engineering", "Human Resources", "Sales", "Finance", "Operations"],
    designations: designations.length
      ? designations
      : ["Software Engineer", "HR Manager", "Team Lead", "Sales Executive"],
    locations: ["Karachi", "Lahore", "Islamabad", "Rawalpindi"],
    holidays: [
      { id: "h1", name: "Pakistan Day", date: "2026-03-23", type: "public" },
      { id: "h2", name: "Eid ul Fitr", date: "2026-03-30", type: "public" },
      { id: "h3", name: "Independence Day", date: "2026-08-14", type: "public" },
      { id: "h4", name: "Eid ul Adha", date: "2026-06-06", type: "public" },
      { id: "h5", name: "Iqbal Day", date: "2026-11-09", type: "public" },
    ],
  };
}
