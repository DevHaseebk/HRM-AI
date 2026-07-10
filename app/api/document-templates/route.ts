import { NextResponse } from "next/server";
import { getCompanyScope } from "@/lib/company-scope";
import { extractVariablesFromContent, mapTemplateRow } from "@/lib/document-templates";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
    const type = new URL(request.url).searchParams.get("type");
    let query = supabaseAdmin
      .from("document_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (scope.companyId) query = query.eq("company_id", scope.companyId);
    else if (!scope.isSuperAdmin) query = query.is("company_id", null);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({
        templates: [],
        warning: "Document templates are not available yet. Run migration 009_document_templates.sql.",
      });
    }
    return NextResponse.json({ templates: (data ?? []).map(mapTemplateRow) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch document templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = getCompanyScope(request);
    const body = await request.json();
    const type = String(body.type ?? "").trim();
    const name = String(body.name ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!type || !name || !content) {
      return NextResponse.json({ error: "type, name, and content are required" }, { status: 400 });
    }

    const variables = Array.isArray(body.variables)
      ? Array.from(new Set(body.variables.map(String)))
      : extractVariablesFromContent(content);
    const payload = {
      type,
      name,
      content,
      variables,
      company_id: scope.companyId ?? body.companyId ?? null,
      created_by: request.headers.get("x-user-id") ?? body.createdBy ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("document_templates")
      .insert(payload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: mapTemplateRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to save document template" }, { status: 500 });
  }
}
