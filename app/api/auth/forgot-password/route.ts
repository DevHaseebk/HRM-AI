import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateOTP, getNextAllowedTime, getRemainingSeconds } from "@/lib/otp";
import { sendPasswordResetOtpEmail } from "@/lib/mailer";

function genericSuccess() {
  return NextResponse.json({
    success: true,
    message: "If an account exists for this email, an OTP has been sent.",
  });
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return genericSuccess();
    }

    const { data: existing, error: otpFetchError } = await supabaseAdmin
      .from("password_reset_otp")
      .select("id, attempt_count, next_allowed_at, expires_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpFetchError) {
      return NextResponse.json({ error: otpFetchError.message }, { status: 500 });
    }

    const remainingSeconds = getRemainingSeconds(existing?.next_allowed_at ?? null);
    if (remainingSeconds > 0) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another OTP",
          remainingSeconds,
        },
        { status: 429 }
      );
    }

    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("password_reset_otp")
        .delete()
        .eq("email", normalizedEmail);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const nextAttemptCount = (existing?.attempt_count ?? 0) + 1;
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const nextAllowedAt = getNextAllowedTime(nextAttemptCount);

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_otp")
      .insert({
        email: normalizedEmail,
        otp,
        attempt_count: nextAttemptCount,
        expires_at: expiresAt.toISOString(),
        next_allowed_at: nextAllowedAt.toISOString(),
        used: false,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await sendPasswordResetOtpEmail(normalizedEmail, otp);
    return genericSuccess();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send OTP" },
      { status: 500 }
    );
  }
}
