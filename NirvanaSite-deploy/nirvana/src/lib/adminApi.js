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

  if (status) query = query.eq("status", status);
  return query;
}
