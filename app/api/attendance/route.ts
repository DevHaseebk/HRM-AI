import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const date = searchParams.get("date");

    const scope = getCompanyScope(request);
    let query = scope.shouldScope
      ? supabaseAdmin.from("attendance").select("*, employees!inner(company_id)")
      : supabaseAdmin.from("attendance").select("*");

    if (scope.shouldScope) {
      query = query.eq("employees.company_id", scope.companyId);
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (date) {
      query = query.eq("date", date);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (!body.employee_id || !body.date) {
      return NextResponse.json(
        { error: "employee_id and date are required" },
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
      .from("attendance")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 });
  }
}
