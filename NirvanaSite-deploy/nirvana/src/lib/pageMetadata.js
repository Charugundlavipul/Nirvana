import { SITE_DESCRIPTION } from "./siteConfig";

export const STATIC_PAGE_METADATA = [
  {
    pageKey: "/",
    label: "Home",
    group: "Main pages",
    title: "Nirvana Luxe Official Site - Luxury Vacation Rentals",
    description: "Official Nirvana Luxe direct-booking site for luxury cabins and lakefront vacation rentals in the Smoky Mountains, TN and Lake Norman, NC.",
    keywords: ["Nirvana Luxe", "luxury vacation rentals", "direct booking vacation rentals", "Sevierville cabins", "Lake Norman rentals"],
  },
  { pageKey: "/properties", label: "All properties", group: "Main pages", title: "Luxury Rentals - Smokies & Lake Norman | Book", description: "Browse luxury cabins and lakefront homes in Sevierville, Tennessee and Lake Norman, North Carolina. Direct booking and the best rate guaranteed." },
  { pageKey: "/book", label: "Book direct", group: "Main pages", title: "Book Direct - Luxury Cabins & Lake Homes | Save", description: "Skip platform fees and book your Smoky Mountain cabin or Lake Norman home directly with Nirvana Luxe. Check real-time availability." },
  { pageKey: "/about", label: "About us", group: "Company", title: "About Nirvana Luxe - Luxury Rental Hosts", description: "Meet the team behind Nirvana Luxe, curating luxury vacation rentals in the Smoky Mountains and Lake Norman with personal service." },
  { pageKey: "/contact", label: "Contact", group: "Company", title: "Contact Nirvana Luxe - Inquiries & Booking", description: "Contact the Nirvana Luxe team with questions about booking, availability, group trips, or your upcoming stay." },
  { pageKey: "/hosts", label: "Property management", group: "Company", title: "List With Nirvana Luxe - Property Management", description: "Learn about Nirvana Luxe full-service short-term rental management in Sevierville, Tennessee and Lake Norman, North Carolina." },
  { pageKey: "/blog", label: "Journal", group: "Content", title: "Nirvana Luxe Journal - Luxury Travel & Tips", description: "Explore luxury travel guides, Smoky Mountain tips, and Lake Norman getaway ideas from Nirvana Luxe." },
  { pageKey: "/faq", label: "Frequently asked questions", group: "Content", title: "FAQ - Booking, Check-In & Amenities | Nirvana", description: "Find answers about booking, cancellation, check-in, amenities, pets, and more for your Nirvana Luxe stay." },
  { pageKey: "/review", label: "Guest reviews", group: "Content", title: "5-Star Guest Reviews - Nirvana Luxe Rentals", description: "Read verified guest reviews for Nirvana Luxe cabins and lake homes, shared by real families and groups." },
  { pageKey: "/privacy", label: "Privacy policy", group: "Legal & utility", title: "Privacy Policy", description: "Read the privacy policy for Nirvana Luxe." },
  { pageKey: "/terms", label: "Terms and conditions", group: "Legal & utility", title: "Terms and Conditions", description: "Read the terms and conditions for Nirvana Luxe." },
  { pageKey: "/cancellation-policy", label: "Cancellation policy", group: "Legal & utility", title: "Cancellation Policy - Direct Bookings", description: "Review the Nirvana Luxe cancellation policy for direct bookings and find where to view the policy for Airbnb or Vrbo reservations." },
  { pageKey: "/unsubscribe", label: "Unsubscribe", group: "Legal & utility", title: "Unsubscribe", description: "Manage your Nirvana Luxe alert subscription preferences.", noindex: true, follow: true },
];

export function normalizePageKey(value) {
  let pageKey = String(value || "").trim();
  if (!pageKey) return "";
  if (!pageKey.startsWith("/")) pageKey = `/${pageKey}`;
  if (pageKey.length > 1) pageKey = pageKey.replace(/\/+$/, "");
  return pageKey;
}

export function normalizeMetadataRecord(value = {}, fallback = {}) {
  const keywords = Array.isArray(value.keywords)
    ? value.keywords
    : String(value.keywords || "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

  return {
    title: String(value.title ?? value.seo_title ?? fallback.title ?? "").trim(),
    description: String(value.description ?? fallback.description ?? SITE_DESCRIPTION).trim(),
    keywords: keywords.length ? keywords : (fallback.keywords || []),
    canonicalPathname: String(value.canonicalPathname ?? value.canonical_path ?? fallback.canonicalPathname ?? fallback.pathname ?? "").trim(),
    openGraphTitle: String(value.openGraphTitle ?? value.open_graph_title ?? fallback.openGraphTitle ?? "").trim(),
    openGraphDescription: String(value.openGraphDescription ?? value.open_graph_description ?? fallback.openGraphDescription ?? "").trim(),
    openGraphImage: String(value.openGraphImage ?? value.open_graph_image ?? fallback.openGraphImage ?? "").trim(),
    twitterTitle: String(value.twitterTitle ?? value.twitter_title ?? fallback.twitterTitle ?? "").trim(),
    twitterDescription: String(value.twitterDescription ?? value.twitter_description ?? fallback.twitterDescription ?? "").trim(),
    twitterImage: String(value.twitterImage ?? value.twitter_image ?? fallback.twitterImage ?? "").trim(),
    noindex: value.noindex ?? fallback.noindex ?? false,
    follow: value.follow ?? fallback.follow ?? true,
  };
}

export function metadataRecordToBuildOptions(record, fallback = {}) {
  const normalized = normalizeMetadataRecord(record, fallback);
  return {
    ...fallback,
    title: normalized.title || fallback.title,
    description: normalized.description || fallback.description,
    keywords: normalized.keywords,
    canonicalPathname: normalized.canonicalPathname || fallback.canonicalPathname || fallback.pathname,
    images: normalized.openGraphImage ? [normalized.openGraphImage] : fallback.images,
    openGraphTitle: normalized.openGraphTitle || undefined,
    openGraphDescription: normalized.openGraphDescription || undefined,
    twitterTitle: normalized.twitterTitle || undefined,
    twitterDescription: normalized.twitterDescription || undefined,
    twitterImages: normalized.twitterImage ? [normalized.twitterImage] : undefined,
    noindex: normalized.noindex,
    follow: normalized.follow,
  };
}
