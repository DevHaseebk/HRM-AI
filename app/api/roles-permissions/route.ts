import { NextResponse } from "next/server";
import { getCompanyScope } from "@/lib/company-scope";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_MODULES,
  mergePermissions,
  type PermissionModule,
  type RolePermission,
} from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import type { Role } from "@/lib/types";

const ROLES: Role[] = [
  "super_admin",
  "company_admin",
  "hr_manager",
  "team_lead",
  "employee",
];
const COMPANY_ADMIN_EDITABLE_ROLES: Role[] = ["hr_manager", "team_lead", "employee"];

function normalize(row: Record<string, unknown>): RolePermission | null {
  const role = row.role as Role;
  const permissionModule = row.module as PermissionModule;
  if (!ROLES.includes(role) || !PERMISSION_MODULES.includes(permissionModule)) return null;
  return {
    id: row.id ? String(row.id) : undefined,
    role,
    module: permissionModule,
    can_view: Boolean(row.can_view),
    can_create: Boolean(row.can_create),
    can_edit: Boolean(row.can_edit),
    can_delete: Boolean(row.can_delete),
  };
}

async function getUserCounts(role: Role | null, companyId: string | null) {
  let query = supabaseAdmin.from("users").select("role");
  if (role === "company_admin" && companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  const counts: Partial<Record<Role, number>> = {};
  ROLES.forEach((item) => { counts[item] = 0; });
  (data ?? []).forEach((row) => {
    const userRole = row.role as Role;
    if (ROLES.includes(userRole)) counts[userRole] = (counts[userRole] ?? 0) + 1;
  });
  return counts;
}

export async function GET(request: Request) {
  const scope = getCompanyScope(request);
  const userCounts = await getUserCounts(scope.role, scope.companyId);
  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select("id, role, module, can_view, can_create, can_edit, can_delete")
    .order("role")
    .order("module");

  if (error) {
    return NextResponse.json({
      permissions: DEFAULT_PERMISSIONS,
      userCounts,
      usingDefaults: true,
      warning: "Permissions table is unavailable. Run migration 008_role_permissions.sql to save changes.",
    });
  }

  const rows = (data ?? [])
    .map((row) => normalize(row as Record<string, unknown>))
    .filter((row): row is RolePermission => Boolean(row));

  return NextResponse.json({ permissions: mergePermissions(rows), userCounts });
}

export async function POST(request: Request) {
  try {
    const scope = getCompanyScope(request);
    if (scope.role !== "super_admin" && scope.role !== "company_admin") {
      return NextResponse.json({ error: "Only Super Admin or Company Admin can update permissions" }, { status: 403 });
    }

    const body = await request.json();
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    }

    const inputPermissions = body.permissions as Record<string, unknown>[];
    const normalized: RolePermission[] = inputPermissions
      .map((row) => normalize(row))
      .filter((row: RolePermission | null): row is RolePermission => Boolean(row));

    if (normalized.length !== inputPermissions.length) {
      return NextResponse.json({ error: "One or more permission rows are invalid" }, { status: 400 });
    }

    const editableRoles = scope.role === "super_admin"
      ? ROLES.filter((role) => role !== "super_admin")
      : COMPANY_ADMIN_EDITABLE_ROLES;
    if (normalized.some((permission) => !editableRoles.includes(permission.role))) {
      return NextResponse.json({ error: "You cannot change permissions for that role" }, { status: 403 });
    }

    const payload = normalized.map(({ role, module, can_view, can_create, can_edit, can_delete }) => ({
      role,
      module,
      can_view,
      can_create,
      can_edit,
      can_delete,
    }));
    const { data, error } = await supabaseAdmin
      .from("role_permissions")
      .upsert(payload, { onConflict: "role,module" })
      .select("id, role, module, can_view, can_create, can_edit, can_delete");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const saved = (data ?? [])
      .map((row) => normalize(row as Record<string, unknown>))
      .filter((row): row is RolePermission => Boolean(row));
    const { data: allRows } = await supabaseAdmin
      .from("role_permissions")
      .select("id, role, module, can_view, can_create, can_edit, can_delete");
    const allPermissions = (allRows ?? [])
      .map((row) => normalize(row as Record<string, unknown>))
      .filter((row): row is RolePermission => Boolean(row));

    return NextResponse.json({
      permissions: mergePermissions(allPermissions.length ? allPermissions : saved),
      message: "Permission changes saved",
    });
  } catch {
    return NextResponse.json({ error: "Failed to save permissions" }, { status: 500 });
  }
}
