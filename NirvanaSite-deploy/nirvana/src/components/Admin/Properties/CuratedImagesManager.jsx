import React, { useEffect, useState } from "react";
import styles from "./CuratedImagesManager.module.css";
import editorStyles from "./PropertyEditor.module.css"; // Reuse card/field styles
import { supabase } from "../../../supabaseClient";
import { getCurrentAdminRole, isSuperAdminRole, submitApprovalRequest } from "../../../lib/adminApi";

const SLOTS = ["home", "bg", "secondary"];

const CuratedImagesManager = ({ propertyId }) => {
    const [images, setImages] = useState({ home: null, bg: null, secondary: null });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({ home: false, bg: false, secondary: false });
    const [adminRole, setAdminRole] = useState(null);

    useEffect(() => {
        loadImages();
    }, [propertyId]);

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

    const handleUpload = async (e, slot) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

            if (isSuperAdminRole(adminRole)) {
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
        } catch (error) {
            console.error(`Error uploading ${slot}:`, error);
            alert(`Failed to upload ${slot}: ` + error.message);
        } finally {
            setUploading(prev => ({ ...prev, [slot]: false }));
        }
    };

    const handleDelete = async (slot) => {
        if (!images[slot]) return;
        if (!confirm(`Remove ${slot} image?`)) return;

        try {
            if (isSuperAdminRole(adminRole)) {
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

                        {images[slot] ? (
                            <div className={styles.imagePreviewWrapper}>
                                <img src={images[slot].url} alt={slot} className={styles.previewImage} />
                                <button
                                    className={styles.deleteBtnSmall}
                                    onClick={() => handleDelete(slot)}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className={styles.uploadPlaceholder}>
                                <span>No image set</span>
                            </div>
                        )}

                        <div style={{ marginTop: '8px' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleUpload(e, slot)}
                                disabled={uploading[slot]}
                            />
                            {uploading[slot] && <span style={{ fontSize: '12px' }}> Uploading...</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CuratedImagesManager;
