import { supabase } from "../supabaseClient";

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

const normalizeProperty = (property, curatedByPropertyId) => {
  // Instead of static meta, rely on DB columns or sensible defaults
  // If specific meta fields (like fallback images) are critical and not in DB strictly, 
  // we might need to migrate them or keep a simplified local constant. 
  // Assuming for now we can default safely or use what's in curated.
  const curated = curatedByPropertyId[property.id] || {};
  return {
    ...property,
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
    "id,slug,name,location,description,guests_max,bedroom_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub";
  const withBookingColumns = `id,slug,name,booking_url,location,description,guests_max,bedroom_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub`;

  let { data, error } = await supabase
    .from("properties")
    .select(withBookingColumns)
    .order("created_at", { ascending: true });

  const errorMessage = `${error?.message || ""}`.toLowerCase();
  const missingBookingUrlColumn =
    error &&
    (errorMessage.includes("booking_url") &&
      (errorMessage.includes("does not exist") ||
        errorMessage.includes("could not find the")));

  if (missingBookingUrlColumn) {
    const fallback = await supabase
      .from("properties")
      .select(baseColumns)
      .order("created_at", { ascending: true });
    if (fallback.error) throw fallback.error;
    data = (fallback.data || []).map((row) => ({ ...row, booking_url: "" }));
    error = null;
  }

  if (error) throw error;
  return (data || []).sort(sortByPropertyOrder);
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

  const [highlightsRes, primaryRes] = await Promise.all([
    supabase
      .from("property_highlight_images")
      .select("property_id,url,display_order")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("properties")
      .select("id,primary_image,tagline")
      .in("id", propertyIds)
  ]);

  // Build lookup maps
  const highlightsByPropertyId = {};
  (highlightsRes.data || []).forEach(row => {
    if (!highlightsByPropertyId[row.property_id]) {
      highlightsByPropertyId[row.property_id] = [];
    }
    highlightsByPropertyId[row.property_id].push(row.url);
  });

  const primaryByPropertyId = {};
  (primaryRes.data || []).forEach(row => {
    primaryByPropertyId[row.id] = {
      primary_image: row.primary_image,
      tagline: row.tagline
    };
  });

  return properties.map(prop => ({
    ...prop,
    highlightImages: highlightsByPropertyId[prop.id] || [],
    primary_image: primaryByPropertyId[prop.id]?.primary_image || prop.curated?.home || "",
    tagline: primaryByPropertyId[prop.id]?.tagline || ""
  }));
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
    image: property.curated.home || property.curated.secondary || "",
    faqRouteId: property.meta?.faqRouteId || null,
    reviewRouteId: property.meta?.reviewRouteId || null,
    bookingPropertyId: property.id,
    propertyRoute: `/${property.slug}`,
    bookingUrl: property.booking_url || "",
    activityRoute: property.meta?.activityRoute || null,
    location: property.location,
    guests_max: property.guests_max,
    bedroom_count: property.bedroom_count,
    bathroom_count: property.bathroom_count,
    bed_details: property.bed_details,
    bath_details: property.bath_details,
    hot_tub: property.hot_tub,
    pet_friendly: property.pet_friendly,
    pet_fee: property.pet_fee,
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
