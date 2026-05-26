import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAttendanceReminderEmail } from "@/lib/mailer";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const date = todayISO();

    const { data: employees, error: empError } = await supabaseAdmin
      .from("employees")
      .select("id, full_name, email")
      .eq("status", "active");

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No active employees" });
    }

    const { data: marked, error: attError } = await supabaseAdmin
      .from("attendance")
      .select("employee_id, status, check_in_time")
      .eq("date", date);

    if (attError) {
      return NextResponse.json({ error: attError.message }, { status: 500 });
    }

    const markedIds = new Set(
      (marked ?? [])
        .filter(
          (m) =>
            (m.status === "present" || m.status === "late" || m.status === "wfh" || m.status === "half_day") ||
            !!m.check_in_time
        )
        .map((m) => m.employee_id)
    );

    const dateLabel = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const toRemind = employees.filter((e) => e.email && !markedIds.has(e.id));

    let sentCount = 0;
    const failures: string[] = [];

    for (const emp of toRemind) {
      try {
        await sendAttendanceReminderEmail(emp.full_name, emp.email, dateLabel);
        sentCount++;
      } catch (err) {
        failures.push(`${emp.full_name}: ${err instanceof Error ? err.message : "send failed"}`);
      }
    }

    return NextResponse.json({
      success: true,
      count: sentCount,
      totalCandidates: toRemind.length,
      failures,
      message: `Reminders sent to ${sentCount} employee${sentCount === 1 ? "" : "s"}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
