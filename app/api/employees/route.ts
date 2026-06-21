import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { generateTempPassword } from "@/lib/password-utils";
import { sendCredentialsEmail } from "@/lib/mailer";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query;

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
    const scope = getCompanyScope(request);

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

    let companyId = body.company_id ?? (scope.shouldScope ? scope.companyId : null);
    const requestedRole = body.role === "company_admin" && scope.role === "super_admin"
      ? "company_admin"
      : "employee";

    if (scope.role === "super_admin" && body.new_company_name && !companyId) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({ name: String(body.new_company_name).trim() })
        .select("id")
        .single();

      if (companyError) {
        return NextResponse.json({ error: companyError.message }, { status: 500 });
      }

      companyId = company.id;
    }

    if (requestedRole === "company_admin" && !companyId) {
      return NextResponse.json(
        { error: "company_id or new_company_name is required for company admin" },
        { status: 400 }
      );
    }

    const employeePayload = companyId ? { ...body, company_id: companyId } : body;
    delete employeePayload.role;
    delete employeePayload.new_company_name;

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert(employeePayload)
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
        role: requestedRole,
        company_id: companyId,
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
