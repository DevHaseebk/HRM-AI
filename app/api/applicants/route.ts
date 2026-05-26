import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const stage = searchParams.get("stage");

    let query = supabaseAdmin.from("applicants").select("*");

    if (jobId) {
      query = query.eq("job_id", jobId);
    }
    if (stage) {
      query = query.eq("stage", stage);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch applicants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.full_name || !body.job_id) {
      return NextResponse.json(
        { error: "full_name and job_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("applicants")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create applicant" }, { status: 500 });
  }
}
