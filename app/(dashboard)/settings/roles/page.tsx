"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Save, ShieldCheck, Users } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { useAuthUser } from "@/components/shared/auth-provider";
import { usePermissions } from "@/components/shared/permissions-provider";
import { useToast } from "@/components/shared/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientAuthHeaders } from "@/lib/company-scope";
import {
  MODULE_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  mergePermissions,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: Role[] = [
  "super_admin",
  "company_admin",
  "hr_manager",
  "team_lead",
  "employee",
];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full system access. Can manage all companies and system settings.",
  company_admin: "Full access to their company. Cannot access other companies.",
  hr_manager: "Manages HR operations. Cannot delete employees or access system settings.",
  team_lead: "Manages their team attendance and leaves. Read-only access to other modules.",
  employee: "Self-service access. Can view own data, apply leaves, mark attendance.",
};

const ROLE_STYLES: Record<Role, string> = {
  super_admin: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  company_admin: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
  hr_manager: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  team_lead: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  employee: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

export default function RolesPermissionsPage() {
  const user = useAuthUser();
  const { permissions, userCounts, warning, replacePermissions } = usePermissions();
  const toast = useToast();
  const matrixRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(() => mergePermissions(permissions));
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(mergePermissions(permissions));
  }, [permissions]);

  const editableRoles = useMemo<Role[]>(
    () => user.role === "super_admin"
      ? ["company_admin", "hr_manager", "team_lead", "employee"]
      : ["hr_manager", "team_lead", "employee"],
    [user.role]
  );

  const isEditable = (role: Role) => editableRoles.includes(role);

  const getPermission = (role: Role, module: PermissionModule) =>
    rows.find((permission) => permission.role === role && permission.module === module);

  const togglePermission = (
    role: Role,
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean
  ) => {
    if (!isEditable(role)) return;
    setRows((current) => current.map((permission) => {
      if (permission.role !== role || permission.module !== module) return permission;
      const next = { ...permission, [`can_${action}`]: checked };
      if (action === "view" && !checked) {
        next.can_create = false;
        next.can_edit = false;
        next.can_delete = false;
      } else if (action !== "view" && checked) {
        next.can_view = true;
      }
      return next;
    }));
  };

  const focusRole = (role: Role) => {
    setSelectedRole(role);
    matrixRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const payload = rows.filter((permission) => editableRoles.includes(permission.role));
      const response = await fetch("/api/roles-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({ permissions: payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save permissions");
      const merged = mergePermissions(data.permissions ?? rows);
      setRows(merged);
      replacePermissions(merged);
      toast.success("Permission changes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Back to settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Roles &amp; Permissions</h2>
            <p className="text-sm text-muted-foreground">
              Control what each role can access and do in HRFlow
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Managed by {ROLE_LABELS[user.role]}
        </Badge>
      </div>

      {warning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {warning}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ROLES.map((role) => (
          <Card key={role} className={cn("flex min-h-48 flex-col", selectedRole === role && "ring-2 ring-primary")}>
            <CardHeader className="space-y-3 pb-2">
              <Badge variant="outline" className={cn("w-fit", ROLE_STYLES[role])}>
                {ROLE_LABELS[role]}
              </Badge>
              <CardDescription className="min-h-14 text-xs leading-relaxed">
                {ROLE_DESCRIPTIONS[role]}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{userCounts[role] ?? 0}</span>
                <span className="text-muted-foreground">users</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => focusRole(role)}>
                View Permissions
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Hierarchy</CardTitle>
          <CardDescription>Higher roles inherit broader organizational responsibility.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pb-1">
            {ROLES.map((role, index) => (
              <div key={role} className="flex items-center gap-2">
                <div className={cn("rounded-md border px-4 py-2 text-sm font-medium", ROLE_STYLES[role])}>
                  {ROLE_LABELS[role]}
                </div>
                {index < ROLES.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div ref={matrixRef} className="scroll-mt-6 space-y-3">
        <div>
          <h3 className="text-base font-semibold">Permissions Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Turning off View also removes Create, Edit, and Delete for that module.
          </p>
        </div>

        <Table className="min-w-[1320px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-40 bg-muted">Module</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className={cn("min-w-56", selectedRole === role && "bg-primary/10")}>
                  <div className="space-y-1">
                    <span>{ROLE_LABELS[role]}</span>
                    {!isEditable(role) && <p className="text-[10px] normal-case text-muted-foreground">Locked</p>}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_MODULES.map((module) => (
              <TableRow key={module}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  {MODULE_LABELS[module]}
                </TableCell>
                {ROLES.map((role) => {
                  const permission = getPermission(role, module);
                  const editable = isEditable(role);
                  return (
                    <TableCell key={role} className={cn(selectedRole === role && "bg-primary/5")}>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {PERMISSION_ACTIONS.map((action) => {
                          const checked = role === "super_admin"
                            ? true
                            : Boolean(permission?.[`can_${action}`]);
                          const id = `${role}-${module}-${action}`;
                          return (
                            <label key={action} htmlFor={id} className={cn("flex items-center gap-2 text-xs", !editable && "text-muted-foreground")}>
                              <Checkbox
                                id={id}
                                checked={checked}
                                disabled={!editable}
                                onCheckedChange={(value) => togglePermission(role, module, action, Boolean(value))}
                              />
                              {ACTION_LABELS[action]}
                            </label>
                          );
                        })}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={savePermissions} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Permission Changes"}
        </Button>
      </div>
    </PageWrapper>
  );
}
