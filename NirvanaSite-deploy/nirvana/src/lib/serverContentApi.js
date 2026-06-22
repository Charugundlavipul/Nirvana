import { cache } from "react";
import { supabase } from "../supabaseClient";
import { fetchHospitableProperties } from "./hospitableApi";
import { normalizeHospitablePropertyId } from "./hospitablePropertyId";
import {
  fetchActivitiesBySlug,
  fetchFaqsBySlug,
  fetchProperties,
  fetchPropertyBundleBySlug,
  fetchPropertyBySlug,
  fetchPropertyCards,
  fetchPropertiesWithCurated,
  fetchReviews,
} from "./contentApi";

export const getProperties = cache(async () => fetchProperties());
export const getPropertyCards = cache(async () => fetchPropertyCards());
export const getPropertiesWithCurated = cache(async () => fetchPropertiesWithCurated());
export const getPropertyBySlug = cache(async (slug) => fetchPropertyBySlug(slug));
export const getPropertyBundleBySlug = cache(async (slug) => fetchPropertyBundleBySlug(slug));
export const getFaqsBySlug = cache(async (slug) => fetchFaqsBySlug(slug));
export const getActivitiesBySlug = cache(async (slug) => fetchActivitiesBySlug(slug));
export const getReviews = cache(async (options = {}) => fetchReviews(options));

export const getHospitableProperties = cache(async () => {
  try {
    return await fetchHospitableProperties({ next: { revalidate: 3600 } });
  } catch (error) {
    console.error("Unable to load Hospitable properties for structured data:", error);
    return [];
  }
});

export const getHospitablePropertyById = cache(async (propertyId) => {
  const normalizedPropertyId = normalizeHospitablePropertyId(propertyId);
  if (!normalizedPropertyId) return null;

  const properties = await getHospitableProperties();
  return (
    properties.find(
      (property) => normalizeHospitablePropertyId(property?.id) === normalizedPropertyId
    ) || null
  );
});

export const getPropertySlugs = cache(async () => {
  const properties = await fetchPropertiesWithCurated();
  return properties.map((property) => property.slug).filter(Boolean);
});

export const getLegalPageContent = cache(async (pageKey) => {
  const fallbackTitle =
    pageKey === "terms_and_conditions"
      ? "Terms and Conditions"
      : pageKey === "privacy_policy"
        ? "Privacy Policy"
        : "Legal";

  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .eq("key", pageKey)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return {
    title: data?.title || fallbackTitle,
    content: data?.content || "",
    lastUpdated: data?.last_updated || null,
    effectiveDate: data?.effective_date || null,
  };
});

export const getBlogBySlug = cache(async (slug) => {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, title, excerpt, cover_image, author_name, category, created_at, read_time")
    .eq("slug", slug)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching blog by slug:", error);
  }
  return data ? { ...data, author: data.author_name } : null;
});

export const getBlogSlugs = cache(async () => {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching blog slugs:", error);
    return [];
  }
  return (data || []).map((row) => row.slug).filter(Boolean);
});
