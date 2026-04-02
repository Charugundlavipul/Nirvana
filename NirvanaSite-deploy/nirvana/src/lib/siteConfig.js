export const SITE_NAME = "Nirvana Luxe";
export const SITE_TITLE = "Luxury Vacation Rentals in the Smokies and Lake Norman";
export const SITE_DESCRIPTION =
  "Book luxury vacation rentals with Nirvana Luxe in Sevierville, Tennessee and Lake Norman, North Carolina.";
export const DEFAULT_OG_IMAGE = "/logo512.png";
export const SITE_PHONE = "+1-704-780-1369";
export const SITE_EMAIL = "reservations@vkr-ventures.com";
export const SOCIAL_LINKS = [
  "https://www.instagram.com/nirvanaluxevacations/",
  "https://www.facebook.com/NirvanaaLuxe",
  "https://www.youtube.com/@nirvanaaluxe",
];

function normalizeUrl(value) {
  if (!value) return null;
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export function getSiteUrl() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeUrl(process.env.SITE_URL) ||
    "https://www.nirvanaluxe.co"
  );
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString();
}
