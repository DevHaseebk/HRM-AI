import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

const MANAGE_ROLES = ["super_admin", "company_admin", "hr_manager", "team_lead"];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const date = searchParams.get("date");

    const scoped = session.role !== "super_admin";
    let query = scoped
      ? supabaseAdmin.from("attendance").select("*, employees!inner(company_id)").eq("employees.company_id", session.company_id)
      : supabaseAdmin.from("attendance").select("*");

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.employee_id || !body.date) {
      return NextResponse.json(
        { error: "employee_id and date are required" },
        { status: 400 }
      );
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, company_id")
      .eq("id", body.employee_id)
      .maybeSingle();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (session.role !== "super_admin" && employee.company_id !== session.company_id) {
      return NextResponse.json({ error: "Employee not found in your company" }, { status: 403 });
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
