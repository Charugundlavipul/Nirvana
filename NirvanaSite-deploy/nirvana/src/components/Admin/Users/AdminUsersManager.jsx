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
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Create New Admin</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px auto", gap: "10px" }}>
          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}
          />
          <input
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
            style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={busyUserId === "create"}
            style={{ padding: "10px 14px", border: "none", background: "#10b981", color: "#fff", borderRadius: "6px", cursor: "pointer" }}
          >
            {busyUserId === "create" ? "Creating..." : "Create Admin"}
          </button>
        </div>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          Passwords are never viewable. To change a password, type a new one and click Save Changes.
        </p>
      </div>

      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h3 style={{ margin: 0 }}>Existing Admins ({users.length})</h3>
          <input
            placeholder="Search by email/role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "260px", padding: "9px 10px", border: "1px solid #ddd", borderRadius: "6px" }}
          />
        </div>

        {error ? <div style={{ color: "#b91c1c", marginBottom: "8px" }}>{error}</div> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visibleUsers.map((u) => {
            const row = getRowState(u);
            return (
              <div key={u.user_id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                  User ID: {u.user_id}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "8px", alignItems: "center" }}>
                  <input
                    value={row.email}
                    onChange={(e) => setRowState(u.user_id, { email: e.target.value })}
                    placeholder="Email"
                    style={{ padding: "9px 10px", border: "1px solid #ddd", borderRadius: "6px" }}
                  />
                  <select
                    value={row.role}
                    onChange={(e) => setRowState(u.user_id, { role: e.target.value })}
                    style={{ padding: "9px 10px", border: "1px solid #ddd", borderRadius: "6px" }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "8px" }}>
                  <input
                    placeholder="New password (optional)"
                    type="password"
                    value={row.password}
                    onChange={(e) => setRowState(u.user_id, { password: e.target.value })}
                    style={{ padding: "9px 10px", border: "1px solid #ddd", borderRadius: "6px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    onClick={() => handleSaveUser(u)}
                    disabled={busyUserId === u.user_id || !rowHasChanges(u, row)}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {busyUserId === u.user_id ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => handleDelete(u.user_id, u.email)}
                    disabled={busyUserId === u.user_id}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ef4444",
                      borderRadius: "6px",
                      background: "#fff",
                      color: "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    Delete User
                  </button>
                </div>
              </div>
            );
          })}
          {visibleUsers.length === 0 ? <div style={{ color: "#666" }}>No admin users found.</div> : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersManager;
