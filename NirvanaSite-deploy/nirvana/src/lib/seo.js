import { richTextToPlainText } from "./richText";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_EMAIL,
  SITE_PHONE,
  SOCIAL_LINKS,
  absoluteUrl,
} from "./siteConfig";

function trimDescription(value, maxLength = 160) {
  if (!value) return SITE_DESCRIPTION;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function descriptionFromRichText(value, maxLength = 160) {
  return trimDescription(richTextToPlainText(value, true), maxLength);
}

export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  pathname = "/",
  canonicalPathname = pathname,
  images = [DEFAULT_OG_IMAGE],
  keywords = [],
  type = "website",
  noindex = false,
  follow = true,
}) {
  const normalizedImages = (Array.isArray(images) ? images : [images])
    .filter(Boolean)
    .map((image) => ({
      url: image.startsWith("http") ? image : absoluteUrl(image),
    }));

  return {
    title: title || SITE_TITLE,
    description,
    keywords,
    alternates: {
      canonical: canonicalPathname,
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: title || SITE_TITLE,
      description,
      url: pathname,
      images: normalizedImages,
    },
    twitter: {
      card: "summary_large_image",
      title: title || SITE_TITLE,
      description,
      images: normalizedImages.map((image) => image.url),
    },
    robots: noindex
      ? {
          index: false,
          follow,
        }
      : {
          index: true,
          follow,
        },
  };
}

/* ──────────────────────────────────────────────
   Breadcrumb JSON-LD — helps Google show
   breadcrumb trails and encourages sitelinks
   ────────────────────────────────────────────── */

export function buildBreadcrumbJsonLd(items = []) {
  if (!items.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ──────────────────────────────────────────────
   FAQ JSON-LD
   ────────────────────────────────────────────── */

export function buildFaqJsonLd(faqs = []) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((faq) => faq?.question && faq?.answer)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: richTextToPlainText(faq.answer || "", true) || faq.answer,
        },
      })),
  };
}

/* ──────────────────────────────────────────────
   Property JSON-LD — enhanced with individual
   reviews, check-in/out, geo, and bathrooms
   ────────────────────────────────────────────── */

export function buildPropertyJsonLd(property, bundle = null, reviews = []) {
  if (!property) return null;

  const images = [
    bundle?.curated?.home,
    bundle?.curated?.bg,
    bundle?.curated?.secondary,
    ...(bundle?.galleryImages || []).slice(0, 8),
  ].filter(Boolean);

  const validReviews = (reviews || []).filter((review) => review?.text);
  const ratingValue = validReviews.length
    ? (
        validReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
        validReviews.length
      ).toFixed(1)
    : null;

  const amenities = (bundle?.amenities || [])
    .map((amenity) => amenity?.title)
    .filter(Boolean);

  // Build up to 10 individual review items — this is what triggers
  // Google's star rating display in search results
  const reviewItems = validReviews.slice(0, 10).map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.name || review.author || "Verified Guest",
    },
    datePublished: review.created_at || review.date || undefined,
    reviewBody: typeof review.text === "string"
      ? review.text.slice(0, 300)
      : richTextToPlainText(review.text, true)?.slice(0, 300) || "",
    reviewRating: {
      "@type": "Rating",
      ratingValue: Number(review.rating || 5),
      bestRating: 5,
      worstRating: 1,
    },
  }));

  // Geo coordinates for properties (helps with local search / Google Maps)
  const propertyGeo = {
    "halftime-hideaway": { lat: 35.8682, lng: -83.5612 },
    "grand-prix-getaway": { lat: 35.8640, lng: -83.5580 },
    "nirvana": { lat: 35.8415, lng: -83.5710 },
    "shoreside-oasis": { lat: 35.5760, lng: -80.9280 },
    "chalet-du-lac": { lat: 35.4320, lng: -80.9650 },
    "cabin-at-the-summit": { lat: 35.8500, lng: -83.5500 },
    "evergreen-escape": { lat: 35.8550, lng: -83.5650 },
    "the-grand-sumeru": { lat: 35.8450, lng: -83.5700 },
  };

  const geo = propertyGeo[property.slug];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: descriptionFromRichText(property.description, 220),
    url: absoluteUrl(`/${property.slug}`),
    image: images.map((image) => (image.startsWith("http") ? image : absoluteUrl(image))),
    telephone: SITE_PHONE,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location || "",
      addressRegion: (property.location || "").toLowerCase().includes("sevierville") ||
        (property.location || "").toLowerCase().includes("smoky") ||
        (property.location || "").toLowerCase().includes("tennessee")
        ? "TN"
        : (property.location || "").toLowerCase().includes("norman") ||
          (property.location || "").toLowerCase().includes("mooresville") ||
          (property.location || "").toLowerCase().includes("charlotte")
        ? "NC"
        : undefined,
      addressCountry: "US",
    },
    ...(geo ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: geo.lat,
        longitude: geo.lng,
      },
    } : {}),
    maximumAttendeeCapacity: property.guests_max || undefined,
    numberOfRooms: property.bedroom_count || undefined,
    numberOfBedrooms: property.bedroom_count || undefined,
    numberOfBathroomsTotal: property.bathroom_count || undefined,
    petsAllowed: Boolean(property.pet_friendly),
    checkinTime: "16:00",
    checkoutTime: "10:00",
    amenityFeature: amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    aggregateRating:
      ratingValue && validReviews.length
        ? {
            "@type": "AggregateRating",
            ratingValue,
            reviewCount: validReviews.length,
            bestRating: "5",
            worstRating: "1",
          }
        : undefined,
    ...(reviewItems.length ? { review: reviewItems } : {}),
  };

  return jsonLd;
}

/* ──────────────────────────────────────────────
   Review Collection JSON-LD (review pages)
   ────────────────────────────────────────────── */

export function buildReviewCollectionJsonLd({ name, pathname, reviews = [] }) {
  const validReviews = reviews.filter((review) => review?.text);
  if (!validReviews.length) return null;

  const ratingValue = (
    validReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
    validReviews.length
  ).toFixed(1);

  // Build individual review items for richer snippets
  const reviewItems = validReviews.slice(0, 10).map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.name || review.author || "Verified Guest",
    },
    datePublished: review.created_at || review.date || undefined,
    reviewBody: typeof review.text === "string"
      ? review.text.slice(0, 300)
      : richTextToPlainText(review.text, true)?.slice(0, 300) || "",
    reviewRating: {
      "@type": "Rating",
      ratingValue: Number(review.rating || 5),
      bestRating: 5,
      worstRating: 1,
    },
  }));

  const isProperty = pathname.startsWith("/review/") && pathname !== "/review";

  if (isProperty) {
    return {
      "@context": "https://schema.org",
      "@type": "VacationRental",
      "name": name.replace(" Reviews", ""),
      "url": absoluteUrl(pathname),
      "image": absoluteUrl("/logo512.png"),
      "aggregateRating": {
        "@type": "AggregateRating",
        ratingValue,
        reviewCount: validReviews.length,
        bestRating: "5",
        worstRating: "1",
      },
      ...(reviewItems.length ? { review: reviewItems } : {}),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Nirvana Luxe Vacation Rentals",
    "description": "Verified guest reviews and ratings for Nirvana Luxe luxury vacation rentals.",
    "image": absoluteUrl("/logo512.png"),
    "url": absoluteUrl(pathname),
    "brand": {
      "@type": "Brand",
      "name": "Nirvana Luxe",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount: validReviews.length,
      bestRating: "5",
      worstRating: "1",
    },
    ...(reviewItems.length ? { review: reviewItems } : {}),
  };
}

/* ──────────────────────────────────────────────
   Enhanced Organization JSON-LD with aggregate
   rating across all properties
   ────────────────────────────────────────────── */

export function buildOrganizationJsonLd(allReviews = []) {
  const validReviews = (allReviews || []).filter((review) => review?.text);
  const ratingValue = validReviews.length
    ? (
        validReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
        validReviews.length
      ).toFixed(1)
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["NirvanaLuxe", "Nirvana Luxe Vacation Rentals"],
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo512.png"),
    email: SITE_EMAIL,
    telephone: SITE_PHONE,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_PHONE,
      email: SITE_EMAIL,
      contactType: "reservations",
      areaServed: "US",
      availableLanguage: "English",
    },
    areaServed: [
      {
        "@type": "State",
        name: "Tennessee",
      },
      {
        "@type": "State",
        name: "North Carolina",
      },
    ],
    sameAs: SOCIAL_LINKS,
    ...(ratingValue && validReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue,
            reviewCount: validReviews.length,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };
}

/* ──────────────────────────────────────────────
   SiteNavigationElement JSON-LD — encourages
   Google to show sitelink buttons
   ────────────────────────────────────────────── */

export function buildSiteNavigationJsonLd() {
  const navItems = [
    { name: "Properties", path: "/properties" },
    { name: "Book Now", path: "/book" },
    { name: "Reviews", path: "/review" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "FAQ", path: "/faq" },
    { name: "Blog", path: "/blog" },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: "Main Navigation",
    hasPart: navItems.map((item) => ({
      "@type": "WebPage",
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/* ──────────────────────────────────────────────
   WebPage JSON-LD with isPartOf — creates the
   parent–child page hierarchy that triggers
   Google's indented sub-results under the
   main site listing
   ────────────────────────────────────────────── */

export function buildWebPageJsonLd({
  name,
  pathname,
  description,
  type = "WebPage",
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    url: absoluteUrl(pathname),
    description,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}
