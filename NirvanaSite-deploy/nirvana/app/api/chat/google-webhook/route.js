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
 */
export async function POST(request) {
  try {
    const payload = await request.json();

    console.log("[GChat Webhook] Received event type:", payload.type);
    console.log("[GChat Webhook] Full payload:", JSON.stringify(payload, null, 2));

    if (payload.type === "ADDED_TO_SPACE") {
      return NextResponse.json({ text: "Hello! I am the NirvanaLuxe Chat bridge. I will forward website guest inquiries here." });
    }

    if (payload.type === "MESSAGE") {
      const messageText = payload.message?.text || "";
      const threadName = payload.message?.thread?.name || "";
      const senderType = payload.message?.sender?.type || "HUMAN";
      const messageId = payload.message?.name || "";

      console.log("[GChat Webhook] MESSAGE details:", { messageText, threadName, senderType, messageId });

      // Ignore messages from bots (to prevent infinite loops)
      if (senderType === "BOT") {
        console.log("[GChat Webhook] Ignoring BOT message");
        return NextResponse.json({});
      }

      if (!messageText.trim() || !threadName) {
        console.log("[GChat Webhook] Empty text or no thread, skipping");
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
          console.log("[GChat Webhook] Duplicate message, skipping:", messageId);
          return NextResponse.json({});
        }
      }

      // ── Find the conversation linked to this Google Chat thread ──────────
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .select("id, hospitable_inquiry_id")
        .eq("hospitable_inquiry_id", threadName)
        .eq("status", "open")
        .single();

      console.log("[GChat Webhook] Conversation lookup:", { threadName, conv, convErr: convErr?.message });

      if (!conv) {
        console.warn(`[GChat Webhook] No open conversation found for thread ${threadName}`);
        return NextResponse.json({});
      }

      // ── Insert host reply into the guest conversation ──────────────────
      const { error: insertErr } = await supabase.from("chat_messages").insert({
        conversation_id: conv.id,
        sender_type: "host",
        body: messageText.trim(),
        hospitable_message_id: messageId || null,
      });

      console.log("[GChat Webhook] Insert result:", { success: !insertErr, error: insertErr?.message });

      // Update the last message timestamp
      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);

      console.log("[GChat Webhook] Reply saved successfully for conversation:", conv.id);
      return NextResponse.json({});
    }

    return NextResponse.json({});
  } catch (err) {
    console.error("[GChat Webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}
