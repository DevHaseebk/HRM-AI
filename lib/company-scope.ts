import type { AuthUser, Role } from "./types";
import { getAuthUser } from "./auth";

export interface CompanyScope {
  role: Role | null;
  companyId: string | null;
  isSuperAdmin: boolean;
  shouldScope: boolean;
}

export function getClientAuthHeaders(): HeadersInit {
  const user = getAuthUser();
  if (!user) return {};

  return {
    "x-user-role": user.role,
    "x-user-id": user.id,
    ...(user.companyId ? { "x-company-id": user.companyId } : {}),
  };
}

export function getCompanyScope(request: Request): CompanyScope {
  const role = request.headers.get("x-user-role") as Role | null;
  const companyId = request.headers.get("x-company-id");
  const isSuperAdmin = role === "super_admin";

  return {
    role,
    companyId,
    isSuperAdmin,
    shouldScope: Boolean(companyId && !isSuperAdmin),
  };
}

export function userCompanyPayload(user: Partial<AuthUser>) {
  return {
    ...(user.companyId ? { company_id: user.companyId } : {}),
  };
}
