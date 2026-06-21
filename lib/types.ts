export type Role = "super_admin" | "company_admin" | "hr_manager" | "team_lead" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  employeeId: string | null;
  companyId?: string | null;
  mustChangePassword?: boolean;
  isTempPassword?: boolean;
}

export interface UserRecord extends AuthUser {
  password: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joinDate: string;
  salary: number;
  status: "active" | "inactive";
  managerId: string | null;
  location: string;
  gender: string;
  companyId?: string | null;
}

export interface CompanyRecord {
  id: string;
  name: string;
}

export interface OfficePolicy {
  id: string;
  title: string;
  description: string;
  effectiveDate: string;
}

export interface OfficeProfile {
  id?: string;
  companyId: string | null;
  name: string;
  logoUrl: string;
  email: string;
  phone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  lateThresholdMinutes: number;
  gracePeriodMinutes: number;
  workDays: string[];
  latitude: number | null;
  longitude: number | null;
  locationRadiusMeters: number;
  locationSet: boolean;
  policies: OfficePolicy[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "absent" | "late" | "on_leave";
  hoursWorked: number;
  latitude?: number | null;
  longitude?: number | null;
  distanceFromOffice?: number | null;
  markedBy?: string;
  overrideNote?: string | null;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  type: "annual" | "sick" | "casual";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedOn: string;
  approvedBy: string | null;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "paid" | "processing" | "pending";
  paidOn: string | null;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salaryRange: string;
  status: "open" | "closed";
  postedDate: string;
  deadline: string;
  description: string;
}

export interface Applicant {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  appliedDate: string;
  resumeScore: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  department: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  period: string;
  rating: number;
  goals: number;
  goalsCompleted: number;
  reviewerId: string;
  status: "completed" | "in_progress" | "pending";
  comments: string;
}

export interface CompanySettings {
  company: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    currency: string;
    timezone: string;
    workingDays: string[];
    officeHours: string;
  };
  departments: string[];
  designations: string[];
  locations: string[];
  holidays: { id: string; name: string; date: string; type: string }[];
}

export type DataFile =
  | "users.json"
  | "employees.json"
  | "attendance.json"
  | "leaves.json"
  | "payroll.json"
  | "jobs.json"
  | "applicants.json"
  | "announcements.json"
  | "performance.json"
  | "settings.json";
