"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  AlertTriangle,
  Users,
  XCircle,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { useToast } from "@/components/shared/toast-provider";
import { canManageEmployees, getTeamMemberIds } from "@/lib/auth";
import { getClientAuthHeaders } from "@/lib/company-scope";
import { getEmployeeName } from "@/lib/helpers";
import { todayISO } from "@/lib/hrm-api";
import type { AttendanceRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendancePage() {
  const user = useAuthUser();
  const { employees, attendance, settings } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const isAdmin = canManageEmployees(user.role);
  const isTeamLead = user.role === "team_lead";
  const today = todayISO();

  const defaultTab =
    user.role === "employee"
      ? "my"
      : isAdmin
        ? "all"
        : "team";

  const visibleEmployees = useMemo(() => {
    if (user.role === "employee" && user.employeeId) {
      return employees.filter((e) => e.id === user.employeeId);
    }
    if (isTeamLead && user.employeeId) {
      const teamIds = getTeamMemberIds(employees, user.employeeId);
      teamIds.push(user.employeeId);
      return employees.filter((e) => teamIds.includes(e.id));
    }
    return employees;
  }, [employees, user, isTeamLead]);

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Office hours {settings.company.officeHours} PKT · {today}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "employee" && user.employeeId && (
            <Link
              href="/attendance/qr"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              <QrCode className="mr-1.5 h-4 w-4" /> My QR Code
            </Link>
          )}
          {(isTeamLead || isAdmin) && (
            <Link
              href="/attendance/bulk"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Users className="mr-1.5 h-4 w-4" /> Bulk Mark
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="my">My Attendance</TabsTrigger>
          {(isTeamLead || isAdmin) && (
            <TabsTrigger value="team">Team Attendance</TabsTrigger>
          )}
          {isAdmin && <TabsTrigger value="all">All Attendance</TabsTrigger>}
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <MyAttendanceTab
            user={user}
            attendance={attendance}
            refetch={refetch}
            toast={toast}
          />
        </TabsContent>

        {(isTeamLead || isAdmin) && (
          <TabsContent value="team" className="mt-4">
            <TeamAttendanceTab
              employees={visibleEmployees}
              attendance={attendance}
              date={today}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="all" className="mt-4">
            <AllAttendanceTab employees={employees} attendance={attendance} />
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}

/* -------------------- My Attendance -------------------- */

function MyAttendanceTab({
  user,
  attendance,
  refetch,
  toast,
}: {
  user: { employeeId: string | null };
  attendance: AttendanceRecord[];
  refetch: () => Promise<void>;
  toast: { success: (m: string) => void; error: (m: string) => void };
}) {
  const today = todayISO();
  const [acting, setActing] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationDeniedOpen, setLocationDeniedOpen] = useState(false);
  const [feedback, setFeedback] = useState<
    | { type: "success"; message: string; checkInTime: string }
    | { type: "range"; distance: number; radius: number }
    | null
  >(null);

  const myAttendance = useMemo(
    () => attendance.filter((a) => a.employeeId === user.employeeId),
    [attendance, user.employeeId]
  );

  const todayRecord = myAttendance.find((a) => a.date === today);
  const month = today.slice(0, 7);
  const thisMonth = myAttendance.filter((a) => a.date.startsWith(month));
  const present = thisMonth.filter((a) => a.status === "present").length;
  const late = thisMonth.filter((a) => a.status === "late").length;
  const absent = thisMonth.filter((a) => a.status === "absent").length;
  const onLeave = thisMonth.filter((a) => a.status === "on_leave").length;

  const submitCheckIn = async (latitude: number, longitude: number) => {
    if (!user.employeeId) return;
    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({ employee_id: user.employeeId, latitude, longitude }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "OUTSIDE_OFFICE_RANGE") {
          setFeedback({ type: "range", distance: Number(json.distance), radius: Number(json.radius) });
          return;
        }
        throw new Error(json.error ?? "Check-in failed");
      }
      setFeedback({ type: "success", message: json.message ?? "Checked in", checkInTime: json.checkInTime });
      toast.success(json.message ?? "Checked in");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActing(false);
      setGettingLocation(false);
    }
  };

  const handleCheckIn = () => {
    if (!user.employeeId || acting) return;
    setFeedback(null);
    setActing(true);
    setGettingLocation(true);

    if (!navigator.geolocation) {
      setLocationDeniedOpen(true);
      setActing(false);
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => void submitCheckIn(position.coords.latitude, position.coords.longitude),
      () => {
        setLocationDeniedOpen(true);
        setActing(false);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCheckOut = async () => {
    if (!user.employeeId) return;
    setActing(true);
    try {
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({ employee_id: user.employeeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check-out failed");
      toast.success(json.message ?? "Checked out");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setActing(false);
    }
  };

  if (!user.employeeId) {
    return (
      <EmptyState
        icon={Clock}
        title="Not linked to an employee record"
        description="Ask your HR to link your user account to an employee."
      />
    );
  }

  const checkInDone = !!todayRecord?.checkIn;
  const checkOutDone = !!todayRecord?.checkOut;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
            <p className="text-lg font-semibold">
              {new Date(today).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">Check-in:</span>{" "}
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {todayRecord?.checkIn ?? "—"}
                  {todayRecord?.checkIn && <LocationPin record={todayRecord} />}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Check-out:</span>{" "}
                <span className="font-medium">{todayRecord?.checkOut ?? "—"}</span>
              </span>
              {todayRecord?.hoursWorked ? (
                <span>
                  <span className="text-muted-foreground">Hours:</span>{" "}
                  <span className="font-medium">{todayRecord.hoursWorked}h</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            {!checkInDone && (
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={acting}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {gettingLocation ? "Getting your location..." : acting ? "Checking in..." : "Check In"}
              </Button>
            )}
            {checkInDone && !checkOutDone && (
              <Button
                size="lg"
                onClick={handleCheckOut}
                disabled={acting}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {acting ? "Checking out..." : "Check Out"}
              </Button>
            )}
            {checkInDone && checkOutDone && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Day complete
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {feedback?.type === "range" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">You are outside office range!</p>
              <p className="mt-1 text-sm">Your location: {feedback.distance}m from office</p>
              <p className="text-sm">Required: within {feedback.radius}m</p>
              <p className="mt-2 text-sm">Please check in from the office.</p>
            </div>
          </div>
        </div>
      )}

      {feedback?.type === "success" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold">{feedback.message}</p>
          </div>
          <p className="mt-1 text-sm">
            Check-in time: {new Date(feedback.checkInTime).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard title="Present" value={present} icon={CheckCircle2} accent="emerald" />
        <StatCard title="Late" value={late} icon={Clock} accent="amber" />
        <StatCard title="Absent" value={absent} icon={XCircle} accent="rose" />
        <StatCard title="On Leave" value={onLeave} icon={CalendarDays} accent="blue" />
      </div>

      <MyCalendar attendance={myAttendance} />

      <Dialog open={locationDeniedOpen} onOpenChange={setLocationDeniedOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Location access required</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Location access is required for check-in. Please enable location permissions in your browser settings.
          </p>
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
            <p><strong>Chrome:</strong> Click the lock icon in the address bar, open Site settings, and allow Location.</p>
            <p><strong>Firefox:</strong> Click the permissions icon beside the address bar and allow Location.</p>
            <p><strong>Safari:</strong> Open Settings for This Website and set Location to Allow.</p>
          </div>
          <DialogFooter><Button onClick={() => setLocationDeniedOpen(false)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyCalendar({ attendance }: { attendance: AttendanceRecord[] }) {
  const today = todayISO();
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDay = new Date(y, m - 1, 1).getDay();
  const monthKey = today.slice(0, 7);

  const map = new Map<string, AttendanceRecord["status"]>();
  attendance
    .filter((a) => a.date.startsWith(monthKey))
    .forEach((a) => map.set(a.date, a.status));

  const cells: ({ day: number; status: AttendanceRecord["status"] | null } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${monthKey}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, status: map.get(iso) ?? null });
  }

  const monthLabel = new Date(monthKey + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{monthLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          <LegendDot color="bg-emerald-100" label="Present (P)" />
          <LegendDot color="bg-amber-100" label="Late (L)" />
          <LegendDot color="bg-rose-100" label="Absent (A)" />
          <LegendDot color="bg-blue-100" label="Leave (H)" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} />;
            const letter =
              cell.status === "present"
                ? "P"
                : cell.status === "late"
                  ? "L"
                  : cell.status === "absent"
                    ? "A"
                    : cell.status === "on_leave"
                      ? "H"
                      : "";
            return (
              <div
                key={cell.day}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  cell.status === "present" && "bg-emerald-100 text-emerald-700",
                  cell.status === "late" && "bg-amber-100 text-amber-700",
                  cell.status === "absent" && "bg-rose-100 text-rose-700",
                  cell.status === "on_leave" && "bg-blue-100 text-blue-700",
                  !cell.status && "bg-muted/40 text-muted-foreground"
                )}
              >
                <span className="text-sm font-semibold">{cell.day}</span>
                {letter && <span className="text-[9px] font-bold">{letter}</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

/* -------------------- Team Attendance -------------------- */

function TeamAttendanceTab({
  employees,
  attendance,
  date,
}: {
  employees: { id: string; name: string; email: string; department: string }[];
  attendance: AttendanceRecord[];
  date: string;
}) {
  const todayRecords = attendance.filter((a) => a.date === date);
  const presentCount = todayRecords.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Team Size"
          value={employees.length}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Present Today"
          value={presentCount}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          title="Not Marked"
          value={employees.length - todayRecords.length}
          icon={Clock}
          accent="amber"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s Team Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState icon={Users} title="No team members" description="Your team has no members." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const rec = todayRecords.find((r) => r.employeeId === emp.id);
                    const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          {rec ? <StatusBadge status={rec.status} /> : (
                            <span className="text-xs text-muted-foreground">Not marked</span>
                          )}
                        </TableCell>
                        <TableCell><span className="inline-flex items-center gap-1.5">{rec?.checkIn ?? "—"}{rec?.checkIn && <LocationPin record={rec} />}</span></TableCell>
                        <TableCell>{rec?.checkOut ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- All Attendance -------------------- */

function AllAttendanceTab({
  employees,
  attendance,
}: {
  employees: { id: string; name: string; email: string; department: string }[];
  attendance: AttendanceRecord[];
}) {
  const [from, setFrom] = useState(todayISO().slice(0, 7) + "-01");
  const [to, setTo] = useState(todayISO());
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
    [employees]
  );

  const filtered = useMemo(() => {
    return attendance.filter((a) => {
      if (a.date < from || a.date > to) return false;
      if (employeeFilter !== "all" && a.employeeId !== employeeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (deptFilter !== "all") {
        const emp = employees.find((e) => e.id === a.employeeId);
        if (emp?.department !== deptFilter) return false;
      }
      return true;
    });
  }, [attendance, employees, from, to, employeeFilter, deptFilter, statusFilter]);

  const present = filtered.filter((a) => a.status === "present").length;
  const late = filtered.filter((a) => a.status === "late").length;
  const absent = filtered.filter((a) => a.status === "absent").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={employeeFilter} onValueChange={(v) => v && setEmployeeFilter(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Select value={deptFilter} onValueChange={(v) => v && setDeptFilter(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard title="Total" value={filtered.length} icon={Clock} accent="violet" />
        <StatCard title="Present" value={present} icon={CheckCircle2} accent="emerald" />
        <StatCard title="Late" value={late} icon={Clock} accent="amber" />
        <StatCard title="Absent" value={absent} icon={XCircle} accent="rose" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No records"
              description="No attendance records match the filters."
              action={{ label: "Bulk mark attendance", onClick: () => (window.location.href = "/attendance/bulk") }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{getEmployeeName(employees, r.employeeId)}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-1.5">{r.checkIn ?? "—"}{r.checkIn && <LocationPin record={r} />}</span></TableCell>
                      <TableCell>{r.checkOut ?? "—"}</TableCell>
                      <TableCell>{r.hoursWorked}h</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LocationPin({ record }: { record: AttendanceRecord }) {
  const isOverride = record.markedBy === "hr_override";
  const tooltip = record.distanceFromOffice == null
    ? isOverride
      ? record.overrideNote ?? "Manual HR override"
      : "Location not recorded"
    : `Checked in from: ${Math.round(record.distanceFromOffice)}m from office`;

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-help">
        <MapPin className={cn("h-3.5 w-3.5", isOverride ? "text-red-500" : "text-emerald-600")} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
