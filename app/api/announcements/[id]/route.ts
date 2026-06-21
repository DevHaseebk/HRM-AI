import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("announcements")
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
      return NextResponse.json({ error: "Announcement not found" }, { status: 400 });
    }

    return NextResponse.json({ message: "Announcement deleted", data });
  } catch {
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
