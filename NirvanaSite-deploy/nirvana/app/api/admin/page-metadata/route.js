import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { apiErrorResponse, noStoreJson } from "../../../../src/lib/server/apiResponses";
import { requireAdminAccess } from "../../../../src/lib/server/supabaseAdmin";
import { STATIC_PAGE_METADATA, normalizeMetadataRecord, normalizePageKey } from "../../../../src/lib/pageMetadata";
import { descriptionFromRichText } from "../../../../src/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPEN_STATUSES = ["pending", "revision_requested"];

function publicRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    pageKey: record.page_key,
    title: record.seo_title,
    description: record.description,
    keywords: record.keywords || [],
    canonicalPathname: record.canonical_path || record.page_key,
    openGraphTitle: record.open_graph_title || "",
    openGraphDescription: record.open_graph_description || "",
    openGraphImage: record.open_graph_image || "",
    twitterTitle: record.twitter_title || "",
    twitterDescription: record.twitter_description || "",
    twitterImage: record.twitter_image || "",
    noindex: Boolean(record.noindex),
    follow: record.follow !== false,
    updatedAt: record.updated_at,
    updatedBy: record.updated_by,
  };
}

function approvalPayloadToRecord(payload = {}) {
  return publicRecord({
    ...payload,
    id: payload.id,
    page_key: payload.page_key,
    seo_title: payload.seo_title,
    canonical_path: payload.canonical_path,
    open_graph_title: payload.open_graph_title,
    open_graph_description: payload.open_graph_description,
    open_graph_image: payload.open_graph_image,
    twitter_title: payload.twitter_title,
    twitter_description: payload.twitter_description,
    twitter_image: payload.twitter_image,
    updated_at: payload.updated_at,
    updated_by: payload.updated_by,
  });
}

function validateMetadata(pageKey, input) {
  const normalizedPageKey = normalizePageKey(pageKey);
  if (!normalizedPageKey || normalizedPageKey.length > 300) {
    const error = new Error("A valid page path is required.");
    error.status = 400;
    throw error;
  }

  const metadata = normalizeMetadataRecord(input, { canonicalPathname: normalizedPageKey });
  if (!metadata.title || metadata.title.length > 120) {
    const error = new Error("SEO title is required and must be 120 characters or fewer.");
    error.status = 400;
    throw error;
  }
  if (!metadata.description || metadata.description.length > 320) {
    const error = new Error("Meta description is required and must be 320 characters or fewer.");
    error.status = 400;
    throw error;
  }
  if (metadata.keywords.length > 40 || metadata.keywords.some((keyword) => keyword.length > 80)) {
    const error = new Error("Use no more than 40 keywords, with 80 characters or fewer per keyword.");
    error.status = 400;
    throw error;
  }
  if (metadata.canonicalPathname && !/^(\/|https?:\/\/)/i.test(metadata.canonicalPathname)) {
    const error = new Error("Canonical URL must be a site path beginning with / or a full http(s) URL.");
    error.status = 400;
    throw error;
  }
  for (const image of [metadata.openGraphImage, metadata.twitterImage]) {
    if (image && !/^(\/|https?:\/\/)/i.test(image)) {
      const error = new Error("Social image URLs must be site paths beginning with / or full http(s) URLs.");
      error.status = 400;
      throw error;
    }
  }

  return { normalizedPageKey, metadata };
}

function toDatabasePayload(id, pageKey, metadata, userId) {
  return {
    id,
    page_key: pageKey,
    seo_title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    canonical_path: metadata.canonicalPathname || pageKey,
    open_graph_title: metadata.openGraphTitle || null,
    open_graph_description: metadata.openGraphDescription || null,
    open_graph_image: metadata.openGraphImage || null,
    twitter_title: metadata.twitterTitle || null,
    twitter_description: metadata.twitterDescription || null,
    twitter_image: metadata.twitterImage || null,
    noindex: Boolean(metadata.noindex),
    follow: metadata.follow !== false,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
}

function getPropertyImage(property) {
  const images = property?.property_curated_images || [];
  return images.find((image) => image.slot === "bg")?.url ||
    images.find((image) => image.slot === "home")?.url ||
    images.find((image) => image.slot === "secondary")?.url || "";
}

function buildCatalog(properties = [], blogs = []) {
  const pages = STATIC_PAGE_METADATA.map((page) => ({ ...page, canonicalPathname: page.pageKey }));

  for (const property of properties) {
    const slug = property.slug;
    if (!slug) continue;
    const description = descriptionFromRichText(property.description, 160) || `Book ${property.name} in ${property.location || "a beautiful destination"}.`;
    const image = getPropertyImage(property);
    const definitions = [
      { pageKey: `/${slug}`, label: property.name, group: "Property pages", title: `${property.name} - ${property.location || "Luxury Vacation Rental"}`, description, openGraphImage: image },
      { pageKey: `/book/${slug}`, label: `Book ${property.name}`, group: "Booking pages", title: `Book ${property.name}`, description, openGraphImage: image },
      { pageKey: `/${slug}/gallery`, label: `${property.name} gallery`, group: "Property pages", title: `${property.name} Photo Gallery`, description: `View the photo gallery for ${property.name}.`, openGraphImage: image },
      { pageKey: `/faq/${slug}`, label: `${property.name} FAQ`, group: "Property pages", title: `${property.name} FAQ`, description: `Answers to common questions about ${property.name}, including amenities, booking, and house rules.`, openGraphImage: image },
      { pageKey: `/review/${slug}`, label: `${property.name} reviews`, group: "Property pages", title: `${property.name} Reviews`, description: `Read verified guest reviews for ${property.name}.`, openGraphImage: image },
      { pageKey: `/activities/${slug}`, label: `Activities near ${property.name}`, group: "Property pages", title: `${property.name} Nearby Activities`, description: `Discover nearby activities, dining, and local experiences around ${property.name}.`, openGraphImage: image },
    ];
    pages.push(...definitions.map((page) => ({ ...page, canonicalPathname: page.pageKey })));
  }

  for (const blog of blogs) {
    if (!blog.slug) continue;
    const pageKey = `/blog/${blog.slug}`;
    pages.push({
      pageKey,
      label: blog.title,
      group: "Journal posts",
      title: `${blog.title} | Nirvana Luxe Journal`,
      description: blog.excerpt || `Read ${blog.title} on the Nirvana Luxe luxury travel blog.`,
      canonicalPathname: pageKey,
      openGraphImage: blog.cover_image || "",
    });
  }
  return pages;
}

export async function GET(request) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const [metadataResult, propertiesResult, blogsResult, approvalsResult] = await Promise.all([
      adminClient.from("page_metadata").select("*").order("page_key"),
      adminClient.from("properties").select("id,slug,name,location,description,property_curated_images(slot,url)").eq("is_published", true).order("name"),
      adminClient.from("blogs").select("id,slug,title,excerpt,cover_image").order("title"),
      adminClient.from("approval_requests").select("*").eq("entity_type", "page_metadata").in("status", OPEN_STATUSES).order("submitted_at", { ascending: false }),
    ]);

    if (metadataResult.error) throw metadataResult.error;
    if (propertiesResult.error) throw propertiesResult.error;
    if (blogsResult.error) throw blogsResult.error;
    if (approvalsResult.error) throw approvalsResult.error;

    const overrides = new Map((metadataResult.data || []).map((row) => [row.page_key, row]));
    const isReviewer = role === "owner" || role === "superadmin";
    const drafts = (approvalsResult.data || []).filter((row) => isReviewer || row.submitted_by === user.id);
    const draftByPage = new Map();
    for (const draft of drafts) {
      const payload = typeof draft.payload === "string" ? JSON.parse(draft.payload) : draft.payload || {};
      const pageKey = normalizePageKey(payload.page_key);
      if (pageKey && !draftByPage.has(pageKey)) draftByPage.set(pageKey, { ...draft, payload });
    }

    const catalog = buildCatalog(propertiesResult.data || [], blogsResult.data || []);
    const knownKeys = new Set(catalog.map((page) => page.pageKey));
    for (const row of metadataResult.data || []) {
      if (!knownKeys.has(row.page_key)) {
        catalog.push({ pageKey: row.page_key, label: row.page_key, group: "Other pages", title: row.seo_title, description: row.description, canonicalPathname: row.canonical_path || row.page_key });
      }
    }

    const pages = catalog.map((page) => {
      const published = publicRecord(overrides.get(page.pageKey));
      const draft = draftByPage.get(page.pageKey);
      return {
        ...page,
        published,
        effective: published || normalizeMetadataRecord(page, page),
        draft: draft ? {
          id: draft.id,
          entityId: draft.entity_id,
          status: draft.status,
          comment: draft.comment,
          submittedAt: draft.submitted_at,
          metadata: approvalPayloadToRecord(draft.payload),
        } : null,
      };
    });

    return noStoreJson({ pages, role });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const body = await request.json().catch(() => ({}));
    const { normalizedPageKey, metadata } = validateMetadata(body.pageKey, body.metadata || {});
    const comment = String(body.comment || "").trim() || null;

    const { data: existing, error: existingError } = await adminClient
      .from("page_metadata")
      .select("*")
      .eq("page_key", normalizedPageKey)
      .maybeSingle();
    if (existingError) throw existingError;

    const isReviewer = role === "owner" || role === "superadmin";
    if (isReviewer) {
      const payload = toDatabasePayload(existing?.id || randomUUID(), normalizedPageKey, metadata, user.id);
      const { data, error } = await adminClient
        .from("page_metadata")
        .upsert(payload, { onConflict: "page_key" })
        .select()
        .single();
      if (error) throw error;

      const { data: openForPage, error: openForPageError } = await adminClient
        .from("approval_requests")
        .select("id,payload")
        .eq("entity_type", "page_metadata")
        .in("status", OPEN_STATUSES);
      if (openForPageError) throw openForPageError;
      const resolvedRequestIds = (openForPage || []).filter((row) => {
        const draftPayload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload || {};
        return normalizePageKey(draftPayload.page_key) === normalizedPageKey;
      }).map((row) => row.id);
      if (resolvedRequestIds.length) {
        const { error: resolveError } = await adminClient
          .from("approval_requests")
          .update({ status: "applied", approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .in("id", resolvedRequestIds);
        if (resolveError) throw resolveError;
      }

      revalidatePath(normalizedPageKey);
      return noStoreJson({ status: "published", metadata: publicRecord(data) });
    }

    const { data: openRequests, error: openError } = await adminClient
      .from("approval_requests")
      .select("*")
      .eq("entity_type", "page_metadata")
      .in("status", OPEN_STATUSES)
      .order("submitted_at", { ascending: false });
    if (openError) throw openError;

    const matchingDraft = (openRequests || []).find((row) => {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload || {};
      return normalizePageKey(payload.page_key) === normalizedPageKey;
    });
    if (matchingDraft && matchingDraft.submitted_by !== user.id) {
      const error = new Error("Another editor already has a pending metadata change for this page.");
      error.status = 409;
      throw error;
    }
    const recordId = existing?.id || matchingDraft?.entity_id || randomUUID();
    const payload = toDatabasePayload(recordId, normalizedPageKey, metadata, user.id);

    if (matchingDraft) {
      const { data, error } = await adminClient
        .from("approval_requests")
        .update({ payload, before_snapshot: existing || matchingDraft.before_snapshot, status: "pending", comment: comment ?? matchingDraft.comment, updated_at: new Date().toISOString() })
        .eq("id", matchingDraft.id)
        .select()
        .single();
      if (error) throw error;
      return noStoreJson({ status: "submitted", updated: true, request: data });
    }

    const { data, error } = await adminClient
      .from("approval_requests")
      .insert({
        entity_type: "page_metadata",
        action: existing ? "update" : "create",
        entity_id: recordId,
        payload,
        before_snapshot: existing || null,
        submitted_by: user.id,
        comment,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return noStoreJson({ status: "submitted", updated: false, request: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await requireAdminAccess(request, ["owner", "superadmin"]);
    const body = await request.json().catch(() => ({}));
    const pageKey = normalizePageKey(body.pageKey);
    if (!pageKey) {
      const error = new Error("A valid page path is required.");
      error.status = 400;
      throw error;
    }
    revalidatePath(pageKey);
    return noStoreJson({ revalidated: true, pageKey });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
