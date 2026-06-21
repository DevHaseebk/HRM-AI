import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (scope.shouldScope) {
      const { data: existing } = await supabaseAdmin
        .from("payroll")
        .select("id, employees!inner(company_id)")
        .eq("id", params.id)
        .eq("employees.company_id", scope.companyId)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "Payroll record not found in your company" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("payroll")
      .update(body)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
  }
}
