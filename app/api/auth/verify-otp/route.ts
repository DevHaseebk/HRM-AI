import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getNextAllowedTime } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const inputOtp = String(otp ?? "").trim();

    if (!normalizedEmail || !inputOtp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const { data: record, error } = await supabaseAdmin
      .from("password_reset_otp")
      .select("id, otp, attempt_count, expires_at, used")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!record || record.used || new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (record.otp !== inputOtp) {
      const attemptCount = (record.attempt_count ?? 0) + 1;
      const { error: updateError } = await supabaseAdmin
        .from("password_reset_otp")
        .update({
          attempt_count: attemptCount,
          next_allowed_at: getNextAllowedTime(attemptCount).toISOString(),
        })
        .eq("id", record.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const resetToken = randomUUID();
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60_000);

    const { error: updateError } = await supabaseAdmin
      .from("password_reset_otp")
      .update({
        used: true,
        reset_token: resetToken,
        reset_token_expires_at: resetTokenExpiresAt.toISOString(),
      })
      .eq("id", record.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reset_token: resetToken });
  } catch {
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
