import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function randomToken() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");

    if (!employeeId) {
      return NextResponse.json(
        { error: "employee_id is required" },
        { status: 400 }
      );
    }

    const date = todayISO();
    const token = `${employeeId}|${date}|${randomToken()}`;

    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id, status, check_in_time")
      .eq("employee_id", employeeId)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("attendance")
        .update({ qr_token: token })
        .eq("id", existing.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("attendance")
        .insert({
          employee_id: employeeId,
          date,
          qr_token: token,
          marked_by: "qr_pending",
        });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const dataUrl = await QRCode.toDataURL(token, {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return NextResponse.json({
      token,
      qrCode: dataUrl,
      date,
      status: existing?.status ?? null,
      checkInTime: existing?.check_in_time ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate QR code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
