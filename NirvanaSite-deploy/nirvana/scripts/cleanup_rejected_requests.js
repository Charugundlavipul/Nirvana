require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = !process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const HELP = process.argv.includes("--help") || process.argv.includes("-h");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.split("=")[1], 10) : null;
const PAGE_SIZE = 200;

const MANAGED_STORAGE_BUCKETS = new Set(["property-assets", "profile-pictures"]);
const STORAGE_PUBLIC_PATH_MARKER = "/storage/v1/object/public/";
const PREVIEW_IGNORED_KEYS = new Set([
  "__redacted",
  "id",
  "created_at",
  "updated_at",
  "submitted_by",
  "approved_by",
  "approval_request_id",
]);
const MEDIA_REFERENCE_TABLES = [
  { table: "property_images", column: "url" },
  { table: "property_curated_images", column: "url" },
  { table: "property_highlight_images", column: "url" },
  { table: "reviews", column: "avatar_url" },
  { table: "activities", column: "image_url" },
];
const MEDIA_ENTITY_TYPES = new Set([
  "property_image",
  "property_curated_image",
  "property_highlight_image",
  "review",
  "activity",
]);

if (HELP) {
  console.log("Cleanup stale rejected approval request data.");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/cleanup_rejected_requests.js           # dry-run");
  console.log("  node scripts/cleanup_rejected_requests.js --apply   # execute changes");
  console.log("  node scripts/cleanup_rejected_requests.js --apply --limit=100");
  console.log("  node scripts/cleanup_rejected_requests.js --verbose");
  process.exit(0);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY in .env.");
  process.exit(1);
}

if (Number.isNaN(LIMIT)) {
  console.error("Invalid --limit value.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const log = (...args) => console.log(...args);
const debug = (...args) => {
  if (VERBOSE) console.log(...args);
};

const parseSnapshot = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim());

const isLikelyImageUrl = (fieldKey, value) => {
  if (!isHttpUrl(value)) return false;
  const normalized = value.trim().toLowerCase();
  const key = String(fieldKey || "").toLowerCase();

  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/.test(normalized)) return true;
  if (key.includes("image") || key.includes("avatar") || key.includes("thumbnail")) return true;
  if (key === "url" && /(storage\/v1\/object|gallery|curated|highlight|property-assets)/.test(normalized)) return true;
  if (/(property-assets|gallery|highlights|curated|avatar)/.test(normalized)) return true;
  return false;
};

const extractManagedStorageAsset = (value) => {
  if (!isHttpUrl(value)) return null;
  try {
    const parsed = new URL(value.trim());
    const markerIndex = parsed.pathname.indexOf(STORAGE_PUBLIC_PATH_MARKER);
    if (markerIndex < 0) return null;
    const objectPart = parsed.pathname.slice(markerIndex + STORAGE_PUBLIC_PATH_MARKER.length);
    const chunks = objectPart.split("/").filter(Boolean);
    if (chunks.length < 2) return null;
    const bucket = chunks.shift();
    if (!MANAGED_STORAGE_BUCKETS.has(bucket)) return null;
    const path = decodeURIComponent(chunks.join("/"));
    if (!path) return null;
    return {
      bucket,
      path,
      canonicalUrl: `${parsed.origin}${parsed.pathname}`,
      key: `${bucket}:${path}`,
    };
  } catch {
    return null;
  }
};

const collectManagedStorageAssets = (value, map = new Map()) => {
  if (value === null || value === undefined) return map;
  if (typeof value === "string") {
    const asset = extractManagedStorageAsset(value);
    if (asset) map.set(asset.key, asset);
    return map;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectManagedStorageAssets(item, map));
    return map;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectManagedStorageAssets(item, map));
    return map;
  }
  return map;
};

const buildRejectedPayloadSummary = (req, removedMediaCount = 0) => {
  const payload = parseSnapshot(req?.payload);
  const entityType = String(req?.entity_type || "").toLowerCase();
  const summary = {
    __redacted: true,
    entity_type: entityType || null,
    action: req?.action || null,
    summary_label:
      payload.title ||
      payload.name ||
      payload.question ||
      payload.author_name ||
      payload.slot ||
      payload.slug ||
      null,
    submitted_field_count: 0,
    submitted_fields: [],
    had_media: false,
    removed_media_count: removedMediaCount,
    redacted_at: new Date().toISOString(),
  };

  const fieldEntries = Object.entries(payload).filter(([key]) => !PREVIEW_IGNORED_KEYS.has(key));
  const nonMediaFields = [];
  let hasMedia = false;
  fieldEntries.forEach(([key, rawValue]) => {
    if (isLikelyImageUrl(key, rawValue)) {
      hasMedia = true;
      return;
    }
    nonMediaFields.push(key);
  });

  summary.submitted_field_count = nonMediaFields.length;
  summary.submitted_fields = nonMediaFields.slice(0, 12);
  summary.had_media = hasMedia;

  if (entityType === "amenity") {
    if (payload.title) summary.title = String(payload.title);
    if (payload.icon_key) summary.icon_key = String(payload.icon_key);
    if (payload.description) summary.description = String(payload.description).slice(0, 180);
  }
  if (entityType === "property_curated_image") {
    if (payload.slot) summary.slot = String(payload.slot);
    if (payload.display_order !== undefined && payload.display_order !== null) summary.display_order = payload.display_order;
  }
  if (entityType === "property_image" || entityType === "property_highlight_image") {
    if (payload.category) summary.category = String(payload.category);
    if (payload.display_order !== undefined && payload.display_order !== null) summary.display_order = payload.display_order;
  }
  if (entityType === "property") {
    if (payload.name) summary.name = String(payload.name);
    if (payload.slug) summary.slug = String(payload.slug);
    if (payload.location) summary.location = String(payload.location);
  }

  return summary;
};

async function fetchRejectedRequests(limit = null) {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("approval_requests")
      .select("id,status,entity_type,action,payload,before_snapshot,submitted_at")
      .eq("status", "rejected")
      .order("submitted_at", { ascending: true })
      .range(from, to);

    if (limit !== null) {
      if (from >= limit) break;
      const cappedTo = Math.min(to, limit - 1);
      query = query.range(from, cappedTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function buildOpenAssetKeySet() {
  const set = new Set();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("approval_requests")
      .select("id,payload,before_snapshot")
      .in("status", ["pending", "revision_requested"])
      .range(from, to);
    if (error) throw error;
    const rows = data || [];

    rows.forEach((row) => {
      collectManagedStorageAssets(parseSnapshot(row.payload)).forEach((_, key) => set.add(key));
      collectManagedStorageAssets(parseSnapshot(row.before_snapshot)).forEach((_, key) => set.add(key));
    });

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return set;
}

async function isAssetUsedInLiveData(asset) {
  const checks = await Promise.all(
    MEDIA_REFERENCE_TABLES.map(async ({ table, column }) => {
      const result = await supabase.from(table).select("id").eq(column, asset.canonicalUrl).limit(1);
      return { table, result };
    })
  );

  return checks.some(({ table, result }) => {
    if (result.error) {
      debug(`Reference check failed for ${table}: ${result.error.message}`);
      return true;
    }
    return Array.isArray(result.data) && result.data.length > 0;
  });
}

async function processRejectedRequest(req, openAssetKeys) {
  const payload = parseSnapshot(req.payload);
  const before = parseSnapshot(req.before_snapshot);
  const alreadyRedacted = payload.__redacted === true && Object.keys(before).length === 0;

  if (alreadyRedacted) {
    return {
      id: req.id,
      redacted: false,
      skipped: true,
      deletedMedia: 0,
      reason: "already_redacted",
    };
  }

  const entityType = String(req.entity_type || "").toLowerCase();
  const payloadAssets = collectManagedStorageAssets(payload);
  const beforeAssets = collectManagedStorageAssets(before);
  const candidates = MEDIA_ENTITY_TYPES.has(entityType)
    ? Array.from(payloadAssets.values()).filter((asset) => !beforeAssets.has(asset.key))
    : [];

  let deletedMedia = 0;
  let skippedInUse = 0;
  let skippedOpen = 0;

  for (const asset of candidates) {
    if (openAssetKeys.has(asset.key)) {
      skippedOpen += 1;
      continue;
    }

    const inLiveData = await isAssetUsedInLiveData(asset);
    if (inLiveData) {
      skippedInUse += 1;
      continue;
    }

    if (DRY_RUN) {
      debug(`[dry-run] would delete ${asset.bucket}/${asset.path}`);
      deletedMedia += 1;
      continue;
    }

    const { error } = await supabase.storage.from(asset.bucket).remove([asset.path]);
    if (error) {
      debug(`Failed deleting ${asset.bucket}/${asset.path}: ${error.message}`);
      continue;
    }
    deletedMedia += 1;
  }

  const redactedPayload = buildRejectedPayloadSummary(req, deletedMedia);
  if (!DRY_RUN) {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        payload: redactedPayload,
        before_snapshot: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (error) {
      throw new Error(`Failed redacting request ${req.id}: ${error.message}`);
    }
  }

  return {
    id: req.id,
    redacted: true,
    skipped: false,
    deletedMedia,
    skippedInUse,
    skippedOpen,
  };
}

async function main() {
  log(`Mode: ${DRY_RUN ? "dry-run" : "apply"}`);
  if (LIMIT !== null) log(`Limit: ${LIMIT}`);

  const openAssetKeys = await buildOpenAssetKeySet();
  log(`Loaded ${openAssetKeys.size} media keys from open requests for safety checks.`);

  const rejectedRequests = await fetchRejectedRequests(LIMIT);
  log(`Found ${rejectedRequests.length} rejected requests.`);

  const totals = {
    processed: 0,
    skippedAlreadyRedacted: 0,
    redacted: 0,
    deletedMedia: 0,
    skippedInUse: 0,
    skippedOpen: 0,
  };

  for (const req of rejectedRequests) {
    const result = await processRejectedRequest(req, openAssetKeys);
    totals.processed += 1;

    if (result.skipped) {
      totals.skippedAlreadyRedacted += 1;
      continue;
    }

    if (result.redacted) totals.redacted += 1;
    totals.deletedMedia += result.deletedMedia || 0;
    totals.skippedInUse += result.skippedInUse || 0;
    totals.skippedOpen += result.skippedOpen || 0;

    if (VERBOSE) {
      log(
        `request ${result.id}: redacted=${result.redacted}, deleted_media=${result.deletedMedia}, skipped_in_use=${result.skippedInUse || 0}, skipped_open=${result.skippedOpen || 0}`
      );
    }
  }

  log("");
  log("Cleanup summary:");
  log(`- Processed: ${totals.processed}`);
  log(`- Redacted: ${totals.redacted}`);
  log(`- Already redacted: ${totals.skippedAlreadyRedacted}`);
  log(`- Media deletions (${DRY_RUN ? "would delete" : "deleted"}): ${totals.deletedMedia}`);
  log(`- Media skipped (in live data): ${totals.skippedInUse}`);
  log(`- Media skipped (open requests): ${totals.skippedOpen}`);
}

main().catch((error) => {
  console.error("Cleanup failed:", error.message || error);
  process.exit(1);
});
