import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

/** Cookie set by Express backend on login (via Next rewrite). */
const SESSION_COOKIE = "hrm_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionPayload {
  id: string;
  role: string;
  company_id: string | null;
  employee_id: string | null;
}

/**
 * Verify JWT session for Next.js page middleware only.
 * Session cookies are created/cleared by the Express backend.
 */
export async function getServerSession(
  request: NextRequest
): Promise<SessionPayload | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
