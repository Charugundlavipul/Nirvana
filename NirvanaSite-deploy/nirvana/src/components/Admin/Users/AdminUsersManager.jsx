import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { getCurrentAdminRole, isSuperAdminRole } from "../../../lib/adminApi";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUserEmail,
  updateAdminUserPassword,
  updateAdminUserRole,
} from "../../../lib/adminUsersApi";

const ROLE_OPTIONS = ["superadmin", "owner", "editor"];

const panel = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "#fff",
  padding: "14px",
  marginBottom: "14px",
};

const AdminUsersManager = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "editor",
  });

  const [rowEdit, setRowEdit] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const currentRole = await getCurrentAdminRole();
      setRole(currentRole);
      if (!isSuperAdminRole(currentRole)) {
        setLoading(false);
        return;
      }
      const data = await listAdminUsers();
      setUsers(data?.users || []);
    } catch (e) {
      setError(e.message || "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.email || ""} ${u.role || ""}`.toLowerCase().includes(q)
    );
  }, [users, search]);

  const getRowState = (u) => {
    const current = rowEdit[u.user_id] || {};
    return {
      email: current.email ?? (u.email || ""),
      role: current.role ?? (u.role || "editor"),
      password: current.password ?? "",
    };
  };

  const setRowState = (userId, patch) => {
    setRowEdit((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        ...patch,
      },
    }));
  };

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password) {
      alert("Email and password are required.");
      return;
    }
    setBusyUserId("create");
    try {
      await createAdminUser(newUser);
      setNewUser({ email: "", password: "", role: "editor" });
      await load();
    } catch (e) {
      alert(e.message || "Failed to create admin user");
    } finally {
      setBusyUserId(null);
    }
  };

  const rowHasChanges = (user, row) => {
    const currentEmail = String(user.email || "").trim().toLowerCase();
    const nextEmail = String(row.email || "").trim().toLowerCase();
    const currentRole = String(user.role || "").trim().toLowerCase();
    const nextRole = String(row.role || "").trim().toLowerCase();
    return currentEmail !== nextEmail || currentRole !== nextRole || !!String(row.password || "").trim();
  };

  const handleSaveUser = async (user) => {
    const userId = user.user_id;
    const row = getRowState(user);
    const nextEmail = String(row.email || "").trim().toLowerCase();
    const nextRole = String(row.role || "").trim().toLowerCase();
    const nextPassword = String(row.password || "");
    const currentEmail = String(user.email || "").trim().toLowerCase();
    const currentRole = String(user.role || "").trim().toLowerCase();

    if (!rowHasChanges(user, row)) {
      alert("No changes to save.");
      return;
    }

    setBusyUserId(userId);
    try {
      if (nextEmail && nextEmail !== currentEmail) {
        await updateAdminUserEmail({ userId, email: nextEmail });
      }
      if (nextRole && nextRole !== currentRole) {
        await updateAdminUserRole({ userId, role: nextRole });
      }
      if (nextPassword) {
        await updateAdminUserPassword({ userId, password: nextPassword });
      }
      await load();
      alert("User updated successfully.");
    } catch (e) {
      alert(e.message || "Failed to update user");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Delete admin user ${email}? This is permanent.`)) return;
    setBusyUserId(userId);
    try {
      await deleteAdminUser({ userId });
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete user");
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Users" subtitle="Superadmin management panel">
        <div style={panel}>Loading...</div>
      </AdminLayout>
    );
  }

  if (!isSuperAdminRole(role)) {
    return (
      <AdminLayout title="Admin Users" subtitle="Superadmin management panel">
        <div style={panel}>
          <h3 style={{ margin: 0 }}>Access Restricted</h3>
          <p style={{ marginTop: "8px", color: "#555" }}>
            Only owner/superadmin can manage admin users.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Users" subtitle="Create admins and update credentials in one step">
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-800">Create New Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_auto] gap-4 items-center">
          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          />
          <input
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={busyUserId === "create"}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50 md:w-auto"
          >
            {busyUserId === "create" ? "Creating..." : "Create Admin"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Passwords are never viewable. To change a password, type a new one and click Save Changes.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h3 className="text-xl font-bold text-slate-800">Existing Admins ({users.length})</h3>
          <input
            placeholder="Search by email/role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 md:w-64"
          />
        </div>

        {error ? <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <div className="flex flex-col gap-4">
          {visibleUsers.map((u) => {
            const row = getRowState(u);
            const isChanged = rowHasChanges(u, row);
            return (
              <div key={u.user_id} className="rounded-xl border border-slate-200 p-5 transition-all hover:border-slate-300 hover:shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">ID: {u.user_id}</span>
                </div>
                <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                  <input
                    value={row.email}
                    onChange={(e) => setRowState(u.user_id, { email: e.target.value })}
                    placeholder="Email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <select
                    value={row.role}
                    onChange={(e) => setRowState(u.user_id, { role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <input
                    placeholder="New password (optional)"
                    type="password"
                    value={row.password}
                    onChange={(e) => setRowState(u.user_id, { password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSaveUser(u)}
                    disabled={busyUserId === u.user_id || !isChanged}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 disabled:bg-emerald-600/50 disabled:active:scale-100"
                  >
                    {busyUserId === u.user_id ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => handleDelete(u.user_id, u.email)}
                    disabled={busyUserId === u.user_id}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            );
          })}
          {visibleUsers.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">No admin users found.</div> : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersManager;
