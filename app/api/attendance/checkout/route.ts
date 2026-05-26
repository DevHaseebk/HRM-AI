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

    const { data: record, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select("id, check_in_time, check_out_time")
      .eq("employee_id", employee_id)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!record || !record.check_in_time) {
      return NextResponse.json(
        { error: "You must check in before checking out" },
        { status: 400 }
      );
    }

    if (record.check_out_time) {
      return NextResponse.json(
        { error: "Already checked out today" },
        { status: 400 }
      );
    }

    const now = new Date();
    const checkInDate = new Date(record.check_in_time);
    const hoursWorked = Number(
      ((now.getTime() - checkInDate.getTime()) / 1000 / 60 / 60).toFixed(2)
    );

    const { error: updateError } = await supabaseAdmin
      .from("attendance")
      .update({
        check_out_time: now.toISOString(),
        check_out: now.toTimeString().slice(0, 8),
      })
      .eq("id", record.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkOutTime: now.toISOString(),
      hoursWorked,
      message: `Checked out · ${hoursWorked}h worked`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check out" }, { status: 500 });
  }
}
