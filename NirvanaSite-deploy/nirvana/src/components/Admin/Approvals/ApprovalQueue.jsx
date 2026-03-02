import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../supabaseClient";
import { fetchApprovalRequests, getCurrentAdminRole, isSuperAdminRole } from "../../../lib/adminApi";
import { getAmenityIcon } from "../../../lib/amenityIcons.jsx";
import { normalizePropertySpaces, summarizeSpaces } from "../../../lib/propertySpaces";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "#fff",
  padding: "14px",
  marginBottom: "12px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  marginTop: "8px",
};

const preStyle = {
  background: "#0b1020",
  color: "#d1d5db",
  borderRadius: "8px",
  padding: "10px",
  maxHeight: "220px",
  overflow: "auto",
  fontSize: "12px",
};

const previewButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 8px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  lineHeight: 1.6,
};

const sectionHeadingStyle = {
  marginTop: "12px",
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const ENTITY_TABLE_BY_TYPE = {
  property: "properties",
  review: "reviews",
  faq: "faqs",
  activity: "activities",
  amenity: "amenities",
  property_image: "property_images",
  property_curated_image: "property_curated_images",
  property_highlight_image: "property_highlight_images",
};

const MANAGED_STORAGE_BUCKETS = new Set(["property-assets", "profile-pictures"]);
const STORAGE_PUBLIC_PATH_MARKER = "/storage/v1/object/public/";
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

const statusBadgeStyle = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") return { color: "#b45309", background: "#fef3c7" };
  if (normalized === "applied" || normalized === "approved") return { color: "#065f46", background: "#d1fae5" };
  if (normalized === "rejected") return { color: "#991b1b", background: "#fee2e2" };
  if (normalized === "revision_requested") return { color: "#9a3412", background: "#ffedd5" };
  return { color: "#334155", background: "#e2e8f0" };
};

const friendlyStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "revision_requested") return "Revision Requested";
  return status;
};

const FIELD_LABELS = {
  name: "Property Name",
  slug: "URL Slug",
  location: "Location",
  booking_url: "Booking URL",
  description: "Description",
  guests_max: "Max Guests",
  bedroom_count: "Bedrooms",
  bathroom_count: "Bathrooms",
  bed_details: "Bed Details",
  bath_details: "Bath Details",
  pet_friendly: "Pet Friendly",
  pet_fee: "Pet Fee",
  hot_tub: "Hot Tub",
  spaces: "Spaces",
  is_published: "Published",
  summary_label: "Requested Item",
  submitted_fields: "Submitted Fields",
  submitted_field_count: "Field Count",
  had_media: "Included Media",
  removed_media_count: "Removed Media Files",
  redacted_at: "Redacted At",
  url: "Image URL",
  slot: "Image Slot",
  property_id: "Property",
  property_ids: "Properties",
};

const PREVIEW_IGNORED_KEYS = new Set([
  "__redacted",
  "id",
  "created_at",
  "updated_at",
  "submitted_by",
  "approved_by",
  "approval_request_id",
]);

const friendlyFieldName = (key) => FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const resolvePropertyValue = (key, value, propertyNamesById) => {
  if (!propertyNamesById || typeof propertyNamesById !== "object") return null;
  if (key === "property_id" && typeof value === "string" && propertyNamesById[value]) {
    return propertyNamesById[value];
  }
  if (key === "property_ids" && Array.isArray(value)) {
    const names = value.map((id) => propertyNamesById[id] || id);
    return names.join(", ");
  }
  return null;
};

const SpaceImageList = ({ space, onPreviewImage }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const images = space.images || [];
  const remaining = images.length - visibleCount;
  const canPreview = typeof onPreviewImage === "function";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#fff",
        padding: "10px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
        {space.name}
        <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "6px", fontSize: "12px" }}>
          ({images.length} {images.length === 1 ? "image" : "images"})
        </span>
      </div>
      {images.length > 0 ? (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {images.slice(0, visibleCount).map((image, idx) => {
            const label = image.name || `Image ${idx + 1}`;
            const content = (
              <>
                <img
                  src={image.url}
                  alt={label}
                  style={{
                    width: "100%",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "5px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <span
                  style={{
                    marginTop: "3px",
                    fontSize: "10px",
                    color: "#64748b",
                    textAlign: "center",
                    wordBreak: "break-word",
                    lineHeight: 1.3,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={label}
                >
                  {label}
                </span>
              </>
            );

            if (canPreview) {
              return (
                <button
                  key={image.id || idx}
                  type="button"
                  onClick={() => onPreviewImage(image.url)}
                  style={{
                    width: "84px",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {content}
                </button>
              );
            }
            return (
              <div
                key={image.id || idx}
                style={{ width: "84px", display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {content}
              </div>
            );
          })}
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 5)}
              style={{
                minWidth: "84px",
                height: "60px",
                borderRadius: "5px",
                border: "1px dashed #cbd5e1",
                background: "#fff",
                color: "#0f766e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              +{remaining} more
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>No images in this space.</div>
      )}
    </div>
  );
};

const PropertyPreviewCard = ({ payload, onPreviewImage }) => {
  if (!payload || typeof payload !== "object") return null;
  const spaces = normalizePropertySpaces(payload.spaces);
  const previewStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    padding: "16px",
    marginBottom: "12px",
  };
  return (
    <div style={previewStyle}>
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "#0f172a" }}>{payload.name || "Untitled"}</h4>
          {payload.location && <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>📍 {payload.location}</p>}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#475569", marginTop: "8px" }}>
            {payload.guests_max && <span>👥 {payload.guests_max} Guests</span>}
            {payload.bedroom_count && <span>🛏️ {payload.bedroom_count} Bedrooms</span>}
            {payload.bathroom_count && <span>🚿 {payload.bathroom_count} Bathrooms</span>}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", marginTop: "8px" }}>
            {payload.pet_friendly && <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "999px" }}>🐾 Pet Friendly</span>}
            {payload.hot_tub && <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "999px" }}>♨️ Hot Tub</span>}
            {payload.is_published === false && <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "999px" }}>Draft</span>}
            {payload.is_published === true && <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "999px" }}>Published</span>}
          </div>
          {payload.booking_url && <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#0f766e", wordBreak: "break-all" }}>🔗 {payload.booking_url}</p>}
        </div>
      </div>
      {payload.description && (
        <div style={{ marginTop: "12px", padding: "10px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", maxHeight: "120px", overflow: "auto" }}>
          <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8" }}>Description</strong>
          <div style={{ marginTop: "4px" }} dangerouslySetInnerHTML={{ __html: payload.description }} />
        </div>
      )}
      <div style={{ marginTop: "12px", padding: "10px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155" }}>
        <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8" }}>Spaces</strong>
        <div style={{ marginTop: "4px", fontWeight: 600, color: "#0f172a" }}>{summarizeSpaces(spaces)}</div>
        {spaces.length ? (
          <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
            {spaces.map((space) => (
              <SpaceImageList key={space.id} space={space} onPreviewImage={onPreviewImage} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: "6px", color: "#64748b", fontSize: "12px" }}>No spaces in this request.</div>
        )}
      </div>
    </div>
  );
};

const collectImageFields = (obj) => {
  if (!obj || typeof obj !== "object") return [];
  const seen = new Set();
  return Object.entries(obj)
    .filter(([fieldKey, value]) => isLikelyImageUrl(fieldKey, value))
    .map(([fieldKey, value]) => ({
      fieldKey,
      url: typeof value === "string" ? value.trim() : String(value || ""),
    }))
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
};

const normalizeAmenityPreview = (source) => {
  if (!source || typeof source !== "object") return null;
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const description = typeof source.description === "string" ? source.description.trim() : "";
  const icon_key = typeof source.icon_key === "string" ? source.icon_key.trim() : "";
  if (!title && !description && !icon_key) return null;
  return { title, description, icon_key };
};

const AmenityPreviewTile = ({ label, data }) => {
  if (!data) return null;
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#fff",
        padding: "10px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#0f766e",
            flexShrink: 0,
          }}
        >
          {getAmenityIcon(data.title, data.icon_key)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
            {data.title || "Untitled"}
          </div>
          {data.description ? (
            <div style={{ marginTop: "3px", fontSize: "12px", color: "#475569", wordBreak: "break-word" }}>
              {data.description}
            </div>
          ) : null}
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", wordBreak: "break-word" }}>
            Icon key: {data.icon_key || "(from title mapping)"}
          </div>
        </div>
      </div>
    </div>
  );
};

const RequestEntityPreviewCard = ({ req, onPreviewImage = null, propertyNamesById = {} }) => {
  if (!req) return null;
  const entityType = String(req.entity_type || "").toLowerCase();
  if (entityType === "property") return null;

  const action = String(req.action || "").toLowerCase();
  const payload = parseSnapshot(req.payload);
  const before = parseSnapshot(req.before_snapshot);
  const isRedacted = payload.__redacted === true;
  const mergedRequested = { ...before, ...payload };
  const currentData = action === "create" ? null : before;
  const requestedData = action === "delete" ? null : mergedRequested;
  const previewSource = requestedData || currentData || payload || before;
  const isAmenity = entityType === "amenity";
  const currentAmenity = isAmenity ? normalizeAmenityPreview(currentData) : null;
  const requestedAmenity = isAmenity ? normalizeAmenityPreview(requestedData) : null;
  const hasAmenityPreview = !!currentAmenity || !!requestedAmenity;

  const summaryRows = Object.entries(previewSource || {})
    .filter(([key, value]) => !PREVIEW_IGNORED_KEYS.has(key) && !isLikelyImageUrl(key, value))
    .filter(([key]) => !(isAmenity && (key === "title" || key === "description" || key === "icon_key")))
    .filter(([, value]) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === ""))
    .slice(0, 8);

  const currentImages = collectImageFields(currentData);
  const requestedImages = collectImageFields(requestedData);
  const canPreview = typeof onPreviewImage === "function";
  const title =
    requestedData?.title ||
    requestedData?.name ||
    requestedData?.slot ||
    currentData?.title ||
    currentData?.name ||
    currentData?.slot ||
    null;

  if (!summaryRows.length && !currentImages.length && !requestedImages.length && !hasAmenityPreview) {
    return null;
  }

  const renderImageRow = (label, images) => {
    if (!images.length) return null;
    return (
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>{label}</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {images.map((item, index) => (
            <div
              key={`${label}-${item.fieldKey}-${index}`}
              style={{
                width: "112px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#fff",
                padding: "6px",
              }}
            >
              <img
                src={item.url}
                alt={item.fieldKey}
                style={{ width: "100%", height: "74px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e2e8f0" }}
              />
              <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>
                {friendlyFieldName(item.fieldKey)}
              </div>
              {canPreview ? (
                <button type="button" style={{ ...previewButtonStyle, marginTop: "6px" }} onClick={() => onPreviewImage(item.url)}>
                  Preview
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#f8fafc",
        padding: "12px",
        marginBottom: "12px",
      }}
    >
      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "12px", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {friendlyFieldName(req.entity_type)}
        </strong>
        {title ? (
          <span style={{ fontSize: "13px", color: "#334155" }}>{title}</span>
        ) : null}
      </div>

      {action === "delete" ? (
        <div style={{ marginBottom: "8px", fontSize: "12px", color: "#991b1b", fontWeight: 600 }}>
          This request deletes the current record.
        </div>
      ) : null}
      {isRedacted ? (
        <div style={{ marginBottom: "8px", fontSize: "12px", color: "#334155" }}>
          Detailed payload was removed after rejection to conserve storage.
        </div>
      ) : null}

      {isAmenity && hasAmenityPreview ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: action === "update" && currentAmenity && requestedAmenity ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr",
            gap: "8px",
            marginBottom: summaryRows.length || currentImages.length || requestedImages.length ? "10px" : 0,
          }}
        >
          {action !== "create" ? <AmenityPreviewTile label="Current Amenity" data={currentAmenity} /> : null}
          {action !== "delete" ? (
            <AmenityPreviewTile
              label={action === "update" ? "Requested Amenity" : "Amenity Preview"}
              data={requestedAmenity}
            />
          ) : null}
        </div>
      ) : null}

      {summaryRows.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "8px",
            marginBottom: currentImages.length || requestedImages.length ? "10px" : 0,
          }}
        >
          {summaryRows.map(([key, value]) => (
            <div
              key={key}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px",
                minHeight: "54px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                {friendlyFieldName(key)}
              </div>
              <div style={{ marginTop: "3px", fontSize: "13px", color: "#0f172a", wordBreak: "break-word" }}>
                {resolvePropertyValue(key, value, propertyNamesById) || compactValue(value)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "10px" }}>
        {renderImageRow("Current Images", currentImages)}
        {renderImageRow(action === "update" ? "Requested Images" : "Requested Image", requestedImages)}
      </div>
    </div>
  );
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const compactValue = (value, key = null) => {
  if (value === null || value === undefined) return "-";
  if (key === "spaces") return summarizeSpaces(value);
  if (typeof value === "string") return value.trim() === "" ? "-" : value;
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.join(", ");
    }
    return `${value.length} items`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getSpaceDiffKey = (space, index) => {
  if (space?.id) return `id:${space.id}`;
  const normalizedName = String(space?.name || "").trim().toLowerCase();
  if (normalizedName) return `name:${normalizedName}`;
  return `idx:${index}`;
};

const buildSpacesDiff = (beforeRaw, afterRaw) => {
  const beforeSpaces = normalizePropertySpaces(beforeRaw);
  const afterSpaces = normalizePropertySpaces(afterRaw);

  const beforeByKey = new Map();
  beforeSpaces.forEach((space, index) => beforeByKey.set(getSpaceDiffKey(space, index), space));

  const afterByKey = new Map();
  afterSpaces.forEach((space, index) => afterByKey.set(getSpaceDiffKey(space, index), space));

  const addedSpaces = [];
  const removedSpaces = [];
  const renamedSpaces = [];
  const addedImages = [];
  const removedImages = [];
  const renamedImages = [];

  afterByKey.forEach((space, key) => {
    if (!beforeByKey.has(key)) {
      addedSpaces.push(space);
      (space?.images || [])
        .filter((image) => image?.url)
        .forEach((image) => {
          addedImages.push({
            spaceName: space?.name || "Unnamed Space",
            image,
            reason: "space_added",
          });
        });
    }
  });

  beforeByKey.forEach((space, key) => {
    if (!afterByKey.has(key)) {
      removedSpaces.push(space);
      (space?.images || [])
        .filter((image) => image?.url)
        .forEach((image) => {
          removedImages.push({
            spaceName: space?.name || "Unnamed Space",
            image,
            reason: "space_removed",
          });
        });
    }
  });

  afterByKey.forEach((afterSpace, key) => {
    if (!beforeByKey.has(key)) return;
    const beforeSpace = beforeByKey.get(key);

    const beforeName = String(beforeSpace?.name || "").trim();
    const afterName = String(afterSpace?.name || "").trim();
    if (beforeName !== afterName) {
      renamedSpaces.push({ beforeName, afterName });
    }

    const beforeImageByUrl = new Map(
      (beforeSpace?.images || [])
        .filter((image) => image?.url)
        .map((image) => [image.url, image])
    );
    const afterImageByUrl = new Map(
      (afterSpace?.images || [])
        .filter((image) => image?.url)
        .map((image) => [image.url, image])
    );

    afterImageByUrl.forEach((image, url) => {
      if (!beforeImageByUrl.has(url)) {
        addedImages.push({
          spaceName: afterName || afterSpace?.name || "Unnamed Space",
          image,
          reason: "image_added",
        });
        return;
      }

      const beforeImage = beforeImageByUrl.get(url);
      const beforeImageName = String(beforeImage?.name || "").trim();
      const afterImageName = String(image?.name || "").trim();
      if (beforeImageName !== afterImageName) {
        renamedImages.push({
          spaceName: afterName || beforeName || afterSpace?.name || "Unnamed Space",
          url,
          beforeName: beforeImageName,
          afterName: afterImageName,
          image,
        });
      }
    });

    beforeImageByUrl.forEach((image, url) => {
      if (!afterImageByUrl.has(url)) {
        removedImages.push({
          spaceName: beforeName || beforeSpace?.name || "Unnamed Space",
          image,
          reason: "image_removed",
        });
      }
    });
  });

  return {
    beforeSpaces,
    afterSpaces,
    addedSpaces,
    removedSpaces,
    renamedSpaces,
    addedImages,
    removedImages,
    renamedImages,
  };
};

const getSpaceImageLabel = (image) => {
  const explicitName = String(image?.name || "").trim();
  if (explicitName) return explicitName;
  const url = String(image?.url || "").trim();
  if (!url) return "(unnamed image)";
  try {
    const parsed = new URL(url);
    const file = parsed.pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(file) || url;
  } catch {
    const file = url.split("?")[0].split("/").pop() || "";
    return decodeURIComponent(file) || url;
  }
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

const getComparableValue = (obj, key) => {
  if (!obj || typeof obj !== "object") return undefined;
  return obj[key];
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
    const canonicalUrl = `${parsed.origin}${parsed.pathname}`;
    if (!path) return null;
    return { bucket, path, canonicalUrl, key: `${bucket}:${path}` };
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

const removeRejectedRequestAssets = async (req) => {
  const entityType = String(req?.entity_type || "").toLowerCase();
  if (!MEDIA_ENTITY_TYPES.has(entityType)) return { removed: 0 };

  const payloadAssets = collectManagedStorageAssets(parseSnapshot(req?.payload));
  if (!payloadAssets.size) return { removed: 0 };
  const beforeAssets = collectManagedStorageAssets(parseSnapshot(req?.before_snapshot));
  const candidates = Array.from(payloadAssets.values()).filter((asset) => !beforeAssets.has(asset.key));
  if (!candidates.length) return { removed: 0 };

  const openAssetKeys = new Set();
  const { data: openRequests, error: openRequestsError } = await supabase
    .from("approval_requests")
    .select("id,payload,before_snapshot")
    .in("status", ["pending", "revision_requested"])
    .neq("id", req.id);
  if (openRequestsError) {
    console.error("Failed loading open requests for media cleanup safety check:", openRequestsError);
  } else {
    (openRequests || []).forEach((row) => {
      collectManagedStorageAssets(parseSnapshot(row.payload)).forEach((_, key) => openAssetKeys.add(key));
      collectManagedStorageAssets(parseSnapshot(row.before_snapshot)).forEach((_, key) => openAssetKeys.add(key));
    });
  }

  let removed = 0;
  for (const asset of candidates) {
    if (openAssetKeys.has(asset.key)) continue;

    let inUse = false;
    try {
      const checks = await Promise.all(
        MEDIA_REFERENCE_TABLES.map(async ({ table, column }) => {
          const result = await supabase.from(table).select("id").eq(column, asset.canonicalUrl).limit(1);
          return { table, result };
        })
      );
      inUse = checks.some(({ table, result }) => {
        if (result.error) {
          console.error(`Failed checking live media reference in ${table}:`, result.error);
          return true;
        }
        return Array.isArray(result.data) && result.data.length > 0;
      });
    } catch (error) {
      console.error("Failed checking live media references:", error);
      inUse = true;
    }

    if (inUse) continue;
    const { error } = await supabase.storage.from(asset.bucket).remove([asset.path]);
    if (error) {
      console.error(`Failed deleting rejected media ${asset.key}:`, error);
      continue;
    }
    removed += 1;
  }

  return { removed };
};

const redactRejectedRequestData = async (req, removedMediaCount = 0) => {
  const redactedPayload = buildRejectedPayloadSummary(req, removedMediaCount);
  return supabase
    .from("approval_requests")
    .update({
      payload: redactedPayload,
      before_snapshot: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id);
};

const fetchLinkedPropertyIds = async (entityType, entityId) => {
  if (!entityId) return [];
  if (entityType === "review") {
    const { data } = await supabase.from("property_reviews").select("property_id").eq("review_id", entityId);
    return (data || []).map((row) => row.property_id);
  }
  if (entityType === "faq") {
    const { data } = await supabase.from("property_faqs").select("property_id").eq("faq_id", entityId);
    return (data || []).map((row) => row.property_id);
  }
  if (entityType === "activity") {
    const { data } = await supabase.from("property_activities").select("property_id").eq("activity_id", entityId);
    return (data || []).map((row) => row.property_id);
  }
  return [];
};

const fetchLiveSnapshotForRequest = async (req) => {
  const entityType = String(req?.entity_type || "").toLowerCase();
  const action = String(req?.action || "").toLowerCase();
  const entityId = req?.entity_id;
  if (!entityId || action === "create") return null;

  const tableName = ENTITY_TABLE_BY_TYPE[entityType];
  if (!tableName) return null;

  const { data, error } = await supabase.from(tableName).select("*").eq("id", entityId).maybeSingle();
  if (error || !data) return null;

  if (entityType === "review" || entityType === "faq" || entityType === "activity") {
    const propertyIds = await fetchLinkedPropertyIds(entityType, entityId);
    return { ...data, property_ids: propertyIds };
  }

  return data;
};

const hydrateMissingSnapshots = async (rows) => {
  const list = rows || [];
  const hydrated = await Promise.all(
    list.map(async (req) => {
      const action = String(req?.action || "").toLowerCase();
      const hasSnapshot = !!req?.before_snapshot;
      if (hasSnapshot || action === "create") return req;
      const liveSnapshot = await fetchLiveSnapshotForRequest(req);
      if (!liveSnapshot) return req;
      return { ...req, before_snapshot: liveSnapshot };
    })
  );
  return hydrated;
};

const emptyPropertyDraftBundle = () => ({
  curated: [],
  gallery: [],
  amenities: [],
});

const buildPropertyDraftBundleMap = async (rows) => {
  const propertyIds = Array.from(
    new Set(
      (rows || [])
        .filter((req) => String(req?.entity_type || "").toLowerCase() === "property" && req?.entity_id)
        .map((req) => String(req.entity_id))
    )
  );

  if (!propertyIds.length) return {};

  const [curatedRes, galleryRes, amenitiesRes] = await Promise.all([
    supabase
      .from("property_curated_images")
      .select("property_id,slot,url,display_order")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("property_images")
      .select("property_id,url,display_order")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("amenities")
      .select("property_id,title,description,icon_key")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: true }),
  ]);

  const bundles = propertyIds.reduce((acc, propertyId) => {
    acc[propertyId] = emptyPropertyDraftBundle();
    return acc;
  }, {});

  if (curatedRes.error) {
    console.error("Failed to load curated draft images for approval queue:", curatedRes.error);
  } else {
    (curatedRes.data || []).forEach((row) => {
      const propertyId = String(row.property_id);
      if (!bundles[propertyId]) bundles[propertyId] = emptyPropertyDraftBundle();
      bundles[propertyId].curated.push(row);
    });
  }

  if (galleryRes.error) {
    console.error("Failed to load draft gallery images for approval queue:", galleryRes.error);
  } else {
    (galleryRes.data || []).forEach((row) => {
      const propertyId = String(row.property_id);
      if (!bundles[propertyId]) bundles[propertyId] = emptyPropertyDraftBundle();
      bundles[propertyId].gallery.push(row);
    });
  }

  if (amenitiesRes.error) {
    console.error("Failed to load draft amenities for approval queue:", amenitiesRes.error);
  } else {
    (amenitiesRes.data || []).forEach((row) => {
      const propertyId = String(row.property_id);
      if (!bundles[propertyId]) bundles[propertyId] = emptyPropertyDraftBundle();
      bundles[propertyId].amenities.push(row);
    });
  }

  return bundles;
};

const buildDiffRows = (req) => {
  const action = String(req?.action || "").toLowerCase();
  const before = parseSnapshot(req?.before_snapshot);
  const after = req?.payload && typeof req.payload === "object" ? req.payload : {};
  const ignored = new Set(["id", "created_at", "updated_at", "submitted_by", "approved_by"]);

  if (action === "create") {
    return Object.keys(after)
      .filter((key) => !ignored.has(key))
      .map((key) => ({
        key,
        oldValue: "-",
        newValue: compactValue(after[key], key),
        oldRaw: null,
        newRaw: after[key],
      }))
      .slice(0, 12);
  }

  if (action === "delete") {
    return Object.keys(before)
      .filter((key) => !ignored.has(key))
      .map((key) => ({
        key,
        oldValue: compactValue(before[key], key),
        newValue: "(deleted)",
        oldRaw: before[key],
        newRaw: null,
      }))
      .slice(0, 12);
  }

  // For update requests, payload is often partial. Merge with current snapshot so
  // omitted fields are treated as unchanged instead of "removed".
  const mergedAfter = { ...before, ...after };
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(mergedAfter)])).filter(
    (key) => !ignored.has(key)
  );
  const rows = keys
    .map((key) => {
      const prev = getComparableValue(before, key);
      const next = getComparableValue(mergedAfter, key);
      const changed = JSON.stringify(prev) !== JSON.stringify(next);
      return changed
        ? {
          key,
          oldValue: compactValue(prev, key),
          newValue: compactValue(next, key),
          oldRaw: prev,
          newRaw: next,
        }
        : null;
    })
    .filter(Boolean);

  return rows.slice(0, 12);
};

const requestHasSpacesChange = (req) => {
  const rows = buildDiffRows(req);
  return rows.some((row) => row.key === "spaces");
};

const getRequestPrimaryLabel = (req) => {
  const payload = parseSnapshot(req?.payload);
  const before = parseSnapshot(req?.before_snapshot);
  const merged = { ...before, ...payload };
  return (
    merged.name ||
    merged.title ||
    merged.question ||
    merged.author_name ||
    merged.slot ||
    merged.slug ||
    merged.url ||
    null
  );
};

const buildRequestSummaryData = (req) => {
  const rows = buildDiffRows(req);
  const action = String(req?.action || "").toLowerCase();
  const entityType = String(req?.entity_type || "").toLowerCase();
  const label = getRequestPrimaryLabel(req);
  const chips = [];
  const highlights = [];

  if (action === "create") chips.push("Create request");
  if (action === "update") chips.push("Update request");
  if (action === "delete") chips.push("Delete request");

  chips.push(`${rows.length} changed fields`);

  const imageRows = rows.filter((row) => isLikelyImageUrl(row.key, row.newRaw) || isLikelyImageUrl(row.key, row.oldRaw));
  if (imageRows.length) chips.push(`${imageRows.length} media field changes`);

  const changedFieldNames = rows
    .map((row) => friendlyFieldName(row.key))
    .filter(Boolean)
    .slice(0, 6);
  if (changedFieldNames.length) {
    highlights.push(`Changed fields: ${changedFieldNames.join(", ")}`);
  }

  const spacesRow = rows.find((row) => row.key === "spaces");
  if (spacesRow) {
    const spacesDiff = buildSpacesDiff(spacesRow.oldRaw, spacesRow.newRaw);
    const netSpaceDelta = spacesDiff.afterSpaces.length - spacesDiff.beforeSpaces.length;
    if (spacesDiff.addedSpaces.length) {
      highlights.push(`Spaces added: ${spacesDiff.addedSpaces.map((space) => space.name || "Unnamed Space").join(", ")}`);
    }
    if (spacesDiff.removedSpaces.length) {
      highlights.push(`Spaces removed: ${spacesDiff.removedSpaces.map((space) => space.name || "Unnamed Space").join(", ")}`);
    }
    if (spacesDiff.renamedSpaces.length) {
      highlights.push(
        `Spaces renamed: ${spacesDiff.renamedSpaces
          .map((item) => `${item.beforeName || "Unnamed"} -> ${item.afterName || "Unnamed"}`)
          .join(", ")}`
      );
    }
    if (spacesDiff.addedImages.length || spacesDiff.removedImages.length) {
      highlights.push(
        `Space image changes: +${spacesDiff.addedImages.length} / -${spacesDiff.removedImages.length}`
      );
    }
    if (spacesDiff.renamedImages.length) {
      highlights.push(`Image names updated: ${spacesDiff.renamedImages.length}`);
    }
    chips.push(`Space delta ${netSpaceDelta >= 0 ? `+${netSpaceDelta}` : `${netSpaceDelta}`}`);
  }

  if (entityType === "property" && rows.some((row) => row.key === "is_published")) {
    chips.push("Publish state changed");
  }

  return {
    title: `${friendlyFieldName(req?.entity_type)} ${action}${label ? `: ${label}` : ""}`,
    chips,
    highlights,
  };
};

const RequestSummaryCard = ({ req }) => {
  const summary = useMemo(() => buildRequestSummaryData(req), [req]);
  return (
    <div
      style={{
        marginTop: "10px",
        marginBottom: "10px",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#f8fafc",
        padding: "12px",
      }}
    >
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", fontWeight: 700 }}>
        At a glance
      </div>
      <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
        {summary.title}
      </div>

      {summary.chips.length ? (
        <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {summary.chips.map((chip, index) => (
            <span
              key={`${req?.id}-summary-chip-${index}`}
              style={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "999px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {summary.highlights.length ? (
        <div style={{ marginTop: "8px", display: "grid", gap: "4px" }}>
          {summary.highlights.slice(0, 4).map((item, index) => (
            <div key={`${req?.id}-summary-highlight-${index}`} style={{ fontSize: "12px", color: "#475569" }}>
              - {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DiffPreview = ({ req, enableImagePreview = false, onPreviewImage = null, propertyNamesById = {} }) => {
  const rows = useMemo(() => buildDiffRows(req), [req]);
  if (!rows.length) {
    return <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>No field-level preview available.</div>;
  }

  const renderSpacesCell = (row, mode) => {
    const diff = buildSpacesDiff(row.oldRaw, row.newRaw);
    const isRequested = mode === "requested";
    const spaces = isRequested ? diff.afterSpaces : diff.beforeSpaces;
    const imageChanges = isRequested ? diff.addedImages : diff.removedImages;
    const imageChangesLabel = isRequested ? "Added images" : "Removed images";

    return (
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontWeight: 600, color: isRequested ? "#0f766e" : "#334155" }}>
          {summarizeSpaces(spaces)}
        </div>

        {spaces.length ? (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {spaces.slice(0, 10).map((space, index) => (
              <span
                key={`${mode}-space-${space.id || index}`}
                style={{
                  fontSize: "11px",
                  padding: "4px 7px",
                  borderRadius: "999px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={`${space.name || "Unnamed Space"} (${space.images?.length || 0} images)`}
              >
                {space.name || "Unnamed Space"} ({space.images?.length || 0})
              </span>
            ))}
            {spaces.length > 10 ? (
              <span style={{ fontSize: "11px", color: "#64748b" }}>+{spaces.length - 10} more</span>
            ) : null}
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "#64748b" }}>No spaces</div>
        )}

        {isRequested && diff.addedSpaces.length ? (
          <div style={{ fontSize: "11px", color: "#166534" }}>
            <strong>Added spaces:</strong>{" "}
            {diff.addedSpaces.map((space) => space.name || "Unnamed Space").join(", ")}
          </div>
        ) : null}

        {isRequested && diff.renamedSpaces.length ? (
          <div style={{ fontSize: "11px", color: "#0f766e" }}>
            <strong>Renamed spaces:</strong>{" "}
            {diff.renamedSpaces
              .map((item) => `${item.beforeName || "Unnamed"} -> ${item.afterName || "Unnamed"}`)
              .join(", ")}
          </div>
        ) : null}

        {!isRequested && diff.removedSpaces.length ? (
          <div style={{ fontSize: "11px", color: "#991b1b" }}>
            <strong>Removed spaces:</strong>{" "}
            {diff.removedSpaces.map((space) => space.name || "Unnamed Space").join(", ")}
          </div>
        ) : null}

        {imageChanges.length ? (
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: isRequested ? "#166534" : "#991b1b" }}>
              {imageChangesLabel}: {imageChanges.length}
            </div>
            {imageChanges.slice(0, 10).map((item, index) => (
              <div key={`${mode}-image-change-${index}`} style={{ fontSize: "11px", color: "#475569", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{item.spaceName}:</span>
                <span>{getSpaceImageLabel(item.image)}</span>
                {item.reason === "space_added" ? (
                  <span style={{ fontSize: "10px", color: "#166534" }}>(from new space)</span>
                ) : null}
                {item.reason === "space_removed" ? (
                  <span style={{ fontSize: "10px", color: "#991b1b" }}>(from removed space)</span>
                ) : null}
                {enableImagePreview && typeof onPreviewImage === "function" && item.image?.url ? (
                  <button type="button" style={previewButtonStyle} onClick={() => onPreviewImage(item.image.url)}>
                    Preview
                  </button>
                ) : null}
              </div>
            ))}
            {imageChanges.length > 10 ? (
              <div style={{ fontSize: "11px", color: "#64748b" }}>+{imageChanges.length - 10} more changes</div>
            ) : null}
          </div>
        ) : null}

        {isRequested && diff.renamedImages.length ? (
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f766e" }}>
              Updated image names: {diff.renamedImages.length}
            </div>
            {diff.renamedImages.slice(0, 10).map((item, index) => (
              <div key={`renamed-image-${index}`} style={{ fontSize: "11px", color: "#475569", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{item.spaceName}:</span>
                <span>
                  {(item.beforeName || "(empty)") + " -> " + (item.afterName || "(empty)")}
                </span>
                {enableImagePreview && typeof onPreviewImage === "function" && item.image?.url ? (
                  <button type="button" style={previewButtonStyle} onClick={() => onPreviewImage(item.image.url)}>
                    Preview
                  </button>
                ) : null}
              </div>
            ))}
            {diff.renamedImages.length > 10 ? (
              <div style={{ fontSize: "11px", color: "#64748b" }}>+{diff.renamedImages.length - 10} more name updates</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderCell = (fieldKey, displayValue, rawValue) => {
    const canPreview = enableImagePreview && isLikelyImageUrl(fieldKey, rawValue);
    const resolved = resolvePropertyValue(fieldKey, rawValue, propertyNamesById);
    const resolvedDisplay = resolved || displayValue;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ wordBreak: "break-word" }}>{resolvedDisplay}</span>
        {canPreview && typeof onPreviewImage === "function" ? (
          <button type="button" style={previewButtonStyle} onClick={() => onPreviewImage(rawValue)}>
            Preview
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <table style={tableStyle}>
      <thead>
        <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
          <th style={{ padding: "6px 4px" }}>Field</th>
          <th style={{ padding: "6px 4px" }}>Current</th>
          <th style={{ padding: "6px 4px" }}>Requested</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "6px 4px", fontWeight: 600 }}>{row.key}</td>
            <td style={{ padding: "6px 4px", color: "#475569" }}>
              {row.key === "spaces"
                ? renderSpacesCell(row, "current")
                : renderCell(row.key, row.oldValue, row.oldRaw)}
            </td>
            <td style={{ padding: "6px 4px", color: "#0f766e" }}>
              {row.key === "spaces"
                ? renderSpacesCell(row, "requested")
                : renderCell(row.key, row.newValue, row.newRaw)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const PropertyDraftBundleCard = ({ bundle, onPreviewImage = null }) => {
  const [galleryVisible, setGalleryVisible] = useState(6);
  const [amenitiesVisible, setAmenitiesVisible] = useState(10);

  if (!bundle) return null;

  const curated = bundle.curated || [];
  const gallery = bundle.gallery || [];
  const amenities = bundle.amenities || [];
  const hasAnyDraftContent = curated.length > 0 || gallery.length > 0 || amenities.length > 0;
  if (!hasAnyDraftContent) return null;

  const canPreview = typeof onPreviewImage === "function";
  const renderThumb = (item, label, key) => {
    const thumb = (
      <>
        <img
          src={item.url}
          alt={label}
          style={{
            width: "100%",
            height: "68px",
            objectFit: "cover",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        />
        <span style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>{label}</span>
      </>
    );

    if (!canPreview) {
      return (
        <div
          key={key}
          style={{ width: "92px", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {thumb}
        </div>
      );
    }

    return (
      <button
        key={key}
        type="button"
        onClick={() => onPreviewImage(item.url)}
        style={{
          width: "92px",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {thumb}
      </button>
    );
  };

  const galleryRemaining = gallery.length - galleryVisible;
  const amenitiesRemaining = amenities.length - amenitiesVisible;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#f8fafc",
        padding: "12px",
        marginBottom: "12px",
      }}
    >
      <strong style={{ fontSize: "12px", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        Draft Content Snapshot
      </strong>

      <div style={{ marginTop: "10px", display: "grid", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Key Images ({curated.length})
          </div>
          {curated.length ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {curated.map((item, idx) => renderThumb(item, item.slot || "image", `curated-${item.slot || idx}`))}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>No curated images in draft.</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Gallery ({gallery.length})
          </div>
          {gallery.length ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {gallery.slice(0, galleryVisible).map((item, idx) => renderThumb(item, `#${idx + 1}`, `gallery-${idx}`))}
              {galleryRemaining > 0 ? (
                <button
                  type="button"
                  onClick={() => setGalleryVisible((prev) => prev + 5)}
                  style={{
                    minWidth: "92px",
                    height: "68px",
                    borderRadius: "6px",
                    border: "1px dashed #cbd5e1",
                    background: "#fff",
                    color: "#0f766e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +{galleryRemaining} more
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>No gallery images in draft.</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Amenities ({amenities.length})
          </div>
          {amenities.length ? (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {amenities.slice(0, amenitiesVisible).map((item, idx) => (
                <span
                  key={`amenity-${item.title || idx}-${idx}`}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    color: "#334155",
                  }}
                >
                  {item.title || "Untitled"}
                </span>
              ))}
              {amenitiesRemaining > 0 ? (
                <button
                  type="button"
                  onClick={() => setAmenitiesVisible((prev) => prev + 10)}
                  style={{
                    fontSize: "12px",
                    color: "#0f766e",
                    alignSelf: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "4px 8px",
                  }}
                >
                  +{amenitiesRemaining} more
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>No amenities in draft.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditorRequestCard = ({ req, onRevise, propertyDraftBundle = null, onPreviewImage = null, propertyNamesById = {} }) => {
  const badge = statusBadgeStyle(req.status);
  const isRevision = req.status === "revision_requested";
  const ownerResponse = req.status !== "pending" ? req.comment : null;
  const entityType = String(req?.entity_type || "").toLowerCase();
  const isPropertyRequest = entityType === "property";
  const hasSpacesChange = useMemo(() => requestHasSpacesChange(req), [req]);
  const hidePropertyPreviewForSpaces = isPropertyRequest && hasSpacesChange;

  return (
    <div style={{ ...cardStyle, borderLeft: isRevision ? "4px solid #f59e0b" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <div>
          <strong>{friendlyFieldName(req.entity_type)}</strong> - <span>{req.action}</span>
        </div>
        <span
          style={{
            ...badge,
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: "999px",
            textTransform: "uppercase",
          }}
        >
          {friendlyStatus(req.status)}
        </span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
        Submitted: {formatDateTime(req.submitted_at)}
      </div>

      {isRevision && ownerResponse && (
        <div style={{
          marginTop: "10px",
          padding: "12px 14px",
          background: "#fffbeb",
          border: "1px solid #fbbf24",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#92400e",
        }}>
          <strong>⚠️ Revision Requested:</strong>
          <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>{ownerResponse}</p>
        </div>
      )}

      <div style={sectionHeadingStyle}>Requested Changes</div>
      <DiffPreview req={req} enableImagePreview onPreviewImage={onPreviewImage} propertyNamesById={propertyNamesById} />

      {!hidePropertyPreviewForSpaces ? (
        <>
          <div style={sectionHeadingStyle}>Preview</div>
          {isPropertyRequest ? (
            <>
              <PropertyPreviewCard payload={req.payload} onPreviewImage={onPreviewImage} />
              <PropertyDraftBundleCard bundle={propertyDraftBundle} onPreviewImage={onPreviewImage} />
            </>
          ) : (
            <RequestEntityPreviewCard req={req} onPreviewImage={onPreviewImage} propertyNamesById={propertyNamesById} />
          )}
        </>
      ) : (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
          Space update detected. Use the Requested Changes section for detailed space/image diffs.
        </div>
      )}

      {!isRevision && (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#334155" }}>
          <strong>Owner/Superadmin Message:</strong>{" "}
          {ownerResponse ? ownerResponse : req.status === "pending" ? "Pending review." : "No message provided."}
        </div>
      )}
      {req.approved_at ? (
        <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
          Last update: {formatDateTime(req.approved_at)}
        </div>
      ) : null}

      {isRevision && isPropertyRequest && req.entity_id && (
        <div style={{ marginTop: "12px" }}>
          <button
            type="button"
            onClick={() => onRevise && onRevise(req)}
            style={{
              padding: "10px 18px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ✏️ Revise & Resubmit
          </button>
        </div>
      )}
    </div>
  );
};

const ImagePreviewModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(96vw, 1100px)",
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <strong style={{ fontSize: "14px", color: "#0f172a" }}>Image Preview</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: "12px", overflow: "auto", background: "#f8fafc" }}>
          <img
            src={imageUrl}
            alt="Approval preview"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(90vh - 80px)",
              margin: "0 auto",
              objectFit: "contain",
              borderRadius: "8px",
              background: "#fff",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [comment, setComment] = useState({});
  const [workingId, setWorkingId] = useState(null);
  const [showRaw, setShowRaw] = useState({});
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [propertyDraftBundlesById, setPropertyDraftBundlesById] = useState({});
  const [propertyNamesById, setPropertyNamesById] = useState({});
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    const adminRole = await getCurrentAdminRole();
    setRole(adminRole);

    // Fetch property names for ID -> name resolution
    const { data: propsData } = await supabase.from("properties").select("id,name");
    if (propsData) {
      const map = {};
      propsData.forEach((p) => { map[p.id] = p.name; });
      setPropertyNamesById(map);
    }

    const statusFilter = isSuperAdminRole(adminRole) ? ["pending", "revision_requested"] : null;
    const { data: reqData, error: reqError } = await fetchApprovalRequests(statusFilter);

    if (reqError) {
      console.error(reqError);
      setRequests([]);
      setPropertyDraftBundlesById({});
    } else {
      const hydrated = await hydrateMissingSnapshots(reqData || []);
      const bundleMap = await buildPropertyDraftBundleMap(hydrated);
      setRequests(hydrated);
      setPropertyDraftBundlesById(bundleMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (req, decision) => {
    if (!req?.id) return;
    const requestId = req.id;
    setWorkingId(requestId);
    const decisionComment = comment[requestId] || null;
    const { error } = await supabase.rpc("apply_approval_request", {
      p_request_id: requestId,
      p_new_status: decision,
      p_comment: decisionComment,
    });

    if (error) {
      alert(`Failed to ${decision}: ${error.message}`);
    } else {
      if (decision === "rejected") {
        let removedMediaCount = 0;
        try {
          const cleanup = await removeRejectedRequestAssets(req);
          removedMediaCount = cleanup?.removed || 0;
        } catch (cleanupError) {
          console.error("Rejected request media cleanup failed:", cleanupError);
        }

        const { error: redactError } = await redactRejectedRequestData(req, removedMediaCount);
        if (redactError) {
          console.error("Failed to redact rejected request payload:", redactError);
        }
      }
      await loadRequests();
    }
    setWorkingId(null);
  };

  const handleRevise = async (req) => {
    // Navigate to the property editor so the editor can make changes
    if (req.entity_type === "property" && req.entity_id) {
      // Look up the property slug
      const { data } = await supabase.from("properties").select("slug").eq("id", req.entity_id).maybeSingle();
      if (data?.slug) {
        navigate(`/admin/properties/${data.slug}`);
      } else {
        alert("Could not find the property to revise.");
      }
    }
  };

  const getPropertyDraftBundle = (req) => {
    if (String(req?.entity_type || "").toLowerCase() !== "property" || !req?.entity_id) {
      return null;
    }
    return propertyDraftBundlesById[String(req.entity_id)] || null;
  };

  const superAdminFilteredRequests = useMemo(() => {
    if (!isSuperAdminRole(role)) return requests;
    return (requests || []).filter((req) => {
      const entityType = String(req?.entity_type || "").toLowerCase();
      const action = String(req?.action || "").toLowerCase();
      const primaryLabel = String(getRequestPrimaryLabel(req) || "").toLowerCase();
      const note = String(req?.comment || "").toLowerCase();
      const requestId = String(req?.id || "").toLowerCase();
      const query = String(searchText || "").trim().toLowerCase();

      if (entityFilter !== "all" && entityType !== entityFilter) return false;
      if (actionFilter !== "all" && action !== actionFilter) return false;
      if (!query) return true;

      return (
        entityType.includes(query) ||
        action.includes(query) ||
        primaryLabel.includes(query) ||
        note.includes(query) ||
        requestId.includes(query)
      );
    });
  }, [requests, role, entityFilter, actionFilter, searchText]);

  const superAdminOverview = useMemo(() => {
    const source = superAdminFilteredRequests;
    const byEntity = {};
    const byAction = {};
    source.forEach((req) => {
      const entityType = String(req?.entity_type || "").toLowerCase() || "unknown";
      const action = String(req?.action || "").toLowerCase() || "unknown";
      byEntity[entityType] = (byEntity[entityType] || 0) + 1;
      byAction[action] = (byAction[action] || 0) + 1;
    });
    return { total: source.length, byEntity, byAction };
  }, [superAdminFilteredRequests]);

  const superAdminAllEntityCounts = useMemo(() => {
    const byEntity = {};
    (requests || []).forEach((req) => {
      const entityType = String(req?.entity_type || "").toLowerCase() || "unknown";
      byEntity[entityType] = (byEntity[entityType] || 0) + 1;
    });
    return byEntity;
  }, [requests]);

  if (!isSuperAdminRole(role)) {
    const revisionNeeded = requests.filter((req) => req.status === "revision_requested");
    const pending = requests.filter((req) => req.status === "pending");
    const processed = requests.filter((req) => req.status !== "pending" && req.status !== "revision_requested");

    return (
      <AdminLayout title="My Approval Requests" subtitle="Track your submitted changes and owner/superadmin replies">
        {loading ? <div style={cardStyle}>Loading requests...</div> : null}
        {!loading && requests.length === 0 ? <div style={cardStyle}>No requests submitted yet.</div> : null}

        {!loading && revisionNeeded.length > 0 ? <h3 style={{ margin: "4px 0 10px", color: "#b45309" }}>⚠️ Revisions Needed</h3> : null}
        {!loading &&
          revisionNeeded.map((req) => (
            <EditorRequestCard
              key={req.id}
              req={req}
              onRevise={handleRevise}
              propertyDraftBundle={getPropertyDraftBundle(req)}
              onPreviewImage={(url) => setPreviewImageUrl(url)}
              propertyNamesById={propertyNamesById}
            />
          ))}

        {!loading && pending.length > 0 ? <h3 style={{ margin: "4px 0 10px" }}>Pending</h3> : null}
        {!loading &&
          pending.map((req) => (
            <EditorRequestCard
              key={req.id}
              req={req}
              propertyDraftBundle={getPropertyDraftBundle(req)}
              onPreviewImage={(url) => setPreviewImageUrl(url)}
              propertyNamesById={propertyNamesById}
            />
          ))}

        {!loading && processed.length > 0 ? <h3 style={{ margin: "16px 0 10px" }}>Processed</h3> : null}
        {!loading &&
          processed.map((req) => (
            <EditorRequestCard
              key={req.id}
              req={req}
              propertyDraftBundle={getPropertyDraftBundle(req)}
              onPreviewImage={(url) => setPreviewImageUrl(url)}
              propertyNamesById={propertyNamesById}
            />
          ))}
        <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Approval Queue" subtitle="Review pending requests with quick before/after preview">
      <div style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12px", color: "#475569" }}>
            Showing <strong>{superAdminOverview.total}</strong> request(s)
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {Object.entries(superAdminOverview.byAction).map(([action, count]) => (
              <span
                key={`action-overview-${action}`}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 600,
                }}
              >
                {action}: {count}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: "8px" }}>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by entity, item name, note, or request ID"
            style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}
          />

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", background: "#fff" }}
          >
            <option value="all">All entities</option>
            {Object.keys(superAdminAllEntityCounts)
              .sort()
              .map((entity) => (
                <option key={`entity-filter-${entity}`} value={entity}>
                  {friendlyFieldName(entity)} ({superAdminAllEntityCounts[entity]})
                </option>
              ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", background: "#fff" }}
          >
            <option value="all">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading requests...</div>
      ) : superAdminFilteredRequests.length === 0 ? (
        <div style={cardStyle}>No pending requests.</div>
      ) : (
        superAdminFilteredRequests.map((req) => {
          const propertyDraftBundle = getPropertyDraftBundle(req);
          const isPropertyRequest = String(req?.entity_type || "").toLowerCase() === "property";
          const hasSpacesChange = requestHasSpacesChange(req);
          const hidePropertyPreviewForSpaces = isPropertyRequest && hasSpacesChange;
          return (
            <div key={req.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div>
                  <strong>{req.entity_type}</strong> - <span>{req.action}</span>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Submitted: {formatDateTime(req.submitted_at)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Request ID: {req.id}</div>
                </div>
                <div>
                  <span
                    style={{
                      ...statusBadgeStyle(req.status),
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "999px",
                      textTransform: "uppercase",
                    }}
                  >
                    {req.status}
                  </span>
                </div>
              </div>

              {req.comment && req.status === "pending" ? (
                <div style={{ marginBottom: "8px", fontSize: "13px", color: "#444" }}>
                  <strong>Editor Note:</strong> {req.comment}
                </div>
              ) : null}

              {req.status === "revision_requested" && (
                <div style={{
                  marginBottom: "10px",
                  padding: "10px 14px",
                  background: "#fffbeb",
                  border: "1px solid #fbbf24",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#92400e",
                }}>
                  <strong>Previous Revision Note:</strong> {req.comment || "No note provided."}
                </div>
              )}

              <RequestSummaryCard req={req} />

              <div style={sectionHeadingStyle}>Requested Changes</div>
              <DiffPreview req={req} enableImagePreview onPreviewImage={(url) => setPreviewImageUrl(url)} propertyNamesById={propertyNamesById} />

              {!hidePropertyPreviewForSpaces ? (
                <>
                  <div style={sectionHeadingStyle}>Preview</div>
                  {isPropertyRequest ? (
                    <>
                      <PropertyPreviewCard payload={req.payload} onPreviewImage={(url) => setPreviewImageUrl(url)} />
                      <PropertyDraftBundleCard
                        bundle={propertyDraftBundle}
                        onPreviewImage={(url) => setPreviewImageUrl(url)}
                      />
                    </>
                  ) : (
                    <RequestEntityPreviewCard req={req} onPreviewImage={(url) => setPreviewImageUrl(url)} propertyNamesById={propertyNamesById} />
                  )}
                </>
              ) : (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
                  Space update detected. Use the Requested Changes section for detailed space/image diffs.
                </div>
              )}

              <div style={{ marginTop: "8px" }}>
                <button
                  onClick={() => setShowRaw((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {showRaw[req.id] ? "Hide Raw Payload" : "Show Raw Payload"}
                </button>
              </div>

              {showRaw[req.id] ? <pre style={preStyle}>{JSON.stringify(req.payload || {}, null, 2)}</pre> : null}

              <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "8px", alignItems: "center" }}>
                <input
                  value={comment[req.id] || ""}
                  onChange={(e) => setComment((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Message back to editor (optional)..."
                  style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}
                />
                <button
                  onClick={() => handleDecision(req, "rejected")}
                  disabled={workingId === req.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    background: "#fff",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    if (!comment[req.id]?.trim()) {
                      alert("Please add a message explaining what needs to be revised.");
                      return;
                    }
                    handleDecision(req, "revision_requested");
                  }}
                  disabled={workingId === req.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #f59e0b",
                    color: "#fff",
                    background: "#f59e0b",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Request Revision
                </button>
                <button
                  onClick={() => handleDecision(req, "approved")}
                  disabled={workingId === req.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #10b981",
                    color: "#fff",
                    background: "#10b981",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Approve & Publish
                </button>
              </div>
            </div>
          )
        })
      )}
      <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </AdminLayout>
  );
};

export default ApprovalQueue;
