import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import styles from "./PropertyList.module.css";
import { supabase } from "../../../supabaseClient";
import { getCurrentAdminRole, isSuperAdminRole, fetchMyPendingDrafts, getApprovalRequestPropertyId } from "../../../lib/adminApi";

const PropertyList = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminRole, setAdminRole] = useState(null);
    const [draftsPerProperty, setDraftsPerProperty] = useState({});

    useEffect(() => {
        loadProperties();
        getCurrentAdminRole().then(setAdminRole);
    }, []);

    useEffect(() => {
        if (adminRole === null) return;
        if (!isSuperAdminRole(adminRole)) {
            fetchMyPendingDrafts().then((drafts) => {
                const byProperty = {};
                for (const draft of drafts) {
                    const propertyId = getApprovalRequestPropertyId(draft);
                    if (!propertyId) continue;
                    if (!byProperty[propertyId]) byProperty[propertyId] = [];
                    byProperty[propertyId].push(draft);
                }
                setDraftsPerProperty(byProperty);
            });
        }
    }, [adminRole]);

    const loadProperties = async () => {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*, property_curated_images(slot,url)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setProperties(data || []);
        } catch (error) {
            console.error("Error loading properties:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (slug) => {
        navigate(`/admin/properties/${slug}`);
    };

    const handleDelete = async (event, id) => {
        event.stopPropagation();
        if (!window.confirm("Are you sure? This will delete the entire property and its linked data.")) return;

        try {
            const { error } = await supabase.from("properties").delete().eq("id", id);
            if (error) throw error;
            loadProperties();
        } catch (error) {
            alert("Error deleting property: " + error.message);
        }
    };

    const getThumbnail = (property) => {
        const images = property.property_curated_images || [];
        const homeImage = images.find((image) => image.slot === "home")?.url;
        const fallbackImage = images[0]?.url;
        return homeImage || fallbackImage || "/assets/placeholder-house.png";
    };

    const getLatestRevisionNote = (propertyId) => {
        const drafts = draftsPerProperty[propertyId] || [];
        const revisionDraft = drafts.find((draft) => draft.status === "revision_requested" && draft.comment);
        return revisionDraft?.comment || "";
    };

    return (
        <AdminLayout title="Properties" subtitle="Manage your vacation rentals">
            <div className={styles.container}>
                <div className={styles.header}>
                    <input
                        type="text"
                        placeholder="Search properties..."
                        className={styles.searchBar}
                    />
                    <button
                        className={styles.addBtn}
                        onClick={() => navigate("/admin/properties/new")}
                    >
                        + Add Property
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading properties...</div>
                ) : (
                    <div className={styles.grid}>
                        {properties.map((property) => {
                            const drafts = draftsPerProperty[property.id] || [];
                            const hasRevision = drafts.some((draft) => draft.status === "revision_requested");
                            const latestRevisionNote = getLatestRevisionNote(property.id);

                            return (
                                <div key={property.id} className={styles.card} onClick={() => handleEdit(property.slug)}>
                                    <div
                                        className={styles.cardImage}
                                        style={{ backgroundImage: `url(${getThumbnail(property)})` }}
                                    />
                                    <div className={styles.cardContent}>
                                        <h3 className={styles.cardTitle}>
                                            {property.name}
                                            {property.is_published === false && (
                                                <span
                                                    style={{
                                                        marginLeft: "8px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        padding: "2px 8px",
                                                        borderRadius: "999px",
                                                        background: "#fef3c7",
                                                        color: "#b45309",
                                                        textTransform: "uppercase",
                                                        verticalAlign: "middle"
                                                    }}
                                                >
                                                    Draft
                                                </span>
                                            )}
                                            {drafts.length > 0 && (
                                                <span
                                                    style={{
                                                        marginLeft: "8px",
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                        padding: "3px 10px",
                                                        borderRadius: "999px",
                                                        background: hasRevision ? "#fef3c7" : "#dbeafe",
                                                        color: hasRevision ? "#92400e" : "#1d4ed8",
                                                        textTransform: "uppercase",
                                                        verticalAlign: "middle",
                                                        letterSpacing: "0.02em",
                                                    }}
                                                >
                                                    {hasRevision
                                                        ? `${drafts.length} Revision${drafts.length !== 1 ? "s" : ""}`
                                                        : `${drafts.length} Draft${drafts.length !== 1 ? "s" : ""} Pending`}
                                                </span>
                                            )}
                                        </h3>
                                        <p className={styles.cardLocation}>{property.location || "No location set"}</p>
                                        {latestRevisionNote && (
                                            <p
                                                style={{
                                                    margin: "6px 0 0",
                                                    fontSize: "12px",
                                                    color: "#92400e",
                                                    fontStyle: "italic",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                Note: {latestRevisionNote}
                                            </p>
                                        )}
                                        <div className={styles.cardStats}>
                                            <span>{property.bedroom_count || 0} Beds</span>
                                            <span>{property.guests_max || 0} Guests</span>
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <button className={styles.editBtn}>Edit</button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={(event) => handleDelete(event, property.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && properties.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No properties found. Create your first listing!</p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default PropertyList;
