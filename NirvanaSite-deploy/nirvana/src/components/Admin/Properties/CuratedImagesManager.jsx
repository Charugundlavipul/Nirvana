import React, { useEffect, useState } from "react";
import styles from "./CuratedImagesManager.module.css";
import editorStyles from "./PropertyEditor.module.css"; // Reuse card/field styles
import { supabase } from "../../../supabaseClient";

const SLOTS = ["home", "bg", "secondary"];

const CuratedImagesManager = ({ propertyId }) => {
    const [images, setImages] = useState({ home: null, bg: null, secondary: null });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({ home: false, bg: false, secondary: false });

    useEffect(() => {
        loadImages();
    }, [propertyId]);

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

            // Upsert into DB
            const { error: dbErr } = await supabase
                .from("property_curated_images")
                .upsert({
                    property_id: propertyId,
                    slot: slot,
                    url: publicUrl,
                    display_order: SLOTS.indexOf(slot)
                }, { onConflict: 'property_id, slot' }); // Ensure unique constraint on property_id + slot

            if (dbErr) throw dbErr;

            await loadImages(); // Reload to get IDs/Fresh data
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
            const { error } = await supabase
                .from("property_curated_images")
                .delete()
                .eq("property_id", propertyId)
                .eq("slot", slot);

            if (error) throw error;

            setImages(prev => ({ ...prev, [slot]: null }));
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
