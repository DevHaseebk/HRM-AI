"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Wallet } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canViewAllPayroll } from "@/lib/auth";
import { formatPKR, getEmployeeName } from "@/lib/helpers";
import { createRecord, currentMonthISO, updateRecordApi } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import type { PayrollRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function PayrollPage() {
  const user = useAuthUser();
  const { employees, payroll } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canManage = canViewAllPayroll(user.role);

  const [monthFilter, setMonthFilter] = useState(currentMonthISO());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    month: currentMonthISO(),
    basicSalary: 150000,
    allowances: 20000,
    deductions: 8000,
  });

  const months = useMemo(() => {
    const set = new Set(payroll.map((p) => p.month));
    set.add(currentMonthISO());
    return Array.from(set).sort().reverse();
  }, [payroll]);

  const filtered = useMemo(() => {
    let records = payroll.filter((p) => p.month === monthFilter);
    if (!canManage && user.employeeId) {
      records = records.filter((p) => p.employeeId === user.employeeId);
    }
    return records;
  }, [payroll, monthFilter, canManage, user.employeeId]);

  const totalDisbursed = filtered
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.netSalary, 0);

  const handleGenerate = async () => {
    if (!form.employeeId) return;
    setSaving(true);
    try {
      const net = form.basicSalary + form.allowances - form.deductions;
      await createRecord("payroll", {
        employeeId: form.employeeId,
        month: form.month,
        basicSalary: form.basicSalary,
        allowances: form.allowances,
        deductions: form.deductions,
        netSalary: net,
        status: "processing",
      });
      await refetch();
      setGenerateOpen(false);
      toast.success("Payslip generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate payslip");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (record: PayrollRecord) => {
    try {
      await updateRecordApi<PayrollRecord>("payroll", record.id, { status: "paid" });
      await refetch();
      toast.success("Marked as paid");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payroll");
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payroll</h2>
          <p className="text-sm text-muted-foreground">Salaries in PKR · Monthly processing</p>
        </div>
        <div className="flex gap-2">
          <Select value={monthFilter} onValueChange={(v) => v && setMonthFilter(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Generate Payslip
            </Button>
          )}
        </div>
      </div>

      {canManage && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Total Disbursed" value={formatPKR(totalDisbursed)} icon={Wallet} accent="emerald" />
          <StatCard title="Records" value={filtered.length} icon={FileText} accent="blue" />
          <StatCard title="Processing" value={filtered.filter((p) => p.status === "processing").length} icon={Wallet} accent="amber" />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <EmptyState icon={Wallet} title="No payroll records" description={`No payroll data for ${formatMonth(monthFilter)}.`} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{getEmployeeName(employees, record.employeeId)}</TableCell>
                    <TableCell>{formatMonth(record.month)}</TableCell>
                    <TableCell>{formatPKR(record.basicSalary)}</TableCell>
                    <TableCell className="text-emerald-600">+{formatPKR(record.allowances)}</TableCell>
                    <TableCell className="text-rose-600">−{formatPKR(record.deductions)}</TableCell>
                    <TableCell className="font-semibold">{formatPKR(record.netSalary)}</TableCell>
                    <TableCell><StatusBadge status={record.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setPayslipRecord(record)}>
                          View
                        </Button>
                        {canManage && record.status === "processing" && (
                          <Button size="sm" className="h-7" onClick={() => handleMarkPaid(record)}>Mark Paid</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Payslip Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Payslip</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => {
                if (!v) return;
                const emp = employees.find((e) => e.id === v);
                setForm({ ...form, employeeId: v, basicSalary: emp?.salary ?? 150000 });
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.status === "active").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Month</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Basic (PKR)</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Allowances</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Net Salary: </span>
              <span className="font-bold">{formatPKR(form.basicSalary + form.allowances - form.deductions)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={saving || !form.employeeId}>{saving ? "Generating..." : "Generate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Breakdown Dialog */}
      <Dialog open={!!payslipRecord} onOpenChange={() => setPayslipRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip — {payslipRecord && getEmployeeName(employees, payslipRecord.employeeId)}</DialogTitle>
          </DialogHeader>
          {payslipRecord && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{formatMonth(payslipRecord.month)}</p>
                <p className="mt-1 text-3xl font-bold">{formatPKR(payslipRecord.netSalary)}</p>
                <StatusBadge status={payslipRecord.status} className="mt-2" />
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <Row label="Basic Salary" value={formatPKR(payslipRecord.basicSalary)} />
                <Row label="Allowances" value={`+${formatPKR(payslipRecord.allowances)}`} className="text-emerald-600" />
                <Row label="Deductions" value={`−${formatPKR(payslipRecord.deductions)}`} className="text-rose-600" />
                <Separator />
                <Row label="Net Payable" value={formatPKR(payslipRecord.netSalary)} bold />
                {payslipRecord.paidOn && (
                  <p className="text-xs text-muted-foreground">Paid on {payslipRecord.paidOn}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function Row({ label, value, className, bold }: { label: string; value: string; className?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : className}>{value}</span>
    </div>
  );
}
