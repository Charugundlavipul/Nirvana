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

const MediaManager = ({ propertyId, isDraft = false }) => {
    const [images, setImages] = useState([]);
    const [pendingDrafts, setPendingDrafts] = useState({ creates: [], updatesById: {}, deletesById: {} });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const canEditDirectly = isDraft || isSuperAdminRole(adminRole);

    useEffect(() => {
        loadImages();
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

    const loadPendingDrafts = async () => {
        if (!propertyId || canEditDirectly) {
            setPendingDrafts({ creates: [], updatesById: {}, deletesById: {} });
            return;
        }

        const { data, error } = await fetchOpenPropertyRequests(propertyId, ["property_image"]);
        if (error) {
            console.error("Error loading gallery draft requests:", error);
            return;
        }

        const next = { creates: [], updatesById: {}, deletesById: {} };
        (data || [])
            .slice()
            .sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0))
            .forEach((req) => {
                const action = String(req.action || "").toLowerCase();
                const payload = parseApprovalObject(req.payload);
                const beforeSnapshot = parseApprovalObject(req.before_snapshot);

                if (action === "create" && payload.url) {
                    next.creates.push({
                        id: req.id,
                        url: payload.url,
                        display_order: payload.display_order ?? null,
                    });
                    return;
                }

                if (!req.entity_id) return;
                const entityId = String(req.entity_id);

                if (action === "delete") {
                    next.deletesById[entityId] = { id: req.id, beforeSnapshot };
                    return;
                }

                if (action === "update") {
                    next.updatesById[entityId] = {
                        id: req.id,
                        url: payload.url || beforeSnapshot.url || "",
                    };
                }
            });

        setPendingDrafts(next);
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(true);
        try {
            const startOrder = images.length > 0 ? Math.max(...images.map((i) => i.display_order || 0)) + 1 : 0;
            const uploads = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `${propertyId}/gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

                const { error: uploadErr } = await supabase.storage
                    .from("property-assets")
                    .upload(fileName, file);

                if (uploadErr) throw uploadErr;

                const {
                    data: { publicUrl },
                } = supabase.storage.from("property-assets").getPublicUrl(fileName);

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
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: "6px",
                                            left: "6px",
                                            background: "#eff6ff",
                                            color: "#1d4ed8",
                                            border: "1px solid #bfdbfe",
                                            borderRadius: "999px",
                                            padding: "2px 8px",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        Draft
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className={styles.row} style={{ flexWrap: "wrap", marginTop: "20px" }}>
                {images.map((img) => {
                    const imageId = String(img.id);
                    const deleteDraft = pendingDrafts.deletesById[imageId];
                    const updateDraft = pendingDrafts.updatesById[imageId];

                    return (
                        <div key={img.id} style={{ width: "150px" }}>
                            <div style={{ position: "relative", width: "150px", height: "100px" }}>
                                <img
                                    src={img.url}
                                    alt="Gallery"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                        opacity: deleteDraft ? 0.6 : 1,
                                    }}
                                />
                                {deleteDraft ? (
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: "6px",
                                            left: "6px",
                                            background: "#fee2e2",
                                            color: "#991b1b",
                                            border: "1px solid #fecaca",
                                            borderRadius: "999px",
                                            padding: "2px 8px",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        Draft Delete
                                    </span>
                                ) : null}
                                <button
                                    onClick={() => handleDelete(img.id)}
                                    disabled={!canEditDirectly && !!deleteDraft}
                                    style={{
                                        position: "absolute",
                                        top: "4px",
                                        right: "4px",
                                        background: "rgba(0,0,0,0.6)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "24px",
                                        height: "24px",
                                        cursor: "pointer",
                                    }}
                                    title={!canEditDirectly && !!deleteDraft ? "Delete request already pending" : undefined}
                                >
                                    x
                                </button>
                            </div>

                            {!canEditDirectly && updateDraft?.url ? (
                                <div style={{ marginTop: "6px", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "6px", background: "#eff6ff" }}>
                                    <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                                        Draft Update Pending
                                    </p>
                                    <img
                                        src={updateDraft.url}
                                        alt="Draft update"
                                        style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px" }}
                                    />
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
