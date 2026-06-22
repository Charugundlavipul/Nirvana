export const SITE_NAME = "Nirvana Luxe";
export const SITE_LEGAL_NAME = "VKR Ventures LLC";
export const SITE_ALTERNATE_NAMES = [
  "NirvanaLuxe",
  "Nirvana Luxe Vacation Rentals",
  "Nirvana Luxe Luxury Vacation Rentals",
];
export const SITE_TITLE = "Luxury Vacation Rentals";
export const SITE_DESCRIPTION =
  "Nirvana Luxe is the official direct-booking site for luxury cabins and lakefront vacation rentals in the Smoky Mountains, TN and Lake Norman, NC.";
export const SITE_KEYWORDS = [
  "vacation rentals",
  "luxury vacation rentals",
  "vacation homes",
  "vrbo rentals",
  "vrbo vacation rentals",
  "luxury rentals",
  "lake norman rentals",
  "lake norman vacation rentals",
  "vacation rental homes",
  "cabin rental",
  "lake rentals",
  "booking vacation rentals",
  "luxury home rentals",
  "cabins in sevierville tn",
  "homes to go",
  "tennessee cabin rentals",
  "vacation rental properties",
  "large group vacation rentals",
  "cabins in smoky mountains",
  "north carolina vacation rentals",
  "luxury cabin rentals",
  "vacation home rental sites",
  "smoky mountains cabin rentals",
  "luxury airbnb",
  "airbnb vacation rentals",
  "cabin rentals sevierville tn",
  "airbnb luxe",
  "lake cabin rentals",
  "lakefront vacation rentals near me",
  "home rentals",
  "sevierville cabin rentals",
  "home rentals like airbnb",
  "last minute vacation rentals",
  "getaway cabin",
  "vacation rental homes near me",
  "vacation rentals sevierville tn",
  "cabins near sevierville tn",
  "luxury cabins",
  "high end vacation rentals",
  "last minute rentals",
  "luxury cabins in north carolina",
  "luxury vacation home rentals",
  "luxury short term rentals",
  "large cabin rentals",
  "tennessee cabin",
  "cabin rentals in nc mountains",
  "short term rental homes",
  "tennessee vacation cabins",
  "luxury vacation",
  "smoky mountains vacation rentals",
  "book vacation homes",
  "smoky mountains rentals",
  "airbnb in gatlinburg",
  "airbnb in sevierville",
  "airbnb in tennessee",
  "luxury cabin rentals smoky mountains",
  "cabins with indoor pool smoky mountains",
  "sevierville luxury cabins",
  "luxury cabins in tennessee",
  "cabins for large groups smoky mountains",
  "luxury cabins near gatlinburg",
  "smoky mountain luxury cabins",
  "mountain view cabin rentals",
  "cabins with theater room",
  "direct booking vacation rentals",
  "cabins with hot tub and pool",
  "luxury vacation cabins",
  "walland tn cabin rentals",
  "large group cabins sevierville",
  "luxury airbnb smoky mountains",
  "chalet du lac",
  "chalet du lac charlotte",
  "chalet du lac lake norman",
  "shoreside oasis",
  "shoreside oasis charlotte",
  "shoreside oasis lake norman",
  "halftime hideaway",
  "halftime hideaway sevierville",
  "halftime hideaway smoky mountains",
  "cabin at the summit with mountain views",
  "cabin at the summit sevierville",
  "grand prix getaway",
  "grand prix getaway smoky mountains",
  "evergreen escape",
  "evergreen escape sevierville",
  "the grand sumeru",
  "the grand sumeru smoky mountains",
  "nirvana luxe retreat",
  "nirvana luxe cabin",
  "nirvana cabin sevierville"
];

export const DEFAULT_OG_IMAGE = "/logo512.png";
export const SITE_PHONE = "+1-704-780-1368";
export const SITE_EMAIL = "reservations@vkr-ventures.com";
export const SOCIAL_LINKS = [
  "https://www.instagram.com/nirvanaluxevacations/",
  "https://www.facebook.com/NirvanaLuxe",
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
    "https://www.nirvanaluxevacations.com"
  );
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString();
}
