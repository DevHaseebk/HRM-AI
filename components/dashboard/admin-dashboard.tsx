"use client";

import {
  Briefcase,
  CalendarOff,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { AttendanceTrendChart } from "@/components/dashboard/charts/attendance-trend-chart";
import { DepartmentHeadcountChart } from "@/components/dashboard/charts/department-headcount-chart";
import { LeaveDistributionChart } from "@/components/dashboard/charts/leave-distribution-chart";
import { HiringAttritionChart } from "@/components/dashboard/charts/hiring-attrition-chart";
import { useHrmData } from "@/components/shared/hrm-data-provider";
import { formatPKR, getEmployeeName } from "@/lib/helpers";
import {
  getAttendanceTrend,
  getDepartmentHeadcount,
  getHiringVsAttrition,
  getLeaveDistribution,
} from "@/lib/dashboard-data";

export function AdminDashboard() {
  const { employees, attendance, leaves, payroll, jobs, applicants, announcements } =
    useHrmData();

  const activeEmployees = employees.filter((e) => e.status === "active");
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.filter((a) => a.date === today);
  const presentToday = todayAttendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const onLeave = leaves.filter(
    (l) => l.status === "approved" && l.startDate <= today && l.endDate >= today
  ).length;
  const openPositions = jobs.filter((j) => j.status === "open").length;
  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const newApplicants = applicants.filter(
    (a) => a.status === "applied" || a.status === "screening"
  ).length;
  const pendingApprovals = pendingLeaves.length + newApplicants;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const payrollThisMonth = payroll
    .filter((p) => p.month === currentMonth || p.month === lastMonth)
    .reduce((sum, p) => sum + p.netSalary, 0);

  const attendanceTrend = getAttendanceTrend(attendance, activeEmployees.length);
  const departmentHeadcount = getDepartmentHeadcount(employees);
  const leaveDistribution = getLeaveDistribution(leaves);
  const hiringAttrition = getHiringVsAttrition(employees);

  const recentActivities = buildRecentActivities({
    leaves,
    applicants,
    announcements,
    employees,
    jobs,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Employees"
          value={activeEmployees.length}
          icon={Users}
          accent="violet"
          trend={{ value: "+8.2%", positive: true }}
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          description={`of ${activeEmployees.length} active`}
          icon={UserCheck}
          accent="emerald"
          trend={{ value: "+1.4%", positive: true }}
        />
        <StatCard
          title="On Leave"
          value={onLeave}
          description="Approved leaves today"
          icon={CalendarOff}
          accent="amber"
        />
        <StatCard
          title="Open Positions"
          value={openPositions}
          description={`${applicants.length} applicants`}
          icon={Briefcase}
          accent="blue"
          trend={{ value: "+2", positive: true }}
        />
        <StatCard
          title="Payroll"
          value={formatPKR(payrollThisMonth)}
          description="This month"
          icon={Wallet}
          accent="indigo"
          trend={{ value: "+3.1%", positive: true }}
        />
        <StatCard
          title="Pending"
          value={pendingApprovals}
          description={`${pendingLeaves.length} leaves, ${newApplicants} new apps`}
          icon={ClipboardList}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttendanceTrendChart data={attendanceTrend} />
        <DepartmentHeadcountChart data={departmentHeadcount} />
        <LeaveDistributionChart data={leaveDistribution} />
        <HiringAttritionChart data={hiringAttrition} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <p className="text-xs text-muted-foreground">
                Leave requests awaiting your decision
              </p>
            </div>
            <Link
              href="/leaves"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-xs text-muted-foreground">
                  No pending approvals right now.
                </p>
              </div>
            ) : (
              pendingLeaves.slice(0, 5).map((leave) => {
                const name = getEmployeeName(employees, leave.employeeId);
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2);
                return (
                  <div
                    key={leave.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="capitalize">{leave.type}</span> leave ·{" "}
                        {leave.days} day{leave.days > 1 ? "s" : ""} ·{" "}
                        {leave.startDate}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Latest events across the organization
            </p>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-5">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <li key={activity.id} className="relative">
                    <span
                      className="absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background"
                      style={{ background: activity.color + "20", color: activity.color }}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <p className="text-sm font-medium leading-snug">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description} · {activity.date}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: typeof UserPlus;
  color: string;
}

function buildRecentActivities({
  leaves,
  applicants,
  announcements,
  employees,
  jobs,
}: {
  leaves: ReturnType<typeof useHrmData>["leaves"];
  applicants: ReturnType<typeof useHrmData>["applicants"];
  announcements: ReturnType<typeof useHrmData>["announcements"];
  employees: ReturnType<typeof useHrmData>["employees"];
  jobs: ReturnType<typeof useHrmData>["jobs"];
}): Activity[] {
  const activities: Activity[] = [];

  leaves
    .slice(-4)
    .reverse()
    .forEach((l) => {
      activities.push({
        id: `leave-${l.id}`,
        title: `${getEmployeeName(employees, l.employeeId)} requested ${l.type} leave`,
        description: `${l.days} day${l.days > 1 ? "s" : ""} starting ${l.startDate}`,
        date: l.appliedOn,
        icon: CalendarOff,
        color: "hsl(38 92% 50%)",
      });
    });

  applicants.slice(-3).forEach((a) => {
    const job = jobs.find((j) => j.id === a.jobId);
    activities.push({
      id: `app-${a.id}`,
      title: `New applicant: ${a.name}`,
      description: `Applied for ${job?.title ?? "a position"}`,
      date: a.appliedDate,
      icon: UserPlus,
      color: "hsl(220 90% 56%)",
    });
  });

  announcements.slice(0, 2).forEach((ann) => {
    activities.push({
      id: `ann-${ann.id}`,
      title: ann.title,
      description: `Posted by ${getEmployeeName(employees, ann.authorId)}`,
      date: ann.createdAt,
      icon: Megaphone,
      color: "hsl(262 83% 58%)",
    });
  });

  return activities
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
}
