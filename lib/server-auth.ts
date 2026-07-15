import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_COOKIE = "hrm_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days, rolling
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionPayload {
  id: string;
  role: string;
  company_id: string | null;
  employee_id: string | null;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getServerSession(
  request?: NextRequest
): Promise<SessionPayload | null> {
  try {
    const token = request
      ? request.cookies.get(SESSION_COOKIE)?.value
      : cookies().get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function refreshSessionCookie(payload: SessionPayload) {
  await createSession(payload);
}
