import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import styles from "./PropertyList.module.css";
import { supabase } from "../../../supabaseClient";

const PropertyList = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*, property_curated_images(url)")
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

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure? This will delete the entire property and its linked data.")) return;

        try {
            const { error } = await supabase.from("properties").delete().eq("id", id);
            if (error) throw error;
            loadProperties();
        } catch (error) {
            alert("Error deleting property: " + error.message);
        }
    };

    const getThumbnail = (p) => {
        // Try to find the 'home' or 'primary' image from curated relations if available
        // For now, if the query returns array, we just take the first one or a fallback
        const images = p.property_curated_images || [];
        return images.length > 0 ? images[0].url : "/assets/placeholder-house.png";
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
                        {properties.map((p) => (
                            <div key={p.id} className={styles.card} onClick={() => handleEdit(p.slug)}>
                                <div
                                    className={styles.cardImage}
                                    style={{ backgroundImage: `url(${getThumbnail(p)})` }}
                                />
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>{p.name}</h3>
                                    <p className={styles.cardLocation}>{p.location || "No location set"}</p>
                                    <div className={styles.cardStats}>
                                        <span>🛏️ {p.bedroom_count || 0} Beds</span>
                                        <span>👥 {p.guests_max || 0} Guests</span>
                                    </div>
                                    <div className={styles.cardFooter}>
                                        <button className={styles.editBtn}>Edit</button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => handleDelete(e, p.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
