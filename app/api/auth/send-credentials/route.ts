import { NextRequest, NextResponse } from "next/server";
import { sendCredentialsEmail } from "@/lib/mailer";
import { getServerSession } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_ROLES = ["super_admin", "company_admin", "hr_manager"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "email, name, and password are required" },
        { status: 400 }
      );
    }

    if (session.role !== "super_admin") {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("company_id")
        .eq("email", email)
        .maybeSingle();

      if (!employee || employee.company_id !== session.company_id) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
    }

    await sendCredentialsEmail(email, name, password);

    return NextResponse.json({ success: true, message: "Credentials email sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
