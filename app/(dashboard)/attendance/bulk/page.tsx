"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, Save } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { useAuthUser } from "@/components/shared/auth-provider";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useToast } from "@/components/shared/toast-provider";
import { usePermissions } from "@/components/shared/permissions-provider";
import { canManageEmployees, getTeamMemberIds } from "@/lib/auth";
import { getClientAuthHeaders } from "@/lib/company-scope";
import { todayISO } from "@/lib/hrm-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Status = "present" | "absent" | "late" | "half_day" | "wfh";

interface RowState {
  status: Status;
  checkIn: string;
}

export default function BulkAttendancePage() {
  const user = useAuthUser();
  const { employees, attendance } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const { can } = usePermissions();
  const canEditAttendance = can("attendance", "edit");
  const isHr = canManageEmployees(user.role);

  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const visibleEmployees = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    if (user.role === "team_lead" && user.employeeId) {
      const teamIds = getTeamMemberIds(active, user.employeeId);
      teamIds.push(user.employeeId);
      return active.filter((e) => teamIds.includes(e.id));
    }
    return active;
  }, [employees, user]);

  useEffect(() => {
    const next: Record<string, RowState> = {};
    visibleEmployees.forEach((emp) => {
      const existing = attendance.find((a) => a.employeeId === emp.id && a.date === date);
      next[emp.id] = {
        status: ((existing?.status as Status | undefined) ?? "present"),
        checkIn: existing?.checkIn ?? "09:00",
      };
    });
    setRows(next);
  }, [visibleEmployees, attendance, date]);

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const selectAllPresent = () => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      Object.keys(prev).forEach((id) => {
        next[id] = { ...prev[id], status: "present" };
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = visibleEmployees.map((emp) => ({
        employee_id: emp.id,
        status: rows[emp.id]?.status ?? "present",
        check_in_time:
          rows[emp.id]?.status === "absent" ? null : rows[emp.id]?.checkIn ?? null,
      }));

      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          date,
          records,
          marked_by: "hr_override",
          override_note: `Manual override by ${user.name}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Bulk save failed");
      toast.success(json.message ?? `${json.count} employees marked successfully`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch("/api/attendance/reminder", { method: "POST", headers: getClientAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send reminders");
      toast.success(json.message ?? `Reminders sent to ${json.count} employees`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bulk Mark Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Mark attendance for {visibleEmployees.length} employees at once
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          {canEditAttendance && <Button variant="outline" size="sm" onClick={selectAllPresent}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Select All Present
          </Button>}
          {isHr && canEditAttendance && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReminders}
              disabled={sendingReminders}
              className="text-amber-700"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              {sendingReminders ? "Sending..." : "Send Reminders"}
            </Button>
          )}
          {canEditAttendance && <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Saving..." : "Mark All"}
          </Button>}
        </div>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Attendance saved here bypasses location restrictions and is recorded as a manual override by {user.name}.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{visibleEmployees.length} Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-[200px]">Status</TableHead>
                  <TableHead className="w-[140px]">Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEmployees.map((emp) => {
                  const row = rows[emp.id] ?? { status: "present" as Status, checkIn: "09:00" };
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
                        <Select
                          value={row.status}
                          onValueChange={(v) => v && updateRow(emp.id, { status: v as Status })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="half_day">Half Day</SelectItem>
                            <SelectItem value="wfh">Work From Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.checkIn}
                          onChange={(e) => updateRow(emp.id, { checkIn: e.target.value })}
                          disabled={row.status === "absent"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
