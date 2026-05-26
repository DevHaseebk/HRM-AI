"use client";

import Link from "next/link";
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Star,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeamWeekAttendanceChart } from "@/components/dashboard/charts/team-week-attendance-chart";
import { useHrmData } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import {
  getTeamMembers,
  getTeamPerformanceSummary,
  getTodayAttendanceFor,
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function TeamLeadDashboard() {
  const user = useAuthUser();
  const { employees, attendance, leaves, performanceReviews } = useHrmData();

  if (!user.employeeId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No team data available for this account.
      </div>
    );
  }

  const team = getTeamMembers(employees, user.employeeId);
  const teamIds = team.map((m) => m.id);
  const teamLeadEmployee = employees.find((e) => e.id === user.employeeId);

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.filter((a) => a.date === today);

  const presentToday = team.filter((m) => {
    const rec = todayAttendance.find((a) => a.employeeId === m.id);
    return rec && (rec.status === "present" || rec.status === "late");
  }).length;

  const teamPendingLeaves = leaves.filter(
    (l) => teamIds.includes(l.employeeId) && l.status === "pending"
  );

  const perf = getTeamPerformanceSummary(performanceReviews, teamIds);
  const weekData = buildWeekData(attendance, teamIds);
  const goalProgress = perf.totalGoals
    ? Math.round((perf.goalsDone / perf.totalGoals) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-blue-50 p-5 dark:from-violet-950/30 dark:to-blue-950/30">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h2 className="text-2xl font-bold tracking-tight">
          {teamLeadEmployee?.name ?? user.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re leading {team.length} team member{team.length !== 1 ? "s" : ""} ·{" "}
          {teamLeadEmployee?.department}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Team Size"
          value={team.length}
          icon={Users}
          accent="violet"
        />
        <StatCard
          title="Present Today"
          value={`${presentToday}/${team.length}`}
          icon={UserCheck}
          accent="emerald"
          description="Including on-time and late"
        />
        <StatCard
          title="Pending Leaves"
          value={teamPendingLeaves.length}
          icon={ClipboardList}
          accent="amber"
          description="Awaiting your approval"
        />
        <StatCard
          title="Avg. Rating"
          value={perf.avgRating ? `${perf.avgRating}/5` : "—"}
          icon={Award}
          accent="indigo"
          description={`${perf.completed} review${perf.completed !== 1 ? "s" : ""} completed`}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team Attendance Today</CardTitle>
          <p className="text-xs text-muted-foreground">{formatDateLong(today)}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.map((member) => {
              const rec = getTodayAttendanceFor(
                attendance.filter((a) => a.date === today),
                member.id
              );
              const status = rec?.status ?? "absent";
              const initials = member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);
              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-sm"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                        status === "present" && "bg-emerald-500",
                        status === "late" && "bg-amber-500",
                        status === "on_leave" && "bg-blue-500",
                        status === "absent" && "bg-rose-500"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.designation}
                    </p>
                    {rec?.checkIn ? (
                      <p className="text-[11px] text-muted-foreground">
                        In: {rec.checkIn}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No check-in</p>
                    )}
                  </div>
                  <StatusBadge status={status} className="shrink-0 text-[10px]" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TeamWeekAttendanceChart data={weekData} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Performance</CardTitle>
            <p className="text-xs text-muted-foreground">Snapshot of current cycle</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-transparent p-3 dark:from-indigo-950/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-indigo-500" /> Avg Rating
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {perf.avgRating ? perf.avgRating.toFixed(1) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">out of 5.0</p>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-transparent p-3 dark:from-emerald-950/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5 text-emerald-500" /> Goals
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {perf.goalsDone}
                  <span className="text-sm text-muted-foreground">/{perf.totalGoals}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">completed</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Goal completion</span>
                <span className="font-medium">{goalProgress}%</span>
              </div>
              <Progress value={goalProgress} className="h-2" />
            </div>

            <div className="flex gap-2 text-xs">
              <div className="flex-1 rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/30">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {perf.completed}
                </p>
                <p className="text-muted-foreground">Completed</p>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/30">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {perf.inProgress}
                </p>
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Pending Leave Approvals</CardTitle>
            <p className="text-xs text-muted-foreground">From your team members</p>
          </div>
          <Link
            href="/leaves"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {teamPendingLeaves.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">No pending approvals</p>
              <p className="text-xs text-muted-foreground">
                Your team is all set.
              </p>
            </div>
          ) : (
            teamPendingLeaves.map((leave) => {
              const member = employees.find((e) => e.id === leave.employeeId);
              const initials = (member?.name ?? "")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);
              return (
                <div
                  key={leave.id}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{member?.name}</p>
                      <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs capitalize text-muted-foreground">
                        {leave.type} · {leave.days}d
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {leave.startDate} → {leave.endDate} · {leave.reason}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                      Reject
                    </Button>
                    <Button size="sm" className="h-7 px-2 text-xs">
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildWeekData(
  attendance: ReturnType<typeof useHrmData>["attendance"],
  teamIds: string[]
) {
  const today = new Date();
  const data: { day: string; present: number; late: number; absent: number }[] =
    [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const iso = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    const recs = attendance.filter(
      (a) => a.date === iso && teamIds.includes(a.employeeId)
    );
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let present = recs.filter((a) => a.status === "present").length;
    let late = recs.filter((a) => a.status === "late").length;
    let absent = recs.filter((a) => a.status === "absent").length;

    if (recs.length === 0 && !isWeekend && teamIds.length > 0) {
      const seed = (date.getDate() + i) % 4;
      present = Math.max(teamIds.length - 1 - (seed > 2 ? 1 : 0), teamIds.length - 2);
      late = seed > 1 ? 1 : 0;
      absent = teamIds.length - present - late;
    }

    data.push({ day: label, present, late, absent });
  }
  return data;
}
