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

function formatSchemaTime(value, fallback) {
  const normalized = `${value || ""}`.trim();
  if (!normalized) return fallback;
  if (/^\d{2}:\d{2}:\d{2}/.test(normalized)) return normalized;
  if (/^\d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  return fallback;
}

function formatSchemaDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCaseWords(value) {
  return `${value || ""}`
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getVacationRentalType(property, hospitableProperty) {
  const haystack = [
    hospitableProperty?.property_type,
    hospitableProperty?.public_name,
    hospitableProperty?.name,
    property?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("chalet") || haystack.includes("chateau")) return "Chalet";
  if (haystack.includes("cabin")) return "Cabin";
  if (haystack.includes("villa")) return "Villa";
  if (haystack.includes("cottage")) return "Cottage";
  if (haystack.includes("bungalow")) return "Bungalow";
  if (haystack.includes("apartment") || haystack.includes("condo")) return "Apartment";
  if (haystack.includes("house") || haystack.includes("home")) return "House";
  return "VacationRental";
}

function getAccommodationType(roomType) {
  const normalized = `${roomType || ""}`.toLowerCase();
  if (normalized.includes("private")) return "PrivateRoom";
  if (normalized.includes("shared")) return "SharedRoom";
  return "EntirePlace";
}

function getAddress(property, hospitableProperty) {
  const remoteAddress = hospitableProperty?.address || {};
  const location = `${property?.location || ""}`.toLowerCase();

  return {
    "@type": "PostalAddress",
    streetAddress: remoteAddress.street || undefined,
    addressLocality: remoteAddress.city || property?.location || "",
    addressRegion: remoteAddress.state ||
      (location.includes("sevierville") || location.includes("smoky") || location.includes("tennessee")
        ? "TN"
        : location.includes("norman") || location.includes("mooresville") || location.includes("charlotte")
          ? "NC"
          : undefined),
    postalCode: remoteAddress.postcode || undefined,
    addressCountry: remoteAddress.country || "US",
  };
}

function getCoordinates(hospitableProperty) {
  const coordinates = hospitableProperty?.address?.coordinates || {};
  const latitude = toNumber(coordinates.latitude);
  const longitude = toNumber(coordinates.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function getBedDetails(hospitableProperty) {
  const bedTypes = new Map();
  const bedTypeLabels = {
    california_king_bed: "CaliforniaKing",
    king_bed: "King",
    queen_bed: "Queen",
    full_bed: "Full",
    double_bed: "Double",
    single_bed: "Single",
    twin_bed: "Single",
    bunk_bed: "Bunk",
    sofa_bed: "Sofa",
  };

  for (const room of hospitableProperty?.room_details || []) {
    for (const bed of room?.beds || []) {
      const quantity = toInteger(bed?.quantity) || 0;
      if (!quantity) continue;

      const typeOfBed = bedTypeLabels[bed?.type] || titleCaseWords(bed?.type || "Bed");
      bedTypes.set(typeOfBed, (bedTypes.get(typeOfBed) || 0) + quantity);
    }
  }

  return Array.from(bedTypes.entries()).map(([typeOfBed, numberOfBeds]) => ({
    "@type": "BedDetails",
    numberOfBeds,
    typeOfBed,
  }));
}

function getSchemaAmenities(bundle, hospitableProperty, property) {
  const googleAmenityNames = {
    ac: "ac",
    balcony: "balcony",
    beach_access: "beachAccess",
    crib: "crib",
    fireplace: "fireplace",
    heating: "heating",
    hot_tub: "hotTub",
    jacuzzi: "hotTub",
    iron: "ironingBoard",
    kitchen: "kitchen",
    microwave: "microwave",
    bbq: "outdoorGrill",
    barbeque_utensils: "outdoorGrill",
    oven: "ovenStove",
    stove: "ovenStove",
    patio: "patio",
    pool: "pool",
    tv: "tv",
    washer: "washerDryer",
    dryer: "washerDryer",
    wifi: "wifi",
  };

  const featureNames = new Set();
  for (const amenity of hospitableProperty?.amenities || []) {
    const mappedName = googleAmenityNames[amenity];
    if (mappedName) featureNames.add(mappedName);
  }

  if (property?.hot_tub) featureNames.add("hotTub");
  if (property?.pet_friendly || hospitableProperty?.house_rules?.pets_allowed) {
    featureNames.add("petsAllowed");
  }

  const features = Array.from(featureNames).map((name) => ({
    "@type": "LocationFeatureSpecification",
    name,
    value: true,
  }));

  if ((hospitableProperty?.amenities || []).includes("wifi")) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "internetType",
      value: "Free",
    });
  }

  if ((hospitableProperty?.amenities || []).includes("free_on_premise_parking")) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "parkingType",
      value: "Free",
    });
  }

  const poolText = [
    hospitableProperty?.name,
    hospitableProperty?.public_name,
    hospitableProperty?.summary,
    hospitableProperty?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const poolType = poolText.includes("indoor")
    ? "Indoor"
    : poolText.includes("outdoor")
      ? "Outdoor"
      : null;

  if ((hospitableProperty?.amenities || []).includes("pool") && poolType) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "poolType",
      value: poolType,
    });
  }

  return features;
}

export function buildPropertyJsonLd(property, bundle = null, reviews = [], hospitableProperty = null) {
  if (!property) return null;

  const images = [
    hospitableProperty?.picture,
    bundle?.curated?.home,
    bundle?.curated?.bg,
    bundle?.curated?.secondary,
    ...(bundle?.galleryImages || []).slice(0, 8),
  ].filter(Boolean);

  const validReviews = (reviews || []).filter(
    (review) => review?.text && formatSchemaDate(review.created_at || review.date)
  );
  const ratingValue = validReviews.length
    ? Number((
        validReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
        validReviews.length
      ).toFixed(1))
    : null;

  const coordinates = getCoordinates(hospitableProperty);
  const occupancyValue =
    toInteger(hospitableProperty?.capacity?.max) || toInteger(property.guests_max);
  const bedrooms =
    toInteger(hospitableProperty?.capacity?.bedrooms) || toInteger(property.bedroom_count);
  const bathrooms =
    toNumber(hospitableProperty?.capacity?.bathrooms) || toNumber(property.bathroom_count);
  const beds = getBedDetails(hospitableProperty);
  const amenities = getSchemaAmenities(bundle, hospitableProperty, property);
  const roomCount = Array.isArray(hospitableProperty?.room_details)
    ? hospitableProperty.room_details.filter((room) =>
        !`${room?.type || ""}`.includes("bathroom") &&
        !["exterior", "deck", "patio", "balcony", "backyard", "hot_tub", "pool"].includes(room?.type)
      ).length
    : bedrooms;

  // Build up to 10 individual review items — this is what triggers
  // Google's star rating display in search results
  const reviewItems = validReviews.slice(0, 10).map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.name || review.author?.replace(/^- /, "") || "Verified Guest",
    },
    datePublished: formatSchemaDate(review.created_at || review.date),
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    additionalType: getVacationRentalType(property, hospitableProperty),
    identifier: hospitableProperty?.id || property.hospitable_property_id || property.id || property.slug,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    name: property.name,
    description: descriptionFromRichText(property.description, 220),
    url: absoluteUrl(`/${property.slug}`),
    image: images.map((image) => (image.startsWith("http") ? image : absoluteUrl(image))),
    telephone: SITE_PHONE,
    address: getAddress(property, hospitableProperty),
    ...(coordinates ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    } : {}),
    containsPlace: {
      "@type": "Accommodation",
      additionalType: getAccommodationType(hospitableProperty?.room_type),
      occupancy: occupancyValue
        ? {
            "@type": "QuantitativeValue",
            value: occupancyValue,
          }
        : undefined,
      ...(beds.length ? { bed: beds } : {}),
      amenityFeature: amenities,
      numberOfBathroomsTotal: bathrooms || undefined,
      numberOfBedrooms: bedrooms || undefined,
      numberOfRooms: roomCount || bedrooms || undefined,
      petsAllowed: Boolean(property.pet_friendly || hospitableProperty?.house_rules?.pets_allowed),
      smokingAllowed: Boolean(hospitableProperty?.house_rules?.smoking_allowed),
    },
    maximumAttendeeCapacity: occupancyValue || undefined,
    numberOfRooms: roomCount || bedrooms || undefined,
    numberOfBedrooms: bedrooms || undefined,
    numberOfBathroomsTotal: bathrooms || undefined,
    petsAllowed: Boolean(property.pet_friendly),
    checkinTime: formatSchemaTime(hospitableProperty?.checkin, "16:00:00"),
    checkoutTime: formatSchemaTime(hospitableProperty?.checkout, "10:00:00"),
    amenityFeature: amenities,
    knowsLanguage: ["en-US"],
    aggregateRating:
      ratingValue && validReviews.length
        ? {
            "@type": "AggregateRating",
            ratingValue,
            ratingCount: validReviews.length,
            reviewCount: validReviews.length,
            bestRating: 5,
            worstRating: 1,
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
    "@type": "CollectionPage",
    name,
    description: "Verified guest reviews for Nirvana Luxe luxury vacation rentals.",
    url: absoluteUrl(pathname),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    about: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      name,
      numberOfItems: validReviews.length,
    },
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
