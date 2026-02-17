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

