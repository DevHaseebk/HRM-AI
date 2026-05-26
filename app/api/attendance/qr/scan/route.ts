import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
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
