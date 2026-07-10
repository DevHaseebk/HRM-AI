import { getClientAuthHeaders } from "./company-scope";
import type { Role } from "./types";

export const PERMISSION_MODULES = [
  "dashboard",
  "employees",
  "attendance",
  "leaves",
  "payroll",
  "recruitment",
  "performance",
  "announcements",
  "ai_assistant",
  "reports",
  "settings",
] as const;

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface RolePermission {
  id?: string;
  role: Role;
  module: PermissionModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PermissionsResponse {
  permissions: RolePermission[];
  userCounts: Partial<Record<Role, number>>;
  usingDefaults?: boolean;
  warning?: string;
}

const ROLES: Role[] = [
  "super_admin",
  "company_admin",
  "hr_manager",
  "team_lead",
  "employee",
];

const access: Record<Role, Partial<Record<PermissionModule, PermissionAction[]>>> = {
  super_admin: Object.fromEntries(
    PERMISSION_MODULES.map((module) => [module, [...PERMISSION_ACTIONS]])
  ),
  company_admin: Object.fromEntries(
    PERMISSION_MODULES.map((module) => [module, [...PERMISSION_ACTIONS]])
  ),
  hr_manager: {
    dashboard: ["view"],
    employees: ["view", "create", "edit"],
    attendance: ["view", "create", "edit"],
    leaves: ["view", "create", "edit"],
    payroll: ["view", "create"],
    recruitment: ["view", "create", "edit"],
    performance: ["view", "create", "edit"],
    announcements: ["view", "create", "edit"],
    ai_assistant: ["view", "create", "edit"],
    reports: ["view", "create"],
  },
  team_lead: {
    dashboard: ["view"],
    employees: ["view"],
    attendance: ["view", "create", "edit"],
    leaves: ["view", "create", "edit"],
    payroll: ["view"],
    recruitment: ["view"],
    performance: ["view", "create", "edit"],
    announcements: ["view"],
    ai_assistant: ["view", "create", "edit"],
    reports: ["view"],
  },
  employee: {
    dashboard: ["view"],
    attendance: ["view", "create"],
    leaves: ["view", "create"],
    payroll: ["view"],
    performance: ["view"],
    announcements: ["view"],
    ai_assistant: ["view", "create"],
  },
};

export const DEFAULT_PERMISSIONS: RolePermission[] = ROLES.flatMap((role) =>
  PERMISSION_MODULES.map((module) => {
    const actions = access[role][module] ?? [];
    return {
      role,
      module,
      can_view: actions.includes("view"),
      can_create: actions.includes("create"),
      can_edit: actions.includes("edit"),
      can_delete: actions.includes("delete"),
    };
  })
);

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  attendance: "Attendance",
  leaves: "Leaves",
  payroll: "Payroll",
  recruitment: "Recruitment",
  performance: "Performance",
  announcements: "Announcements",
  ai_assistant: "AI Assistant",
  reports: "Reports",
  settings: "Settings",
};

export const PATH_MODULES: Array<{ prefix: string; module: PermissionModule }> = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/employees", module: "employees" },
  { prefix: "/attendance", module: "attendance" },
  { prefix: "/leaves", module: "leaves" },
  { prefix: "/payroll", module: "payroll" },
  { prefix: "/recruitment", module: "recruitment" },
  { prefix: "/performance", module: "performance" },
  { prefix: "/announcements", module: "announcements" },
  { prefix: "/ai-assistant", module: "ai_assistant" },
  { prefix: "/reports", module: "reports" },
  { prefix: "/settings", module: "settings" },
];

let permissionCache: RolePermission[] | null = null;
let responseCache: PermissionsResponse | null = null;
let pendingRequest: Promise<PermissionsResponse> | null = null;

function key(role: Role, module: PermissionModule) {
  return `${role}:${module}`;
}

export function mergePermissions(rows: RolePermission[]): RolePermission[] {
  const merged = new Map(
    DEFAULT_PERMISSIONS.map((permission) => [
      key(permission.role, permission.module),
      permission,
    ])
  );

  rows.forEach((permission) => {
    if (
      ROLES.includes(permission.role) &&
      PERMISSION_MODULES.includes(permission.module)
    ) {
      merged.set(key(permission.role, permission.module), permission);
    }
  });

  return Array.from(merged.values());
}

export function setPermissionCache(permissions: RolePermission[]) {
  permissionCache = mergePermissions(permissions);
  if (responseCache) responseCache = { ...responseCache, permissions: permissionCache };
}

export function hasPermission(
  role: Role,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === "super_admin") return true;
  const source = permissionCache ?? DEFAULT_PERMISSIONS;
  const permission = source.find(
    (item) => item.role === role && item.module === module
  );
  return permission?.[`can_${action}`] ?? false;
}

export async function loadPermissions(force = false): Promise<PermissionsResponse> {
  if (!force && responseCache) return responseCache;
  if (!force && pendingRequest) return pendingRequest;

  pendingRequest = fetch("/api/roles-permissions", {
    headers: getClientAuthHeaders(),
    cache: "no-store",
  })
    .then(async (response) => {
      const data = (await response.json()) as PermissionsResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load permissions");
      const result = { ...data, permissions: mergePermissions(data.permissions ?? []) };
      permissionCache = result.permissions;
      responseCache = result;
      return result;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function getModuleForPath(pathname: string): PermissionModule | null {
  return PATH_MODULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.module ?? null;
}
