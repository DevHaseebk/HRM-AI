import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .insert(scope.shouldScope ? { ...body, company_id: scope.companyId } : body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
