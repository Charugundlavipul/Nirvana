import { NextResponse } from "next/server";
import { fetchPropertyCalendar } from "../../../../../src/lib/hospitableApi";
import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!id || !startDate || !endDate) {
      return apiErrorResponse(new Error("Property ID, start_date, and end_date are required"), 400);
    }

    const calendarData = await fetchPropertyCalendar(id, startDate, endDate);
    return noStoreJson(calendarData);
  } catch (error) {
    console.error("Error fetching hospitable calendar:", error);
    return apiErrorResponse(error);
  }
}
