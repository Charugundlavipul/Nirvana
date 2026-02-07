import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import listStyles from "../Properties/PropertyList.module.css";
import formStyles from "../Properties/PropertyEditor.module.css";

const FaqManager = () => {
    const [faqs, setFaqs] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        property_ids: [],
        question: "",
        answer: "",
        display_order: 0,
        is_default: false
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data: faqsData, error: faqsError } = await supabase
            .from("faqs")
            .select("*, property_faqs(property_id)")
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        const { data: propsData, error: propsError } = await supabase
            .from("properties")
            .select("id, name")
            .order("name");

        const propsMap = new Map((propsData || []).map(p => [p.id, p.name]));

        const propertyCount = propsData ? propsData.length : 0;
        const enhancedFaqs = (faqsData || []).map(f => {
            const linkedIds = (f.property_faqs || []).map(pf => pf.property_id);
            const linkedNames = linkedIds.map(id => propsMap.get(id)).filter(Boolean).join(", ");

            let displayLabel = "Hidden (Not Linked)";
            if (f.is_default) {
                displayLabel = "🌐 Default (Always Visible)";
            } else if (linkedIds.length > 0) {
                if (linkedIds.length === propertyCount) {
                    displayLabel = "All Properties (Global)";
                } else {
                    displayLabel = linkedNames;
                }
            }

            return {
                ...f,
                property_ids: linkedIds,
                property_names: displayLabel
            };
        });

        setFaqs(enhancedFaqs);
        setProperties(propsData || []);
        setLoading(false);
    };

    const handleEdit = (faq) => {
        setFormData({
            id: faq.id,
            property_ids: faq.property_ids || [],
            question: faq.question || "",
            answer: faq.answer || "",
            display_order: faq.display_order || 0,
            is_default: faq.is_default || false
        });
        setIsEditing(true);
    };

    const handleCreate = () => {
        setFormData({
            id: null,
            property_ids: [],
            question: "",
            answer: "",
            display_order: faqs.length,
            is_default: false
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this FAQ?")) return;
        await supabase.from("faqs").delete().eq("id", id);
        loadData();
    };

    const toggleProperty = (propId) => {
        if (formData.is_default) return; // Don't allow changes when default is selected
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
        if (formData.is_default) return; // Don't allow changes when default is selected
        if (formData.property_ids.length === properties.length) {
            setFormData(prev => ({ ...prev, property_ids: [] }));
        } else {
            setFormData(prev => ({ ...prev, property_ids: properties.map(p => p.id) }));
        }
    };

    const handleToggleDefault = () => {
        setFormData(prev => ({
            ...prev,
            is_default: !prev.is_default,
            property_ids: !prev.is_default ? properties.map(p => p.id) : prev.property_ids // Select ALL properties when enabling default
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                question: formData.question,
                answer: formData.answer,
                display_order: parseInt(formData.display_order),
                is_default: formData.is_default
            };

            let faqId = formData.id;

            if (faqId) {
                await supabase.from("faqs").update(payload).eq("id", faqId);
            } else {
                const { data, error } = await supabase.from("faqs").insert(payload).select().single();
                if (error) throw error;
                faqId = data.id;
            }

            // Sync Properties (M:N) - Only if not default
            await supabase.from("property_faqs").delete().eq("faq_id", faqId);

            if (!formData.is_default && formData.property_ids.length > 0) {
                const links = formData.property_ids.map(pid => ({
                    faq_id: faqId,
                    property_id: pid
                }));
                await supabase.from("property_faqs").insert(links);
            }

            setIsEditing(false);
            loadData();
        } catch (error) {
            alert("Error saving FAQ: " + error.message);
        }
    };

    if (isEditing) {
        return (
            <div className={formStyles.card}>
                <h3>{formData.id ? "Edit FAQ" : "New FAQ"}</h3>
                <form onSubmit={handleSave} className={formStyles.formGrid}>
                    {/* Default Option */}
                    <div className={formStyles.fieldGroup}>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                padding: '16px',
                                background: formData.is_default ? '#e8f5e9' : '#f8f9fa',
                                borderRadius: '10px',
                                border: formData.is_default ? '2px solid #4caf50' : '2px solid #e0e0e0',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={formData.is_default}
                                onChange={handleToggleDefault}
                                style={{ width: '20px', height: '20px', accentColor: '#4caf50' }}
                            />
                            <div>
                                <strong style={{ color: formData.is_default ? '#2e7d32' : '#333', fontSize: '15px' }}>
                                    🌐 Default FAQ
                                </strong>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                                    Default FAQs are always shown regardless of the selected property
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Linked Properties - Disabled when Default is selected */}
                    <div className={formStyles.fieldGroup} style={{ opacity: formData.is_default ? 0.5 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ marginBottom: 0 }}>Linked Properties</label>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                disabled={formData.is_default}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: formData.is_default ? '#aaa' : '#0984e3',
                                    cursor: formData.is_default ? 'not-allowed' : 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            >
                                {formData.property_ids.length === properties.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '8px',
                            border: '1px solid #ddd',
                            padding: '12px',
                            borderRadius: '8px',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            background: formData.is_default ? '#f5f5f5' : 'white'
                        }}>
                            {properties.map(p => (
                                <label
                                    key={p.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: formData.is_default ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        color: formData.is_default ? '#999' : '#333'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.property_ids.includes(p.id)}
                                        onChange={() => toggleProperty(p.id)}
                                        disabled={formData.is_default}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    {p.name}
                                </label>
                            ))}
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                            {formData.is_default
                                ? "🌐 This FAQ will be shown on all properties as a default"
                                : formData.property_ids.length === 0
                                    ? "Not linked to any property (Hidden)"
                                    : formData.property_ids.length === properties.length
                                        ? "Visible on ALL properties"
                                        : `Visible on ${formData.property_ids.length} selected properties`}
                        </p>
                    </div>

                    <div className={formStyles.fieldGroup}>
                        <label>Question</label>
                        <input
                            value={formData.question}
                            onChange={e => setFormData({ ...formData, question: e.target.value })}
                            required
                        />
                    </div>

                    <div className={formStyles.fieldGroup}>
                        <label>Answer</label>
                        <textarea
                            rows={4}
                            value={formData.answer}
                            onChange={e => setFormData({ ...formData, answer: e.target.value })}
                            required
                        />
                    </div>

                    <div className={formStyles.actionBar}>
                        <button type="button" className={formStyles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="submit" className={formStyles.saveBtn}>Save FAQ</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div className={listStyles.header}>
                <h3>Global FAQs</h3>
                <button className={listStyles.addBtn} onClick={handleCreate}>+ Add FAQ</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {faqs.map((f, index) => (
                    <li
                        key={f.id}
                        style={{
                            background: f.is_default ? '#f0fff4' : 'white',
                            padding: '16px',
                            marginBottom: '12px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '16px',
                            border: f.is_default ? '1px solid #a5d6a7' : '1px solid #eee'
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                <strong style={{ color: '#171717', fontSize: '15px' }}>{f.question}</strong>
                                <span style={{
                                    fontSize: '11px',
                                    background: f.is_default ? '#c8e6c9' : '#f1f2f6',
                                    color: f.is_default ? '#2e7d32' : '#57606f',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {f.property_names}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.4' }}>{f.answer}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button onClick={() => handleEdit(f)} style={{ background: 'transparent', border: 'none', color: '#0984e3', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Edit</button>
                            <button onClick={() => handleDelete(f.id)} style={{ background: 'transparent', border: 'none', color: '#d63031', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FaqManager;
