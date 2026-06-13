import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key);
}

/**
 * POST /api/chat/close
 *
 * Body:
 *   conversationId: string — the conversation to close
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "closed" })
      .eq("id", conversationId);

    if (error) {
      console.error("Failed to close conversation:", error);
      return NextResponse.json({ error: "Could not close conversation." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Chat close error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error." },
      { status: 500 }
    );
  }
}
