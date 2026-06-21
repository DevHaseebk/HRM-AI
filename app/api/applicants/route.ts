import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const stage = searchParams.get("stage");

    const scope = getCompanyScope(request);
    let query = scope.shouldScope
      ? supabaseAdmin.from("applicants").select("*, jobs!inner(company_id)")
      : supabaseAdmin.from("applicants").select("*");

    if (scope.shouldScope) {
      query = query.eq("jobs.company_id", scope.companyId);
    }

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
    const scope = getCompanyScope(request);

    if (!body.full_name || !body.job_id) {
      return NextResponse.json(
        { error: "full_name and job_id are required" },
        { status: 400 }
      );
    }

    if (scope.shouldScope) {
      const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("id", body.job_id)
        .eq("company_id", scope.companyId)
        .maybeSingle();

      if (!job) {
        return NextResponse.json({ error: "Job not found in your company" }, { status: 403 });
      }
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
