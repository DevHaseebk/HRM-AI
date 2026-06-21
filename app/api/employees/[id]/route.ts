import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", params.id);

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Employee not found" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    let query = supabaseAdmin
      .from("employees")
      .update(body)
      .eq("id", params.id);

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query.select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Employee not found" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", params.id);

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query.select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Employee not found" }, { status: 400 });
    }

    return NextResponse.json({ message: "Employee deleted", data });
  } catch {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
