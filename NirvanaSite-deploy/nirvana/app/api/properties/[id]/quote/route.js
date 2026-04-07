import { NextResponse } from "next/server";
import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { checkin_date, checkout_date, guests } = await request.json();

    if (!id || !checkin_date || !checkout_date) {
      return apiErrorResponse(new Error("Property ID, checkin_date, and checkout_date are required"), 400);
    }

    const token = process.env.HOSPITABLE_API_KEY || process.env.HOSPITABLE_PAT || process.env.HOSPITABLE_TOKEN || process.env.NEXT_PUBLIC_HOSPITABLE_KEY || "";
    if (!token) {
      throw new Error("Missing Hospitable API token.");
    }

    const url = new URL(`https://public.api.hospitable.com/v2/properties/${id}/quote`);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkin_date: checkin_date,
        checkout_date: checkout_date,
        guests: {
            adults: guests?.adults || 2,
            children: guests?.children || 0,
            infants: guests?.infants || 0
        }
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(errorText); } catch(err){}
      if (parsed && parsed.reason_phrase) {
          return NextResponse.json({ error: parsed.reason_phrase }, { status: response.status });
      }
      return apiErrorResponse(new Error(`Hospitable quote failed (${response.status}): ${errorText || "Unknown"}`), response.status);
    }

    const payload = await response.json();
    return noStoreJson(payload);
  } catch (error) {
    console.error("Error fetching hospitable quote:", error);
    return apiErrorResponse(error);
  }
}
