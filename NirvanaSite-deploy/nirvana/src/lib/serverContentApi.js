import { cache } from "react";
import { supabase } from "../supabaseClient";
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
