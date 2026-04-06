import { supabase } from "../supabaseClient";

export const SUPERADMIN_ROLES = ["owner", "superadmin"];

export const isSuperAdminRole = (role) => SUPERADMIN_ROLES.includes((role || "").toLowerCase());

export async function adminRequest(path, options = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Admin session is required.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Admin request failed.");
  }

  return payload;
}

export async function getCurrentAdminRole() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return null;
  return data?.role || null;
}

export async function submitApprovalRequest({
  entityType,
  action,
  entityId = null,
  payload,
  beforeSnapshot = null,
  submittedBy = null,
  comment = null,
}) {
  return supabase.from("approval_requests").insert({
    entity_type: entityType,
    action,
    entity_id: entityId,
    payload,
    before_snapshot: beforeSnapshot,
    submitted_by: submittedBy,
    comment,
    status: "pending",
  });
}

/**
 * Dedup-safe approval request submit.
 * If an open request already exists for the same entity_type + entity_id + action,
 * it updates the existing request instead of creating a duplicate.
 * Returns { data, error, updated: boolean }.
 */
export async function submitOrUpdateApproval({
  entityType,
  action,
  entityId = null,
  payload,
  beforeSnapshot = null,
  submittedBy = null,
  comment = null,
}) {
  try {
    const response = await adminRequest("/api/admin/drafts/merge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entityType,
        action,
        entityId,
        payload,
        beforeSnapshot,
        submittedBy,
        comment,
      }),
    });
    
    return { data: response.data, error: null, updated: response.updated };
  } catch (error) {
    console.error("Failed to merge approval draft via API:", error);
    return { data: null, error, updated: false };
  }
}

export async function fetchApprovalRequests(status = "pending") {
  let query = supabase
    .from("approval_requests")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (Array.isArray(status)) {
    query = query.in("status", status);
  } else if (status) {
    query = query.eq("status", status);
  }
  return query;
}

export const parseApprovalObject = (value) => {
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

export const getApprovalRequestPropertyId = (request) => {
  if (!request) return null;
  if (String(request.entity_type || "").toLowerCase() === "property" && request.entity_id) {
    return String(request.entity_id);
  }
  const payload = parseApprovalObject(request.payload);
  const before = parseApprovalObject(request.before_snapshot);
  const propertyId = payload.property_id || before.property_id || null;
  return propertyId ? String(propertyId) : null;
};

export async function fetchOpenPropertyRequests(propertyId, entityTypes = null) {
  if (!propertyId) return { data: [], error: null };
  const { data, error } = await fetchApprovalRequests(["pending", "revision_requested"]);
  if (error) return { data: [], error };

  const normalizedPropertyId = String(propertyId);
  let rows = (data || []).filter((row) => getApprovalRequestPropertyId(row) === normalizedPropertyId);
  if (Array.isArray(entityTypes) && entityTypes.length) {
    const allowed = new Set(entityTypes.map((v) => String(v || "").toLowerCase()));
    rows = rows.filter((row) => allowed.has(String(row.entity_type || "").toLowerCase()));
  }
  return { data: rows, error: null };
}

export async function findRevisionRequest(entityType, entityId) {
  if (!entityId) return null;
  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "revision_requested")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function findOpenRequest(entityType, entityId, action = null) {
  if (!entityId) return null;
  let query = supabase
    .from("approval_requests")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("status", ["pending", "revision_requested"])
    .order("submitted_at", { ascending: false })
    .limit(1);

  if (action) {
    query = query.eq("action", action);
  }

  const { data } = await query.maybeSingle();
  return data || null;
}

export async function resubmitApprovalRequest(requestId, newPayload, beforeSnapshot = null, comment = null) {
  const { data, error } = await supabase
    .from("approval_requests")
    .update({
      payload: newPayload,
      before_snapshot: beforeSnapshot,
      status: "pending",
      comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .maybeSingle();
      
  if (!error && !data) {
      return { data: null, error: new Error("Draft update failed: Check if you have permission to edit this request.") };
  }
  return { data, error };
}

export async function fetchMyPendingDrafts() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) return [];

  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("submitted_by", userData.user.id)
    .in("status", ["pending", "revision_requested"])
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending drafts:", error);
    return [];
  }
  return data || [];
}

export async function queueKnowledgeRefresh(payload = {}) {
  return adminRequest("/api/admin/knowledge/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
