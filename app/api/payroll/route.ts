import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

const CREATE_ROLES = ["super_admin", "company_admin", "hr_manager"];
const COMPANY_SCOPED_ROLES = ["company_admin", "hr_manager"];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let query = supabaseAdmin
      .from("payroll")
      .select(`
        *,
        employees!inner (
          id,
          full_name,
          email,
          department,
          designation,
          cnic,
          phone,
          company_id
        )
      `)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (COMPANY_SCOPED_ROLES.includes(session.role)) {
      query = query.eq("employees.company_id", session.company_id);
    } else if (session.role !== "super_admin") {
      // team_lead / employee: only their own payroll records
      if (!session.employee_id) {
        return NextResponse.json([]);
      }
      query = query.eq("employee_id", session.employee_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!CREATE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.employee_id || body.month == null || body.year == null) {
      return NextResponse.json(
        { error: "employee_id, month, and year are required" },
        { status: 400 }
      );
    }

    if (session.role !== "super_admin") {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("id", body.employee_id)
        .eq("company_id", session.company_id)
        .maybeSingle();

      if (!employee) {
        return NextResponse.json({ error: "Employee not found in your company" }, { status: 403 });
      }
    }

    const netSalary =
      body.net_salary ??
      (Number(body.basic_salary ?? 0) +
        Number(body.bonuses ?? 0) -
        Number(body.deductions ?? 0));

    const { data, error } = await supabaseAdmin
      .from("payroll")
      .insert({ ...body, net_salary: netSalary })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create payroll record" }, { status: 500 });
  }
}
