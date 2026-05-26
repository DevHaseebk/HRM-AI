import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.stage || !VALID_STAGES.includes(body.stage)) {
      return NextResponse.json(
        { error: `stage must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { stage: body.stage };
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    const { data, error } = await supabaseAdmin
      .from("applicants")
      .update(updates)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update applicant" }, { status: 500 });
  }
}
