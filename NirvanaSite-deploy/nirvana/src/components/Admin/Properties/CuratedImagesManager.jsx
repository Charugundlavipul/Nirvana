import React, { useEffect, useRef, useState } from "react";
import styles from "./CuratedImagesManager.module.css";
import { supabase } from "../../../supabaseClient";
import {
    fetchOpenPropertyRequests,
    getCurrentAdminRole,
    isSuperAdminRole,
    parseApprovalObject,
    submitApprovalRequest
} from "../../../lib/adminApi";

const SLOTS = ["home", "bg", "secondary"];

const CuratedImagesManager = ({ propertyId, isDraft = false }) => {
    const [images, setImages] = useState({ home: null, bg: null, secondary: null });
    const [pendingBySlot, setPendingBySlot] = useState({ home: null, bg: null, secondary: null });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({ home: false, bg: false, secondary: false });
    const [adminRole, setAdminRole] = useState(null);
    const fileInputRefs = useRef({});
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
        try {
            const { data, error } = await supabase
                .from("property_curated_images")
                .select("*")
                .eq("property_id", propertyId);

            if (error) throw error;

            const map = { home: null, bg: null, secondary: null };
            data?.forEach(row => {
                map[row.slot] = row; // row has { id, url, slot }
            });
            setImages(map);
        } catch (error) {
            console.error("Error loading curated images:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadPendingDrafts = async () => {
        if (!propertyId || canEditDirectly) {
            setPendingBySlot({ home: null, bg: null, secondary: null });
            return;
        }

        const { data, error } = await fetchOpenPropertyRequests(propertyId, ["property_curated_image"]);
        if (error) {
            console.error("Error loading curated image draft requests:", error);
            return;
        }

        const next = { home: null, bg: null, secondary: null };
        (data || [])
            .slice()
            .sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0))
            .forEach((req) => {
                const payload = parseApprovalObject(req.payload);
                const beforeSnapshot = parseApprovalObject(req.before_snapshot);
                const slot = payload.slot || beforeSnapshot.slot;
                if (!slot || !Object.prototype.hasOwnProperty.call(next, slot)) return;
                next[slot] = {
                    id: req.id,
                    action: String(req.action || "").toLowerCase(),
                    url: payload.url || beforeSnapshot.url || "",
                    beforeSnapshot,
                };
            });
        setPendingBySlot(next);
    };

    const handleUpload = async (e, slot) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!canEditDirectly && pendingBySlot[slot]) {
            alert(`A draft request for ${slot} is already pending review.`);
            return;
        }

        setUploading(prev => ({ ...prev, [slot]: true }));

        try {
            const fileName = `${propertyId}/curated/${slot}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            const { error: uploadErr } = await supabase.storage
                .from("property-assets")
                .upload(fileName, file);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage.from("property-assets").getPublicUrl(fileName);

            const payload = {
                property_id: propertyId,
                slot,
                url: publicUrl,
                display_order: SLOTS.indexOf(slot)
            };

            if (canEditDirectly) {
                const { error: dbErr } = await supabase
                    .from("property_curated_images")
                    .upsert(payload, { onConflict: 'property_id, slot' });
                if (dbErr) throw dbErr;
                await loadImages();
                return;
            }

            const existing = images[slot];
            const { data: userData } = await supabase.auth.getUser();
            const { error: requestError } = await submitApprovalRequest({
                entityType: "property_curated_image",
                action: existing ? "update" : "create",
                entityId: existing?.id || null,
                payload,
                beforeSnapshot: existing || null,
                submittedBy: userData?.user?.id || null,
                comment: `Curated ${slot} image change request`,
            });
            if (requestError) throw requestError;
            alert(`${slot} image request submitted for approval.`);
            await loadPendingDrafts();
        } catch (error) {
            console.error(`Error uploading ${slot}:`, error);
            alert(`Failed to upload ${slot}: ` + error.message);
        } finally {
            setUploading(prev => ({ ...prev, [slot]: false }));
        }
    };

    const handleDelete = async (slot) => {
        if (!images[slot] && pendingBySlot[slot]) {
            alert("This is a draft upload request. It cannot be removed here until reviewed.");
            return;
        }
        if (!images[slot]) return;
        if (!confirm(`Remove ${slot} image?`)) return;

        try {
            if (canEditDirectly) {
                const { error } = await supabase
                    .from("property_curated_images")
                    .delete()
                    .eq("property_id", propertyId)
                    .eq("slot", slot);
                if (error) throw error;
                setImages(prev => ({ ...prev, [slot]: null }));
                return;
            }

            const target = images[slot];
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitApprovalRequest({
                entityType: "property_curated_image",
                action: "delete",
                entityId: target.id,
                payload: {},
                beforeSnapshot: target,
                submittedBy: userData?.user?.id || null,
                comment: `Curated ${slot} image delete request`,
            });
            if (error) throw error;
            alert(`${slot} image delete request submitted for approval.`);
            await loadPendingDrafts();
        } catch (error) {
            console.error(`Error deleting ${slot}:`, error);
            alert(`Failed to delete ${slot}: ` + error.message);
        }
    };

    if (loading) return <div>Loading curated images...</div>;

    return (
        <div className={styles.card}>
            <h3>Key Images (Curated)</h3>
            <p className={styles.hint}>These specific images are used in key locations on the site.</p>

            <div className={styles.row}>
                {SLOTS.map(slot => (
                    <div key={slot} className={styles.fieldGroup}>
                        <label style={{ textTransform: 'capitalize' }}>{slot} Image</label>
                        {(() => {
                            const liveImage = images[slot];
                            const pendingDraft = pendingBySlot[slot];
                            const draftIsDelete = pendingDraft?.action === "delete";
                            const draftIsReplacement = pendingDraft && !draftIsDelete && pendingDraft.url;

                            return (
                                <>
                                    {liveImage ? (
                                        <div className={styles.imagePreviewWrapper}>
                                            <img src={liveImage.url} alt={slot} className={styles.previewImage} />
                                            {!canEditDirectly && draftIsDelete ? (
                                                <span style={{
                                                    position: "absolute",
                                                    top: "8px",
                                                    left: "8px",
                                                    background: "#fee2e2",
                                                    color: "#991b1b",
                                                    border: "1px solid #fecaca",
                                                    borderRadius: "999px",
                                                    padding: "2px 8px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                }}>
                                                    Draft Delete Pending
                                                </span>
                                            ) : null}
                                            <button
                                                className={styles.deleteBtnSmall}
                                                onClick={() => handleDelete(slot)}
                                                disabled={!canEditDirectly && draftIsDelete}
                                                title={!canEditDirectly && draftIsDelete ? "Delete request already pending" : undefined}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : null}

                                    {!liveImage && !draftIsReplacement ? (
                                        <div className={styles.uploadPlaceholder}>
                                            <span>No image set</span>
                                        </div>
                                    ) : null}

                                    {!canEditDirectly && draftIsReplacement ? (
                                        <div style={{ marginTop: "8px", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "8px", background: "#eff6ff" }}>
                                            <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                                                Draft Upload Pending
                                            </p>
                                            <img src={pendingDraft.url} alt={`${slot} draft`} className={styles.previewImage} />
                                        </div>
                                    ) : null}
                                </>
                            );
                        })()}

                        <div style={{ marginTop: '8px' }}>
                            <input
                                ref={(el) => { fileInputRefs.current[slot] = el; }}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleUpload(e, slot)}
                                disabled={uploading[slot]}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className={styles.uploadBtn}
                                onClick={() => fileInputRefs.current[slot]?.click()}
                                disabled={uploading[slot] || (!canEditDirectly && !!pendingBySlot[slot])}
                            >
                                {uploading[slot]
                                    ? "Uploading..."
                                    : (!canEditDirectly && pendingBySlot[slot])
                                        ? "Pending Review"
                                        : images[slot]
                                            ? "Replace Image"
                                            : "Upload Image"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CuratedImagesManager;
