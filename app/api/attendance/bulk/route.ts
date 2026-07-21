import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

const VALID_STATUS = ["present", "absent", "late", "half_day", "wfh"];
const MANAGE_ROLES = ["super_admin", "company_admin", "hr_manager", "team_lead"];

interface BulkRecord {
  employee_id: string;
  status: string;
  check_in_time?: string | null;
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

    const body = (await request.json()) as {
      date?: string;
      records?: BulkRecord[];
      marked_by?: string;
      override_note?: string;
    };

    if (!body.date || !Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: "date and a non-empty records array are required" },
        { status: 400 }
      );
    }

    const cleaned = body.records
      .filter((r) => r.employee_id && VALID_STATUS.includes(r.status))
      .map((r) => ({
        employee_id: r.employee_id,
        date: body.date!,
        status: r.status,
        check_in: r.check_in_time ?? null,
        check_in_time: r.check_in_time
          ? new Date(`${body.date}T${r.check_in_time}:00`).toISOString()
          : null,
        marked_by: "hr_override",
        override_note: body.override_note ?? "Manual HR override",
      }));

    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: "No valid records to save" },
        { status: 400 }
      );
    }

    if (session.role !== "super_admin") {
      const requestedIds = cleaned.map((record) => record.employee_id);
      const { data: allowedEmployees } = await supabaseAdmin
        .from("employees")
        .select("id")
        .in("id", requestedIds)
        .eq("company_id", session.company_id);
      const allowedIds = new Set((allowedEmployees ?? []).map((employee) => employee.id));
      const allValid = requestedIds.every((id) => allowedIds.has(id));

      if (!allValid) {
        return NextResponse.json(
          { error: "One or more employees do not belong to your company" },
          { status: 403 }
        );
      }
    }

    let savedCount = 0;

    for (const record of cleaned) {
      const { data: existing } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("employee_id", record.employee_id)
        .eq("date", record.date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabaseAdmin
          .from("attendance")
          .update(record)
          .eq("id", existing.id);
        if (!error) savedCount++;
      } else {
        const { error } = await supabaseAdmin.from("attendance").insert(record);
        if (!error) savedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      count: savedCount,
      message: `${savedCount} employees marked successfully`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save bulk attendance" }, { status: 500 });
  }
}
