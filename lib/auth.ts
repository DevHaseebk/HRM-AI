import type { Role, AuthUser } from "./types";

const AUTH_KEY = "hrm_auth";
const COOKIE_NAME = "hrm_auth";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  hr_manager: "HR Manager",
  team_lead: "Team Lead",
  employee: "Employee",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/employees", label: "Employees", icon: "Users", roles: ["super_admin", "hr_manager"] as Role[] },
  { href: "/attendance", label: "Attendance", icon: "Clock", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/leaves", label: "Leaves", icon: "CalendarDays", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/payroll", label: "Payroll", icon: "Wallet", roles: ["super_admin", "hr_manager"] as Role[] },
  { href: "/recruitment", label: "Recruitment", icon: "Briefcase", roles: ["super_admin", "hr_manager"] as Role[] },
  { href: "/performance", label: "Performance", icon: "TrendingUp", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/announcements", label: "Announcements", icon: "Megaphone", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/ai-assistant", label: "AI Assistant", icon: "Bot", roles: ["super_admin", "hr_manager", "team_lead", "employee"] as Role[] },
  { href: "/reports", label: "Reports", icon: "BarChart3", roles: ["super_admin", "hr_manager"] as Role[] },
  { href: "/settings", label: "Settings", icon: "Settings", roles: ["super_admin"] as Role[] },
];

function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;
  // 30-day persistence; client-readable so middleware just checks presence
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function saveAuth(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  setAuthCookie(user.id);
}

export function updateAuthUser(updates: Partial<AuthUser>): AuthUser | null {
  const user = getAuthUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  saveAuth(updated);
  return updated;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  clearAuthCookie();
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}

export function hasRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function canAccessRoute(user: AuthUser | null, href: string): boolean {
  if (!user) return false;
  const item = NAV_ITEMS.find((nav) => nav.href === href);
  if (!item) return user.role === "super_admin";
  return item.roles.includes(user.role);
}

export function getNavItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canManageEmployees(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager";
}

export function canApproveLeaves(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager" || role === "team_lead";
}

export function canViewAllPayroll(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager";
}

export function canManageRecruitment(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager";
}

export function canManageAnnouncements(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager";
}

export function canManagePerformance(role: Role): boolean {
  return role === "super_admin" || role === "hr_manager" || role === "team_lead";
}

export function canManageSettings(role: Role): boolean {
  return role === "super_admin";
}

export function getTeamMemberIds(
  employees: { id: string; managerId: string | null }[],
  managerEmployeeId: string
): string[] {
  return employees
    .filter((e) => e.managerId === managerEmployeeId)
    .map((e) => e.id);
}
