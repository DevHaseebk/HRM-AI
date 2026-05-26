"use client";

import Link from "next/link";
import {
  CalendarDays,
  Download,
  FileText,
  Megaphone,
  Plane,
  Stethoscope,
  Sun,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { AttendanceCalendar } from "@/components/dashboard/attendance-calendar";
import { useHrmData } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { formatPKR } from "@/lib/helpers";
import {
  getCurrentMonthAttendanceCalendar,
  getLeaveBalance,
  type LeaveBalance,
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const leaveAccents: Record<
  LeaveBalance["type"],
  { icon: typeof Plane; bg: string; fg: string; bar: string }
> = {
  annual: {
    icon: Plane,
    bg: "from-blue-500/15 to-blue-500/5",
    fg: "text-blue-600",
    bar: "bg-blue-500",
  },
  sick: {
    icon: Stethoscope,
    bg: "from-rose-500/15 to-rose-500/5",
    fg: "text-rose-600",
    bar: "bg-rose-500",
  },
  casual: {
    icon: Sun,
    bg: "from-amber-500/15 to-amber-500/5",
    fg: "text-amber-600",
    bar: "bg-amber-500",
  },
};

export function EmployeeDashboard() {
  const user = useAuthUser();
  const { employees, attendance, leaves, payroll, announcements } = useHrmData();

  if (!user.employeeId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No employee profile linked to this account.
      </div>
    );
  }

  const me = employees.find((e) => e.id === user.employeeId);
  const today = new Date().toISOString().slice(0, 10);

  const myAttendance = attendance.filter((a) => a.employeeId === user.employeeId);
  const monthPrefix = today.slice(0, 7);
  const monthAttendance = myAttendance.filter((a) => a.date.startsWith(monthPrefix));
  const presentDays = monthAttendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const totalHours = monthAttendance.reduce((s, a) => s + a.hoursWorked, 0);

  const myLeaves = leaves.filter((l) => l.employeeId === user.employeeId);
  const upcomingLeaves = myLeaves
    .filter((l) => l.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const leaveBalances = getLeaveBalance(leaves, user.employeeId);

  const myPayslips = payroll
    .filter((p) => p.employeeId === user.employeeId)
    .sort((a, b) => b.month.localeCompare(a.month));
  const latestPayslip = myPayslips[0];

  const recentAnnouncements = [...announcements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const calendar = getCurrentMonthAttendanceCalendar(attendance, user.employeeId);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 dark:from-violet-950/30 dark:via-background dark:to-blue-950/30">
        <p className="text-sm text-muted-foreground">{formatDateLong(today)}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Welcome back, {me?.name.split(" ")[0] ?? user.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {me?.designation} · {me?.department}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <CalendarDays className="h-3 w-3" />
            {presentDays} days present this month
          </Badge>
          <Badge variant="secondary">{totalHours.toFixed(1)} hours logged</Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Leave Balance
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {leaveBalances.map((balance) => {
            const accent = leaveAccents[balance.type];
            const Icon = accent.icon;
            const pct = balance.total
              ? Math.round((balance.remaining / balance.total) * 100)
              : 0;
            return (
              <Card key={balance.type} className="relative overflow-hidden">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                    accent.bg
                  )}
                />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {balance.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight">
                        {balance.remaining}
                        <span className="text-base font-medium text-muted-foreground">
                          {" "}
                          / {balance.total}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        days remaining
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 ring-1 ring-border",
                        accent.fg
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>Used: {balance.used}</span>
                      <span>{pct}% left</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                      <div
                        className={cn("h-full rounded-full", accent.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AttendanceCalendar
            cells={calendar.cells}
            monthLabel={calendar.monthLabel}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Leaves</CardTitle>
              <p className="text-xs text-muted-foreground">Approved &amp; pending</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingLeaves.length === 0 ? (
                <div className="py-6 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">No upcoming leaves</p>
                  <Link
                    href="/leaves"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "mt-3",
                    })}
                  >
                    Request leave
                  </Link>
                </div>
              ) : (
                upcomingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">
                        {leave.type} leave · {leave.days}d
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {leave.startDate} → {leave.endDate}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {latestPayslip && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Latest Payslip</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatMonthLabel(latestPayslip.month)}
                  </p>
                </div>
                <StatusBadge status={latestPayslip.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-gradient-to-br from-violet-50 via-background to-blue-50 p-4 dark:from-violet-950/30 dark:to-blue-950/30">
                  <p className="text-xs text-muted-foreground">Net salary</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatPKR(latestPayslip.netSalary)}
                  </p>
                  {latestPayslip.paidOn && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paid on {latestPayslip.paidOn}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border p-2">
                    <p className="text-muted-foreground">Basic</p>
                    <p className="font-semibold">
                      {formatPKR(latestPayslip.basicSalary)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-muted-foreground">Allowance</p>
                    <p className="font-semibold text-emerald-600">
                      +{formatPKR(latestPayslip.allowances)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-muted-foreground">Deductions</p>
                    <p className="font-semibold text-rose-600">
                      −{formatPKR(latestPayslip.deductions)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/payroll"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "w-full",
                  })}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download payslip
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Recent Announcements</CardTitle>
            <p className="text-xs text-muted-foreground">
              Latest news from your organization
            </p>
          </div>
          <Link
            href="/announcements"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/40">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{ann.title}</p>
                  <StatusBadge status={ann.priority} />
                  <Badge variant="outline" className="text-[10px]">
                    {ann.department}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {ann.content}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {ann.createdAt}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthLabel(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
