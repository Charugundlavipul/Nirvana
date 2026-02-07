import { supabase } from "../supabaseClient";

async function invokeAdminUsers(action, payload = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Unauthorized: please sign in again.");
  }

  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: { action, ...payload },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listAdminUsers() {
  return invokeAdminUsers("list");
}

export async function createAdminUser({ email, password, role }) {
  return invokeAdminUsers("create", { email, password, role });
}

export async function updateAdminUserRole({ userId, role }) {
  return invokeAdminUsers("update_role", { userId, role });
}

export async function updateAdminUserEmail({ userId, email }) {
  return invokeAdminUsers("update_email", { userId, email });
}

export async function updateAdminUserPassword({ userId, password }) {
  return invokeAdminUsers("update_password", { userId, password });
}

export async function deleteAdminUser({ userId }) {
  return invokeAdminUsers("delete", { userId });
}
