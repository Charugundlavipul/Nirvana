import { richTextToPlainText } from "./richText";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
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

  return {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: descriptionFromRichText(property.description, 220),
    url: absoluteUrl(`/${property.slug}`),
    image: images.map((image) => (image.startsWith("http") ? image : absoluteUrl(image))),
    telephone: undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location || "",
      addressCountry: "US",
    },
    maximumAttendeeCapacity: property.guests_max || undefined,
    numberOfRooms: property.bedroom_count || undefined,
    petsAllowed: Boolean(property.pet_friendly),
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
  };
}

export function buildReviewCollectionJsonLd({ name, pathname, reviews = [] }) {
  const validReviews = reviews.filter((review) => review?.text);
  if (!validReviews.length) return null;

  const ratingValue = (
    validReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
    validReviews.length
  ).toFixed(1);

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
  };
}
