import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { FaTrash, FaPlus } from "react-icons/fa";
import { ICON_OPTIONS, BANK_OPTIONS, getAmenityIcon } from "../../../lib/amenityIcons.jsx";
import {
    fetchOpenPropertyRequests,
    getCurrentAdminRole,
    isSuperAdminRole,
    parseApprovalObject,
    submitApprovalRequest
} from "../../../lib/adminApi";

const PAGE_SIZE = 30;

const filterAndPaginate = (options, searchText, page, getter) => {
    const q = (searchText || "").trim().toLowerCase();
    const filtered = !q
        ? options
        : options.filter((opt) => getter(opt).toLowerCase().includes(q));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return {
        filtered,
        totalPages,
        page: safePage,
        pageItems: filtered.slice(start, start + PAGE_SIZE),
    };
};

const SearchablePagedDropdown = ({
    options,
    value,
    onChange,
    getLabel,
    getValue,
    placeholder,
    width = "100%",
}) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const selected = options.find((opt) => getValue(opt) === value);
        if (selected) setSearch(getLabel(selected));
        if (!value) setSearch("");
    }, [value, options, getLabel, getValue]);

    const paged = useMemo(
        () => filterAndPaginate(options, search, page, (opt) => `${getLabel(opt)} ${getValue(opt)}`),
        [options, search, page, getLabel, getValue]
    );

    return (
        <div style={{ position: "relative", width }}>
            <input
                value={search}
                placeholder={placeholder}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    setOpen(true);
                }}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
            {open && (
                <div style={{ position: "absolute", zIndex: 40, top: "100%", left: 0, right: 0, marginTop: "6px", border: "1px solid #ddd", borderRadius: "6px", background: "#fff", boxShadow: "0 8px 16px rgba(0,0,0,0.08)" }}>
                    <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                        {paged.pageItems.length === 0 && (
                            <div style={{ padding: "8px 10px", fontSize: "12px", color: "#666" }}>No results</div>
                        )}
                        {paged.pageItems.map((opt) => (
                            <button
                                key={getValue(opt)}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(getValue(opt), opt);
                                    setSearch(getLabel(opt));
                                    setOpen(false);
                                }}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 10px",
                                    border: "none",
                                    background: value === getValue(opt) ? "#ecfdf5" : "#fff",
                                    cursor: "pointer",
                                    fontSize: "13px"
                                }}
                            >
                                {getLabel(opt)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderTop: "1px solid #eee", fontSize: "11px", color: "#666" }}>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} disabled={paged.page <= 1}>Prev</button>
                        <span>{paged.page}/{paged.totalPages} • {paged.filtered.length}</span>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setPage((p) => Math.min(paged.totalPages, p + 1)); }} disabled={paged.page >= paged.totalPages}>Next</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AmenitiesManager = ({ propertyId, isDraft = false }) => {
    const [amenities, setAmenities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAmenity, setNewAmenity] = useState({ title: "", description: "", icon_key: "" });
    const [isAdding, setIsAdding] = useState(false);
    const [mode, setMode] = useState("BANK"); // "BANK" or "CUSTOM"
    const [adminRole, setAdminRole] = useState(null);
    const [draftById, setDraftById] = useState({});
    const [pendingDrafts, setPendingDrafts] = useState({ creates: [], updatesById: {}, deletesById: {} });
    const [savingAmenityId, setSavingAmenityId] = useState(null);
    const canEditDirectly = isDraft || isSuperAdminRole(adminRole);

    useEffect(() => {
        if (propertyId) loadAmenities();
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

    const loadAmenities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("amenities")
            .select("*")
            .eq("property_id", propertyId)
            .order("created_at", { ascending: true });

        if (error) console.error("Error loading amenities:", error);
        else {
            const next = data || [];
            setAmenities(next);
            setDraftById(
                next.reduce((acc, item) => {
                    acc[item.id] = {
                        title: item.title || "",
                        description: item.description || "",
                        icon_key: item.icon_key || "",
                    };
                    return acc;
                }, {})
            );
        }
        setLoading(false);
    };

    const loadPendingDrafts = async () => {
        if (!propertyId || canEditDirectly) {
            setPendingDrafts({ creates: [], updatesById: {}, deletesById: {} });
            return;
        }

        const { data, error } = await fetchOpenPropertyRequests(propertyId, ["amenity"]);
        if (error) {
            console.error("Error loading amenity draft requests:", error);
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

                if (action === "create") {
                    next.creates.push({
                        id: req.id,
                        title: payload.title || "Untitled",
                        description: payload.description || "",
                        icon_key: payload.icon_key || "",
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
                        title: payload.title ?? beforeSnapshot.title ?? "",
                        description: payload.description ?? beforeSnapshot.description ?? "",
                        icon_key: payload.icon_key ?? beforeSnapshot.icon_key ?? "",
                    };
                }
            });
        setPendingDrafts(next);
    };

    const handleAdd = async () => {
        if (!newAmenity.title) return alert("Title is required");
        try {
            const payload = { ...newAmenity, property_id: propertyId };
            if (canEditDirectly) {
                const { data, error } = await supabase
                    .from("amenities")
                    .insert(payload)
                    .select()
                    .single();

                if (error) throw error;
                setAmenities([...amenities, data]);
            } else {
                const { data: userData } = await supabase.auth.getUser();
                const { error } = await submitApprovalRequest({
                    entityType: "amenity",
                    action: "create",
                    payload,
                    submittedBy: userData?.user?.id || null,
                    comment: "Amenity creation request",
                });
                if (error) throw error;
                alert("Amenity create request submitted for approval.");
                await loadPendingDrafts();
            }

            setNewAmenity({ title: "", description: "", icon_key: "" });
            setIsAdding(false);
        } catch (error) {
            alert("Error adding amenity: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this amenity?")) return;
        try {
            if (canEditDirectly) {
                const { error } = await supabase.from("amenities").delete().eq("id", id);
                if (error) throw error;
                setAmenities(amenities.filter((a) => a.id !== id));
                return;
            }

            const target = amenities.find((a) => a.id === id);
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitApprovalRequest({
                entityType: "amenity",
                action: "delete",
                entityId: id,
                payload: {},
                beforeSnapshot: target || null,
                submittedBy: userData?.user?.id || null,
                comment: "Amenity delete request",
            });
            if (error) throw error;
            alert("Amenity delete request submitted for approval.");
            await loadPendingDrafts();
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    };

    const handleDraftChange = (id, field, value) => {
        setDraftById((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value,
            },
        }));
    };

    const handleSaveRow = async (item) => {
        const draft = draftById[item.id] || {};
        const payload = {
            title: draft.title ?? item.title ?? "",
            description: draft.description ?? item.description ?? "",
            icon_key: draft.icon_key ?? item.icon_key ?? "",
            property_id: item.property_id,
        };

        setSavingAmenityId(item.id);
        try {
            if (canEditDirectly) {
                const { error } = await supabase
                    .from("amenities")
                    .update({
                        title: payload.title,
                        description: payload.description,
                        icon_key: payload.icon_key,
                    })
                    .eq("id", item.id);
                if (error) throw error;
                setAmenities((prev) =>
                    prev.map((a) => (a.id === item.id ? { ...a, ...payload } : a))
                );
            } else {
                const { data: userData } = await supabase.auth.getUser();
                const { error } = await submitApprovalRequest({
                    entityType: "amenity",
                    action: "update",
                    entityId: item.id,
                    payload,
                    beforeSnapshot: item,
                    submittedBy: userData?.user?.id || null,
                    comment: "Amenity update request",
                });
                if (error) throw error;
                alert("Amenity update request submitted for approval.");
                await loadPendingDrafts();
            }
        } catch (error) {
            alert("Error saving amenity: " + error.message);
        } finally {
            setSavingAmenityId(null);
        }
    };

    return (
        <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3>Amenities ({amenities.length})</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        background: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"
                    }}
                >
                    <FaPlus /> Add Amenity
                </button>
            </div>

            {isAdding && (
                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "6px", marginBottom: "20px", border: "1px solid #e5e7eb" }}>

                    {/* Mode Toggle */}
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
                        <button
                            onClick={() => {
                                setMode("BANK");
                                setNewAmenity({ title: "", description: "", icon_key: "" });
                            }}
                            style={{
                                background: mode === "BANK" ? "#10b981" : "#e5e7eb",
                                color: mode === "BANK" ? "white" : "#374151",
                                border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                            }}
                        >
                            Select from Bank
                        </button>
                        <button
                            onClick={() => {
                                setMode("CUSTOM");
                                setNewAmenity({ title: "", description: "", icon_key: "" });
                            }}
                            style={{
                                background: mode === "CUSTOM" ? "#8b5cf6" : "#e5e7eb",
                                color: mode === "CUSTOM" ? "white" : "#374151",
                                border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                            }}
                        >
                            Create Custom
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "10px" }}>

                        {/* BANK MODE */}
                        {mode === "BANK" && (
                            <>
                                <SearchablePagedDropdown
                                    options={BANK_OPTIONS}
                                    value={newAmenity.title}
                                    onChange={(selectedValue, selectedOpt) => {
                                        setNewAmenity({
                                            ...newAmenity,
                                            title: selectedValue,
                                            icon_key: selectedOpt?.iconKey || ""
                                        });
                                    }}
                                    getLabel={(opt) => `${opt.label}`}
                                    getValue={(opt) => opt.value}
                                    placeholder="Search and choose from amenity bank..."
                                />
                                {newAmenity.title && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#666" }}>
                                        <span>Preview:</span>
                                        <div style={{ fontSize: "20px", color: "#000" }}>{getAmenityIcon(newAmenity.title, newAmenity.icon_key)}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* CUSTOM MODE */}
                        {mode === "CUSTOM" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <input
                                    placeholder="Amenity Name (e.g. 'PS5 Gaming Room')"
                                    value={newAmenity.title}
                                    onChange={(e) => setNewAmenity({ ...newAmenity, title: e.target.value })}
                                    style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                                />

                                {/* Searchable Icon Picker (Datalist) */}
                                <div>
                                    <label style={{ fontSize: "12px", color: "#666" }}>
                                        Search Icon ({ICON_OPTIONS.length} options)
                                    </label>
                                    <SearchablePagedDropdown
                                        options={ICON_OPTIONS}
                                        value={newAmenity.icon_key}
                                        onChange={(val) => setNewAmenity((prev) => ({ ...prev, icon_key: val }))}
                                        getLabel={(opt) => `${opt.label} (${opt.value})`}
                                        getValue={(opt) => opt.value}
                                        placeholder="Search and pick icon..."
                                    />
                                </div>

                                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#666" }}>
                                    <span>Icon Preview:</span>
                                    <div style={{ fontSize: "24px", color: "#000" }}>
                                        {newAmenity.icon_key ? getAmenityIcon(null, newAmenity.icon_key) : "❓"}
                                    </div>
                                    {newAmenity.icon_key && <span style={{ fontSize: "12px", color: "#999" }}>({newAmenity.icon_key})</span>}
                                </div>
                            </div>
                        )}

                        <textarea
                            placeholder={mode === "BANK" ? "Description (Optional)" : "Description (e.g. 'Has 2 controllers')"}
                            value={newAmenity.description}
                            onChange={(e) => setNewAmenity({ ...newAmenity, description: e.target.value })}
                            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                            rows={2}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleAdd} style={{ background: "#2563eb", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Add Amenity</button>
                        <button onClick={() => setIsAdding(false)} style={{ background: "#6b7280", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                    </div>
                </div>
            )}

            {loading ? <p>Loading...</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {!canEditDirectly && pendingDrafts.creates.length > 0 ? (
                        <div style={{ background: "#eff6ff", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "10px" }}>
                            <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                                Draft Amenity Additions Pending ({pendingDrafts.creates.length})
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {pendingDrafts.creates.map((item, idx) => (
                                    <span
                                        key={item.id || idx}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "6px 10px",
                                            borderRadius: "999px",
                                            border: "1px solid #bfdbfe",
                                            background: "#fff",
                                            color: "#1e3a8a",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <span>{getAmenityIcon(item.title, item.icon_key)}</span>
                                        <span>{item.title}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {amenities.map((item) => {
                        const itemId = String(item.id);
                        const pendingUpdate = pendingDrafts.updatesById[itemId];
                        const pendingDelete = pendingDrafts.deletesById[itemId];
                        const baseDraft = draftById[item.id] || {
                            title: item.title || "",
                            description: item.description || "",
                            icon_key: item.icon_key || "",
                        };
                        const draft = pendingUpdate ? {
                            ...baseDraft,
                            title: pendingUpdate.title ?? baseDraft.title,
                            description: pendingUpdate.description ?? baseDraft.description,
                            icon_key: pendingUpdate.icon_key ?? baseDraft.icon_key,
                        } : baseDraft;

                        const submitDisabled = savingAmenityId === item.id || (!canEditDirectly && (!!pendingUpdate || !!pendingDelete));

                        return (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "15px", padding: "10px", border: "1px solid #f0f0f0", borderRadius: "6px", background: "white", opacity: pendingDelete ? 0.7 : 1 }}>
                                <div style={{ fontSize: "24px", width: "40px", display: "flex", justifyContent: "center", color: "#666" }}>
                                    {getAmenityIcon(draft.title, draft.icon_key)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                                        {pendingUpdate && !canEditDirectly ? (
                                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "999px", padding: "2px 8px", textTransform: "uppercase" }}>
                                                Draft Update Pending
                                            </span>
                                        ) : null}
                                        {pendingDelete && !canEditDirectly ? (
                                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "999px", padding: "2px 8px", textTransform: "uppercase" }}>
                                                Draft Delete Pending
                                            </span>
                                        ) : null}
                                    </div>
                                    <input
                                        value={draft.title}
                                        disabled={!canEditDirectly && (!!pendingUpdate || !!pendingDelete)}
                                        onChange={(e) => handleDraftChange(item.id, "title", e.target.value)}
                                        style={{ fontWeight: "bold", border: "none", background: "transparent", width: "100%", marginBottom: "4px", fontSize: "16px" }}
                                    />
                                    <input
                                        value={draft.description || ""}
                                        disabled={!canEditDirectly && (!!pendingUpdate || !!pendingDelete)}
                                        placeholder="Add description..."
                                        onChange={(e) => handleDraftChange(item.id, "description", e.target.value)}
                                        style={{ border: "none", background: "transparent", width: "100%", color: "#666", fontSize: "14px" }}
                                    />
                                </div>
                                <div style={{ width: "230px" }}>
                                    <SearchablePagedDropdown
                                        options={ICON_OPTIONS}
                                        value={draft.icon_key || ""}
                                        onChange={(val) => {
                                            if (!canEditDirectly && (!!pendingUpdate || !!pendingDelete)) return;
                                            handleDraftChange(item.id, "icon_key", val);
                                        }}
                                        getLabel={(opt) => `${opt.label}`}
                                        getValue={(opt) => opt.value}
                                        placeholder="Search and pick icon..."
                                        width="230px"
                                    />
                                </div>
                                <button
                                    onClick={() => handleSaveRow(item)}
                                    disabled={submitDisabled}
                                    style={{
                                        background: "#2563eb",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                    }}
                                >
                                    {savingAmenityId === item.id ? "Saving..." : pendingDelete ? "Delete Pending" : pendingUpdate ? "Update Pending" : (canEditDirectly ? "Save" : "Submit")}
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={!canEditDirectly && !!pendingDelete}
                                    style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                                    title={!canEditDirectly && !!pendingDelete ? "Delete request already pending" : undefined}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        );
                    })}
                    {amenities.length === 0 && !isAdding && <p style={{ color: "#999", textAlign: "center", marginTop: "20px" }}>No amenities yet. Add one!</p>}
                </div>
            )}

        </div>
    );
};

export default AmenitiesManager;
