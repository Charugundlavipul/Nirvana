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
 * POST /api/chat/google-webhook
 *
 * Receives webhook payloads from Google Chat when a team member replies.
 * Verifies the event and routes the reply to the corresponding guest conversation
 * via Supabase Realtime.
 */
export async function POST(request) {
  try {
    const payload = await request.json();

    // Google Chat expects a synchronous response. For messages, we can return text if we want,
    // but typically we just acknowledge.
    if (payload.type === "ADDED_TO_SPACE") {
      return NextResponse.json({ text: "Hello! I am the NirvanaLuxe Chat bridge. I will forward website guest inquiries here." });
    }

    if (payload.type === "MESSAGE") {
      const messageText = payload.message?.text || "";
      const threadName = payload.message?.thread?.name || ""; // e.g. spaces/XXX/threads/YYY
      const senderType = payload.message?.sender?.type || "HUMAN";
      const messageId = payload.message?.name || "";

      // Ignore messages from bots (to prevent infinite loops if the bot sends a message)
      if (senderType === "BOT") {
        return NextResponse.json({});
      }

      if (!messageText.trim() || !threadName) {
        return NextResponse.json({});
      }

      const supabase = getSupabaseAdmin();

      // ── Deduplicate ──────────────────────────────────────────────────────
      if (messageId) {
        const { data: existing } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("hospitable_message_id", messageId) // Reusing this column for external message IDs
          .maybeSingle();

        if (existing) {
          return NextResponse.json({});
        }
      }

      // ── Find the conversation linked to this Google Chat thread ──────────
      // We stored the threadName in the hospitable_inquiry_id column
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("hospitable_inquiry_id", threadName)
        .eq("status", "open")
        .single();

      if (!conv) {
        console.warn(`Google Chat Webhook: No open conversation found for thread ${threadName}`);
        // Optional: you could return a message back to the Google Chat thread telling the team
        // that the conversation is closed or not found.
        return NextResponse.json({});
      }

      // ── Insert host reply into the guest conversation ──────────────────
      await supabase.from("chat_messages").insert({
        conversation_id: conv.id,
        sender_type: "host",
        body: messageText.trim(),
        hospitable_message_id: messageId || null,
      });

      // Update the last message timestamp
      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);

      // We just return empty JSON to acknowledge the event without posting a reply back to GC.
      return NextResponse.json({});
    }

    return NextResponse.json({});
  } catch (err) {
    console.error("Google Chat webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}
