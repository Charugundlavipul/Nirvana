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
 * GET /api/chat/messages?conversationId=<uuid>
 *
 * Returns all messages for a conversation, ordered chronologically.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("id, sender_type, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return NextResponse.json(
        { error: "Could not load messages." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { messages: messages || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Chat messages error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error." },
      { status: 500 }
    );
  }
}
