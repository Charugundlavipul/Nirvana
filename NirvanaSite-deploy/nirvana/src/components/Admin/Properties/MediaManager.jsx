import React, { useEffect, useState } from "react";
import styles from "./PropertyEditor.module.css";
import { supabase } from "../../../supabaseClient";
import {
    fetchOpenPropertyRequests,
    getCurrentAdminRole,
    isSuperAdminRole,
    parseApprovalObject,
    submitOrUpdateApproval,
    queueKnowledgeRefresh
} from "../../../lib/adminApi";
import { compressImageToWebp } from "../../../lib/imageCompressor";

const StarIcon = ({ filled }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill={filled ? "#f59e0b" : "none"}
        stroke={filled ? "#f59e0b" : "rgba(255,255,255,0.85)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const MediaManager = ({ propertyId, isDraft = false }) => {
    const [images, setImages] = useState([]);
    const [highlightUrls, setHighlightUrls] = useState(new Set());
    const [highlightRowsByUrl, setHighlightRowsByUrl] = useState({});
    const [pendingDrafts, setPendingDrafts] = useState({ creates: [], updatesById: {}, deletesById: {} });
    const [pendingHighlightDrafts, setPendingHighlightDrafts] = useState({ addsByUrl: {}, removesByUrl: {} });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [togglingUrl, setTogglingUrl] = useState(null);
    const [adminRole, setAdminRole] = useState(null);
    const canEditDirectly = isDraft || isSuperAdminRole(adminRole);

    useEffect(() => {
        loadImages();
        loadHighlights();
    }, [propertyId]);

    useEffect(() => {
        loadPendingDrafts();
    }, [propertyId, canEditDirectly]);

    useEffect(() => {
        const loadRole = async () => {
            const role = await getCurrentAdminRole();
            setAdminRole(role);
        };
        loadRole();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("property_images")
                .select("*")
                .eq("property_id", propertyId)
                .order("display_order", { ascending: true });

            if (error) throw error;
            setImages(data || []);
        } catch (error) {
            console.error("Error loading images:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadHighlights = async () => {
        try {
            const { data, error } = await supabase
                .from("property_highlight_images")
                .select("id,url,display_order")
                .eq("property_id", propertyId)
                .order("display_order", { ascending: true });

            if (error && !error.message?.includes("does not exist")) throw error;
            const rows = data || [];
            setHighlightUrls(new Set(rows.map(r => r.url)));
            const byUrl = {};
            rows.forEach(r => { byUrl[r.url] = r; });
            setHighlightRowsByUrl(byUrl);
        } catch (error) {
            console.error("Error loading highlight images:", error);
        }
    };

    const loadPendingDrafts = async () => {
        if (!propertyId || canEditDirectly) {
            setPendingDrafts({ creates: [], updatesById: {}, deletesById: {} });
            setPendingHighlightDrafts({ addsByUrl: {}, removesByUrl: {} });
            return;
        }

        const { data, error } = await fetchOpenPropertyRequests(propertyId, ["property_image", "property_highlight_image"]);
        if (error) {
            console.error("Error loading draft requests:", error);
            return;
        }

        const next = { creates: [], updatesById: {}, deletesById: {} };
        const nextHighlight = { addsByUrl: {}, removesByUrl: {} };

        (data || [])
            .slice()
            .sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0))
            .forEach((req) => {
                const action = String(req.action || "").toLowerCase();
                const payload = parseApprovalObject(req.payload);
                const beforeSnapshot = parseApprovalObject(req.before_snapshot);
                const entityType = String(req.entity_type || "").toLowerCase();

                if (entityType === "property_highlight_image") {
                    if (action === "create" && payload.url) {
                        nextHighlight.addsByUrl[payload.url] = { id: req.id };
                    }
                    if (action === "delete" && beforeSnapshot.url) {
                        nextHighlight.removesByUrl[beforeSnapshot.url] = { id: req.id };
                    }
                    return;
                }

                if (action === "create" && payload.url) {
                    next.creates.push({ id: req.id, url: payload.url, display_order: payload.display_order ?? null });
                    return;
                }

                if (!req.entity_id) return;
                const entityId = String(req.entity_id);

                if (action === "delete") {
                    next.deletesById[entityId] = { id: req.id, beforeSnapshot };
                    return;
                }

                if (action === "update") {
                    next.updatesById[entityId] = { id: req.id, url: payload.url || beforeSnapshot.url || "" };
                }
            });

        setPendingDrafts(next);
        setPendingHighlightDrafts(nextHighlight);
    };

    const handleToggleHighlight = async (img) => {
        if (togglingUrl === img.url) return;
        setTogglingUrl(img.url);
        const isCurrentlyHighlighted = highlightUrls.has(img.url);

        try {
            if (canEditDirectly) {
                if (isCurrentlyHighlighted) {
                    const row = highlightRowsByUrl[img.url];
                    if (row) {
                        const { error } = await supabase.from("property_highlight_images").delete().eq("id", row.id);
                        if (error) throw error;
                    }
                } else {
                    const maxOrder = Object.values(highlightRowsByUrl).reduce((m, r) => Math.max(m, r.display_order || 0), 0);
                    const { error } = await supabase.from("property_highlight_images").insert({
                        property_id: propertyId,
                        url: img.url,
                        display_order: maxOrder + 1,
                    });
                    if (error) throw error;
                }
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                await loadHighlights();
                return;
            }

            // Non-superadmin: approval flow
            const hasPendingAdd = !!pendingHighlightDrafts.addsByUrl[img.url];
            const hasPendingRemove = !!pendingHighlightDrafts.removesByUrl[img.url];

            if (isCurrentlyHighlighted && hasPendingRemove) {
                alert("A remove-from-highlights request is already pending approval.");
                return;
            }
            if (!isCurrentlyHighlighted && hasPendingAdd) {
                alert("An add-to-highlights request is already pending approval.");
                return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const submittedBy = userData?.user?.id || null;

            if (isCurrentlyHighlighted) {
                const row = highlightRowsByUrl[img.url];
                const { error } = await submitOrUpdateApproval({
                    entityType: "property_highlight_image",
                    action: "delete",
                    entityId: row?.id || null,
                    payload: {},
                    beforeSnapshot: { property_id: propertyId, url: img.url },
                    submittedBy,
                    comment: "Remove image from homepage highlights",
                });
                if (error) throw error;
            } else {
                const { error } = await submitOrUpdateApproval({
                    entityType: "property_highlight_image",
                    action: "create",
                    payload: { property_id: propertyId, url: img.url },
                    submittedBy,
                    comment: "Add image to homepage highlights",
                });
                if (error) throw error;
            }

            alert("Highlight change submitted for approval.");
            await loadPendingDrafts();
        } catch (error) {
            alert("Failed to update highlight: " + error.message);
        } finally {
            setTogglingUrl(null);
        }
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(true);
        try {
            const startOrder = images.length > 0 ? Math.max(...images.map((i) => i.display_order || 0)) + 1 : 0;
            const uploads = [];

            for (let i = 0; i < files.length; i++) {
                const originalFile = files[i];
                const file = await compressImageToWebp(originalFile);
                const fileName = `${propertyId}/gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

                const { error: uploadErr } = await supabase.storage
                    .from("property-assets")
                    .upload(fileName, file);

                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage.from("property-assets").getPublicUrl(fileName);

                uploads.push({
                    property_id: propertyId,
                    url: publicUrl,
                    category: "gallery",
                    display_order: startOrder + i,
                });
            }

            if (canEditDirectly) {
                const { error: insertErr } = await supabase.from("property_images").insert(uploads);
                if (insertErr) throw insertErr;
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                await loadImages();
                return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const submittedBy = userData?.user?.id || null;
            const requests = uploads.map((row) =>
                submitOrUpdateApproval({
                    entityType: "property_image",
                    action: "create",
                    payload: row,
                    submittedBy,
                    comment: "Gallery image upload request",
                })
            );
            const results = await Promise.all(requests);
            const failed = results.find((r) => r.error);
            if (failed?.error) throw failed.error;
            alert("Upload request submitted for approval.");
            await loadPendingDrafts();
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this image?")) return;

        try {
            if (canEditDirectly) {
                const { error } = await supabase.from("property_images").delete().eq("id", id);
                if (error) throw error;
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                setImages((prev) => prev.filter((img) => img.id !== id));
                return;
            }

            const target = images.find((img) => img.id === id);
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitOrUpdateApproval({
                entityType: "property_image",
                action: "delete",
                entityId: id,
                payload: {},
                beforeSnapshot: target || null,
                submittedBy: userData?.user?.id || null,
                comment: "Gallery image delete request",
            });
            if (error) throw error;
            alert("Delete request submitted for approval.");
            await loadPendingDrafts();
        } catch (error) {
            alert("Failed to delete: " + error.message);
        }
    };

    if (loading) return <div className={styles.card}>Loading gallery images...</div>;

    return (
        <div className={styles.card}>
            <h3>Gallery Images</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                Click the <strong>★ star</strong> on any image to mark it as a <strong>homepage highlight</strong>. Highlighted images (amber border) appear in the property card carousel on the homepage.
            </p>

            <div className={styles.fieldGroup}>
                <label>Upload New Images</label>
                <input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} />
                {uploading && <p>Uploading...</p>}
            </div>

            {!canEditDirectly && pendingDrafts.creates.length > 0 ? (
                <div style={{ marginBottom: "12px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                        Draft Uploads Pending ({pendingDrafts.creates.length})
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {pendingDrafts.creates.map((item, idx) => (
                            <div key={item.id || idx} style={{ width: "150px" }}>
                                <div style={{ position: "relative", width: "150px", height: "100px" }}>
                                    <img
                                        src={item.url}
                                        alt="Draft upload"
                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "1px dashed #93c5fd" }}
                                    />
                                    <span style={{ position: "absolute", top: "6px", left: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "999px", padding: "2px 8px", fontSize: "10px", fontWeight: 700 }}>
                                        Draft
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: "12px", 
                marginTop: "20px" 
            }}>
                {images.map((img) => {
                    const imageId = String(img.id);
                    const deleteDraft = pendingDrafts.deletesById[imageId];
                    const updateDraft = pendingDrafts.updatesById[imageId];
                    const isHighlighted = highlightUrls.has(img.url);
                    const hasPendingAdd = !!pendingHighlightDrafts.addsByUrl[img.url];
                    const hasPendingRemove = !!pendingHighlightDrafts.removesByUrl[img.url];
                    const isToggling = togglingUrl === img.url;

                    const effectiveHighlight = isHighlighted ? !hasPendingRemove : hasPendingAdd;

                    return (
                        <div key={img.id} style={{ width: "100%" }}>
                            <div style={{ position: "relative", width: "100%", height: "160px" }}>
                                <img
                                    src={img.url}
                                    alt="Gallery"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                        opacity: deleteDraft ? 0.6 : 1,
                                        border: effectiveHighlight ? "3px solid #f59e0b" : "1px solid #e2e8f0",
                                        boxSizing: "border-box",
                                    }}
                                />


                                {/* Star highlight toggle */}
                                <button
                                    onClick={() => handleToggleHighlight(img)}
                                    disabled={isToggling}
                                    title={effectiveHighlight ? "Remove from homepage highlights" : "Mark as homepage highlight"}
                                    style={{
                                        position: "absolute",
                                        top: "4px",
                                        left: "4px",
                                        background: effectiveHighlight ? "rgba(245,158,11,0.9)" : "rgba(0,0,0,0.45)",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "26px",
                                        height: "26px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: isToggling ? "wait" : "pointer",
                                        transition: "background 0.2s",
                                        padding: 0,
                                    }}
                                >
                                    <StarIcon filled={effectiveHighlight} />
                                </button>

                                {/* Pending highlight draft badges */}
                                {hasPendingAdd && !isHighlighted && (
                                    <span style={{ position: "absolute", bottom: "6px", left: "4px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "999px", padding: "1px 6px", fontSize: "9px", fontWeight: 700 }}>
                                        ★ Pending
                                    </span>
                                )}
                                {hasPendingRemove && isHighlighted && (
                                    <span style={{ position: "absolute", bottom: "6px", left: "4px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "999px", padding: "1px 6px", fontSize: "9px", fontWeight: 700 }}>
                                        ★ Removing
                                    </span>
                                )}

                                {deleteDraft ? (
                                    <span style={{ position: "absolute", top: "6px", right: "30px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "999px", padding: "2px 8px", fontSize: "10px", fontWeight: 700 }}>
                                        Draft Delete
                                    </span>
                                ) : null}

                                <button
                                    onClick={() => handleDelete(img.id)}
                                    disabled={!canEditDirectly && !!deleteDraft}
                                    style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px" }}
                                    title={!canEditDirectly && !!deleteDraft ? "Delete request already pending" : undefined}
                                >
                                    ×
                                </button>
                            </div>

                            {!canEditDirectly && updateDraft?.url ? (
                                <div style={{ marginTop: "6px", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "6px", background: "#eff6ff" }}>
                                    <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                                        Draft Update Pending
                                    </p>
                                    <img src={updateDraft.url} alt="Draft update" style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px" }} />
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MediaManager;
