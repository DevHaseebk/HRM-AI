import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HISTORY_LIMIT = 50;

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .select("id, role, message, created_at")
    .eq("user_id", session.id)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { role?: "user" | "model"; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { role, message } = body;
  if (!role || !message?.trim()) {
    return NextResponse.json(
      { error: "role and message are required" },
      { status: 400 }
    );
  }
  if (role !== "user" && role !== "model") {
    return NextResponse.json({ error: "role must be 'user' or 'model'" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .insert({ user_id: session.id, role, message })
    .select("id, role, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("ai_chat_history")
    .delete()
    .eq("user_id", session.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
