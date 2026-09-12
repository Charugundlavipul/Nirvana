import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { getHrSummary, hrAction } from "../../../lib/hrApi";
import { formatRole, isOwnerRole } from "../../../lib/hr";
import styles from "./Hr.module.css";

export default function LeaveManager() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", dayPortion: "full", reason: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Superadmin view states
  const [activeTab, setActiveTab] = useState("all-requests"); // "all-requests" | "balances" | "my-leave"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "approved" | "rejected"
  const [requestSearch, setRequestSearch] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null); // { userId, name, allowanceDays, overrideReason }

  const load = async () => {
    const result = await getHrSummary();
    setData(result);
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const isOwner = isOwnerRole(data?.role);
  const year = data?.leave?.year || new Date().getFullYear();
  const personalBalance = data?.leave?.balance || { allowance: 0, approved: 0, pending: 0, available: 0 };
  const personalRequests = data?.leave?.requests || [];
  const allRequests = data?.leave?.allRequests || [];
  const employeeBalances = data?.leave?.employeeBalances || [];

  // Superadmin Request Filters
  const pendingRequestsCount = useMemo(
    () => allRequests.filter((r) => r.status === "pending").length,
    [allRequests]
  );
  const approvedRequestsCount = useMemo(
    () => allRequests.filter((r) => r.status === "approved").length,
    [allRequests]
  );
  const rejectedRequestsCount = useMemo(
    () => allRequests.filter((r) => ["rejected", "cancelled", "reversed"].includes(r.status)).length,
    [allRequests]
  );

  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (statusFilter === "pending" && req.status !== "pending") return false;
      if (statusFilter === "approved" && req.status !== "approved") return false;
      if (statusFilter === "rejected" && !["rejected", "cancelled", "reversed"].includes(req.status)) return false;
      if (requestSearch.trim()) {
        const q = requestSearch.toLowerCase();
        const matchName = (req.employee_name || "").toLowerCase().includes(q);
        const matchReason = (req.reason || "").toLowerCase().includes(q);
        const matchDates = `${req.start_date} ${req.end_date}`.includes(q);
        if (!matchName && !matchReason && !matchDates) return false;
      }
      return true;
    });
  }, [allRequests, statusFilter, requestSearch]);

  const filteredBalances = useMemo(() => {
    if (!balanceSearch.trim()) return employeeBalances;
    const q = balanceSearch.toLowerCase();
    return employeeBalances.filter((emp) =>
      (emp.name || "").toLowerCase().includes(q) || (emp.role || "").toLowerCase().includes(q)
    );
  }, [employeeBalances, balanceSearch]);

  // Overall company balance stats
  const totalAllowance = useMemo(
    () => employeeBalances.reduce((sum, e) => sum + (Number(e.allowance) || 0), 0),
    [employeeBalances]
  );
  const totalApproved = useMemo(
    () => employeeBalances.reduce((sum, e) => sum + (Number(e.approved) || 0), 0),
    [employeeBalances]
  );
  const totalPending = useMemo(
    () => employeeBalances.reduce((sum, e) => sum + (Number(e.pending) || 0), 0),
    [employeeBalances]
  );
  const totalAvailable = useMemo(
    () => employeeBalances.reduce((sum, e) => sum + (Number(e.available) || 0), 0),
    [employeeBalances]
  );

  // Submit personal leave request
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await hrAction("submit_leave", form);
      setForm({ startDate: "", endDate: "", dayPortion: "full", reason: "" });
      await load();
      setMessage("Leave request submitted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  // Review leave request (Superadmin)
  const handleReviewLeave = async (requestId, decision, note = "") => {
    setBusy(true);
    setMessage("");
    try {
      await hrAction("review_leave", { requestId, decision, note });
      await load();
      setMessage(`Leave request ${decision}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  // Update employee annual entitlement (Superadmin)
  const handleSaveAllowance = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setBusy(true);
    setMessage("");
    try {
      await hrAction("set_entitlement", {
        userId: editingEmployee.userId,
        year,
        allowanceDays: Number(editingEmployee.allowanceDays),
        overrideReason: editingEmployee.overrideReason,
      });
      setEditingEmployee(null);
      await load();
      setMessage("Employee leave allowance saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <AdminLayout title="Leave" subtitle="Apply and monitor your allowance">
        <div className={styles.card}>{message || "Loading leave…"}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Leave"
      subtitle={
        isOwner
          ? `${year} paid leave · Superadmin management & staff balances`
          : `${year} paid leave`
      }
    >
      {message && (
        <div className={`${styles.alert} ${/(submitted|saved|approved|rejected|reversed|cancelled)/i.test(message) ? styles.success : ""}`}>
          {message}
        </div>
      )}

      {/* Superadmin Navigation Tabs */}
      {isOwner && (
        <div className={styles.leaveTabs}>
          <button
            type="button"
            className={`${styles.leaveTab} ${activeTab === "all-requests" ? styles.leaveTabActive : ""}`}
            onClick={() => setActiveTab("all-requests")}
          >
            All Leave Requests
            {pendingRequestsCount > 0 && <span className={styles.tabBadge}>{pendingRequestsCount}</span>}
          </button>
          <button
            type="button"
            className={`${styles.leaveTab} ${activeTab === "balances" ? styles.leaveTabActive : ""}`}
            onClick={() => setActiveTab("balances")}
          >
            Employee Balances ({employeeBalances.length})
          </button>
          <button
            type="button"
            className={`${styles.leaveTab} ${activeTab === "my-leave" ? styles.leaveTabActive : ""}`}
            onClick={() => setActiveTab("my-leave")}
          >
            My Leave
          </button>
        </div>
      )}

      {/* VIEW 1: All Leave Requests (Superadmin) */}
      {isOwner && activeTab === "all-requests" && (
        <div className={styles.grid}>
          {/* Quick Metrics */}
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.metricRow}>
              <div className={styles.metric}>
                <span>Total Requests</span>
                <strong>{allRequests.length}</strong>
              </div>
              <div className={styles.metric} style={{ background: pendingRequestsCount > 0 ? "#fffbeb" : "#f4f7f3" }}>
                <span style={{ color: pendingRequestsCount > 0 ? "#b45309" : "#64748b" }}>Pending Review</span>
                <strong style={{ color: pendingRequestsCount > 0 ? "#b45309" : "#253926" }}>{pendingRequestsCount}</strong>
              </div>
              <div className={styles.metric}>
                <span>Approved</span>
                <strong style={{ color: "#166534" }}>{approvedRequestsCount}</strong>
              </div>
              <div className={styles.metric}>
                <span>Rejected / Other</span>
                <strong>{rejectedRequestsCount}</strong>
              </div>
            </div>
          </section>

          {/* Leave Requests Roster */}
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <button
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === "all" ? styles.filterChipActive : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All ({allRequests.length})
                </button>
                <button
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === "pending" ? styles.filterChipActive : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending ({pendingRequestsCount})
                </button>
                <button
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === "approved" ? styles.filterChipActive : ""}`}
                  onClick={() => setStatusFilter("approved")}
                >
                  Approved ({approvedRequestsCount})
                </button>
                <button
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === "rejected" ? styles.filterChipActive : ""}`}
                  onClick={() => setStatusFilter("rejected")}
                >
                  Rejected / Reversed ({rejectedRequestsCount})
                </button>
              </div>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search staff, dates, reason…"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
              />
            </div>

            <div className={styles.list}>
              {filteredRequests.map((req) => (
                <div className={styles.row} key={req.id}>
                  <div className={styles.rowMain}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "14px" }}>{req.employee_name}</strong>
                      <span className={styles.badge} style={{ fontSize: "10px", padding: "2px 8px" }}>
                        {formatRole(req.employee_role)}
                      </span>
                    </div>
                    <strong style={{ fontSize: "13px", color: "#334155" }}>
                      {req.start_date} – {req.end_date} · {req.requested_days} day(s)
                    </strong>
                    <span style={{ display: "block", marginTop: "3px" }}>
                      {req.reason ? `“${req.reason}”` : "No reason provided"}
                      {req.decision_note ? ` · Review note: ${req.decision_note}` : ""}
                    </span>
                  </div>

                  <div className={styles.actions} style={{ margin: 0 }}>
                    <span
                      className={`${styles.badge} ${
                        req.status === "pending"
                          ? styles.badgePending
                          : ["rejected", "cancelled", "reversed"].includes(req.status)
                          ? styles.badgeDanger
                          : styles.badgeSuccess
                      }`}
                    >
                      <span className={styles.badgeDot} />
                      {req.status}
                    </span>

                    {req.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className={styles.button}
                          disabled={busy}
                          onClick={() => handleReviewLeave(req.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.danger}`}
                          disabled={busy}
                          onClick={() => {
                            const note = window.prompt("Optional rejection reason / note:");
                            if (note !== null) {
                              handleReviewLeave(req.id, "rejected", note);
                            }
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.status === "approved" && (
                      <button
                        type="button"
                        className={`${styles.button} ${styles.danger}`}
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Reverse this approved leave request?")) {
                            handleReviewLeave(req.id, "reversed");
                          }
                        }}
                      >
                        Reverse
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!filteredRequests.length && (
                <div className={styles.empty}>
                  {statusFilter === "pending"
                    ? "No pending leave requests to review."
                    : "No matching leave requests found."}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: Employee Balances (Superadmin) */}
      {isOwner && activeTab === "balances" && (
        <div className={styles.grid}>
          {/* Company-wide totals */}
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.metricRow}>
              <div className={styles.metric}>
                <span>Total Staff</span>
                <strong>{employeeBalances.length}</strong>
              </div>
              <div className={styles.metric}>
                <span>Total Allowance</span>
                <strong>{totalAllowance} days</strong>
              </div>
              <div className={styles.metric}>
                <span>Approved Taken</span>
                <strong style={{ color: "#166534" }}>{totalApproved} days</strong>
              </div>
              <div className={styles.metric}>
                <span>Available Balance</span>
                <strong style={{ color: "#253926" }}>{totalAvailable} days</strong>
              </div>
            </div>
          </section>

          {/* Employee Wise Table */}
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.filterRow}>
              <div>
                <h2 style={{ margin: 0 }}>Employee leave balances</h2>
                <p className={styles.muted} style={{ margin: "4px 0 0" }}>
                  {year} calendar year allowances, days utilized, and remaining balance.
                </p>
              </div>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Filter employee by name or role…"
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
              />
            </div>

            <div className={styles.balanceTableWrapper}>
              <table className={styles.balanceTable}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Allowance</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Available</th>
                    <th>Utilization</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((emp) => {
                    const allowance = Number(emp.allowance || 0);
                    const approved = Number(emp.approved || 0);
                    const pct = allowance > 0 ? Math.min(100, Math.round((approved / allowance) * 100)) : 0;
                    return (
                      <tr key={emp.user_id}>
                        <td>
                          <strong>{emp.name}</strong>
                        </td>
                        <td>
                          <span className={styles.badge} style={{ fontSize: "10px", padding: "2px 8px" }}>
                            {formatRole(emp.role)}
                          </span>
                        </td>
                        <td>{emp.allowance} days</td>
                        <td style={{ color: approved > 0 ? "#166534" : "inherit" }}>
                          {emp.approved} {emp.approved === 1 ? "day" : "days"}
                        </td>
                        <td style={{ color: emp.pending > 0 ? "#b45309" : "#64748b" }}>
                          {emp.pending > 0 ? `${emp.pending} days` : "—"}
                        </td>
                        <td>
                          <strong style={{ color: emp.available <= 0 ? "#b91c1c" : "#1e293b", fontSize: "14px" }}>
                            {emp.available} days
                          </strong>
                        </td>
                        <td style={{ minWidth: "120px" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{pct}% used</span>
                          <div className={styles.balanceBar}>
                            <div
                              className={styles.balanceBarFill}
                              style={{
                                width: `${pct}%`,
                                background: pct > 80 ? "#dc2626" : pct > 50 ? "#d97706" : "#426743",
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.secondary}`}
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() =>
                              setEditingEmployee({
                                userId: emp.user_id,
                                name: emp.name,
                                allowanceDays: emp.allowance,
                                overrideReason: "",
                              })
                            }
                          >
                            Edit Allowance
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredBalances.length && (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        No employee records match the search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 3: Personal Leave (Employees & Superadmin personal tab) */}
      {(!isOwner || activeTab === "my-leave") && (
        <div className={styles.grid}>
          {/* Personal Allowance Summary */}
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.metricRow}>
              <div className={styles.metric}>
                <span>Allowance</span>
                <strong>{personalBalance.allowance}</strong>
              </div>
              <div className={styles.metric}>
                <span>Approved</span>
                <strong>{personalBalance.approved}</strong>
              </div>
              <div className={styles.metric}>
                <span>Pending</span>
                <strong>{personalBalance.pending}</strong>
              </div>
              <div className={styles.metric}>
                <span>Available</span>
                <strong>{personalBalance.available}</strong>
              </div>
            </div>
          </section>

          {/* Request leave form */}
          <form className={`${styles.card} ${styles.half}`} onSubmit={submit}>
            <h2>Request leave</h2>
            <p className={styles.muted}>Requests cannot cross calendar years.</p>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Start</label>
                <input
                  required
                  type="date"
                  className={styles.input}
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startDate: e.target.value,
                      endDate: form.endDate || e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.field}>
                <label>End</label>
                <input
                  required
                  type="date"
                  className={styles.input}
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label>Duration</label>
                <select
                  className={styles.select}
                  value={form.dayPortion}
                  onChange={(e) => setForm({ ...form, dayPortion: e.target.value })}
                >
                  <option value="full">Full day(s)</option>
                  <option value="half">Half day (single date)</option>
                </select>
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label>Reason (optional)</label>
                <textarea
                  className={styles.textarea}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button disabled={busy || personalBalance.available <= 0} className={styles.button}>
                Submit request
              </button>
            </div>
          </form>

          {/* Personal Request History */}
          <section className={`${styles.card} ${styles.half}`}>
            <h2>Request history</h2>
            <div className={styles.list}>
              {personalRequests.map((request) => (
                <div className={styles.row} key={request.id}>
                  <div className={styles.rowMain}>
                    <strong>
                      {request.start_date} – {request.end_date}
                    </strong>
                    <span>
                      {request.requested_days} day(s)
                      {request.reason ? ` · ${request.reason}` : ""}
                    </span>
                  </div>
                  <div className={styles.actions} style={{ margin: 0 }}>
                    <span
                      className={`${styles.badge} ${
                        request.status === "pending"
                          ? styles.badgePending
                          : ["rejected", "cancelled", "reversed"].includes(request.status)
                          ? styles.badgeDanger
                          : styles.badgeSuccess
                      }`}
                    >
                      <span className={styles.badgeDot} />
                      {request.status}
                    </span>
                    {request.status === "pending" && (
                      <button
                        type="button"
                        className={`${styles.button} ${styles.danger}`}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await hrAction("cancel_leave", { requestId: request.id });
                            await load();
                            setMessage("Leave request cancelled.");
                          } catch (err) {
                            setMessage(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!personalRequests.length && <div className={styles.empty}>No leave requests yet.</div>}
            </div>
          </section>
        </div>
      )}

      {/* Superadmin Edit Allowance Modal */}
      {editingEmployee && (
        <div className={styles.modalOverlay} onClick={() => setEditingEmployee(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px" }}>Edit {year} Leave Allowance</h3>
            <p className={styles.muted} style={{ margin: "0 0 16px" }}>
              Updating paid leave days for <strong>{editingEmployee.name}</strong>.
            </p>
            <form onSubmit={handleSaveAllowance}>
              <div className={styles.field} style={{ marginBottom: "14px" }}>
                <label>Annual Paid Allowance (Days)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.5"
                  className={styles.input}
                  value={editingEmployee.allowanceDays}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, allowanceDays: e.target.value })
                  }
                />
              </div>
              <div className={styles.field} style={{ marginBottom: "18px" }}>
                <label>Override reason (required if reducing below committed days)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Adjusted policy or agreement"
                  value={editingEmployee.overrideReason}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, overrideReason: e.target.value })
                  }
                />
              </div>
              <div className={styles.actions} style={{ justifyContent: "flex-end", marginTop: 0 }}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={() => setEditingEmployee(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={busy} className={styles.button}>
                  Save Allowance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
