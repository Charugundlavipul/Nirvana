import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Max age in milliseconds before a conversation is considered expired (24 hours) */
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key);
}

/**
 * GET /api/chat/status?conversationId=<uuid>
 *
 * Returns the health of a conversation session:
 *   { valid: true/false, reason?: string, conversation?: { status, last_message_at } }
 *
 * A conversation is invalid if:
 *   - It doesn't exist
 *   - Its status is 'closed' or 'archived'
 *   - Its last_message_at is older than SESSION_MAX_AGE_MS
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { valid: false, reason: "missing_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: conv, error } = await supabase
      .from("chat_conversations")
      .select("id, status, last_message_at, created_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("Chat status check error:", error);
      return NextResponse.json(
        { valid: false, reason: "db_error" },
        { status: 500 }
      );
    }

    // Conversation doesn't exist
    if (!conv) {
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Conversation is closed or archived
    if (conv.status === "closed" || conv.status === "archived") {
      return NextResponse.json(
        { valid: false, reason: "closed", conversation: { status: conv.status } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Conversation is expired (no activity for 24h)
    const lastActivity = new Date(conv.last_message_at || conv.created_at).getTime();
    const age = Date.now() - lastActivity;
    if (age > SESSION_MAX_AGE_MS) {
      // Auto-close the expired conversation in the database
      await supabase
        .from("chat_conversations")
        .update({ status: "closed" })
        .eq("id", conversationId);

      return NextResponse.json(
        { valid: false, reason: "expired", conversation: { status: "closed", age_hours: Math.round(age / (60 * 60 * 1000)) } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Conversation is valid
    return NextResponse.json(
      { valid: true, conversation: { status: conv.status, last_message_at: conv.last_message_at } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Chat status error:", err);
    return NextResponse.json(
      { valid: false, reason: "server_error" },
      { status: 500 }
    );
  }
}
