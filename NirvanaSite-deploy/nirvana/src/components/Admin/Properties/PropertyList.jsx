import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBed, FaUsers } from "react-icons/fa";
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
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-8 pb-20">
                        {properties.map((property) => {
                            const drafts = draftsPerProperty[property.id] || [];
                            const hasRevision = drafts.some((draft) => draft.status === "revision_requested");
                            const latestRevisionNote = getLatestRevisionNote(property.id);

                            return (
                                <article
                                    key={property.id}
                                    className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] flex flex-col text-left"
                                    onClick={() => handleEdit(property.slug)}
                                >
                                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
                                        <img
                                            src={getThumbnail(property)}
                                            alt={`${property.name} - thumbnail`}
                                            className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>

                                    <div className="px-2 pb-2 pt-4 flex flex-col flex-grow">
                                        <div className="mb-1 flex items-start justify-between gap-2">
                                            <h3 className="truncate text-lg font-bold text-slate-900 transition-colors group-hover:text-[#8b6e4e]">
                                                {property.name}
                                                {property.is_published === false && (
                                                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase align-middle">
                                                        Draft
                                                    </span>
                                                )}
                                                {drafts.length > 0 && (
                                                    <span className={`ml-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase align-middle tracking-widest ${hasRevision ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                        {hasRevision
                                                            ? `${drafts.length} Revision${drafts.length !== 1 ? "s" : ""}`
                                                            : `${drafts.length} Draft${drafts.length !== 1 ? "s" : ""} Pending`}
                                                    </span>
                                                )}
                                            </h3>
                                        </div>

                                        <p className="mb-2 text-sm text-slate-500">{property.location || "No location set"}</p>

                                        <div className="mb-3 flex items-center gap-3 text-sm text-slate-600">
                                            <span className="flex items-center gap-1.5">
                                                <FaBed className="text-[#8b6e4e]" />
                                                {property.bedroom_count || 0} Beds
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <FaUsers className="text-[#8b6e4e]" />
                                                {property.guests_max || 0} Guests
                                            </span>
                                        </div>

                                        {latestRevisionNote && (
                                            <p className="mb-3 text-xs text-amber-700 italic overflow-hidden text-ellipsis whitespace-nowrap">
                                                Note: {latestRevisionNote}
                                            </p>
                                        )}

                                        <div className="mt-auto pt-4 flex gap-2 border-t border-slate-100">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(property.slug); }}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(e, property.id); }}
                                                className="group/btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
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
