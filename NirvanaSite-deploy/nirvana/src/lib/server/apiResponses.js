import { NextResponse } from "next/server";

export function noStoreJson(payload, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(payload, {
    ...init,
    headers,
  });
}

export function apiErrorResponse(error) {
  const status = Number.isFinite(error?.status) ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Unexpected server error.";
  return noStoreJson(
    {
      error: message,
    },
    { status }
  );
}
