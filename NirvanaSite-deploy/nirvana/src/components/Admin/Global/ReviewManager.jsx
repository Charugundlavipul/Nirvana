import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { getCurrentAdminRole, isSuperAdminRole, submitApprovalRequest } from "../../../lib/adminApi";
import listStyles from "../Properties/PropertyList.module.css";
import formStyles from "../Properties/PropertyEditor.module.css";
import styles from "../Properties/PropertyEditor.module.css";

const ReviewManager = () => {
    const SOURCE_OPTIONS = ["direct", "airbnb", "vrbo"];

    const normalizeSource = (value) => {
        const normalized = String(value || "").trim().toLowerCase();
        return SOURCE_OPTIONS.includes(normalized) ? normalized : "direct";
    };

    const [reviews, setReviews] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [adminRole, setAdminRole] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        property_ids: [],
        author_name: "",
        rating: 5,
        content: "",
        date: new Date().toISOString().split('T')[0],
        avatar_url: "",
        source: "direct"
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const loadRole = async () => {
            const role = await getCurrentAdminRole();
            setAdminRole(role);
        };
        loadRole();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Load Reviews
        const { data: reviewsData, error: reviewsError } = await supabase
            .from("reviews")
            .select("*, property_reviews(property_id)")
            .order("date", { ascending: false })
            .order("created_at", { ascending: false });

        if (reviewsError) console.error(reviewsError);

        // Load Properties
        const { data: propsData, error: propsError } = await supabase
            .from("properties")
            .select("id, name")
            .order("name");

        if (propsError) console.error(propsError);

        // Process reviews to attach property names efficiently
        const propsMap = new Map((propsData || []).map(p => [p.id, p.name]));

        const propertyCount = propsData ? propsData.length : 0;
        const enhancedReviews = (reviewsData || []).map(r => {
            const linkedIds = (r.property_reviews || []).map(pr => pr.property_id);
            const linkedNames = linkedIds.map(id => propsMap.get(id)).filter(Boolean).join(", ");

            let displayLabel = "Hidden (Not Linked)";
            if (linkedIds.length > 0) {
                if (linkedIds.length === propertyCount) {
                    displayLabel = "All Properties (Global)";
                } else {
                    displayLabel = linkedNames;
                }
            }

            return {
                ...r,
                property_ids: linkedIds,
                property_names: displayLabel
            };
        });

        setReviews(enhancedReviews);
        setProperties(propsData || []);
        setLoading(false);
    };

    const handleEdit = (review) => {
        setFormData({
            id: review.id,
            property_ids: review.property_ids || [],
            author_name: review.author_name || "",
            rating: review.rating || 5,
            content: review.content || "",
            date: review.date || new Date().toISOString().split('T')[0],
            avatar_url: review.avatar_url || "",
            source: normalizeSource(review.source)
        });
        setIsEditing(true);
    };

    const handleCreate = () => {
        setFormData({
            id: null,
            property_ids: [],
            author_name: "",
            rating: 5,
            content: "",
            date: new Date().toISOString().split('T')[0],
            avatar_url: "",
            source: "direct"
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this review?")) return;

        try {
            if (isSuperAdminRole(adminRole)) {
                await supabase.from("reviews").delete().eq("id", id);
                loadData();
                return;
            }

            const target = reviews.find((r) => r.id === id);
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitApprovalRequest({
                entityType: "review",
                action: "delete",
                entityId: id,
                payload: {},
                beforeSnapshot: target || null,
                submittedBy: userData?.user?.id || null,
                comment: "Review delete request",
            });
            if (error) throw error;
            alert("Delete request submitted for approval.");
        } catch (error) {
            alert("Error deleting review: " + error.message);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `avatars/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error: uploadErr } = await supabase.storage
                .from("profile-pictures")
                .upload(fileName, file);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (error) {
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const toggleProperty = (propId) => {
        setFormData(prev => {
            const current = new Set(prev.property_ids);
            if (current.has(propId)) {
                current.delete(propId);
            } else {
                current.add(propId);
            }
            return { ...prev, property_ids: Array.from(current) };
        });
    };

    const handleSelectAll = () => {
        if (formData.property_ids.length === properties.length) {
            // Deselect All
            setFormData(prev => ({ ...prev, property_ids: [] }));
        } else {
            // Select All
            setFormData(prev => ({ ...prev, property_ids: properties.map(p => p.id) }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                author_name: formData.author_name,
                rating: parseInt(formData.rating),
                content: formData.content,
                date: formData.date,
                avatar_url: formData.avatar_url,
                source: normalizeSource(formData.source),
                property_ids: formData.property_ids
            };

            if (isSuperAdminRole(adminRole)) {
                let reviewId = formData.id;

                if (reviewId) {
                    const { error } = await supabase.from("reviews").update(payload).eq("id", reviewId);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase.from("reviews").insert(payload).select().single();
                    if (error) throw error;
                    reviewId = data.id;
                }

                await supabase.from("property_reviews").delete().eq("review_id", reviewId);
                if (formData.property_ids.length > 0) {
                    const links = formData.property_ids.map(pid => ({
                        review_id: reviewId,
                        property_id: pid
                    }));
                    const { error: linkError } = await supabase.from("property_reviews").insert(links);
                    if (linkError) throw linkError;
                }

                setIsEditing(false);
                loadData();
                return;
            }

            const action = formData.id ? "update" : "create";
            const beforeSnapshot = formData.id
                ? reviews.find((review) => review.id === formData.id) || null
                : null;
            const { data: userData } = await supabase.auth.getUser();
            const { error: requestError } = await submitApprovalRequest({
                entityType: "review",
                action,
                entityId: formData.id || null,
                payload,
                beforeSnapshot,
                submittedBy: userData?.user?.id || null,
                comment: formData.id ? "Review update request" : "Review creation request",
            });
            if (requestError) throw requestError;

            alert("Review change request submitted for approval.");
            setIsEditing(false);
        } catch (error) {
            alert("Error saving review: " + error.message);
        }
    };

    if (isEditing) {
        return (
            <div className={formStyles.card}>
                <h3>{formData.id ? "Edit Review" : "New Review"}</h3>
                <form onSubmit={handleSave} className={formStyles.formGrid}>

                    <div className={formStyles.fieldGroup}>
                        <label>Tagged Properties</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', border: '1px solid #ddd', padding: '12px', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                            {properties.map(p => (
                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.property_ids.includes(p.id)}
                                        onChange={() => toggleProperty(p.id)}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    {p.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={formStyles.row}>
                        <div className={formStyles.fieldGroup}>
                            <label>Author Name</label>
                            <input
                                value={formData.author_name}
                                onChange={e => setFormData({ ...formData, author_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className={formStyles.fieldGroup}>
                            <label>Rating (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={formData.rating}
                                onChange={e => setFormData({ ...formData, rating: e.target.value })}
                                required
                            />
                        </div>
                        <div className={formStyles.fieldGroup}>
                            <label>Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className={formStyles.fieldGroup}>
                        <label>Review Content</label>
                        <textarea
                            rows={4}
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            required
                        />
                    </div>

                    <div className={formStyles.row}>
                        <div className={formStyles.fieldGroup}>
                            <label>Avatar</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {formData.avatar_url && (
                                    <img src={formData.avatar_url} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd' }} />
                                )}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                            </div>
                            {uploading && <span style={{ fontSize: '12px', color: '#666' }}>Uploading...</span>}
                        </div>
                        <div className={formStyles.fieldGroup}>
                            <label>Source (e.g. Airbnb, VRBO)</label>
                            <select
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: normalizeSource(e.target.value) })}
                            >
                                <option value="direct">direct</option>
                                <option value="airbnb">airbnb</option>
                                <option value="vrbo">vrbo</option>
                            </select>
                        </div>
                    </div>

                    <div className={formStyles.actionBar}>
                        <button type="button" className={formStyles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="submit" className={formStyles.saveBtn}>
                            {isSuperAdminRole(adminRole) ? "Save Review" : "Submit for Approval"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div className={listStyles.header}>
                <h3>All Reviews</h3>
                <button className={listStyles.addBtn} onClick={handleCreate}>+ Add Review</button>
            </div>
            {loading ? <p>Loading...</p> : (
                <div className={listStyles.grid}>
                    {reviews.map(r => (
                        <div key={r.id} className={listStyles.card} style={{ height: 'auto' }}>
                            <div className={listStyles.cardContent}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <img src={r.avatar_url || '/assets/placeholder-user.png'} style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#eee' }} alt="avatar" />
                                    <div>
                                        <strong>{r.author_name}</strong>
                                        <div style={{ color: '#ffb400' }}>{"★".repeat(r.rating)}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {r.property_names} | {new Date(r.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '14px', color: '#444', fontStyle: 'italic' }}>"{r.content}"</p>
                                <div className={listStyles.cardFooter}>
                                    <button className={listStyles.editBtn} onClick={() => handleEdit(r)}>Edit</button>
                                    <button className={listStyles.deleteBtn} onClick={() => handleDelete(r.id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewManager;
