import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

const MANAGE_ROLES = ["super_admin", "company_admin", "hr_manager", "team_lead"];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let existingQuery = supabaseAdmin
      .from("attendance")
      .select("id, employees!inner(company_id)")
      .eq("id", params.id);

    if (session.role !== "super_admin") {
      existingQuery = existingQuery.eq("employees.company_id", session.company_id);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("attendance")
      .update(body)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
