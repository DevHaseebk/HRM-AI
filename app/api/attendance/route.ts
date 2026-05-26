import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");
    const date = searchParams.get("date");

    let query = supabaseAdmin.from("attendance").select("*");

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

    if (!body.employee_id || !body.date) {
      return NextResponse.json(
        { error: "employee_id and date are required" },
        { status: 400 }
      );
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
