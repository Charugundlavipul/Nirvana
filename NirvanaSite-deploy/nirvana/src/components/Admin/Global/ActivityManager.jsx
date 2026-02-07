import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { getCurrentAdminRole, isSuperAdminRole, submitApprovalRequest } from "../../../lib/adminApi";
import listStyles from "../Properties/PropertyList.module.css";
import formStyles from "../Properties/PropertyEditor.module.css";

const ActivityManager = () => {
    const [activities, setActivities] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [adminRole, setAdminRole] = useState(null);

    const [formData, setFormData] = useState({
        id: null,
        property_ids: [],
        title: "",
        description: "",
        image_url: "",
        link_url: ""
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
        const { data: actData, error: actError } = await supabase
            .from("activities")
            .select("*, property_activities(property_id)")
            .order("title")
            .order("created_at", { ascending: false });

        const { data: propsData, error: propsError } = await supabase
            .from("properties")
            .select("id, name")
            .order("name");

        const propsMap = new Map((propsData || []).map(p => [p.id, p.name]));

        const propertyCount = propsData ? propsData.length : 0;
        const enhancedActivities = (actData || []).map(a => {
            const linkedIds = (a.property_activities || []).map(pa => pa.property_id);
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
                ...a,
                property_ids: linkedIds,
                property_names: displayLabel
            };
        });

        setActivities(enhancedActivities);
        setProperties(propsData || []);
        setLoading(false);
    };

    const handleEdit = (activity) => {
        setFormData({
            id: activity.id,
            property_ids: activity.property_ids || [],
            title: activity.title || "",
            description: activity.description || "",
            image_url: activity.image_url || "",
            link_url: activity.link_url || ""
        });
        setIsEditing(true);
    };

    const handleCreate = () => {
        setFormData({
            id: null,
            property_ids: [],
            title: "",
            description: "",
            image_url: "",
            link_url: ""
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this activity?")) return;
        try {
            if (isSuperAdminRole(adminRole)) {
                await supabase.from("activities").delete().eq("id", id);
                loadData();
                return;
            }

            const target = activities.find((activity) => activity.id === id);
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitApprovalRequest({
                entityType: "activity",
                action: "delete",
                entityId: id,
                payload: {},
                beforeSnapshot: target || null,
                submittedBy: userData?.user?.id || null,
                comment: "Activity delete request",
            });
            if (error) throw error;
            alert("Delete request submitted for approval.");
        } catch (error) {
            alert("Error deleting activity: " + error.message);
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
            setFormData(prev => ({ ...prev, property_ids: [] }));
        } else {
            setFormData(prev => ({ ...prev, property_ids: properties.map(p => p.id) }));
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `activities/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error: uploadErr } = await supabase.storage
                .from("property-assets")
                .upload(fileName, file);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage.from("property-assets").getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error) {
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                image_url: formData.image_url,
                link_url: formData.link_url,
                property_ids: formData.property_ids
            };

            if (isSuperAdminRole(adminRole)) {
                let activityId = formData.id;

                if (activityId) {
                    await supabase.from("activities").update(payload).eq("id", activityId);
                } else {
                    const { data, error } = await supabase.from("activities").insert(payload).select().single();
                    if (error) throw error;
                    activityId = data.id;
                }

                await supabase.from("property_activities").delete().eq("activity_id", activityId);
                if (formData.property_ids.length > 0) {
                    const links = formData.property_ids.map(pid => ({
                        activity_id: activityId,
                        property_id: pid
                    }));
                    await supabase.from("property_activities").insert(links);
                }

                setIsEditing(false);
                loadData();
                return;
            }

            const action = formData.id ? "update" : "create";
            const beforeSnapshot = formData.id
                ? activities.find((activity) => activity.id === formData.id) || null
                : null;
            const { data: userData } = await supabase.auth.getUser();
            const { error: requestError } = await submitApprovalRequest({
                entityType: "activity",
                action,
                entityId: formData.id || null,
                payload,
                beforeSnapshot,
                submittedBy: userData?.user?.id || null,
                comment: formData.id ? "Activity update request" : "Activity creation request",
            });
            if (requestError) throw requestError;

            alert("Activity change request submitted for approval.");
            setIsEditing(false);
        } catch (error) {
            alert("Error saving activity: " + error.message);
        }
    };

    if (isEditing) {
        return (
            <div className={formStyles.card}>
                <h3>{formData.id ? "Edit Activity" : "New Activity"}</h3>
                <form onSubmit={handleSave} className={formStyles.formGrid}>
                    <div className={formStyles.fieldGroup}>
                        <label>Linked Properties (Leave empty for Global)</label>
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

                    <div className={formStyles.fieldGroup}>
                        <label>Title</label>
                        <input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className={formStyles.fieldGroup}>
                        <label>Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className={formStyles.row}>
                        <div className={formStyles.fieldGroup}>
                            <label>Image</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {formData.image_url && (
                                    <img src={formData.image_url} alt="Activity" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </div>
                            {uploading && <span style={{ fontSize: '12px', color: '#666' }}>Uploading...</span>}
                        </div>
                        <div className={formStyles.fieldGroup}>
                            <label>Link (URL)</label>
                            <input
                                value={formData.link_url}
                                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className={formStyles.actionBar}>
                        <button type="button" className={formStyles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="submit" className={formStyles.saveBtn}>
                            {isSuperAdminRole(adminRole) ? "Save Activity" : "Submit for Approval"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div className={listStyles.header}>
                <h3>Global Activities</h3>
                <button className={listStyles.addBtn} onClick={handleCreate}>+ Add Activity</button>
            </div>
            {loading ? <p>Loading...</p> : (
                <div className={listStyles.grid}>
                    {activities.map(a => (
                        <div key={a.id} className={listStyles.card} style={{ height: 'auto' }}>
                            <div className={listStyles.cardContent}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    {a.image_url && (
                                        <img src={a.image_url} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} alt={a.title} />
                                    )}
                                    <div>
                                        <strong>{a.title}</strong>
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                            {a.property_names}
                                        </div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '14px', color: '#444', marginBottom: '8px' }}>{a.description}</p>
                                {a.link_url && <a href={a.link_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0984e3' }}>View Link</a>}
                                <div className={listStyles.cardFooter}>
                                    <button className={listStyles.editBtn} onClick={() => handleEdit(a)}>Edit</button>
                                    <button className={listStyles.deleteBtn} onClick={() => handleDelete(a.id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityManager;
