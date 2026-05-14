import { supabase } from "../supabaseClient";
import { normalizePropertySpaces } from "./propertySpaces";
import { getBathroomSummary, normalizeBathroomCounts } from "./bathrooms";

// Define fallback metadata directly or fetch from DB if needed
// For now, removing the static MAP reliance
const PROPERTY_ORDER = ["nirvana", "shoreside", "halftime"]; // Maintain order if needed

const sortByPropertyOrder = (a, b) => {
  const idxA = PROPERTY_ORDER.indexOf(a.slug);
  const idxB = PROPERTY_ORDER.indexOf(b.slug);
  // If not in list, put at end
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
};

const toCuratedMap = (rows = []) => {
  const byPropertyId = {};
  rows.forEach((row) => {
    if (!byPropertyId[row.property_id]) {
      byPropertyId[row.property_id] = {};
    }
    byPropertyId[row.property_id][row.slot] = row.url;
  });
  return byPropertyId;
};

const getPreferredPropertyImage = ({ curated = {}, galleryImages = [] } = {}) =>
  curated.home ||
  curated.secondary ||
  curated.bg ||
  (Array.isArray(galleryImages) ? galleryImages.find(Boolean) : "") ||
  "";

const normalizeProperty = (property, curatedByPropertyId) => {
  // Instead of static meta, rely on DB columns or sensible defaults
  // If specific meta fields (like fallback images) are critical and not in DB strictly, 
  // we might need to migrate them or keep a simplified local constant. 
  // Assuming for now we can default safely or use what's in curated.
  const curated = curatedByPropertyId[property.id] || {};
  const { fullBathCount, halfBathCount } = normalizeBathroomCounts(property);
  return {
    ...property,
    full_bath_count: fullBathCount,
    half_bath_count: halfBathCount,
    bathroom_summary: getBathroomSummary({
      full_bath_count: fullBathCount,
      half_bath_count: halfBathCount,
    }),
    spaces: normalizePropertySpaces(property.spaces),
    curated: {
      home: curated.home || "", // Fallback empty if not in DB
      bg: curated.bg || "",
      secondary: curated.secondary || "",
    },
  };
};

const formatReviewDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeReview = (review, propertyById) => {
  const property = propertyById[review.property_id];
  // const propertyMeta = property ? PROPERTY_META_BY_SLUG[property.slug] : null; // Removed
  const rating = Number(review.rating || 5);
  const source = review.source && review.source !== "direct" ? review.source : "airbnb";
  const authorName = review.author_name || "Guest";

  return {
    id: review.id,
    propertyId: review.property_id,
    propertySlug: property?.slug || null,
    propertyName: property?.name || "",
    property: property?.name || "", // Simplified: use name directly
    source,
    rating,
    stars: Math.max(1, Math.min(5, Math.round(rating))),
    name: authorName,
    author: `- ${authorName}`,
    text: review.content || "",
    date: formatReviewDate(review.date),
    img: review.avatar_url || null,
  };
};

async function fetchPropertiesRaw() {
  const baseColumns =
    "id,slug,name,hospitable_property_id,location,description,guests_max,bedroom_count,bed_count,full_bath_count,half_bath_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub";
  const withBookingColumns = `id,slug,name,hospitable_property_id,booking_url,location,description,guests_max,bedroom_count,bed_count,full_bath_count,half_bath_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub`;
  const withBookingAndSpacesColumns = `${withBookingColumns},spaces`;
  const withBookingSpacesAndVideoColumns = `${withBookingAndSpacesColumns},video_url`;
  const legacyBaseColumns =
    "id,slug,name,location,description,guests_max,bedroom_count,bed_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub";
  const legacyWithBookingColumns = `id,slug,name,booking_url,location,description,guests_max,bedroom_count,bed_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub`;
  const legacyWithBookingAndSpacesColumns = `${legacyWithBookingColumns},spaces`;
  const legacyWithBookingSpacesAndVideoColumns = `${legacyWithBookingAndSpacesColumns},video_url`;

  const attempts = [
    {
      columns: withBookingSpacesAndVideoColumns,
      normalize: (row) => row,
    },
    {
      columns: withBookingAndSpacesColumns,
      normalize: (row) => ({ ...row, video_url: "" }),
    },
    {
      columns: withBookingColumns,
      normalize: (row) => ({ ...row, spaces: [], video_url: "" }),
    },
    {
      columns: baseColumns,
      normalize: (row) => ({
        ...row,
        hospitable_property_id: row.hospitable_property_id || "",
        booking_url: "",
        spaces: [],
        video_url: "",
      }),
    },
    {
      columns: legacyWithBookingSpacesAndVideoColumns,
      normalize: (row) => ({ ...row, hospitable_property_id: "" }),
    },
    {
      columns: legacyWithBookingAndSpacesColumns,
      normalize: (row) => ({ ...row, hospitable_property_id: "", video_url: "" }),
    },
    {
      columns: legacyWithBookingColumns,
      normalize: (row) => ({
        ...row,
        hospitable_property_id: "",
        spaces: [],
        video_url: "",
      }),
    },
    {
      columns: legacyBaseColumns,
      normalize: (row) => ({
        ...row,
        hospitable_property_id: "",
        booking_url: "",
        spaces: [],
        video_url: "",
      }),
    },
  ];

  let lastMissingColumnError = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("properties")
      .select(attempt.columns)
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (!error) {
      return (data || []).map(attempt.normalize).sort(sortByPropertyOrder);
    }

    const errorMessage = `${error?.message || ""}`.toLowerCase();
    const missingColumnError =
      errorMessage.includes("does not exist") ||
      errorMessage.includes("could not find the");
    if (!missingColumnError) {
      throw error;
    }

    lastMissingColumnError = error;
  }

  if (lastMissingColumnError) throw lastMissingColumnError;
  return [];
}

async function fetchCuratedRows(propertyIds) {
  if (!propertyIds.length) return [];
  const { data, error } = await supabase
    .from("property_curated_images")
    .select("property_id,slot,url,display_order")
    .in("property_id", propertyIds);
  if (error) throw error;
  return data || [];
}

export async function fetchPropertiesWithCurated() {
  const properties = await fetchPropertiesRaw();
  const curatedRows = await fetchCuratedRows(properties.map((item) => item.id));
  const curatedByPropertyId = toCuratedMap(curatedRows);
  return properties.map((property) =>
    normalizeProperty(property, curatedByPropertyId)
  );
}

// Fetch all properties with highlight images for Home page
export async function fetchProperties() {
  const properties = await fetchPropertiesWithCurated();

  // Fetch highlight images and primary images for all properties
  const propertyIds = properties.map(p => p.id);

  const [highlightsRes, galleryRes] = await Promise.all([
    supabase
      .from("property_highlight_images")
      .select("property_id,url,display_order")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("property_images")
      .select("property_id,url,display_order")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true })
  ]);

  // Build lookup maps
  const highlightsByPropertyId = {};
  (highlightsRes.data || []).forEach(row => {
    if (!highlightsByPropertyId[row.property_id]) {
      highlightsByPropertyId[row.property_id] = [];
    }
    highlightsByPropertyId[row.property_id].push(row.url);
  });

  const galleryByPropertyId = {};
  (galleryRes.data || []).forEach(row => {
    if (!galleryByPropertyId[row.property_id]) {
      galleryByPropertyId[row.property_id] = [];
    }
    galleryByPropertyId[row.property_id].push(row.url);
  });

  return properties.map(prop => {
    const galleryImages = galleryByPropertyId[prop.id] || [];
    const actualPrimaryImage = getPreferredPropertyImage({
      curated: prop.curated,
      galleryImages,
    });
    
    return {
      ...prop,
      highlightImages: highlightsByPropertyId[prop.id] || [],
      primary_image: actualPrimaryImage,
      image: actualPrimaryImage,
      tagline: ""
    };
  });
}

export async function fetchPropertyBySlug(slug) {
  const properties = await fetchPropertiesWithCurated();
  return properties.find((item) => item.slug === slug) || null;
}

export async function fetchPropertyCards() {
  const properties = await fetchPropertiesWithCurated();
  return properties.map((property) => ({
    slug: property.slug,
    title: property.name,
    image: getPreferredPropertyImage({
      curated: property.curated,
    }),
    faqRouteId: property.meta?.faqRouteId || null,
    reviewRouteId: property.meta?.reviewRouteId || null,
    bookingPropertyId: property.id,
    hospitablePropertyId: property.hospitable_property_id || "",
    propertyRoute: `/${property.slug}`,
    bookingUrl: property.booking_url || "",
    activityRoute: property.meta?.activityRoute || null,
    location: property.location,
    description: property.description || "",
    guests_max: property.guests_max,
    bedroom_count: property.bedroom_count,
    full_bath_count: property.full_bath_count,
    half_bath_count: property.half_bath_count,
    bathroom_count: property.bathroom_count,
    bathroom_summary: property.bathroom_summary,
    bed_details: property.bed_details,
    bath_details: property.bath_details,
    hot_tub: property.hot_tub,
    pet_friendly: property.pet_friendly,
    pet_fee: property.pet_fee,
    video_url: property.video_url || "",
    curated: property.curated,
  }));
}

export async function fetchPropertyBundleBySlug(slug) {
  const property = await fetchPropertyBySlug(slug);
  if (!property) return null;

  const [galleryRes, highlightsRes, amenitiesRes] = await Promise.all([
    supabase
      .from("property_images")
      .select("url,display_order")
      .eq("property_id", property.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("property_highlight_images")
      .select("url,display_order")
      .eq("property_id", property.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("amenities")
      .select("id,title,description,icon_key")
      .eq("property_id", property.id)
      .order("created_at", { ascending: true }),
  ]);

  if (galleryRes.error) throw galleryRes.error;
  if (amenitiesRes.error) throw amenitiesRes.error;

  const highlightErrorMessage = highlightsRes.error?.message || "";
  const shouldIgnoreHighlightsError =
    highlightErrorMessage.includes("does not exist") ||
    highlightErrorMessage.includes("Could not find the table");
  if (highlightsRes.error && !shouldIgnoreHighlightsError) {
    throw highlightsRes.error;
  }

  return {
    property,
    curated: property.curated,
    spaces: property.spaces || [],
    galleryImages: (galleryRes.data || []).map((item) => item.url),
    highlightImages: (highlightsRes.data || []).map((item) => item.url),
    amenities: amenitiesRes.data || [],
  };
}

export async function fetchFaqsBySlug(slug) {
  const property = await fetchPropertyBySlug(slug);
  if (!property) return [];

  // Fetch property-specific FAQs
  const { data: propertyFaqs, error: propertyError } = await supabase
    .from("property_faqs")
    .select("faq_id,faqs(id,question,answer,display_order,created_at,is_default)")
    .eq("property_id", property.id);

  if (propertyError) throw propertyError;

  // Fetch default FAQs (always visible regardless of property)
  const { data: defaultFaqs, error: defaultError } = await supabase
    .from("faqs")
    .select("id,question,answer,display_order,created_at,is_default")
    .eq("is_default", true);

  if (defaultError) throw defaultError;

  // Combine and deduplicate
  const propertyFaqList = (propertyFaqs || []).map(row => row.faqs).filter(Boolean);
  const allFaqs = [...propertyFaqList, ...(defaultFaqs || [])];

  // Remove duplicates by id
  const uniqueFaqs = Array.from(new Map(allFaqs.map(f => [f.id, f])).values());

  // Sort by display_order ASC, then created_at DESC
  return uniqueFaqs.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export async function fetchReviews({ slug = null } = {}) {
  const properties = await fetchPropertiesRaw();
  const propertyById = Object.fromEntries(
    properties.map((property) => [property.id, property])
  );
  const propertyBySlug = Object.fromEntries(
    properties.map((property) => [property.slug, property])
  );

  let query;

  if (slug && propertyBySlug[slug]) {
    // Specific Property: Fetch via junction table
    const propId = propertyBySlug[slug].id;
    const { data, error } = await supabase
      .from("property_reviews")
      .select("reviews(*)")
      .eq("property_id", propId)
      .order("created_at", { foreignTable: "reviews", ascending: false }); // Best effort sort, primarily CLIENT sort matters or we need logic

    if (error) throw error;

    // Normalize: We know the propertyId is propId
    return (data || [])
      .map(row => row.reviews)
      .filter(Boolean)
      .map(review => {
        // Inject the known property ID so normalizeReview can find metadata
        return normalizeReview({ ...review, property_id: propId }, propertyById);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date DESC client-side

  } else {
    // All Reviews (Global): Fetch all reviews and their links
    const { data: reviewsData, error } = await supabase
      .from("reviews")
      .select("*, property_reviews(property_id)")
      .order("date", { ascending: false });

    if (error) throw error;

    return (reviewsData || []).map(review => {
      // For global list, we might have multiple properties. 
      // We pick the first one for "primary" display, or we could update normalizeReview to handle multiple.
      // For now, let's just pick the first linked property to keep it simple, or none.
      const firstPropId = review.property_reviews?.[0]?.property_id || null;
      return normalizeReview({ ...review, property_id: firstPropId }, propertyById);
    });
  }
}

export async function fetchActivitiesBySlug(slug) {
  const property = await fetchPropertyBySlug(slug);
  if (!property) return [];

  const { data, error } = await supabase
    .from("property_activities")
    .select(
      "activity_id,activities(id,title,description,image_url,link_url,created_at)"
    )
    .eq("property_id", property.id);

  if (error) throw error;

  return (data || [])
    .map((row) => row.activities)
    .filter(Boolean)
    .sort((a, b) => {
      const titleA = a.title || "";
      const titleB = b.title || "";
      return titleA.localeCompare(titleB);
    });
}

export function getFallbackMetaForSlug(slug) {
  // Return empty fallback or minimal object, as heavy maps are gone.
  return { fallback: {} };
}
