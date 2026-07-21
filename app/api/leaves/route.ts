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
    const status = searchParams.get("status");

    const scoped = session.role !== "super_admin";
    let query = scoped
      ? supabaseAdmin.from("leaves").select("*, employees!inner(company_id)").eq("employees.company_id", session.company_id)
      : supabaseAdmin.from("leaves").select("*");

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.employee_id || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "employee_id, start_date, and end_date are required" },
        { status: 400 }
      );
    }

    if (!MANAGE_ROLES.includes(session.role) && body.employee_id !== session.employee_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
