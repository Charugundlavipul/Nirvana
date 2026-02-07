import React, { useEffect, useMemo, useState } from "react";
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
  if (normalized === "applied") return { color: "#065f46", background: "#d1fae5" };
  if (normalized === "rejected") return { color: "#991b1b", background: "#fee2e2" };
  return { color: "#334155", background: "#e2e8f0" };
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
          }
        : null;
    })
    .filter(Boolean);

  return rows.slice(0, 12);
};

const DiffPreview = ({ req }) => {
  const rows = useMemo(() => buildDiffRows(req), [req]);
  if (!rows.length) {
    return <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>No field-level preview available.</div>;
  }

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
            <td style={{ padding: "6px 4px", color: "#475569" }}>{row.oldValue}</td>
            <td style={{ padding: "6px 4px", color: "#0f766e" }}>{row.newValue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const EditorRequestCard = ({ req }) => {
  const badge = statusBadgeStyle(req.status);
  const ownerResponse = req.status !== "pending" ? req.comment : null;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <div>
          <strong>{req.entity_type}</strong> - <span>{req.action}</span>
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
          {req.status}
        </span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
        Submitted: {formatDateTime(req.submitted_at)}
      </div>

      <DiffPreview req={req} />

      <div style={{ marginTop: "10px", fontSize: "12px", color: "#334155" }}>
        <strong>Owner/Superadmin Message:</strong>{" "}
        {ownerResponse ? ownerResponse : req.status === "pending" ? "Pending review." : "No message provided."}
      </div>
      {req.approved_at ? (
        <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
          Last update: {formatDateTime(req.approved_at)}
        </div>
      ) : null}
    </div>
  );
};

const ApprovalQueue = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [comment, setComment] = useState({});
  const [workingId, setWorkingId] = useState(null);
  const [showRaw, setShowRaw] = useState({});

  const loadRequests = async () => {
    setLoading(true);
    const adminRole = await getCurrentAdminRole();
    setRole(adminRole);

    const statusFilter = isSuperAdminRole(adminRole) ? "pending" : null;
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

  if (!isSuperAdminRole(role)) {
    const pending = requests.filter((req) => req.status === "pending");
    const processed = requests.filter((req) => req.status !== "pending");

    return (
      <AdminLayout title="My Approval Requests" subtitle="Track your submitted changes and owner/superadmin replies">
        {loading ? <div style={cardStyle}>Loading requests...</div> : null}
        {!loading && requests.length === 0 ? <div style={cardStyle}>No requests submitted yet.</div> : null}

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

            <DiffPreview req={req} />

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

            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "center" }}>
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
    </AdminLayout>
  );
};

export default ApprovalQueue;
