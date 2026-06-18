import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { generateTempPassword } from "@/lib/password-utils";
import { sendCredentialsEmail } from "@/lib/mailer";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.full_name || !body.email) {
      return NextResponse.json(
        { error: "full_name and email are required" },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert(body)
      .select()
      .single();

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        email: body.email,
        password: "[hashed]",
        password_hash: passwordHash,
        role: "employee",
        is_temp_password: true,
        must_change_password: true,
      })
      .select()
      .single();

    if (userError) {
      await supabaseAdmin.from("employees").delete().eq("id", employee.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from("employees")
      .update({ user_id: user.id })
      .eq("id", employee.id);

    try {
      await sendCredentialsEmail(body.email, body.full_name, tempPassword);
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : "Failed to send email";
      return NextResponse.json(
        {
          error: `Employee created but failed to send credentials email: ${message}`,
          employee,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...employee,
      user_id: user.id,
      message: "Employee created and credentials sent to email",
    });
  } catch {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
