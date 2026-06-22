import { NextResponse } from "next/server";

export function proxy(request) {
  const host = request.headers.get("host");

  // Redirect all old domain variants to the new canonical domain.
  const oldHosts = [
    "nirvanaluxe.co",
    "www.nirvanaluxe.co",
    "nirvanaluxe.com",
    "www.nirvanaluxe.com",
  ];
  if (oldHosts.includes(host)) {
    const url = request.nextUrl.clone();
    url.host = "www.nirvanaluxevacations.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)"],
};
