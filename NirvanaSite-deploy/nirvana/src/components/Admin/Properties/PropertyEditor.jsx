import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import styles from "./PropertyEditor.module.css";
import { supabase } from "../../../supabaseClient";
import MediaManager from "./MediaManager";
import CuratedImagesManager from "./CuratedImagesManager";
import AmenitiesManager from "./AmenitiesManager";

const slugify = (v) => `${v || ""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const PropertyEditor = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNew = slug === "new";
    const [activeTab, setActiveTab] = useState("details");
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        booking_url: "",
        location: "",
        description: "",
        guests_max: "",
        bedroom_count: "",
        bathroom_count: "",
        bed_details: "",
        bath_details: "",
        pet_friendly: false,
        pet_fee: 0,
        hot_tub: false
    });

    const [propertyId, setPropertyId] = useState(null);

    useEffect(() => {
        if (!isNew && slug) {
            loadProperty();
        }
    }, [slug]);

    const loadProperty = async () => {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*")
                .eq("slug", slug)
                .single();

            if (error) throw error;

            setPropertyId(data.id);
            setFormData({
                name: data.name || "",
                slug: data.slug || "",
                booking_url: data.booking_url || "",
                location: data.location || "",
                description: data.description || "",
                guests_max: data.guests_max || "",
                bedroom_count: data.bedroom_count || "",
                bathroom_count: data.bathroom_count || "",
                bed_details: data.bed_details || "",
                bath_details: data.bath_details || "",
                pet_friendly: data.pet_friendly || false,
                pet_fee: data.pet_fee || 0,
                hot_tub: data.hot_tub || false
            });
        } catch (error) {
            console.error("Error loading property:", error);
            alert("Failed to load property.");
            navigate("/admin/properties");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;

        setFormData(prev => {
            const next = { ...prev, [name]: val };
            if (name === "name" && isNew) {
                next.slug = slugify(val);
            }
            return next;
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = { ...formData, is_published: true };
            if (!payload.booking_url) delete payload.booking_url; // Optional

            let result;
            if (isNew) {
                const { data, error } = await supabase.from("properties").insert(payload).select().single();
                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase.from("properties").update(payload).eq("id", propertyId).select().single();
                if (error) throw error;
                result = data;
            }

            alert("Property saved successfully!");
            if (isNew) {
                navigate(`/admin/properties/${result.slug}`);
            }
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Error saving property: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading editor...</div>;

    return (
        <AdminLayout title={isNew ? "New Property" : `Edit: ${formData.name || "Untitled"}`} subtitle="Manage property details and media">
            <div className={styles.tabsContainer}>
                <div className={styles.tabsHeader}>
                    <button
                        className={`${styles.tab} ${activeTab === "details" ? styles.active : ""}`}
                        onClick={() => setActiveTab("details")}
                    >
                        Details
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "media" ? styles.active : ""}`}
                        onClick={() => !isNew ? setActiveTab("media") : alert("Save property first")}
                        disabled={isNew}
                    >
                        Media Gallery
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "amenities" ? styles.active : ""}`}
                        onClick={() => !isNew ? setActiveTab("amenities") : alert("Save property first")}
                        disabled={isNew}
                    >
                        Amenities
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === "details" && (
                        <form onSubmit={handleSave} className={styles.formGrid}>
                            <div className={styles.card}>
                                <h3>Basic Info</h3>
                                <div className={styles.fieldGroup}>
                                    <label>Name</label>
                                    <input name="name" value={formData.name} onChange={handleChange} required />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Slug (URL)</label>
                                    <input name="slug" value={formData.slug} onChange={handleChange} required />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Location</label>
                                    <input name="location" value={formData.location} onChange={handleChange} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Booking URL (Hospitable)</label>
                                    <input name="booking_url" value={formData.booking_url} onChange={handleChange} placeholder="https://booking.hospitable.com/..." />
                                </div>
                            </div>

                            <div className={styles.card}>
                                <h3>Details</h3>
                                <div className={styles.row}>
                                    <div className={styles.fieldGroup}>
                                        <label>Max Guests</label>
                                        <input type="number" name="guests_max" value={formData.guests_max} onChange={handleChange} />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>Bedrooms</label>
                                        <input type="number" name="bedroom_count" value={formData.bedroom_count} onChange={handleChange} />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>Bathrooms</label>
                                        <input type="number" step="0.5" name="bathroom_count" value={formData.bathroom_count} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows={5} />
                                </div>
                            </div>

                            <div className={styles.card}>
                                <h3>Features</h3>
                                <div className={styles.row}>
                                    <div className={styles.checkboxGroup}>
                                        <label>
                                            <input type="checkbox" name="pet_friendly" checked={formData.pet_friendly} onChange={handleChange} />
                                            Pet Friendly
                                        </label>
                                    </div>
                                    <div className={styles.checkboxGroup}>
                                        <label>
                                            <input type="checkbox" name="hot_tub" checked={formData.hot_tub} onChange={handleChange} />
                                            Hot Tub
                                        </label>
                                    </div>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Pet Fee ($)</label>
                                    <input type="number" name="pet_fee" value={formData.pet_fee} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.actionBar}>
                                <button type="button" className={styles.cancelBtn} onClick={() => navigate("/admin/properties")}>Cancel</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === "media" && propertyId && (
                        <>
                            <CuratedImagesManager propertyId={propertyId} />
                            <div style={{ marginTop: '24px' }}></div>
                            <MediaManager propertyId={propertyId} />
                        </>
                    )}

                    {activeTab === "amenities" && propertyId && (
                        <AmenitiesManager propertyId={propertyId} />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default PropertyEditor;
