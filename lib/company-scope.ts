import { getAuthUser } from "./auth";

/** Headers still sent by the UI for backward compatibility (API uses session). */
export function getClientAuthHeaders(): HeadersInit {
  const user = getAuthUser();
  if (!user) return {};

  return {
    "x-user-role": user.role,
    "x-user-id": user.id,
    ...(user.companyId ? { "x-company-id": user.companyId } : {}),
  };
}
