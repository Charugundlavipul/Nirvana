import { NextResponse } from "next/server";

export function proxy(request) {
  const host = request.headers.get("host");

  // Keep the canonical host stable for crawlers and link equity consolidation.
  if (host === "nirvanaluxe.co") {
    const url = request.nextUrl.clone();
    url.host = "www.nirvanaluxe.co";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)"],
};
