import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
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

    if (scope.shouldScope) {
      query = query.eq("employees.company_id", scope.companyId);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (!body.employee_id || body.month == null || body.year == null) {
      return NextResponse.json(
        { error: "employee_id, month, and year are required" },
        { status: 400 }
      );
    }

    if (scope.shouldScope) {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("id", body.employee_id)
        .eq("company_id", scope.companyId)
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
