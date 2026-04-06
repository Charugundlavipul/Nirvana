import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import styles from "./Dashboard.module.css";
import { supabase } from "../../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import {
    FaHome,
    FaCheckCircle,
    FaStar,
    FaHiking,
    FaQuestionCircle,
    FaConciergeBell,
    FaPlus,
    FaEdit,
    FaEye,
    FaChartLine,
    FaCalendarAlt,
    FaArrowRight,
    FaBookOpen,
    FaClipboardList,
    FaExclamationTriangle
} from "react-icons/fa";
import { getCurrentAdminRole, isSuperAdminRole, fetchMyPendingDrafts, parseApprovalObject } from "../../lib/adminApi";

const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle }) => (
    <div className={styles.statCard} style={{ '--accent-color': color, '--bg-color': bgColor }}>
        <div className={styles.statIcon} style={{ background: bgColor, color: color }}>
            <Icon size={24} />
        </div>
        <div className={styles.statContent}>
            <h3>{value}</h3>
            <p>{title}</p>
            {subtitle && <span className={styles.statSubtitle}>{subtitle}</span>}
        </div>
    </div>
);

const QuickAction = ({ title, description, icon: Icon, to, color }) => {
    const className = styles.quickAction;
    const style = { '--action-color': color };
    const content = (
        <>
            <div className={styles.actionIcon}>
                <Icon size={20} />
            </div>
            <div className={styles.actionContent}>
                <h4>{title}</h4>
                <p>{description}</p>
            </div>
            <FaArrowRight className={styles.actionArrow} />
        </>
    );

    if (to.startsWith("/") && !to.startsWith("/admin")) {
        return <a href={to} className={className} style={style}>{content}</a>;
    }

    return <Link to={to} className={className} style={style}>{content}</Link>;
};

const RecentItem = ({ title, type, date }) => (
    <div className={styles.recentItem}>
        <div className={styles.recentIcon}>
            {type === 'property' && <FaHome />}
            {type === 'review' && <FaStar />}
            {type === 'activity' && <FaHiking />}
        </div>
        <div className={styles.recentContent}>
            <h5>{title}</h5>
            <span>{date}</span>
        </div>
    </div>
);

const DRAFT_ACTION_LABELS = {
    create: "Create",
    update: "Update",
    delete: "Delete",
};

const DRAFT_ENTITY_LABELS = {
    property: "Property",
    review: "Review",
    faq: "FAQ",
    activity: "Activity",
    amenity: "Amenity",
    property_image: "Gallery Image",
    property_curated_image: "Curated Image",
    property_highlight_image: "Highlight Image",
};

const friendlyEntityType = (type) => DRAFT_ENTITY_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const friendlyAction = (action) => DRAFT_ACTION_LABELS[action] || action;
const friendlyStatus = (status) => {
    if (status === "revision_requested") return "Revision Requested";
    return status?.charAt(0).toUpperCase() + status?.slice(1);
};

const getDraftSummary = (req) => {
    const payload = parseApprovalObject(req.payload);
    const before = parseApprovalObject(req.before_snapshot);
    return payload.name || payload.title || payload.question || payload.author_name || payload.slot || before.name || before.title || before.question || before.author_name || before.slot || null;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        properties: 0,
        activeListings: 0,
        reviews: 0,
        activities: 0,
        faqs: 0,
        amenities: 0
    });
    const [recentProperties, setRecentProperties] = useState([]);
    const [recentReviews, setRecentReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminRole, setAdminRole] = useState(null);
    const [pendingDrafts, setPendingDrafts] = useState([]);
    const [draftsLoading, setDraftsLoading] = useState(true);

    useEffect(() => {
        getCurrentAdminRole().then(setAdminRole);
    }, []);

    useEffect(() => {
        if (adminRole === null) return;
        if (!isSuperAdminRole(adminRole)) {
            setDraftsLoading(true);
            fetchMyPendingDrafts().then((drafts) => {
                setPendingDrafts(drafts);
                setDraftsLoading(false);
            });
        } else {
            setDraftsLoading(false);
        }
    }, [adminRole]);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [props, reviews, acts, faqs, amenities, recentProps, recentRevs] = await Promise.all([
                    supabase.from("properties").select("id", { count: "exact", head: true }),
                    supabase.from("reviews").select("id", { count: "exact", head: true }),
                    supabase.from("activities").select("id", { count: "exact", head: true }),
                    supabase.from("faqs").select("id", { count: "exact", head: true }),
                    supabase.from("amenities").select("id", { count: "exact", head: true }),
                    supabase.from("properties").select("id, name, slug, created_at").order("created_at", { ascending: false }).limit(5),
                    supabase.from("reviews").select("id, author_name, created_at").order("created_at", { ascending: false }).limit(5)
                ]);

                setStats({
                    properties: props.count || 0,
                    activeListings: props.count || 0,
                    reviews: reviews.count || 0,
                    activities: acts.count || 0,
                    faqs: faqs.count || 0,
                    amenities: amenities.count || 0
                });

                setRecentProperties(recentProps.data || []);
                setRecentReviews(recentRevs.data || []);
            } catch (error) {
                console.error("Error loading dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isSuperAdmin = isSuperAdminRole(adminRole);
    const revisionDrafts = pendingDrafts.filter(d => d.status === "revision_requested");
    const pendingCount = pendingDrafts.length;

    return (
        <AdminLayout title="Dashboard" subtitle="Welcome back! Here's an overview of your portfolio.">
            {/* Pending Drafts Banner for Regular Admins */}
            {!isSuperAdmin && !draftsLoading && pendingCount > 0 && (
                <section style={{
                    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    border: "1px solid #7dd3fc",
                    borderRadius: "16px",
                    padding: "24px 28px",
                    marginBottom: "28px",
                    boxShadow: "0 4px 16px rgba(14,165,233,0.08)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            background: revisionDrafts.length > 0 ? "#fef3c7" : "#dbeafe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            {revisionDrafts.length > 0 ? (
                                <FaExclamationTriangle size={22} color="#b45309" />
                            ) : (
                                <FaClipboardList size={22} color="#2563eb" />
                            )}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0c4a6e" }}>
                                You have {pendingCount} pending draft{pendingCount !== 1 ? "s" : ""}
                            </h2>
                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#075985" }}>
                                {revisionDrafts.length > 0
                                    ? `${revisionDrafts.length} need${revisionDrafts.length !== 1 ? "" : "s"} revision — please review and resubmit.`
                                    : "Your changes are awaiting superadmin review."}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {pendingDrafts.map((draft) => {
                            const summary = getDraftSummary(draft);
                            const isRevision = draft.status === "revision_requested";
                            const entityType = String(draft.entity_type || "").toLowerCase();
                            const entityId = draft.entity_id;
                            const isPropertyDraft = entityType === "property";

                            const handleClick = () => {
                                if (isPropertyDraft && entityId) {
                                    // Navigate to the property editor by looking up slug from recent properties
                                    const payload = parseApprovalObject(draft.payload);
                                    const slug = payload?.slug;
                                    if (slug) {
                                        navigate(`/admin/properties/${slug}`);
                                    } else {
                                        navigate("/admin/properties");
                                    }
                                } else if (["review", "faq", "activity"].includes(entityType)) {
                                    navigate("/admin/global");
                                } else if (["amenity", "property_image", "property_curated_image", "property_highlight_image"].includes(entityType)) {
                                    navigate("/admin/properties");
                                }
                            };

                            return (
                                <div
                                    key={draft.id}
                                    onClick={handleClick}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        background: isRevision ? "#fffbeb" : "#ffffff",
                                        border: isRevision ? "1px solid #fbbf24" : "1px solid #e0f2fe",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <span style={{
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                padding: "2px 10px",
                                                borderRadius: "999px",
                                                background: isRevision ? "#fef3c7" : "#dbeafe",
                                                color: isRevision ? "#92400e" : "#1d4ed8",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.03em",
                                            }}>
                                                {friendlyStatus(draft.status)}
                                            </span>
                                            <span style={{
                                                fontSize: "11px",
                                                fontWeight: 600,
                                                padding: "2px 8px",
                                                borderRadius: "999px",
                                                background: "#f1f5f9",
                                                color: "#475569",
                                            }}>
                                                {friendlyAction(draft.action)}
                                            </span>
                                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                                                {friendlyEntityType(draft.entity_type)}
                                            </span>
                                        </div>
                                        {summary && (
                                            <div style={{ marginTop: "4px", fontSize: "12px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {summary}
                                            </div>
                                        )}
                                        {draft.comment && (
                                            <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                Note: {draft.comment}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", textAlign: "right", flexShrink: 0 }}>
                                        {draft.submitted_at ? new Date(draft.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                    </div>
                                    <FaArrowRight size={12} color="#94a3b8" />
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Properties"
                    value={stats.properties}
                    icon={FaHome}
                    color="#4361ee"
                    bgColor="#eef2ff"
                    subtitle="In your portfolio"
                />
                <StatCard
                    title="Active Listings"
                    value={stats.activeListings}
                    icon={FaCheckCircle}
                    color="#10b981"
                    bgColor="#ecfdf5"
                    subtitle="All properties are live"
                />
                <StatCard
                    title="Guest Reviews"
                    value={stats.reviews}
                    icon={FaStar}
                    color="#f59e0b"
                    bgColor="#fefce8"
                    subtitle="Across all properties"
                />
                <StatCard
                    title="Activities"
                    value={stats.activities}
                    icon={FaHiking}
                    color="#8b5cf6"
                    bgColor="#f5f3ff"
                    subtitle="Nearby attractions"
                />
                <StatCard
                    title="FAQs"
                    value={stats.faqs}
                    icon={FaQuestionCircle}
                    color="#06b6d4"
                    bgColor="#ecfeff"
                    subtitle="Help articles"
                />
                <StatCard
                    title="Amenities"
                    value={stats.amenities}
                    icon={FaConciergeBell}
                    color="#ec4899"
                    bgColor="#fdf2f8"
                    subtitle="Property features"
                />
            </div>

            {/* Quick Actions */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>Quick Actions</h2>
                    <p>Jump to common tasks</p>
                </div>
                <div className={styles.actionsGrid}>
                    <QuickAction
                        title="Add Property"
                        description="Create a new listing"
                        icon={FaPlus}
                        to="/admin/properties"
                        color="#4361ee"
                    />
                    <QuickAction
                        title="Manage Reviews"
                        description="View and edit reviews"
                        icon={FaStar}
                        to="/admin/global"
                        color="#f59e0b"
                    />
                    <QuickAction
                        title="Edit Activities"
                        description="Update nearby attractions"
                        icon={FaHiking}
                        to="/admin/global"
                        color="#8b5cf6"
                    />
                    <QuickAction
                        title="Knowledge Hub"
                        description="Curate AI-ready property knowledge"
                        icon={FaBookOpen}
                        to="/admin/knowledge"
                        color="#425b3d"
                    />
                    <QuickAction
                        title="View Website"
                        description="Preview live site"
                        icon={FaEye}
                        to="/"
                        color="#10b981"
                    />
                    <QuickAction
                        title="Approval Queue"
                        description="Review pending edits"
                        icon={FaChartLine}
                        to="/admin/approvals"
                        color="#ef4444"
                    />
                    <QuickAction
                        title="Admin Users"
                        description="Manage admin accounts"
                        icon={FaEdit}
                        to="/admin/admins"
                        color="#0ea5e9"
                    />
                </div>
            </section>

            {/* Recent Activity */}
            <div className={styles.recentGrid}>
                {/* Recent Properties */}
                <section className={styles.recentSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Properties</h2>
                        <Link to="/admin/properties" className={styles.viewAllLink}>View All</Link>
                    </div>
                    <div className={styles.recentList}>
                        {recentProperties.length > 0 ? (
                            recentProperties.map(prop => (
                                <RecentItem
                                    key={prop.id}
                                    title={prop.name}
                                    type="property"
                                    date={formatDate(prop.created_at)}
                                />
                            ))
                        ) : (
                            <p className={styles.emptyState}>No properties yet</p>
                        )}
                    </div>
                </section>

                {/* Recent Reviews */}
                <section className={styles.recentSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Reviews</h2>
                        <Link to="/admin/global" className={styles.viewAllLink}>View All</Link>
                    </div>
                    <div className={styles.recentList}>
                        {recentReviews.length > 0 ? (
                            recentReviews.map(rev => (
                                <RecentItem
                                    key={rev.id}
                                    title={`Review by ${rev.author_name}`}
                                    type="review"
                                    date={formatDate(rev.created_at)}
                                />
                            ))
                        ) : (
                            <p className={styles.emptyState}>No reviews yet</p>
                        )}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};

export default Dashboard;
