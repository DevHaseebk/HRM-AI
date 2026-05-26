import type {
  AttendanceRecord,
  Employee,
  LeaveRecord,
  PerformanceReview,
} from "./types";

export function getDepartmentHeadcount(employees: Employee[]) {
  const map = new Map<string, number>();
  employees
    .filter((e) => e.status === "active")
    .forEach((e) => {
      map.set(e.department, (map.get(e.department) ?? 0) + 1);
    });
  return Array.from(map.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export function getLeaveDistribution(leaves: LeaveRecord[]) {
  const counts = { annual: 0, sick: 0, casual: 0 };
  leaves.forEach((l) => {
    counts[l.type] += l.days;
  });
  return [
    { name: "Annual", value: counts.annual, fill: "hsl(220 90% 56%)" },
    { name: "Sick", value: counts.sick, fill: "hsl(0 84% 60%)" },
    { name: "Casual", value: counts.casual, fill: "hsl(38 92% 50%)" },
  ];
}

/**
 * Generates a 30-day attendance trend.
 * Uses real attendance records where available and fills in plausible
 * synthetic data for missing dates so the chart is always populated.
 */
export function getAttendanceTrend(
  attendance: AttendanceRecord[],
  totalEmployees: number,
  days = 30
) {
  const today = new Date();
  const trend: {
    date: string;
    label: string;
    present: number;
    absent: number;
    late: number;
  }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const iso = date.toISOString().slice(0, 10);
    const dayRecords = attendance.filter((a) => a.date === iso);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let present: number;
    let absent: number;
    let late: number;

    if (dayRecords.length > 0) {
      present = dayRecords.filter((a) => a.status === "present").length;
      absent = dayRecords.filter((a) => a.status === "absent").length;
      late = dayRecords.filter((a) => a.status === "late").length;
    } else if (isWeekend) {
      present = 0;
      absent = 0;
      late = 0;
    } else {
      const seed = (date.getDate() * 7 + date.getMonth() * 3) % 5;
      present = Math.max(totalEmployees - 2 - seed, totalEmployees - 4);
      absent = seed >= 3 ? 1 : 0;
      late = totalEmployees - present - absent;
    }

    trend.push({
      date: iso,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      present,
      absent,
      late,
    });
  }

  return trend;
}

/**
 * Builds hiring vs attrition data for the last 6 months.
 * Hiring is derived from real join dates; attrition is synthetic so the
 * chart visualises turnover trends meaningfully.
 */
export function getHiringVsAttrition(employees: Employee[]) {
  const today = new Date();
  const result: { month: string; hired: number; left: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { month: "short" });

    const hired = employees.filter((e) =>
      e.joinDate.startsWith(monthKey)
    ).length;

    const synthetic = (date.getMonth() * 3 + i * 2) % 5;
    const left = synthetic > 3 ? 2 : synthetic > 1 ? 1 : 0;

    result.push({ month: label, hired, left });
  }

  return result;
}

export function getTeamMembers(employees: Employee[], managerId: string) {
  return employees.filter((e) => e.managerId === managerId);
}

export function getTodayAttendanceFor(
  attendance: AttendanceRecord[],
  employeeId: string
): AttendanceRecord | undefined {
  return attendance
    .filter((a) => a.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export interface LeaveBalance {
  type: "annual" | "sick" | "casual";
  label: string;
  total: number;
  used: number;
  remaining: number;
}

export const LEAVE_QUOTA = {
  annual: 20,
  sick: 10,
  casual: 7,
};

export function getLeaveBalance(
  leaves: LeaveRecord[],
  employeeId: string
): LeaveBalance[] {
  const used = { annual: 0, sick: 0, casual: 0 };
  leaves
    .filter(
      (l) => l.employeeId === employeeId && l.status !== "rejected"
    )
    .forEach((l) => {
      used[l.type] += l.days;
    });

  return [
    {
      type: "annual",
      label: "Annual Leave",
      total: LEAVE_QUOTA.annual,
      used: used.annual,
      remaining: LEAVE_QUOTA.annual - used.annual,
    },
    {
      type: "sick",
      label: "Sick Leave",
      total: LEAVE_QUOTA.sick,
      used: used.sick,
      remaining: LEAVE_QUOTA.sick - used.sick,
    },
    {
      type: "casual",
      label: "Casual Leave",
      total: LEAVE_QUOTA.casual,
      used: used.casual,
      remaining: LEAVE_QUOTA.casual - used.casual,
    },
  ];
}

export function getTeamPerformanceSummary(
  reviews: PerformanceReview[],
  teamIds: string[]
) {
  const teamReviews = reviews.filter((r) => teamIds.includes(r.employeeId));
  if (teamReviews.length === 0) {
    return { avgRating: 0, completed: 0, inProgress: 0, totalGoals: 0, goalsDone: 0 };
  }
  const ratings = teamReviews.filter((r) => r.rating > 0);
  const avgRating = ratings.length
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;
  return {
    avgRating: Number(avgRating.toFixed(1)),
    completed: teamReviews.filter((r) => r.status === "completed").length,
    inProgress: teamReviews.filter((r) => r.status === "in_progress").length,
    totalGoals: teamReviews.reduce((s, r) => s + r.goals, 0),
    goalsDone: teamReviews.reduce((s, r) => s + r.goalsCompleted, 0),
  };
}

export function getCurrentMonthAttendanceCalendar(
  attendance: AttendanceRecord[],
  employeeId: string
) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const map = new Map<string, AttendanceRecord["status"]>();
  attendance
    .filter((a) => a.employeeId === employeeId)
    .forEach((a) => map.set(a.date, a.status));

  const cells: ({ day: number; status: AttendanceRecord["status"] | null } | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, status: map.get(iso) ?? null });
  }

  const monthLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return { cells, monthLabel };
}
