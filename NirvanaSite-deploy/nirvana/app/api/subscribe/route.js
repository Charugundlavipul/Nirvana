import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables for newsletter subscription."
    );
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseClient;
}

function json(payload, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(payload, { ...init, headers });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const privacyAccepted = body?.privacyAccepted === true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!privacyAccepted) {
      return json(
        { error: "Please accept the privacy policy before subscribing." },
        { status: 400 }
      );
    }

    const { error } = await getSupabaseClient()
      .from("alert_subscribers")
      .insert({ email, privacy_accepted: true });

    if (error?.code === "23505") {
      return json(
        { error: "This email is already subscribed." },
        { status: 409 }
      );
    }

    if (error) throw error;

    return json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    return json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
