import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const status = searchParams.get("status");

    const scope = getCompanyScope(request);
    let query = scope.shouldScope
      ? supabaseAdmin.from("leaves").select("*, employees!inner(company_id)")
      : supabaseAdmin.from("leaves").select("*");

    if (scope.shouldScope) {
      query = query.eq("employees.company_id", scope.companyId);
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (!body.employee_id || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "employee_id, start_date, and end_date are required" },
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

    const { data, error } = await supabaseAdmin
      .from("leaves")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
