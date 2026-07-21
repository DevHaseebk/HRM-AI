import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

const MANAGE_ROLES = ["super_admin", "company_admin", "hr_manager"];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || (session.role !== "super_admin" && data.company_id !== session.company_id)) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("employees")
      .select("company_id")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing || (session.role !== "super_admin" && existing.company_id !== session.company_id)) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("employees")
      .update(body)
      .eq("id", params.id)
      .select()
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let canDelete = session.role === "super_admin";
    if (!canDelete) {
      const { data: permRow } = await supabaseAdmin
        .from("role_permissions")
        .select("can_delete")
        .eq("role", session.role)
        .eq("module", "employees")
        .maybeSingle();

      canDelete = permRow
        ? Boolean(permRow.can_delete)
        : Boolean(
            DEFAULT_PERMISSIONS.find(
              (p) => p.role === session.role && p.module === "employees"
            )?.can_delete
          );
    }

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("employees")
      .select("company_id")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing || (session.role !== "super_admin" && existing.company_id !== session.company_id)) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", params.id)
      .select()
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
