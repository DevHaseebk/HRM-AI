import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/server-auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/employees",
  "/attendance",
  "/leaves",
  "/payroll",
  "/recruitment",
  "/performance",
  "/announcements",
  "/ai-assistant",
  "/reports",
  "/settings",
  "/change-password",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = request.cookies.get("hrm_auth")?.value;

  if (!isAuthed && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedPath(pathname)) {
    const session = await getServerSession(request);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAuthed && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - fonts (.woff/.woff2)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.woff2?$).*)",
  ],
};
