import React, { useEffect, useState } from "react";
import styles from "./PropertyEditor.module.css"; // Reuse styling for now or split if needed
import { supabase } from "../../../supabaseClient";

const MediaManager = ({ propertyId }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadImages();
    }, [propertyId]);

    const loadImages = async () => {
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

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setUploading(true);
        try {
            const startOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order || 0)) + 1 : 0;
            const uploads = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `${propertyId}/gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

                const { error: uploadErr } = await supabase.storage
                    .from("property-assets")
                    .upload(fileName, file);

                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage.from("property-assets").getPublicUrl(fileName);

                uploads.push({
                    property_id: propertyId,
                    url: publicUrl,
                    category: "gallery",
                    display_order: startOrder + i
                });
            }

            const { error: insertErr } = await supabase.from("property_images").insert(uploads);
            if (insertErr) throw insertErr;

            loadImages();
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
            const { error } = await supabase.from("property_images").delete().eq("id", id);
            if (error) throw error;
            setImages(prev => prev.filter(img => img.id !== id));
        } catch (error) {
            alert("Failed to delete: " + error.message);
        }
    };

    return (
        <div className={styles.card}>
            <h3>Gallery Images</h3>
            <div className={styles.fieldGroup}>
                <label>Upload New Images</label>
                <input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} />
                {uploading && <p>Uploading...</p>}
            </div>

            <div className={styles.row} style={{ flexWrap: 'wrap', marginTop: '20px' }}>
                {images.map(img => (
                    <div key={img.id} style={{ position: 'relative', width: '150px', height: '100px' }}>
                        <img
                            src={img.url}
                            alt="Gallery"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <button
                            onClick={() => handleDelete(img.id)}
                            style={{
                                position: 'absolute', top: '4px', right: '4px',
                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MediaManager;
