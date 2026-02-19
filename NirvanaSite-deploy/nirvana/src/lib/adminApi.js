import { supabase } from "../supabaseClient";

export const SUPERADMIN_ROLES = ["owner", "superadmin"];

export const isSuperAdminRole = (role) => SUPERADMIN_ROLES.includes((role || "").toLowerCase());

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
  return supabase
    .from("approval_requests")
    .update({
      payload: newPayload,
      before_snapshot: beforeSnapshot,
      status: "pending",
      comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
}
