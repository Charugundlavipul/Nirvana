import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import styles from "./PropertyEditor.module.css";
import { supabase } from "../../../supabaseClient";
import MediaManager from "./MediaManager";
import CuratedImagesManager from "./CuratedImagesManager";
import AmenitiesManager from "./AmenitiesManager";
import { getCurrentAdminRole, isSuperAdminRole, submitApprovalRequest } from "../../../lib/adminApi";
import RichTextContent from "../../common/RichTextContent";
import { sanitizeRichText } from "../../../lib/richText";

const slugify = (v) => `${v || ""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const PropertyEditor = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNew = slug === "new";
    const [activeTab, setActiveTab] = useState("details");
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const [beforeSnapshot, setBeforeSnapshot] = useState(null);
    const descriptionRef = useRef(null);

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

    useEffect(() => {
        const loadRole = async () => {
            const role = await getCurrentAdminRole();
            setAdminRole(role);
        };
        loadRole();
    }, []);

    const loadProperty = async () => {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*")
                .eq("slug", slug)
                .single();

            if (error) throw error;

            setPropertyId(data.id);
            const normalized = {
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
            };
            setFormData(normalized);
            setBeforeSnapshot(normalized);
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

    const normalizeEditorHtml = (value) => {
        let normalized = `${value || ""}`;
        normalized = normalized
            .replace(/<b(\s|>)/gi, "<strong$1")
            .replace(/<\/b>/gi, "</strong>")
            .replace(/<i(\s|>)/gi, "<em$1")
            .replace(/<\/i>/gi, "</em>")
            .replace(/<div>/gi, "<p>")
            .replace(/<\/div>/gi, "</p>")
            .replace(/&nbsp;/gi, " ")
            .replace(/<p><br><\/p>/gi, "");

        return sanitizeRichText(normalized).trim();
    };

    const syncDescriptionFromEditor = () => {
        const editor = descriptionRef.current;
        if (!editor) return;
        const nextDescription = normalizeEditorHtml(editor.innerHTML);
        setFormData((prev) =>
            prev.description === nextDescription
                ? prev
                : { ...prev, description: nextDescription }
        );
    };

    const runEditorCommand = (command, value = null) => {
        const editor = descriptionRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, value);
        syncDescriptionFromEditor();
    };

    const setBlock = (tag) => runEditorCommand("formatBlock", `<${tag}>`);

    const createLink = () => {
        const url = window.prompt("Enter URL", "https://");
        if (!url) return;
        runEditorCommand("createLink", url);
    };

    useEffect(() => {
        const editor = descriptionRef.current;
        if (!editor) return;
        if (document.activeElement === editor) return;
        const sanitized = sanitizeRichText(formData.description || "");
        if (editor.innerHTML !== sanitized) {
            editor.innerHTML = sanitized;
        }
    }, [formData.description]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = { ...formData, is_published: true };
            if (!payload.booking_url) delete payload.booking_url; // Optional

            const superAdmin = isSuperAdminRole(adminRole);
            if (!superAdmin) {
                const { data: userData } = await supabase.auth.getUser();
                const requestAction = isNew ? "create" : "update";
                const requestEntityId = isNew ? null : propertyId;

                const { error: requestError } = await submitApprovalRequest({
                    entityType: "property",
                    action: requestAction,
                    entityId: requestEntityId,
                    payload,
                    beforeSnapshot: isNew ? null : beforeSnapshot,
                    submittedBy: userData?.user?.id || null,
                    comment: isNew ? "New property creation request." : "Property update request.",
                });

                if (requestError) throw requestError;
                alert("Change request submitted to superadmin for approval.");
                navigate("/admin/properties");
                return;
            }

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
                            {!isSuperAdminRole(adminRole) && (
                                <div className={styles.card}>
                                    <h3>Approval Flow Enabled</h3>
                                    <p style={{ marginTop: "8px", color: "#555" }}>
                                        Saving this form creates an approval request. A superadmin must approve before changes go live.
                                    </p>
                                </div>
                            )}
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
                                    <label>Description (Rich Text)</label>
                                    <div className={styles.richEditorShell}>
                                        <div className={styles.richToolbar}>
                                            <button type="button" className={styles.richToolbarBtn} onClick={() => runEditorCommand("bold")}><strong>B</strong></button>
                                            <button type="button" className={styles.richToolbarBtn} onClick={() => runEditorCommand("italic")}><em>I</em></button>
                                            <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("h3")}>H3</button>
                                            <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("p")}>P</button>
                                            <button type="button" className={styles.richToolbarBtn} onClick={() => runEditorCommand("insertUnorderedList")}>List</button>
                                            <button type="button" className={styles.richToolbarBtn} onClick={createLink}>Link</button>
                                        </div>
                                        <div
                                            ref={descriptionRef}
                                            className={styles.richEditor}
                                            contentEditable
                                            role="textbox"
                                            aria-multiline="true"
                                            data-placeholder="Write a long, detailed property description..."
                                            onInput={syncDescriptionFromEditor}
                                            onBlur={syncDescriptionFromEditor}
                                            suppressContentEditableWarning
                                        />
                                    </div>
                                    <p className={styles.richHelpText}>
                                        Use the toolbar to format text. Preview below shows exactly what will render on the site.
                                    </p>
                                    <div className={styles.richPreview}>
                                        <p className={styles.richPreviewTitle}>Preview</p>
                                        <RichTextContent value={formData.description} className={styles.richPreviewContent} />
                                    </div>
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
                                    {saving ? "Saving..." : isSuperAdminRole(adminRole) ? "Save Changes" : "Submit for Approval"}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === "media" && propertyId && isSuperAdminRole(adminRole) && (
                        <>
                            <CuratedImagesManager propertyId={propertyId} />
                            <div style={{ marginTop: '24px' }}></div>
                            <MediaManager propertyId={propertyId} />
                        </>
                    )}

                    {activeTab === "media" && propertyId && !isSuperAdminRole(adminRole) && (
                        <>
                            <div className={styles.card}>
                                <h3>Approval Flow Enabled</h3>
                                <p style={{ marginTop: "8px", color: "#555" }}>
                                    Media changes are submitted for superadmin approval before publishing.
                                </p>
                            </div>
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
