import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { AuthUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, role, password, must_change_password, is_temp_password")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: employee?.full_name ?? user.email.split("@")[0],
      employeeId: employee?.id ?? null,
      mustChangePassword: user.must_change_password ?? false,
      isTempPassword: user.is_temp_password ?? false,
    };

    return NextResponse.json({ user: authUser });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
