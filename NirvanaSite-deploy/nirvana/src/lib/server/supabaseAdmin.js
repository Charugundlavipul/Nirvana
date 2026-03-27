import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let adminClientSingleton = null;

function assertServerSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing server Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }
}

export function getSupabaseAdminClient() {
  if (adminClientSingleton) {
    return adminClientSingleton;
  }

  assertServerSupabaseEnv();
  adminClientSingleton = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClientSingleton;
}

export function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

export async function requireAdminAccess(
  request,
  allowedRoles = ["owner", "superadmin", "editor"]
) {
  const token = getBearerToken(request);
  if (!token) {
    const error = new Error("Missing admin access token.");
    error.status = 401;
    throw error;
  }

  const adminClient = getSupabaseAdminClient();
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user?.id) {
    const error = new Error("Invalid admin session.");
    error.status = 401;
    throw error;
  }

  const { data: adminRecord, error: adminError } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminRecord?.role) {
    const error = new Error("Admin access not found.");
    error.status = 403;
    throw error;
  }

  const normalizedRole = String(adminRecord.role || "").toLowerCase();
  if (!allowedRoles.includes(normalizedRole)) {
    const error = new Error("Insufficient admin permissions.");
    error.status = 403;
    throw error;
  }

  return {
    adminClient,
    user,
    role: normalizedRole,
  };
}
