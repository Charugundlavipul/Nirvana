import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { FaTrash, FaPlus } from "react-icons/fa";
import { ICON_OPTIONS, BANK_OPTIONS, getAmenityIcon } from "../../../lib/amenityIcons.jsx";
import {
    fetchOpenPropertyRequests,
    getCurrentAdminRole,
    isSuperAdminRole,
    parseApprovalObject,
    submitOrUpdateApproval,
    queueKnowledgeRefresh
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
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                setAmenities([...amenities, data]);
            } else {
                const { data: userData } = await supabase.auth.getUser();
                const { error } = await submitOrUpdateApproval({
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
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                setAmenities(amenities.filter((a) => a.id !== id));
                return;
            }

            const target = amenities.find((a) => a.id === id);
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await submitOrUpdateApproval({
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
                await queueKnowledgeRefresh({ propertyIds: [propertyId] });
                setAmenities((prev) =>
                    prev.map((a) => (a.id === item.id ? { ...a, ...payload } : a))
                );
            } else {
                const { data: userData } = await supabase.auth.getUser();
                const { error, updated } = await submitOrUpdateApproval({
                    entityType: "amenity",
                    action: "update",
                    entityId: item.id,
                    payload,
                    beforeSnapshot: item,
                    submittedBy: userData?.user?.id || null,
                    comment: "Amenity update request",
                });
                if (error) throw error;
                alert(updated ? "Amenity draft updated." : "Amenity update request submitted for approval.");
                await loadPendingDrafts();
            }
        } catch (error) {
            alert("Error saving amenity: " + error.message);
        } finally {
            setSavingAmenityId(null);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Amenities ({amenities.length})</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95"
                >
                    <FaPlus /> Add Amenity
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">

                    {/* Mode Toggle */}
                    <div className="mb-6 flex overflow-hidden rounded-xl bg-slate-200/60 p-1">
                        <button
                            onClick={() => {
                                setMode("BANK");
                                setNewAmenity({ title: "", description: "", icon_key: "" });
                            }}
                            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${mode === "BANK" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                            Choose Standard Amenity
                        </button>
                        <button
                            onClick={() => {
                                setMode("CUSTOM");
                                setNewAmenity({ title: "", description: "", icon_key: "" });
                            }}
                            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${mode === "CUSTOM" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                            Create Custom Amenity
                        </button>
                    </div>

                    <div className="mb-4 flex flex-col gap-4">

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
                                    placeholder="Search standard amenities (e.g. WiFi, Pool)..."
                                />
                                {newAmenity.title && (
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <span className="font-semibold">Preview:</span>
                                        <div className="text-2xl text-slate-900">{getAmenityIcon(newAmenity.title, newAmenity.icon_key)}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* CUSTOM MODE */}
                        {mode === "CUSTOM" && (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Amenity Name
                                    </label>
                                    <input
                                        placeholder="e.g. 'PS5 Gaming Room'"
                                        value={newAmenity.title}
                                        onChange={(e) => setNewAmenity({ ...newAmenity, title: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                {/* Searchable Icon Picker (Datalist) */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Choose an Icon
                                    </label>
                                    <SearchablePagedDropdown
                                        options={ICON_OPTIONS}
                                        value={newAmenity.icon_key}
                                        onChange={(val) => setNewAmenity((prev) => ({ ...prev, icon_key: val }))}
                                        getLabel={(opt) => opt.label}
                                        getValue={(opt) => opt.value}
                                        placeholder="Search icons (e.g. 'game', 'pool')..."
                                    />
                                </div>

                                <div className="col-span-1 flex items-center rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                                    <div className="flex flex-1 items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-3xl text-slate-800 shadow-sm border border-slate-100">
                                            {newAmenity.icon_key ? getAmenityIcon(null, newAmenity.icon_key) : <span className="text-slate-300">?</span>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">Icon Preview</p>
                                            <p className="text-xs text-slate-500">
                                                {newAmenity.icon_key ? `Selected: ${newAmenity.icon_key}` : "Search and select an icon to preview"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <textarea
                            placeholder={mode === "BANK" ? "Description (Optional)" : "Description (e.g. 'Has 2 controllers')"}
                            value={newAmenity.description}
                            onChange={(e) => setNewAmenity({ ...newAmenity, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} className="rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95">Add Amenity</button>
                        <button onClick={() => setIsAdding(false)} className="rounded-lg bg-slate-500 px-6 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-slate-400 active:scale-95">Cancel</button>
                    </div>
                </div>
            )}

            {loading ? <p className="py-8 text-center text-slate-500">Loading...</p> : (
                <div className="flex flex-col gap-4">
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
                            <div key={item.id} className={`flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm ${pendingDelete ? 'opacity-70' : ''}`}>
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl text-slate-700">
                                    {getAmenityIcon(draft.title, draft.icon_key)}
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        {pendingUpdate && !canEditDirectly && (
                                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                Draft Update Pending
                                            </span>
                                        )}
                                        {pendingDelete && !canEditDirectly && (
                                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                                Draft Delete Pending
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        value={draft.title}
                                        disabled={!canEditDirectly && (!!pendingUpdate || !!pendingDelete)}
                                        onChange={(e) => handleDraftChange(item.id, "title", e.target.value)}
                                        className="mb-1 w-full border-none bg-transparent text-lg font-bold text-slate-800 outline-none focus:ring-0 p-0"
                                    />
                                    <input
                                        value={draft.description || ""}
                                        disabled={!canEditDirectly && (!!pendingUpdate || !!pendingDelete)}
                                        placeholder="Add description..."
                                        onChange={(e) => handleDraftChange(item.id, "description", e.target.value)}
                                        className="w-full border-none bg-transparent text-sm text-slate-500 outline-none focus:ring-0 p-0"
                                    />
                                </div>
                                <div className="w-full md:w-56 flex-shrink-0">
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
                                        width="100%"
                                    />
                                </div>
                                <div className="flex w-full md:w-auto items-center gap-3">
                                    <button
                                        onClick={() => handleSaveRow(item)}
                                        disabled={submitDisabled}
                                        className="w-full md:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 disabled:bg-emerald-600/50 disabled:active:scale-100"
                                    >
                                        {savingAmenityId === item.id ? "Saving..." : pendingDelete ? "Delete Pending" : pendingUpdate ? "Update Pending" : (canEditDirectly ? "Save" : "Submit")}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        disabled={!canEditDirectly && !!pendingDelete}
                                        className="flex-shrink-0 rounded-lg p-2.5 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                                        title={!canEditDirectly && !!pendingDelete ? "Delete request already pending" : undefined}
                                    >
                                        <FaTrash size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {amenities.length === 0 && !isAdding && <p className="py-8 text-center text-slate-500">No amenities yet. Add one!</p>}
                </div>
            )}

        </div>
    );
};

export default AmenitiesManager;
