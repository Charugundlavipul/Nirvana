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
 * Receives webhook payloads from Google Chat (Workspace Add-on format).
 * The payload structure nests data under payload.chat.messagePayload.
 */
export async function POST(request) {
  try {
    const payload = await request.json();

    // ── Handle both payload formats ─────────────────────────────────────
    // Google Workspace Add-on format: payload.chat.messagePayload.message
    // Legacy Chat API format: payload.message (with payload.type)
    const chatPayload = payload.chat?.messagePayload;
    const message = chatPayload?.message || payload.message;
    const eventType = payload.type || (chatPayload ? "MESSAGE" : null);

    // Handle ADDED_TO_SPACE
    if (eventType === "ADDED_TO_SPACE") {
      return NextResponse.json({ text: "Hello! I am the NirvanaLuxe Chat bridge. I will forward website guest inquiries here." });
    }

    if (!message) {
      return NextResponse.json({});
    }

    const messageText = message.argumentText?.trim() || message.text || "";
    const threadKey = message.thread?.threadKey || "";
    const threadName = message.thread?.name || "";
    const senderType = message.sender?.type || payload.chat?.user?.type || "HUMAN";
    const messageId = message.name || "";

    // Ignore messages from bots (to prevent infinite loops)
    if (senderType === "BOT") {
      return NextResponse.json({});
    }

    if (!messageText.trim()) {
      return NextResponse.json({});
    }

    const supabase = getSupabaseAdmin();

    // ── Deduplicate ──────────────────────────────────────────────────────
    if (messageId) {
      const { data: existing } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("hospitable_message_id", messageId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({});
      }
    }

    // ── Find the conversation ────────────────────────────────────────────
    // Try threadKey first (this is the conversation UUID we set when sending)
    // Fall back to threadName stored in hospitable_inquiry_id
    let conv = null;

    if (threadKey) {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", threadKey)
        .eq("status", "open")
        .single();
      conv = data;
    }

    if (!conv && threadName) {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("hospitable_inquiry_id", threadName)
        .eq("status", "open")
        .single();
      conv = data;
    }

    if (!conv) {
      console.warn("[GChat Webhook] No conversation found for threadKey:", threadKey, "threadName:", threadName);
      return NextResponse.json({});
    }

    // ── Insert host reply into the guest conversation ──────────────────
    const { error: insertErr } = await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_type: "host",
      body: messageText.trim(),
      hospitable_message_id: messageId || null,
    });

    if (insertErr) {
      console.error("[GChat Webhook] Insert failed:", insertErr.message);
      return NextResponse.json({});
    }

    // Update the last message timestamp
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    return NextResponse.json({});
  } catch (err) {
    console.error("[GChat Webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}
