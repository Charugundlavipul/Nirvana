import { NextResponse } from "next/server";
import { fetchHospitableProperties } from "../../../../src/lib/hospitableApi";

export const dynamic = "force-dynamic";

function buildPropertyLabel(property) {
  const name = `${property?.name || property?.public_name || "Untitled property"}`.trim();
  const city = `${property?.address?.city || ""}`.trim();
  const state = `${property?.address?.state || ""}`.trim();
  const location = [city, state].filter(Boolean).join(", ");
  const listedSuffix = property?.listed === false ? " [Unlisted]" : "";

  return location ? `${name} - ${location}${listedSuffix}` : `${name}${listedSuffix}`;
}

export async function GET() {
  try {
    const properties = await fetchHospitableProperties();
    const normalized = properties
      .map((property) => ({
        id: property?.id || "",
        name: `${property?.name || property?.public_name || "Untitled property"}`.trim(),
        label: buildPropertyLabel(property),
        listed: property?.listed !== false,
      }))
      .filter((property) => property.id && property.name)
      .sort((a, b) => {
        if (a.listed !== b.listed) {
          return a.listed ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });

    return NextResponse.json(
      { properties: normalized },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load Hospitable properties.",
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
