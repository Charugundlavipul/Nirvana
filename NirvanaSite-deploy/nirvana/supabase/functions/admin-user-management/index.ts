import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ROLE_SET = new Set(["owner", "admin", "employee"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const error = (message: string, status = 400) => json({ error: message }, status);

const normalizeRole = (value: unknown) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "superadmin") return "admin";
  if (role === "editor" || role === "viewer") return "employee";
  return role;
};

const listAllAuthUsers = async (admin: ReturnType<typeof createClient>) => {
  const users: any[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const chunk = data?.users || [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }
  return users;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("Method not allowed", 405);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return error("Missing Supabase environment variables in function", 500);
  }

  try {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return error("Unauthorized", 401);
    const actorId = authData.user.id;

    const { data: actorRoleRow, error: actorRoleError } = await adminClient
      .from("admin_users")
      .select("role")
      .eq("user_id", actorId)
      .maybeSingle();
    if (actorRoleError) return error(actorRoleError.message, 500);

    const actorRole = normalizeRole(actorRoleRow?.role);
    if (actorRole !== "owner") return error("Forbidden: owner access required", 403);

    const body = await req.json();
    const action = String(body?.action || "").trim().toLowerCase();

    if (action === "list") {
      const { data: adminRows, error: adminRowsError } = await adminClient
        .from("admin_users")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false });
      if (adminRowsError) return error(adminRowsError.message, 500);

      const authUsers = await listAllAuthUsers(adminClient);
      const emailById = new Map(
        (authUsers || []).map((u: any) => [
          u?.id,
          {
            email: u?.email || "",
            last_sign_in_at: u?.last_sign_in_at || null,
            user_created_at: u?.created_at || null,
          },
        ]),
      );

      const users = (adminRows || []).map((r) => {
        const authMeta = emailById.get(r.user_id) || { email: "", last_sign_in_at: null, user_created_at: null };
        return {
          user_id: r.user_id,
          role: r.role,
          created_at: r.created_at,
          email: authMeta.email,
          last_sign_in_at: authMeta.last_sign_in_at,
          user_created_at: authMeta.user_created_at,
        };
      });

      return json({ users });
    }

    if (action === "create") {
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");
      const role = normalizeRole(body?.role);
      const firstName = String(body?.firstName || "").trim().slice(0, 100);
      const lastName = String(body?.lastName || "").trim().slice(0, 100);
      if (!email) return error("Email is required");
      if (!password || password.length < 8) return error("Password must be at least 8 chars");
      if (!ROLE_SET.has(role)) return error("Invalid role");

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) return error(createError.message, 400);

      const newUserId = created?.user?.id;
      if (!newUserId) return error("User creation failed", 500);

      const { error: roleError } = await adminClient.from("admin_users").upsert({
        user_id: newUserId,
        role,
      });
      if (roleError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return error(roleError.message, 500);
      }

      const { error: profileError } = await adminClient.from("employee_directory").upsert({
        user_id: newUserId,
        first_name: firstName,
        last_name: lastName,
      });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return error(profileError.message, 500);
      }

      return json({ ok: true, user_id: newUserId, email, role });
    }

    if (action === "update_role") {
      const userId = String(body?.userId || "").trim();
      const role = normalizeRole(body?.role);
      if (!userId) return error("userId is required");
      if (userId === actorId) return error("You cannot change your own owner role", 400);
      if (!ROLE_SET.has(role)) return error("Invalid role");

      const { error: updateErr } = await adminClient
        .from("admin_users")
        .upsert({ user_id: userId, role });
      if (updateErr) return error(updateErr.message, 500);

      return json({ ok: true });
    }

    if (action === "update_email") {
      const userId = String(body?.userId || "").trim();
      const email = String(body?.email || "").trim().toLowerCase();
      if (!userId || !email) return error("userId and email are required");

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, { email });
      if (updateErr) return error(updateErr.message, 400);

      return json({ ok: true });
    }

    if (action === "update_password") {
      const userId = String(body?.userId || "").trim();
      const password = String(body?.password || "");
      if (!userId) return error("userId is required");
      if (!password || password.length < 8) return error("Password must be at least 8 chars");

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (updateErr) return error(updateErr.message, 400);

      return json({ ok: true });
    }

    if (action === "delete" || action === "set_active") {
      const userId = String(body?.userId || "").trim();
      if (!userId) return error("userId is required");
      if (userId === actorId) return error("You cannot deactivate your own account", 400);
      const active = action === "set_active" ? Boolean(body?.active) : false;

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: active ? "none" : "876000h",
      });
      if (authUpdateError) return error(authUpdateError.message, 400);
      const { error: profileUpdateError } = await adminClient
        .from("employee_private_profiles")
        .update({ employment_status: active ? "active" : "inactive" })
        .eq("user_id", userId);
      if (profileUpdateError) return error(profileUpdateError.message, 500);

      return json({ ok: true, active });
    }

    return error("Unknown action", 400);
  } catch (e) {
    return error(e?.message || "Unexpected server error", 500);
  }
});
