import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { FaTrash, FaPlus } from "react-icons/fa";
import { ICON_OPTIONS, BANK_OPTIONS, getAmenityIcon } from "../../../lib/amenityIcons.jsx";

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

const AmenitiesManager = ({ propertyId }) => {
    const [amenities, setAmenities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAmenity, setNewAmenity] = useState({ title: "", description: "", icon_key: "" });
    const [isAdding, setIsAdding] = useState(false);
    const [mode, setMode] = useState("BANK"); // "BANK" or "CUSTOM"

    useEffect(() => {
        if (propertyId) loadAmenities();
    }, [propertyId]);

    const loadAmenities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("amenities")
            .select("*")
            .eq("property_id", propertyId)
            .order("created_at", { ascending: true });

        if (error) console.error("Error loading amenities:", error);
        else setAmenities(data || []);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newAmenity.title) return alert("Title is required");

        const { data, error } = await supabase
            .from("amenities")
            .insert({ ...newAmenity, property_id: propertyId })
            .select()
            .single();

        if (error) {
            alert("Error adding amenity: " + error.message);
        } else {
            setAmenities([...amenities, data]);
            setNewAmenity({ title: "", description: "", icon_key: "" });
            setIsAdding(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this amenity?")) return;

        const { error } = await supabase.from("amenities").delete().eq("id", id);
        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            setAmenities(amenities.filter((a) => a.id !== id));
        }
    };

    const handleUpdate = async (id, field, value) => {
        // Optimistic update
        setAmenities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

        const { error } = await supabase.from("amenities").update({ [field]: value }).eq("id", id);
        if (error) console.error("Error updating amenity:", error);
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
                    {amenities.map((item) => (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "15px", padding: "10px", border: "1px solid #f0f0f0", borderRadius: "6px", background: "white" }}>
                            <div style={{ fontSize: "24px", width: "40px", display: "flex", justifyContent: "center", color: "#666" }}>
                                {getAmenityIcon(item.title, item.icon_key)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    value={item.title}
                                    onChange={(e) => handleUpdate(item.id, "title", e.target.value)}
                                    style={{ fontWeight: "bold", border: "none", background: "transparent", width: "100%", marginBottom: "4px", fontSize: "16px" }}
                                />
                                <input
                                    value={item.description || ""}
                                    placeholder="Add description..."
                                    onChange={(e) => handleUpdate(item.id, "description", e.target.value)}
                                    style={{ border: "none", background: "transparent", width: "100%", color: "#666", fontSize: "14px" }}
                                />
                            </div>
                            <div style={{ width: "230px" }}>
                                <SearchablePagedDropdown
                                    options={ICON_OPTIONS}
                                    value={item.icon_key || ""}
                                    onChange={(val) => handleUpdate(item.id, "icon_key", val)}
                                    getLabel={(opt) => `${opt.label}`}
                                    getValue={(opt) => opt.value}
                                    placeholder="Search and pick icon..."
                                    width="230px"
                                />
                            </div>
                            <button onClick={() => handleDelete(item.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>
                                <FaTrash />
                            </button>
                        </div>
                    ))}
                    {amenities.length === 0 && !isAdding && <p style={{ color: "#999", textAlign: "center", marginTop: "20px" }}>No amenities yet. Add one!</p>}


                </div>
            )}

        </div>
    );
};

export default AmenitiesManager;
