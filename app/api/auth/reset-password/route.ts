import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { validateNewPassword } from "@/lib/password-utils";

export async function POST(request: Request) {
  try {
    const { email, reset_token, newPassword } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const token = String(reset_token ?? "").trim();
    const password = String(newPassword ?? "");

    if (!normalizedEmail || !token || !password) {
      return NextResponse.json(
        { error: "Email, reset token, and new password are required" },
        { status: 400 }
      );
    }

    const validation = validateNewPassword(password, password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    const { data: record, error: tokenError } = await supabaseAdmin
      .from("password_reset_otp")
      .select("id, reset_token_expires_at")
      .eq("email", normalizedEmail)
      .eq("reset_token", token)
      .eq("used", true)
      .maybeSingle();

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    if (
      !record ||
      !record.reset_token_expires_at ||
      new Date(record.reset_token_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password: null,
        password_hash: passwordHash,
        must_change_password: false,
        is_temp_password: false,
      })
      .eq("email", normalizedEmail);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("password_reset_otp")
      .delete()
      .eq("id", record.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
