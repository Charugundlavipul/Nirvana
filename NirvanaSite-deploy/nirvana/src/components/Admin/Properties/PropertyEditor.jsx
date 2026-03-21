import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import styles from "./PropertyEditor.module.css";
import { supabase } from "../../../supabaseClient";
import MediaManager from "./MediaManager";
import CuratedImagesManager from "./CuratedImagesManager";
import AmenitiesManager from "./AmenitiesManager";
import SpacesManager from "./SpacesManager";
import { getCurrentAdminRole, isSuperAdminRole, submitApprovalRequest, findOpenRequest, findRevisionRequest, parseApprovalObject, resubmitApprovalRequest } from "../../../lib/adminApi";
import { isValidHospitablePropertyId, normalizeHospitablePropertyId } from "../../../lib/hospitablePropertyId";
import RichTextContent from "../../common/RichTextContent";
import { sanitizeRichText } from "../../../lib/richText";
import { normalizePropertySpaces } from "../../../lib/propertySpaces";

const slugify = (v) => `${v || ""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toFormState = (data = {}) => ({
    name: data.name || "",
    slug: data.slug || "",
    booking_url: data.booking_url || "",
    hospitable_property_id: normalizeHospitablePropertyId(data.hospitable_property_id),
    video_url: data.video_url || "",
    location: data.location || "",
    description: data.description || "",
    guests_max: data.guests_max || "",
    bedroom_count: data.bedroom_count || "",
    bathroom_count: data.bathroom_count || "",
    bed_details: data.bed_details || "",
    bath_details: data.bath_details || "",
    pet_friendly: data.pet_friendly || false,
    pet_fee: data.pet_fee || 0,
    hot_tub: data.hot_tub || false,
    spaces: normalizePropertySpaces(data.spaces),
});

const buildPropertyPayload = (formData) => {
    const payload = {
        ...formData,
        hospitable_property_id: normalizeHospitablePropertyId(formData.hospitable_property_id),
        spaces: normalizePropertySpaces(formData.spaces),
    };

    if (!payload.booking_url) delete payload.booking_url;
    if (!payload.hospitable_property_id) {
        delete payload.hospitable_property_id;
    } else if (!isValidHospitablePropertyId(payload.hospitable_property_id)) {
        throw new Error("Hospitable Property ID must be a valid UUID.");
    }

    return payload;
};

const validatePublishRequirements = (payload) => {
    if (!payload.hospitable_property_id) {
        throw new Error("Hospitable Property ID is required before a property can be published.");
    }
};

const slugifyHospitableName = (value) =>
    `${value || ""}`
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const PropertyEditor = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNew = slug === "new";
    const [activeTab, setActiveTab] = useState("details");
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const [isPublished, setIsPublished] = useState(true);
    const [editorNote, setEditorNote] = useState("");
    const [beforeSnapshot, setBeforeSnapshot] = useState(null);
    const [propertyDraftRequest, setPropertyDraftRequest] = useState(null);
    const [hospitableProperties, setHospitableProperties] = useState([]);
    const [hospitablePropertiesLoading, setHospitablePropertiesLoading] = useState(true);
    const [hospitablePropertiesError, setHospitablePropertiesError] = useState("");
    const descriptionRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        booking_url: "",
        hospitable_property_id: "",
        video_url: "",
        location: "",
        description: "",
        guests_max: "",
        bedroom_count: "",
        bathroom_count: "",
        bed_details: "",
        bath_details: "",
        pet_friendly: false,
        pet_fee: 0,
        hot_tub: false,
        spaces: [],
    });

    const [propertyId, setPropertyId] = useState(null);
    const superAdmin = isSuperAdminRole(adminRole);
    const approvalRequiredForEdits = !superAdmin && isPublished;
    const isDraftProperty = !isNew && !isPublished;

    const draftChangedFields = useMemo(() => {
        if (!propertyDraftRequest || !beforeSnapshot) return [];
        const ignored = new Set(["id", "created_at", "updated_at"]);
        return Object.keys(formData).filter((key) => {
            if (ignored.has(key)) return false;
            return JSON.stringify(formData[key]) !== JSON.stringify(beforeSnapshot[key]);
        });
    }, [propertyDraftRequest, beforeSnapshot, formData]);

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

    useEffect(() => {
        let cancelled = false;

        const loadHospitableProperties = async () => {
            setHospitablePropertiesLoading(true);
            setHospitablePropertiesError("");

            try {
                const response = await fetch("/api/hospitable/properties", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.error || "Unable to load Hospitable properties.");
                }

                if (!cancelled) {
                    setHospitableProperties(Array.isArray(payload?.properties) ? payload.properties : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setHospitableProperties([]);
                    setHospitablePropertiesError(
                        error instanceof Error ? error.message : "Unable to load Hospitable properties."
                    );
                }
            } finally {
                if (!cancelled) {
                    setHospitablePropertiesLoading(false);
                }
            }
        };

        loadHospitableProperties();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const loadOpenDraft = async () => {
            if (!propertyId || superAdmin || !isPublished) {
                setPropertyDraftRequest(null);
                return;
            }

            const openRequest = await findOpenRequest("property", propertyId, "update");
            setPropertyDraftRequest(openRequest || null);
            if (!openRequest) return;

            const payloadState = toFormState(parseApprovalObject(openRequest.payload));
            setFormData(payloadState);

            const beforeState = openRequest.before_snapshot
                ? toFormState(parseApprovalObject(openRequest.before_snapshot))
                : null;
            if (beforeState) {
                setBeforeSnapshot(beforeState);
            }
            if (openRequest.comment) {
                setEditorNote(openRequest.comment);
            }
        };

        loadOpenDraft();
    }, [propertyId, superAdmin, isPublished]);

    const loadProperty = async () => {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*")
                .eq("slug", slug)
                .single();

            if (error) throw error;

            setPropertyId(data.id);
            setIsPublished(data.is_published !== false);
            const normalized = toFormState(data);
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
        const normalizedValue =
            name === "hospitable_property_id" ? normalizeHospitablePropertyId(val) : val;

        setFormData(prev => {
            const next = { ...prev, [name]: normalizedValue };
            if (name === "name" && isNew) {
                next.slug = slugify(normalizedValue);
            }
            return next;
        });
    };

    const handleHospitablePropertySelect = (e) => {
        const selectedId = normalizeHospitablePropertyId(e.target.value);
        if (!selectedId) {
            return;
        }

        const selectedProperty = hospitableProperties.find((property) => property.id === selectedId);
        if (!selectedProperty) {
            return;
        }

        setFormData((prev) => {
            const next = {
                ...prev,
                name: selectedProperty.name,
                hospitable_property_id: selectedProperty.id,
            };

            if (isNew) {
                next.slug = slugifyHospitableName(selectedProperty.name);
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
    }, [formData.description, loading, activeTab]);

    const persistPropertyChanges = async () => {
        setSaving(true);

        try {
            const payload = buildPropertyPayload(formData);

            if (superAdmin) {
                // Superadmins save directly and always publish
                payload.is_published = true;
                validatePublishRequirements(payload);
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
                if (isNew) navigate(`/admin/properties/${result.slug}`);
            } else if (isNew) {
                // Editors: create as unpublished draft directly
                payload.is_published = false;
                const { data, error } = await supabase.from("properties").insert(payload).select().single();
                if (error) throw error;
                setPropertyId(data.id);
                setIsPublished(false);
                setBeforeSnapshot(toFormState(data));
                setFormData(toFormState(data));
                alert("Draft property created! You can now add media and amenities. Submit for publish when ready.");
                navigate(`/admin/properties/${data.slug}`);
            } else if (!isPublished) {
                // Editors save draft changes directly while property is unpublished.
                payload.is_published = false;
                const { data, error } = await supabase
                    .from("properties")
                    .update(payload)
                    .eq("id", propertyId)
                    .select()
                    .single();
                if (error) throw error;
                const normalized = toFormState(data);
                setFormData(normalized);
                setBeforeSnapshot(normalized);
                setIsPublished(false);
                alert("Draft saved.");
            } else {
                // Editors on published properties: save as a non-live draft request.
                payload.is_published = isPublished;
                validatePublishRequirements(payload);
                const { data: userData } = await supabase.auth.getUser();
                const existingOpen = await findOpenRequest("property", propertyId, "update");

                if (existingOpen) {
                    const mergedPayload = {
                        ...(existingOpen.payload || {}),
                        ...payload,
                        spaces: normalizePropertySpaces(payload.spaces),
                    };
                    const { error: updateError } = await resubmitApprovalRequest(
                        existingOpen.id,
                        mergedPayload,
                        beforeSnapshot,
                        editorNote || "Draft property update request."
                    );
                    if (updateError) {
                        // Fallback: keep editing flow usable even if update policy blocks edits on requests.
                        const { error: requestError } = await submitApprovalRequest({
                            entityType: "property",
                            action: "update",
                            entityId: propertyId,
                            payload: mergedPayload,
                            beforeSnapshot,
                            submittedBy: userData?.user?.id || null,
                            comment: editorNote || "Property update request.",
                        });
                        if (requestError) throw requestError;
                        alert("Draft update saved as a new approval request.");
                    } else {
                        alert("Draft changes updated.");
                    }
                } else {
                    const { error: requestError } = await submitApprovalRequest({
                        entityType: "property",
                        action: "update",
                        entityId: propertyId,
                        payload,
                        beforeSnapshot,
                        submittedBy: userData?.user?.id || null,
                        comment: editorNote || "Property update request.",
                    });
                    if (requestError) throw requestError;
                    alert("Draft changes saved for review.");
                }
                const refreshedOpen = await findOpenRequest("property", propertyId, "update");
                setPropertyDraftRequest(refreshedOpen || null);
            }
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Error saving property: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        await persistPropertyChanges();
    };

    const handleSpacesChange = (nextSpaces) => {
        setFormData((prev) => ({
            ...prev,
            spaces: normalizePropertySpaces(nextSpaces),
        }));
    };

    const handleSubmitForPublish = async () => {
        if (!propertyId) return;
        setPublishing(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const payload = { ...buildPropertyPayload(formData), is_published: true };
            validatePublishRequirements(payload);

            // Check for an existing revision_requested request to update instead of creating a duplicate
            const existingRevision = await findRevisionRequest("property", propertyId);
            if (existingRevision) {
                const { error: updateError } = await resubmitApprovalRequest(
                    existingRevision.id,
                    payload,
                    beforeSnapshot,
                    editorNote || "Revised and resubmitted for publish."
                );
                if (updateError) throw updateError;
            } else {
                const { error: requestError } = await submitApprovalRequest({
                    entityType: "property",
                    action: "update",
                    entityId: propertyId,
                    payload,
                    beforeSnapshot,
                    submittedBy: userData?.user?.id || null,
                    comment: editorNote || "Request to publish draft property.",
                });
                if (requestError) throw requestError;
            }
            alert("Publish request submitted to superadmin for approval.");
            navigate("/admin/properties");
        } catch (error) {
            console.error("Error submitting publish request:", error);
            alert("Error: " + error.message);
        } finally {
            setPublishing(false);
        }
    };

    const saveButtonLabel = superAdmin
        ? "Save Changes"
        : isNew
            ? "Create Draft"
            : isPublished
                ? "Save Draft Changes"
                : "Save Draft";

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
                        onClick={() => propertyId ? setActiveTab("media") : alert("Save property first")}
                        disabled={!propertyId}
                    >
                        Media Gallery
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "spaces" ? styles.active : ""}`}
                        onClick={() => propertyId ? setActiveTab("spaces") : alert("Save property first")}
                        disabled={!propertyId}
                    >
                        Spaces
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "amenities" ? styles.active : ""}`}
                        onClick={() => propertyId ? setActiveTab("amenities") : alert("Save property first")}
                        disabled={!propertyId}
                    >
                        Amenities
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === "details" && (
                        <form onSubmit={handleSave} className={styles.formGrid}>
                            {!superAdmin && !isPublished && !isNew && (
                                <div className={styles.card} style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}>
                                    <h3 style={{ color: "#b45309" }}>Draft Property</h3>
                                    <p style={{ marginTop: "8px", color: "#92400e" }}>
                                        This property is not yet published. Draft saves are direct and visible immediately. Submit for publish only when details, images, and amenities are complete.
                                    </p>
                                </div>
                            )}
                            {!superAdmin && !isNew && isPublished && (
                                <div className={styles.card}>
                                    <h3>Approval Flow Enabled</h3>
                                    <p style={{ marginTop: "8px", color: "#555" }}>
                                        Published properties keep live data unchanged. Saving here updates your draft request for review.
                                    </p>
                                </div>
                            )}
                            {!superAdmin && isPublished && propertyDraftRequest && (
                                <div className={styles.card} style={{ borderLeft: "4px solid #0ea5e9", background: "#f0f9ff" }}>
                                    <h3 style={{ color: "#0c4a6e" }}>Draft Changes Pending Review</h3>
                                    <p style={{ marginTop: "8px", color: "#075985" }}>
                                        Live property is unchanged. Only the fields below are currently in draft:
                                    </p>
                                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {draftChangedFields.length ? (
                                            draftChangedFields.map((field) => (
                                                <span
                                                    key={field}
                                                    style={{
                                                        fontSize: "12px",
                                                        padding: "4px 8px",
                                                        borderRadius: "999px",
                                                        background: "#e0f2fe",
                                                        border: "1px solid #bae6fd",
                                                        color: "#0c4a6e",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {field.replace(/_/g, " ")}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: "12px", color: "#075985" }}>No field diffs detected yet.</span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className={styles.card}>
                                <h3>Basic Info</h3>
                                <div className={styles.fieldGroup}>
                                    <label>Select Hospitable Property</label>
                                    <select
                                        value={formData.hospitable_property_id}
                                        onChange={handleHospitablePropertySelect}
                                        disabled={hospitablePropertiesLoading || hospitableProperties.length === 0}
                                    >
                                        <option value="">
                                            {hospitablePropertiesLoading
                                                ? "Loading Hospitable properties..."
                                                : "Select Hospitable property"}
                                        </option>
                                        {hospitableProperties.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p style={{ marginTop: "8px", color: "#666", fontSize: "12px" }}>
                                        Selecting a Hospitable property auto-fills the property name and Hospitable Property ID.
                                    </p>
                                    {hospitablePropertiesError && (
                                        <p style={{ marginTop: "6px", color: "#b91c1c", fontSize: "12px" }}>
                                            {hospitablePropertiesError}
                                        </p>
                                    )}
                                </div>
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
                                <div className={styles.fieldGroup}>
                                    <label>Hospitable Property ID</label>
                                    <input
                                        name="hospitable_property_id"
                                        value={formData.hospitable_property_id}
                                        onChange={handleChange}
                                        placeholder="550e8400-e29b-41d4-a716-446655440000"
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Video URL</label>
                                    <input
                                        name="video_url"
                                        value={formData.video_url}
                                        onChange={handleChange}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
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

                            {!superAdmin && (
                                <div className={styles.card}>
                                    <h3>Note to Superadmin</h3>
                                    <textarea
                                        value={editorNote}
                                        onChange={(e) => setEditorNote(e.target.value)}
                                        placeholder="Add a note for the superadmin (e.g. 'Added new photos, please review')..."
                                        rows={2}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            border: "1px solid #ddd",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            resize: "vertical",
                                            fontFamily: "inherit",
                                        }}
                                    />
                                </div>
                            )}

                            <div className={styles.actionBar}>
                                <button type="button" className={styles.cancelBtn} onClick={() => navigate("/admin/properties")}>Cancel</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>
                                    {saving ? "Saving..." : saveButtonLabel}
                                </button>
                                {!superAdmin && !isNew && !isPublished && (
                                    <button
                                        type="button"
                                        className={styles.saveBtn}
                                        style={{ background: "#10b981", borderColor: "#10b981" }}
                                        disabled={publishing}
                                        onClick={handleSubmitForPublish}
                                    >
                                        {publishing ? "Submitting..." : "Submit for Publish"}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {activeTab === "media" && propertyId && superAdmin && (
                        <>
                            <CuratedImagesManager propertyId={propertyId} isDraft={isDraftProperty} />
                            <div style={{ marginTop: '24px' }}></div>
                            <MediaManager propertyId={propertyId} isDraft={isDraftProperty} />
                        </>
                    )}

                    {activeTab === "media" && propertyId && !superAdmin && (
                        <>
                            <div className={styles.card}>
                                <h3>{approvalRequiredForEdits ? "Approval Flow Enabled" : "Draft Mode Enabled"}</h3>
                                <p style={{ marginTop: "8px", color: "#555" }}>
                                    {approvalRequiredForEdits
                                        ? "Media changes are saved as draft requests. Live media stays unchanged until approved."
                                        : "Media updates save directly to this draft and will be reviewed together when you submit for publish."}
                                </p>
                            </div>
                            <CuratedImagesManager propertyId={propertyId} isDraft={isDraftProperty} />
                            <div style={{ marginTop: '24px' }}></div>
                            <MediaManager propertyId={propertyId} isDraft={isDraftProperty} />
                        </>
                    )}

                    {activeTab === "spaces" && propertyId && (
                        <>
                            {!superAdmin && isPublished && (
                                <div className={styles.card}>
                                    <h3>Approval Flow Enabled</h3>
                                    <p style={{ marginTop: "8px", color: "#555" }}>
                                        Space updates are part of property draft changes. Save spaces and submit for review to publish.
                                    </p>
                                </div>
                            )}
                            <SpacesManager
                                propertyId={propertyId}
                                spaces={formData.spaces}
                                onChange={handleSpacesChange}
                            />
                            <div className={styles.actionBar}>
                                <button type="button" className={styles.cancelBtn} onClick={() => navigate("/admin/properties")}>Cancel</button>
                                <button
                                    type="button"
                                    className={styles.saveBtn}
                                    disabled={saving}
                                    onClick={persistPropertyChanges}
                                >
                                    {saving ? "Saving..." : saveButtonLabel}
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === "amenities" && propertyId && (
                        <AmenitiesManager propertyId={propertyId} isDraft={isDraftProperty} />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default PropertyEditor;
