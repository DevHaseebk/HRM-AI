"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Plus, X } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canApproveLeaves, getTeamMemberIds } from "@/lib/auth";
import { getEmployeeName } from "@/lib/helpers";
import { createRecord, updateRecordApi, daysBetween } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import { useApiCall } from "@/hooks/useApiCall";
import type { LeaveRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function LeavesPage() {
  const user = useAuthUser();
  const { employees, leaves } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canApprove = canApproveLeaves(user.role);

  const [applyOpen, setApplyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "annual" as LeaveRecord["type"],
    startDate: "",
    endDate: "",
    reason: "",
  });

  const myLeaves = useMemo(
    () => leaves.filter((l) => l.employeeId === user.employeeId),
    [leaves, user.employeeId]
  );

  const teamLeaves = useMemo(() => {
    if (!user.employeeId) return [];
    const teamIds = getTeamMemberIds(employees, user.employeeId);
    return leaves.filter((l) => teamIds.includes(l.employeeId));
  }, [leaves, employees, user.employeeId]);

  const handleApply = async () => {
    if (!user.employeeId || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      await createRecord("leaves", {
        employeeId: user.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        status: "pending",
      });
      await refetch();
      setApplyOpen(false);
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" });
      toast.success("Leave request submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave");
    } finally {
      setSaving(false);
    }
  };

  const decisionCall = useApiCall(
    async (leave: LeaveRecord, status: "approved" | "rejected") => {
      try {
        await updateRecordApi<LeaveRecord>("leaves", leave.id, {
          status,
          approvedBy: user.employeeId,
        });
        await refetch();
        toast.success(`Leave ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update leave");
        throw err;
      }
    }
  );

  const handleDecision = (leave: LeaveRecord, status: "approved" | "rejected") => {
    void decisionCall.execute(leave, status);
  };

  const defaultTab =
    user.role === "employee" ? "my" : user.role === "team_lead" ? "team" : "all";

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Leave Management</h2>
          <p className="text-sm text-muted-foreground">
            Annual · Sick · Casual leave types
          </p>
        </div>
        {user.employeeId && (
          <Button size="sm" onClick={() => setApplyOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Apply Leave
          </Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="my">My Leaves ({myLeaves.length})</TabsTrigger>
          {(user.role === "team_lead" || user.role === "super_admin" || user.role === "hr_manager") && (
            <TabsTrigger value="team">Team Leaves ({teamLeaves.length})</TabsTrigger>
          )}
          {(user.role === "super_admin" || user.role === "hr_manager") && (
            <TabsTrigger value="all">All Leaves ({leaves.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <LeaveTable
            leaves={myLeaves}
            employees={employees}
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <LeaveTable
            leaves={teamLeaves}
            employees={employees}
            showActions={canApprove}
            onApprove={(l) => handleDecision(l, "approved")}
            onReject={(l) => handleDecision(l, "rejected")}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <LeaveTable
            leaves={leaves}
            employees={employees}
            showActions={canApprove}
            onApprove={(l) => handleDecision(l, "approved")}
            onReject={(l) => handleDecision(l, "rejected")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as LeaveRecord["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            {form.startDate && form.endDate && (
              <Badge variant="secondary">
                {daysBetween(form.startDate, form.endDate)} day(s)
              </Badge>
            )}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea placeholder="Reason for leave..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={saving || !form.startDate || !form.endDate}>
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function LeaveTable({
  leaves,
  employees,
  showActions,
  onApprove,
  onReject,
}: {
  leaves: LeaveRecord[];
  employees: { id: string; name: string }[];
  showActions: boolean;
  onApprove?: (l: LeaveRecord) => void;
  onReject?: (l: LeaveRecord) => void;
}) {
  if (leaves.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState icon={CalendarDays} title="No leave records" description="No leave requests in this view." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave.id}>
                <TableCell className="font-medium">{getEmployeeName(employees, leave.employeeId)}</TableCell>
                <TableCell className="capitalize">{leave.type}</TableCell>
                <TableCell>{leave.startDate}</TableCell>
                <TableCell>{leave.endDate}</TableCell>
                <TableCell>{leave.days}</TableCell>
                <TableCell className="max-w-[180px] truncate">{leave.reason}</TableCell>
                <TableCell><StatusBadge status={leave.status} /></TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {leave.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => onApprove?.(leave)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => onReject?.(leave)}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
