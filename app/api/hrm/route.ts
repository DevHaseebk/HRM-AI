import { NextResponse } from "next/server";
import { readData } from "@/lib/fake-db";
import type {
  Employee,
  AttendanceRecord,
  LeaveRecord,
  PayrollRecord,
  Job,
  Applicant,
  Announcement,
  PerformanceReview,
  CompanySettings,
} from "@/lib/types";

export async function GET() {
  try {
    const [
      employees,
      attendance,
      leaves,
      payroll,
      jobs,
      applicants,
      announcements,
      performanceReviews,
      settings,
    ] = await Promise.all([
      readData<Employee[]>("employees.json"),
      readData<AttendanceRecord[]>("attendance.json"),
      readData<LeaveRecord[]>("leaves.json"),
      readData<PayrollRecord[]>("payroll.json"),
      readData<Job[]>("jobs.json"),
      readData<Applicant[]>("applicants.json"),
      readData<Announcement[]>("announcements.json"),
      readData<PerformanceReview[]>("performance.json"),
      readData<CompanySettings>("settings.json"),
    ]);

    return NextResponse.json({
      employees,
      attendance,
      leaves,
      payroll,
      jobs,
      applicants,
      announcements,
      performanceReviews,
      settings,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load HR data" }, { status: 500 });
  }
}
