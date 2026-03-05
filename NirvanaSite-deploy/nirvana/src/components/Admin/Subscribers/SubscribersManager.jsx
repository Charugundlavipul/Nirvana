import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../AdminLayout";
import styles from "./SubscribersManager.module.css";
import { supabase } from "../../../supabaseClient";
import { FaDownload, FaSearch, FaTrash } from "react-icons/fa";

const SubscribersManager = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(null); // subscriber object or null

    const fetchSubscribers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("alert_subscribers")
            .select("*")
            .eq("is_active", true)
            .order("subscribed_at", { ascending: false });

        if (!error && data) {
            setSubscribers(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return subscribers;
        const q = search.toLowerCase();
        return subscribers.filter((s) => s.email.toLowerCase().includes(q));
    }, [subscribers, search]);

    const handleRemove = async () => {
        if (!confirmDelete) return;
        await supabase
            .from("alert_subscribers")
            .update({ is_active: false })
            .eq("id", confirmDelete.id);

        setSubscribers((prev) => prev.filter((s) => s.id !== confirmDelete.id));
        setConfirmDelete(null);
    };

    const handleExportCSV = () => {
        if (subscribers.length === 0) return;

        const headers = ["Email", "Subscribed At", "Unsubscribe Token"];
        const rows = subscribers.map((s) => [
            s.email,
            new Date(s.subscribed_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            s.unsubscribe_token,
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <AdminLayout title="Subscribers" subtitle="Manage email alert subscribers.">
            <div className={styles.container}>
                {/* Header row */}
                <div className={styles.headerRow}>
                    <div className={styles.statBadge}>
                        <span>{subscribers.length}</span> active subscriber{subscribers.length !== 1 ? "s" : ""}
                    </div>
                    <div className={styles.actions}>
                        <div style={{ position: "relative" }}>
                            <FaSearch
                                size={14}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#aaa",
                                }}
                            />
                            <input
                                id="subscribers-search"
                                type="text"
                                placeholder="Search by email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={styles.searchInput}
                                style={{ paddingLeft: 36 }}
                            />
                        </div>
                        <button
                            id="subscribers-export-csv"
                            onClick={handleExportCSV}
                            className={styles.exportBtn}
                            disabled={subscribers.length === 0}
                        >
                            <FaDownload size={14} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className={styles.loading}>Loading subscribers...</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>{search ? "No subscribers match your search." : "No subscribers yet."}</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Email</th>
                                    <th>Unsubscribe Token</th>
                                    <th>Subscribed</th>
                                    <th style={{ textAlign: "right" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((sub, idx) => (
                                    <tr key={sub.id}>
                                        <td>{idx + 1}</td>
                                        <td className={styles.emailCell}>{sub.email}</td>
                                        <td className={styles.tokenCell}>
                                            <code
                                                className={styles.tokenCode}
                                                title="Click to copy"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(sub.unsubscribe_token);
                                                }}
                                            >
                                                {sub.unsubscribe_token}
                                            </code>
                                        </td>
                                        <td className={styles.dateCell}>{formatDate(sub.subscribed_at)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => setConfirmDelete(sub)}
                                            >
                                                <FaTrash size={11} />
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Confirm dialog */}
                {confirmDelete && (
                    <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
                        <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                            <h3>Remove Subscriber</h3>
                            <p>
                                Are you sure you want to remove <strong>{confirmDelete.email}</strong> from the
                                subscriber list? This will unsubscribe them from future alerts.
                            </p>
                            <div className={styles.confirmActions}>
                                <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>
                                    Cancel
                                </button>
                                <button className={styles.dangerBtn} onClick={handleRemove}>
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default SubscribersManager;
