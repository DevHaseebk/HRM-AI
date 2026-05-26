import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json(
        { error: "employee_id is required" },
        { status: 400 }
      );
    }

    const date = todayISO();

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select("id, status, check_in_time")
      .eq("employee_id", employee_id)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing && (existing.status === "present" || existing.status === "late") && existing.check_in_time) {
      return NextResponse.json(
        { error: "Already checked in today" },
        { status: 400 }
      );
    }

    const now = new Date();
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 30, 0, 0);
    const status = now > lateThreshold ? "late" : "present";

    const payload = {
      status,
      check_in_time: now.toISOString(),
      check_in: now.toTimeString().slice(0, 8),
      marked_by: "self",
    };

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("attendance")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("attendance")
        .insert({ employee_id, date, ...payload });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      status,
      checkInTime: now.toISOString(),
      message: status === "late" ? "Checked in (marked as late)" : "Checked in successfully",
    });
  } catch {
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}
