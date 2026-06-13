import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";

export const dynamic = "force-dynamic";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key);
}

/**
 * Get a Google Chat API access token using service account credentials.
 */
let _authClient = null;
let _lastAuthError = null;
async function getGoogleAccessToken() {
  _lastAuthError = null;
  if (!_authClient) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "");

    // Remove surrounding quotes if present (Vercel sometimes keeps them)
    key = key.replace(/^["']|["']$/g, "");
    // Replace literal \n strings with actual newlines
    key = key.replace(/\\n/g, "\n");

    if (!email || !key) { _lastAuthError = "Missing email or key env var"; return null; }

    _authClient = new GoogleAuth({
      credentials: { client_email: email, private_key: key },
      scopes: ["https://www.googleapis.com/auth/chat.bot"],
    });
  }

  try {
    const client = await _authClient.getClient();
    const tokenRes = await client.getAccessToken();
    return tokenRes?.token || null;
  } catch (err) {
    _lastAuthError = err.message;
    _authClient = null; // Reset so next attempt re-creates
    console.error("Google auth failed:", err.message);
    return null;
  }
}

/**
 * Send a message to a Google Chat space, creating a thread per conversation.
 * Uses the conversation ID as the threadKey so follow-ups go to the same thread.
 */
async function sendToGoogleChat(accessToken, spaceId, { threadKey, guestName, message, isNewConversation }) {
  const body = {
    text: isNewConversation
      ? `🟢 *New chat from ${guestName}*\n\n${message}`
      : `💬 *${guestName}*: ${message}`,
    thread: { threadKey },
  };

  const url = `${CHAT_API_BASE}/${spaceId}/messages?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("Google Chat send failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  return data?.thread?.name || null;
}

/**
 * POST /api/chat/send
 *
 * Body:
 *   conversationId?: string   — existing conversation UUID (omit to start new)
 *   guestName?: string
 *   guestEmail?: string
 *   propertySlug?: string
 *   message: string
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { conversationId, guestName, guestEmail, propertySlug, message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let convId = conversationId;
    let isNewConversation = false;

    // ── Create or fetch conversation ─────────────────────────────────────
    if (!convId) {
      isNewConversation = true;

      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          guest_name: guestName || "Guest",
          guest_email: guestEmail || null,
          property_slug: propertySlug || null,
          status: "open",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (convErr) {
        console.error("Failed to create conversation:", convErr);
        return NextResponse.json(
          { error: "Could not start conversation." },
          { status: 500 }
        );
      }
      convId = conv.id;

      // Insert system greeting
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        sender_type: "system",
        body: "Welcome to Nirvana Luxe! 👋 Our team typically responds within a few minutes. How can we help you today?",
      });
    }

    // ── Save guest message to Supabase ───────────────────────────────────
    const { error: msgErr } = await supabase.from("chat_messages").insert({
      conversation_id: convId,
      sender_type: "guest",
      body: message.trim(),
    });

    if (msgErr) {
      console.error("Failed to save message:", msgErr);
      return NextResponse.json(
        { error: "Could not send message." },
        { status: 500 }
      );
    }

    // Update last_message_at
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);

    // ── Forward to Google Chat ───────────────────────────────────────────
    const spaceId = (process.env.GOOGLE_CHAT_SPACE_ID || "").trim();
    let gchatDebug = { spaceId: spaceId || "(empty)", hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, hasKey: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").trim() };

    if (spaceId) {
      try {
        const accessToken = await getGoogleAccessToken();
        gchatDebug.gotToken = !!accessToken;
        gchatDebug.authError = _lastAuthError;

        if (accessToken) {
          const threadName = await sendToGoogleChat(accessToken, spaceId, {
            threadKey: convId, // Use conversation ID as thread key
            guestName: guestName || "Guest",
            message: message.trim(),
            isNewConversation,
          });

          gchatDebug.threadName = threadName;
          gchatDebug.success = true;

          // Store the Google Chat thread name for routing replies back
          if (threadName && isNewConversation) {
            await supabase
              .from("chat_conversations")
              .update({ hospitable_inquiry_id: threadName })
              .eq("id", convId);
          }
        }
      } catch (gcErr) {
        gchatDebug.error = gcErr.message;
        console.warn("Google Chat forwarding failed:", gcErr.message);
      }
    }

    return NextResponse.json({ conversationId: convId, ok: true, gchatOk: !!gchatDebug.success, gchatDebug });
  } catch (err) {
    console.error("Chat send error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error." },
      { status: 500 }
    );
  }
}
