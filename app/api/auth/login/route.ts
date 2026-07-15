import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import type { AuthUser } from "@/lib/types";
import { createSession } from "@/lib/server-auth";

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
      .select("id, email, role, password, password_hash, company_id, must_change_password, is_temp_password")
      .eq("email", email)
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

    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, full_name, company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: employee?.full_name ?? user.email.split("@")[0],
      employeeId: employee?.id ?? null,
      companyId: user.company_id ?? employee?.company_id ?? null,
      mustChangePassword: user.must_change_password ?? false,
      isTempPassword: user.is_temp_password ?? false,
    };

    await createSession({
      id: authUser.id,
      role: authUser.role,
      company_id: authUser.companyId ?? null,
      employee_id: authUser.employeeId,
    });

    return NextResponse.json({ user: authUser });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
