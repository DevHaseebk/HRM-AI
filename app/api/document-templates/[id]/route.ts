import { NextResponse } from "next/server";
import { getCompanyScope } from "@/lib/company-scope";
import { extractVariablesFromContent, mapTemplateRow } from "@/lib/document-templates";
import { supabaseAdmin } from "@/lib/supabase";

function scopedQuery(request: Request, id: string) {
  const scope = getCompanyScope(request);
  let query = supabaseAdmin.from("document_templates").select("*").eq("id", id);
  if (scope.companyId) query = query.eq("company_id", scope.companyId);
  else if (!scope.isSuperAdmin) query = query.is("company_id", null);
  return query;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { data, error } = await scopedQuery(request, params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: mapTemplateRow(data) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const existing = await scopedQuery(request, params.id).maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    if (!existing.data) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const content = body.content === undefined ? String(existing.data.content) : String(body.content).trim();
    if (!content) return NextResponse.json({ error: "Template content is required" }, { status: 400 });
    const payload = {
      ...(body.type !== undefined ? { type: String(body.type).trim() } : {}),
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      content,
      variables: Array.isArray(body.variables)
        ? Array.from(new Set(body.variables.map(String)))
        : extractVariablesFromContent(content),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("document_templates")
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: mapTemplateRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to update document template" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const existing = await scopedQuery(request, params.id).maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  const { error } = await supabaseAdmin.from("document_templates").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

