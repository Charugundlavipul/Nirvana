import {
  isValidHospitablePropertyId,
  normalizeHospitablePropertyId,
} from "./hospitablePropertyId";

const HOSPITABLE_API_BASE_URL = "https://public.api.hospitable.com/v2";
const MAX_SEARCH_WINDOW_DAYS = 90;
const MAX_SEARCH_YEARS_AHEAD = 3;

function getTotalPriceLabel(pricing) {
  return (
    pricing?.total?.formatted_string ||
    pricing?.total?.formatted ||
    pricing?.total_without_taxes?.formatted_string ||
    pricing?.total_without_taxes?.formatted ||
    ""
  );
}

function parseDateOnlyValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(`${value || ""}`.trim());
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatDateLabel(startDate, endDate) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(parseDateOnlyValue(startDate))} - ${formatter.format(parseDateOnlyValue(endDate))}`;
}

function enrichPropertyWithAvailability(property, remoteResult, startDate, endDate) {
  const availability = remoteResult?.availability || {};
  const remoteProperty = remoteResult?.property || {};
  const totalPriceLabel = getTotalPriceLabel(remoteResult?.pricing);

  return {
    ...property,
    availability: {
      searched: true,
      available: Boolean(availability.available),
      dateLabel: formatDateLabel(startDate, endDate),
      totalPriceLabel,
      notAvailableReasons: Array.isArray(availability.details)
        ? availability.details
            .map((detail) => detail?.notAvailableReason)
            .filter(Boolean)
        : [],
      hospitablePropertyId: normalizeHospitablePropertyId(remoteProperty.id),
    },
  };
}

function getHospitableToken() {
  return (
    process.env.HOSPITABLE_API_KEY ||
    process.env.HOSPITABLE_PAT ||
    process.env.HOSPITABLE_TOKEN ||
    process.env.NEXT_PUBLIC_HOSPITABLE_KEY ||
    ""
  ).trim();
}

function normalizeGuestCount(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildRemoteResultsById(remoteResults) {
  const resultsById = new Map();

  for (const result of remoteResults) {
    const hospitablePropertyId = normalizeHospitablePropertyId(result?.property?.id);
    if (!hospitablePropertyId || resultsById.has(hospitablePropertyId)) {
      continue;
    }

    resultsById.set(hospitablePropertyId, result);
  }

  return resultsById;
}

export function validateAvailabilitySearchInput({ startDate, endDate }) {
  if (!startDate || !endDate) {
    throw new Error("Check-in and check-out dates are required.");
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  if (end <= start) {
    throw new Error("Check-out must be after check-in.");
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const stayLengthDays = Math.round((end.getTime() - start.getTime()) / dayMs);
  if (stayLengthDays > MAX_SEARCH_WINDOW_DAYS) {
    throw new Error(`Hospitable search supports a maximum ${MAX_SEARCH_WINDOW_DAYS}-day window.`);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const maxFutureDate = new Date(today);
  maxFutureDate.setUTCFullYear(maxFutureDate.getUTCFullYear() + MAX_SEARCH_YEARS_AHEAD);

  if (start > maxFutureDate || end > maxFutureDate) {
    throw new Error(`Hospitable search supports dates up to ${MAX_SEARCH_YEARS_AHEAD} years ahead.`);
  }
}

export async function searchHospitableAvailability({
  startDate,
  endDate,
  adults,
  children = 0,
  infants = 0,
  pets = 0,
}) {
  validateAvailabilitySearchInput({ startDate, endDate });

  const token = getHospitableToken();
  if (!token) {
    throw new Error("Missing Hospitable API token.");
  }

  const url = new URL(`${HOSPITABLE_API_BASE_URL}/properties/search`);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("adults", `${Math.max(1, normalizeGuestCount(adults, 1))}`);

  const normalizedChildren = normalizeGuestCount(children, 0);
  const normalizedInfants = normalizeGuestCount(infants, 0);
  const normalizedPets = normalizeGuestCount(pets, 0);

  if (normalizedChildren > 0) url.searchParams.set("children", `${normalizedChildren}`);
  if (normalizedInfants > 0) url.searchParams.set("infants", `${normalizedInfants}`);
  if (normalizedPets > 0) url.searchParams.set("pets", `${normalizedPets}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hospitable search failed (${response.status}): ${errorText || "Unknown error"}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchHospitableProperties() {
  const token = getHospitableToken();
  if (!token) {
    throw new Error("Missing Hospitable API token.");
  }

  const url = new URL(`${HOSPITABLE_API_BASE_URL}/properties`);
  const properties = [];
  let currentPage = 1;
  let lastPage = 1;

  do {
    url.searchParams.set("page", `${currentPage}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hospitable properties request failed (${response.status}): ${errorText || "Unknown error"}`);
    }

    const payload = await response.json();
    const pageItems = Array.isArray(payload?.data) ? payload.data : [];
    properties.push(...pageItems);

    lastPage = Number.parseInt(payload?.meta?.last_page, 10);
    lastPage = Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
    currentPage += 1;
  } while (currentPage <= lastPage);

  return properties;
}

export function mergeLocalPropertiesWithAvailability({
  localProperties,
  remoteResults,
  startDate,
  endDate,
}) {
  const remoteResultsById = buildRemoteResultsById(remoteResults);
  const availableProperties = [];
  const unmappedLocalProperties = [];
  const missingHospitableMatches = [];
  let matchedProperties = 0;

  for (const property of localProperties) {
    const hospitablePropertyId = normalizeHospitablePropertyId(property.hospitablePropertyId);

    if (!hospitablePropertyId) {
      unmappedLocalProperties.push(property.title);
      continue;
    }

    if (!isValidHospitablePropertyId(hospitablePropertyId)) {
      missingHospitableMatches.push({
        title: property.title,
        hospitablePropertyId,
      });
      continue;
    }

    const remoteResult = remoteResultsById.get(hospitablePropertyId);
    if (!remoteResult) {
      missingHospitableMatches.push({
        title: property.title,
        hospitablePropertyId,
      });
      continue;
    }

    matchedProperties += 1;

    if (!remoteResult?.availability?.available) {
      continue;
    }

    availableProperties.push(
      enrichPropertyWithAvailability(property, remoteResult, startDate, endDate)
    );
  }

  return {
    properties: availableProperties,
    meta: {
      totalLocalProperties: localProperties.length,
      configuredProperties: localProperties.length - unmappedLocalProperties.length,
      matchedProperties,
      availableProperties: availableProperties.length,
      unmappedLocalProperties,
      missingHospitableMatches,
    },
  };
}
