import React, { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import styles from "../Properties/PropertyEditor.module.css"; // Reusing tabs styles
import ReviewManager from "./ReviewManager";
import FaqManager from "./FaqManager";
import ActivityManager from "./ActivityManager";
import LegalPagesManager from "./LegalPagesManager";
import { getCurrentAdminRole, isSuperAdminRole, fetchMyPendingDrafts, parseApprovalObject } from "../../../lib/adminApi";

const ENTITY_LABELS = {
    review: "Review",
    faq: "FAQ",
    activity: "Activity",
};

const ACTION_LABELS = {
    create: "Create",
    update: "Update",
    delete: "Delete",
};

const GlobalContent = () => {
    const [activeTab, setActiveTab] = useState("reviews");
    const [adminRole, setAdminRole] = useState(null);
    const [globalDrafts, setGlobalDrafts] = useState([]);

    useEffect(() => {
        getCurrentAdminRole().then(setAdminRole);
    }, []);

    useEffect(() => {
        if (adminRole === null) return;
        if (!isSuperAdminRole(adminRole)) {
            fetchMyPendingDrafts().then((drafts) => {
                const globalOnly = drafts.filter((d) => {
                    const et = String(d.entity_type || "").toLowerCase();
                    return ["review", "faq", "activity"].includes(et);
                });
                setGlobalDrafts(globalOnly);
            });
        }
    }, [adminRole]);

    const isSuperAdmin = isSuperAdminRole(adminRole);

    const getDraftSummary = (draft) => {
        const payload = parseApprovalObject(draft.payload);
        const before = parseApprovalObject(draft.before_snapshot);
        return payload.question || payload.title || payload.author_name || before.question || before.title || before.author_name || null;
    };

    return (
        <AdminLayout title="Global Content" subtitle="Manage reviews, FAQs, and activities across the site">
            {!isSuperAdmin && globalDrafts.length > 0 && (
                <div style={{
                    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    border: "1px solid #7dd3fc",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginBottom: "20px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "20px" }}>📋</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0c4a6e" }}>
                                You have {globalDrafts.length} pending draft{globalDrafts.length !== 1 ? "s" : ""} for global content
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#075985" }}>
                                These changes are awaiting superadmin approval.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {globalDrafts.map((draft) => {
                            const summary = getDraftSummary(draft);
                            const isRevision = draft.status === "revision_requested";
                            const entityType = String(draft.entity_type || "").toLowerCase();
                            return (
                                <div
                                    key={draft.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "10px 14px",
                                        background: isRevision ? "#fffbeb" : "#ffffff",
                                        border: isRevision ? "1px solid #fbbf24" : "1px solid #e0f2fe",
                                        borderRadius: "8px",
                                    }}
                                >
                                    <span style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                        background: isRevision ? "#fef3c7" : "#dbeafe",
                                        color: isRevision ? "#92400e" : "#1d4ed8",
                                        textTransform: "uppercase",
                                    }}>
                                        {isRevision ? "Revision" : "Pending"}
                                    </span>
                                    <span style={{
                                        fontSize: "10px",
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                        background: "#f1f5f9",
                                        color: "#475569",
                                    }}>
                                        {ACTION_LABELS[draft.action] || draft.action}
                                    </span>
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                                        {ENTITY_LABELS[entityType] || entityType}
                                    </span>
                                    {summary && (
                                        <span style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                            — {summary}
                                        </span>
                                    )}
                                    <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "auto" }}>
                                        {draft.submitted_at ? new Date(draft.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={styles.tabsContainer}>
                <div className={styles.tabsHeader}>
                    <button
                        className={`${styles.tab} ${activeTab === "reviews" ? styles.active : ""}`}
                        onClick={() => setActiveTab("reviews")}
                    >
                        Reviews
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "faqs" ? styles.active : ""}`}
                        onClick={() => setActiveTab("faqs")}
                    >
                        FAQs
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "activities" ? styles.active : ""}`}
                        onClick={() => setActiveTab("activities")}
                    >
                        Activities
                    </button>
                    {isSuperAdmin && (
                        <button
                            className={`${styles.tab} ${activeTab === "legal" ? styles.active : ""}`}
                            onClick={() => setActiveTab("legal")}
                        >
                            Legal Pages
                        </button>
                    )}
                </div>

                <div className={styles.tabContent}>
                    {activeTab === "reviews" && <ReviewManager />}
                    {activeTab === "faqs" && <FaqManager />}
                    {activeTab === "activities" && <ActivityManager />}
                    {activeTab === "legal" && isSuperAdmin && <LegalPagesManager />}
                </div>
            </div>
        </AdminLayout>
    );
};

export default GlobalContent;
