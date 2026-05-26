import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("payroll")
      .select(`
        *,
        employees (
          id,
          full_name,
          email,
          department,
          designation,
          cnic,
          phone
        )
      `)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

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

    if (!body.employee_id || body.month == null || body.year == null) {
      return NextResponse.json(
        { error: "employee_id, month, and year are required" },
        { status: 400 }
      );
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
