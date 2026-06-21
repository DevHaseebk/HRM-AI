"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canManageEmployees } from "@/lib/auth";
import { getClientAuthHeaders } from "@/lib/company-scope";
import { formatPKR } from "@/lib/helpers";
import { createRecord, deleteRecordApi, exportToCsv, updateRecordApi } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import { useApiCall } from "@/hooks/useApiCall";
import type { CompanyRecord, Employee, Role } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const emptyEmployee = (): Omit<Employee, "id"> & { id?: string } => ({
  employeeCode: `PK-${Math.floor(1000 + Math.random() * 9000)}`,
  name: "",
  email: "",
  phone: "+92 300 ",
  department: "Engineering",
  designation: "Software Engineer",
  joinDate: new Date().toISOString().slice(0, 10),
  salary: 150000,
  status: "active",
  managerId: "emp003",
  location: "Karachi",
  gender: "Male",
});

export default function EmployeesPage() {
  const user = useAuthUser();
  const { employees, settings } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canManage = canManageEmployees(user.role);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<(Employee | (Omit<Employee, "id"> & { id?: string })) | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [accountRole, setAccountRole] = useState<Role>("employee");
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  useEffect(() => {
    if (user.role !== "super_admin") return;
    fetch("/api/companies", { headers: getClientAuthHeaders() })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  }, [user.role]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || e.department === deptFilter;
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const handleExport = () => {
    exportToCsv(
      "employees.csv",
      ["Code", "Name", "Email", "Department", "Designation", "Location", "Salary (PKR)", "Status"],
      filtered.map((e) => [
        e.employeeCode,
        e.name,
        e.email,
        e.department,
        e.designation,
        e.location,
        e.salary.toString(),
        e.status,
      ])
    );
  };

  const saveCall = useApiCall(async () => {
    if (!editEmployee) return;
    setError("");
    try {
      if ("id" in editEmployee && editEmployee.id) {
        await updateRecordApi<Employee>("employees", editEmployee.id, editEmployee);
        toast.success("Employee updated successfully");
      } else {
        const result = (await createRecord("employees", {
          ...editEmployee,
          role: accountRole,
          company_id: companyId || undefined,
          new_company_name: newCompanyName.trim() || undefined,
        })) as { message?: string };
        toast.success(result.message ?? "Employee created and credentials sent to email");
      }
      await refetch();
      setDialogOpen(false);
      setEditEmployee(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  });

  const deleteCall = useApiCall(async () => {
    if (!deleteId) return;
    try {
      await deleteRecordApi("employees", deleteId);
      await refetch();
      setDeleteId(null);
      toast.success("Employee deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  });

  const handleSave = () => {
    void saveCall.execute();
  };
  const handleDelete = () => {
    void deleteCall.execute();
  };
  const saving = saveCall.loading || deleteCall.loading;

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Employee Directory</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {employees.length} employees
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditEmployee(emptyEmployee());
                setAccountRole("employee");
                setCompanyId("");
                setNewCompanyName("");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, code..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={(v) => v && setDeptFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {settings.departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
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
                        <TableCell>{emp.employeeCode}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{emp.designation}</TableCell>
                        <TableCell>{emp.location}</TableCell>
                        <TableCell>{formatPKR(emp.salary)}</TableCell>
                        <TableCell><StatusBadge status={emp.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setViewEmployee(emp)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <>
                                <Button variant="ghost" size="icon-sm" onClick={() => { setEditEmployee({ ...emp }); setDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(emp.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={() => setViewEmployee(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Employee details</DialogTitle>
            {viewEmployee && (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                    {viewEmployee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold break-words">{viewEmployee.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {viewEmployee.designation} · {viewEmployee.department}
                  </p>
                  <StatusBadge status={viewEmployee.status} className="mt-1" />
                </div>
              </div>
            )}
          </DialogHeader>
          {viewEmployee && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailField label="Employee Code" value={viewEmployee.employeeCode} />
              <DetailField label="Email" value={viewEmployee.email} truncate />
              <DetailField label="Phone" value={viewEmployee.phone} />
              <DetailField label="Location" value={viewEmployee.location} />
              <DetailField label="Join Date" value={viewEmployee.joinDate} />
              <DetailField label="Salary" value={formatPKR(viewEmployee.salary)} />
              <DetailField label="Gender" value={viewEmployee.gender} />
              <DetailField label="Status" value={viewEmployee.status} capitalize />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEmployee && "id" in editEmployee && editEmployee.id ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <div className="grid gap-3 sm:grid-cols-2">
              {user.role === "super_admin" && !("id" in editEmployee && editEmployee.id) && (
                <>
                  <div className="space-y-1.5">
                    <Label>Account Role</Label>
                    <Select value={accountRole} onValueChange={(value) => value && setAccountRole(value as Role)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="company_admin">Company Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Select value={companyId} onValueChange={(value) => value && setCompanyId(value)}>
                      <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {accountRole === "company_admin" && !companyId && (
                    <div className="sm:col-span-2">
                      <Field label="Or Create New Company" value={newCompanyName} onChange={setNewCompanyName} />
                    </div>
                  )}
                </>
              )}
              <Field label="Full Name" value={editEmployee.name} onChange={(v) => setEditEmployee({ ...editEmployee, name: v })} />
              <Field label="Email" value={editEmployee.email} onChange={(v) => setEditEmployee({ ...editEmployee, email: v })} />
              <Field label="Phone" value={editEmployee.phone} onChange={(v) => setEditEmployee({ ...editEmployee, phone: v })} />
              <Field label="Employee Code" value={editEmployee.employeeCode} onChange={(v) => setEditEmployee({ ...editEmployee, employeeCode: v })} />
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={editEmployee.department} onValueChange={(v) => v && setEditEmployee({ ...editEmployee, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{settings.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={editEmployee.designation} onValueChange={(v) => v && setEditEmployee({ ...editEmployee, designation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{settings.designations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select value={editEmployee.location} onValueChange={(v) => v && setEditEmployee({ ...editEmployee, location: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{settings.locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Salary (PKR)" type="number" value={String(editEmployee.salary)} onChange={(v) => setEditEmployee({ ...editEmployee, salary: Number(v) })} />
              <Field label="Join Date" type="date" value={editEmployee.joinDate} onChange={(v) => setEditEmployee({ ...editEmployee, joinDate: v })} />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editEmployee.status} onValueChange={(v) => v && setEditEmployee({ ...editEmployee, status: v as Employee["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DetailField({
  label,
  value,
  truncate,
  capitalize,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1 rounded-lg border bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        title={truncate ? value : undefined}
        className={cn(
          "text-sm font-medium",
          truncate ? "truncate" : "break-words",
          capitalize && "capitalize"
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}
