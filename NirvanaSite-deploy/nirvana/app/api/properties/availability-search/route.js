import { NextResponse } from "next/server";
import { fetchPropertyCards } from "../../../../src/lib/contentApi";
import {
  mergeLocalPropertiesWithAvailability,
  searchHospitableAvailability,
  validateAvailabilitySearchInput,
} from "../../../../src/lib/hospitableApi";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const startDate = `${body?.startDate || ""}`.trim();
    const endDate = `${body?.endDate || ""}`.trim();
    const adults = body?.adults;
    const children = body?.children;
    const infants = body?.infants;
    const pets = body?.pets;

    validateAvailabilitySearchInput({ startDate, endDate });

    const [localProperties, remoteResults] = await Promise.all([
      fetchPropertyCards(),
      searchHospitableAvailability({
        startDate,
        endDate,
        adults,
        children,
        infants,
        pets,
      }),
    ]);

    const response = mergeLocalPropertiesWithAvailability({
      localProperties,
      remoteResults,
      startDate,
      endDate,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to search availability.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
