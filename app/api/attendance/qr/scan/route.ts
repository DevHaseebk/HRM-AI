import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

const ALLOWED_ROLES = ["team_lead", "hr_manager", "company_admin", "super_admin"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const parts = token.split("|");
    if (parts.length < 3) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 400 });
    }

    const tokenDate = parts[1];
    const today = todayISO();
    if (tokenDate !== today) {
      return NextResponse.json(
        { error: "QR code has expired. Generate a new one." },
        { status: 400 }
      );
    }

    const { data: record, error } = await supabaseAdmin
      .from("attendance")
      .select("id, employee_id, status, check_in_time, qr_token")
      .eq("qr_token", token)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired QR token" },
        { status: 400 }
      );
    }

    if (session.role !== "super_admin") {
      const { data: employeeCompany } = await supabaseAdmin
        .from("employees")
        .select("company_id")
        .eq("id", record.employee_id)
        .maybeSingle();

      if (!employeeCompany || employeeCompany.company_id !== session.company_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (record.status === "present" || record.status === "late") {
      return NextResponse.json(
        { error: "Attendance already marked for today" },
        { status: 400 }
      );
    }

    const now = new Date();
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 30, 0, 0);
    const status = now > lateThreshold ? "late" : "present";

    const { error: updateError } = await supabaseAdmin
      .from("attendance")
      .update({
        status,
        check_in_time: now.toISOString(),
        check_in: now.toTimeString().slice(0, 8),
        marked_by: "qr",
        qr_token: null,
      })
      .eq("id", record.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("full_name")
      .eq("id", record.employee_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: "Attendance marked",
      employeeName: employee?.full_name ?? "Employee",
      status,
      checkInTime: now.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan QR code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
