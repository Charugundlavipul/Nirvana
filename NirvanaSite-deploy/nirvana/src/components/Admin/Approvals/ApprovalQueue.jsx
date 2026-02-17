import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import { supabase } from "../../../supabaseClient";
import { fetchApprovalRequests, getCurrentAdminRole, isSuperAdminRole } from "../../../lib/adminApi";

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
  is_published: "Published",
  url: "Image URL",
  slot: "Image Slot",
};

const friendlyFieldName = (key) => FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const PropertyPreviewCard = ({ payload }) => {
  if (!payload || typeof payload !== "object") return null;
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

const compactValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.trim() === "" ? "-" : value;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "[]";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
        newValue: compactValue(after[key]),
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
        oldValue: compactValue(before[key]),
        newValue: "(deleted)",
        oldRaw: before[key],
        newRaw: null,
      }))
      .slice(0, 12);
  }

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
    (key) => !ignored.has(key)
  );
  const rows = keys
    .map((key) => {
      const prev = getComparableValue(before, key);
      const next = getComparableValue(after, key);
      const changed = JSON.stringify(prev) !== JSON.stringify(next);
      return changed
        ? {
          key,
          oldValue: compactValue(prev),
          newValue: compactValue(next),
          oldRaw: prev,
          newRaw: next,
        }
        : null;
    })
    .filter(Boolean);

  return rows.slice(0, 12);
};

const DiffPreview = ({ req, enableImagePreview = false, onPreviewImage = null }) => {
  const rows = useMemo(() => buildDiffRows(req), [req]);
  if (!rows.length) {
    return <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>No field-level preview available.</div>;
  }

  const renderCell = (fieldKey, displayValue, rawValue) => {
    const canPreview = enableImagePreview && isLikelyImageUrl(fieldKey, rawValue);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ wordBreak: "break-word" }}>{displayValue}</span>
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
              {renderCell(row.key, row.oldValue, row.oldRaw)}
            </td>
            <td style={{ padding: "6px 4px", color: "#0f766e" }}>
              {renderCell(row.key, row.newValue, row.newRaw)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const EditorRequestCard = ({ req, onRevise }) => {
  const badge = statusBadgeStyle(req.status);
  const isRevision = req.status === "revision_requested";
  const ownerResponse = req.status !== "pending" ? req.comment : null;

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

      <PropertyPreviewCard payload={req.payload} />

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

      {isRevision && req.entity_type === "property" && req.entity_id && (
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

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [comment, setComment] = useState({});
  const [workingId, setWorkingId] = useState(null);
  const [showRaw, setShowRaw] = useState({});
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    const adminRole = await getCurrentAdminRole();
    setRole(adminRole);

    const statusFilter = isSuperAdminRole(adminRole) ? ["pending", "revision_requested"] : null;
    const { data: reqData, error: reqError } = await fetchApprovalRequests(statusFilter);

    if (reqError) {
      console.error(reqError);
      setRequests([]);
    } else {
      const hydrated = await hydrateMissingSnapshots(reqData || []);
      setRequests(hydrated);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (requestId, decision) => {
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

  if (!isSuperAdminRole(role)) {
    const revisionNeeded = requests.filter((req) => req.status === "revision_requested");
    const pending = requests.filter((req) => req.status === "pending");
    const processed = requests.filter((req) => req.status !== "pending" && req.status !== "revision_requested");

    return (
      <AdminLayout title="My Approval Requests" subtitle="Track your submitted changes and owner/superadmin replies">
        {loading ? <div style={cardStyle}>Loading requests...</div> : null}
        {!loading && requests.length === 0 ? <div style={cardStyle}>No requests submitted yet.</div> : null}

        {!loading && revisionNeeded.length > 0 ? <h3 style={{ margin: "4px 0 10px", color: "#b45309" }}>⚠️ Revisions Needed</h3> : null}
        {!loading && revisionNeeded.map((req) => <EditorRequestCard key={req.id} req={req} onRevise={handleRevise} />)}

        {!loading && pending.length > 0 ? <h3 style={{ margin: "4px 0 10px" }}>Pending</h3> : null}
        {!loading && pending.map((req) => <EditorRequestCard key={req.id} req={req} />)}

        {!loading && processed.length > 0 ? <h3 style={{ margin: "16px 0 10px" }}>Processed</h3> : null}
        {!loading && processed.map((req) => <EditorRequestCard key={req.id} req={req} />)}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Approval Queue" subtitle="Review pending requests with quick before/after preview">
      {loading ? (
        <div style={cardStyle}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={cardStyle}>No pending requests.</div>
      ) : (
        requests.map((req) => (
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

            {req.comment ? (
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

            <PropertyPreviewCard payload={req.payload} />

            <DiffPreview req={req} enableImagePreview onPreviewImage={(url) => setPreviewImageUrl(url)} />

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
                onClick={() => handleDecision(req.id, "rejected")}
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
                  handleDecision(req.id, "revision_requested");
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
                onClick={() => handleDecision(req.id, "approved")}
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
        ))
      )}
      {previewImageUrl ? (
        <div
          onClick={() => setPreviewImageUrl(null)}
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
                onClick={() => setPreviewImageUrl(null)}
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
                src={previewImageUrl}
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
      ) : null}
    </AdminLayout>
  );
};

export default ApprovalQueue;
