import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HISTORY_LIMIT = 50;

function getUserId(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("userId");
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .select("id, role, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  let body: { userId?: string; role?: "user" | "model"; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { userId, role, message } = body;
  if (!userId || !role || !message?.trim()) {
    return NextResponse.json(
      { error: "userId, role, and message are required" },
      { status: 400 }
    );
  }
  if (role !== "user" && role !== "model") {
    return NextResponse.json({ error: "role must be 'user' or 'model'" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .insert({ user_id: userId, role, message })
    .select("id, role, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}

export async function DELETE(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("ai_chat_history")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
