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
 * POST /api/chat/webhook
 *
 * Receives Hospitable webhook payloads for message events.
 * When the HOST replies in Hospitable, this routes the reply to the
 * most recently active open conversation in Supabase.
 *
 * Since all chats share one Hospitable reservation thread, the host
 * reply is delivered to the conversation that was most recently active.
 * If the reply contains a guest name tag like [GuestName], we try to
 * match it to the right conversation.
 */
export async function POST(request) {
  try {
    const payload = await request.json();
    const event = payload?.event || payload?.action || "";
    const data = payload?.data || {};

    // Only process message events
    if (!event.startsWith("message")) {
      return NextResponse.json({ ok: true, skipped: "not a message event" });
    }

    // Only process host messages (guest messages are already saved locally)
    const senderType = data.sender || data.sender_type || "host";
    if (senderType === "guest") {
      return NextResponse.json({ ok: true, skipped: "guest message — already tracked" });
    }

    const messageBody = data.body || "";
    const hospMessageId = data.id || "";

    if (!messageBody.trim()) {
      return NextResponse.json({ ok: true, skipped: "empty message body" });
    }

    const supabase = getSupabaseAdmin();

    // ── Deduplicate ──────────────────────────────────────────────────────
    if (hospMessageId) {
      const { data: existing } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("hospitable_message_id", hospMessageId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ ok: true, skipped: "duplicate message" });
      }
    }

    // ── Try to match reply to specific guest by name tag ─────────────────
    // If the host reply starts with @GuestName or [GuestName], route to that guest
    let targetConversations = [];
    const nameMatch = messageBody.match(/^(?:@|\[)([^\]@:]+)(?:\]|:)/);
    let cleanBody = messageBody;

    if (nameMatch) {
      const guestName = nameMatch[1].trim();
      cleanBody = messageBody.replace(nameMatch[0], "").trim();

      const { data: namedConvs } = await supabase
        .from("chat_conversations")
        .select("id")
        .ilike("guest_name", `%${guestName}%`)
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1);

      if (namedConvs?.length) {
        targetConversations = namedConvs;
      }
    }

    // ── Fallback: deliver to the most recently active open conversation ──
    if (!targetConversations.length) {
      const { data: recentConvs } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1);

      targetConversations = recentConvs || [];
    }

    if (!targetConversations.length) {
      console.warn("Webhook: No open conversations found for host reply.");
      return NextResponse.json({ ok: true, skipped: "no open conversations" });
    }

    // ── Insert host reply ────────────────────────────────────────────────
    let delivered = 0;
    for (const conv of targetConversations) {
      await supabase.from("chat_messages").insert({
        conversation_id: conv.id,
        sender_type: "host",
        body: cleanBody.trim(),
        hospitable_message_id: hospMessageId || null,
      });

      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);

      delivered++;
    }

    return NextResponse.json({ ok: true, delivered });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}

// Hospitable may send a GET to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "nirvanaluxe-chat-webhook" });
}
