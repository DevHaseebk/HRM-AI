import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("companies")
      .select("id, name")
      .order("name", { ascending: true });

    if (scope.shouldScope) {
      query = query.eq("id", scope.companyId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = getCompanyScope(request);
    if (scope.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can create companies" }, { status: 403 });
    }

    const { name } = await request.json();
    const companyName = String(name ?? "").trim();
    if (!companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert({ name: companyName })
      .select("id, name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
