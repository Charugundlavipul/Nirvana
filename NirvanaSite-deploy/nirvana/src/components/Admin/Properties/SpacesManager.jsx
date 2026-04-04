import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import styles from "./PropertyEditor.module.css";
import { inferImageNameFromUrl, normalizePropertySpaces } from "../../../lib/propertySpaces";

const createLocalId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isMissingTableError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("could not find the table");
};

const toUniqueOptions = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const normalizeDraftSpaces = (value = []) =>
  (Array.isArray(value) ? value : []).map((space, spaceIndex) => {
    const rawImages = Array.isArray(space?.images) ? space.images : [];
    const images = rawImages.map((image, imageIndex) => ({
      id:
        typeof image?.id === "string" && image.id.trim()
          ? image.id.trim()
          : createLocalId(`img-${spaceIndex + 1}-${imageIndex + 1}`),
      name: typeof image?.name === "string" ? image.name : "",
      url: typeof image?.url === "string" ? image.url : "",
    }));

    return {
      id:
        typeof space?.id === "string" && space.id.trim()
          ? space.id.trim()
          : createLocalId(`space-${spaceIndex + 1}`),
      name:
        typeof space?.name === "string" && space.name.trim()
          ? space.name
          : `Space ${spaceIndex + 1}`,
      images,
    };
  });

const SpacesManager = ({ propertyId, spaces = [], onChange }) => {
  const [imageOptions, setImageOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  // Track which space has its multi-select picker open (only one at a time)
  const [pickerOpenForSpaceId, setPickerOpenForSpaceId] = useState(null);
  // Track temporarily selected URLs in the multi-select picker
  const [pendingSelections, setPendingSelections] = useState(new Set());
  // Fullscreen lightbox preview
  const [fullscreenUrl, setFullscreenUrl] = useState(null);
  const [draftSpaces, setDraftSpaces] = useState(() =>
    normalizeDraftSpaces(normalizePropertySpaces(spaces))
  );
  const normalizedSpaces = useMemo(() => draftSpaces, [draftSpaces]);

  useEffect(() => {
    setDraftSpaces(normalizeDraftSpaces(normalizePropertySpaces(spaces)));
    setPickerOpenForSpaceId(null);
    setPendingSelections(new Set());
  }, [propertyId]);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      if (!propertyId) {
        if (!isMounted) return;
        setImageOptions([]);
        setOptionsError(null);
        return;
      }

      setLoadingOptions(true);
      setOptionsError(null);

      try {
        const [curatedRes, galleryRes, highlightRes] = await Promise.all([
          supabase
            .from("property_curated_images")
            .select("slot,url")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true }),
          supabase
            .from("property_images")
            .select("url,display_order")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true }),
          supabase
            .from("property_highlight_images")
            .select("url,display_order")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true }),
        ]);

        if (curatedRes.error) throw curatedRes.error;
        if (galleryRes.error) throw galleryRes.error;
        if (highlightRes.error && !isMissingTableError(highlightRes.error)) {
          throw highlightRes.error;
        }

        const curated = (curatedRes.data || []).map((row) => ({
          url: row.url,
          source: "curated",
          label: `Curated: ${row.slot || "slot"}`,
        }));
        const gallery = (galleryRes.data || []).map((row, index) => ({
          url: row.url,
          source: "gallery",
          label: `Gallery #${index + 1}`,
        }));
        const highlights = (highlightRes.data || []).map((row, index) => ({
          url: row.url,
          source: "highlight",
          label: `Highlight #${index + 1}`,
        }));

        const combined = toUniqueOptions([...curated, ...gallery, ...highlights]);
        if (isMounted) {
          setImageOptions(combined);
          setOptionsError(null);
        }
      } catch (error) {
        console.error("Failed to load property image options for spaces:", error);
        if (isMounted) {
          setImageOptions([]);
          setOptionsError(error?.message || "Failed to load property images.");
        }
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    };

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const imageOptionsWithSpaceImages = useMemo(() => {
    const fromSpaces = normalizedSpaces.flatMap((space) =>
      (space.images || []).map((image) => ({
        url: image.url,
        source: "space",
        label: "Existing space image",
      }))
    );
    return toUniqueOptions([...imageOptions, ...fromSpaces]);
  }, [imageOptions, normalizedSpaces]);

  const updateSpaces = (next) => {
    const nextDraft = normalizeDraftSpaces(next);
    setDraftSpaces(nextDraft);
    if (typeof onChange !== "function") return;
    onChange(normalizePropertySpaces(nextDraft));
  };

  const addSpace = () => {
    const nextIndex = normalizedSpaces.length + 1;
    updateSpaces([
      ...normalizedSpaces,
      { id: createLocalId("space"), name: `Space ${nextIndex}`, images: [] },
    ]);
  };

  const removeSpace = (spaceId) => {
    updateSpaces(normalizedSpaces.filter((space) => space.id !== spaceId));
    if (pickerOpenForSpaceId === spaceId) {
      setPickerOpenForSpaceId(null);
      setPendingSelections(new Set());
    }
  };

  const updateSpaceName = (spaceId, name) => {
    updateSpaces(
      normalizedSpaces.map((space) =>
        space.id === spaceId ? { ...space, name } : space
      )
    );
  };

  const updateImageLabel = (spaceId, imageId, name) => {
    updateSpaces(
      normalizedSpaces.map((space) => {
        if (space.id !== spaceId) return space;
        const nextImages = (space.images || []).map((image) => {
          if (image.id !== imageId) return image;
          return { ...image, name };
        });
        return { ...space, images: nextImages };
      })
    );
  };

  const removeImageFromSpace = (spaceId, imageId) => {
    updateSpaces(
      normalizedSpaces.map((space) => {
        if (space.id !== spaceId) return space;
        return {
          ...space,
          images: (space.images || []).filter((image) => image.id !== imageId),
        };
      })
    );
  };

  // Open the multi-select picker for a space
  const openPicker = (spaceId) => {
    // Pre-select images that are already in this space
    const space = normalizedSpaces.find((s) => s.id === spaceId);
    const existingUrls = new Set(
      (space?.images || []).filter((img) => img.url).map((img) => img.url)
    );
    setPendingSelections(existingUrls);
    setPickerOpenForSpaceId(spaceId);
  };

  const closePicker = () => {
    setPickerOpenForSpaceId(null);
    setPendingSelections(new Set());
  };

  // Toggle a single image in the pending selection
  const togglePendingSelection = (url) => {
    setPendingSelections((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Confirm multi-select: add all newly-selected images to the space
  const confirmSelections = (spaceId) => {
    const space = normalizedSpaces.find((s) => s.id === spaceId);
    if (!space) return;

    const existingUrls = new Set(
      (space.images || []).filter((img) => img.url).map((img) => img.url)
    );

    // Remove images that were deselected
    const keptImages = (space.images || []).filter(
      (img) => !img.url || pendingSelections.has(img.url)
    );

    // Add images that are newly selected
    const newImages = [];
    for (const url of pendingSelections) {
      if (!existingUrls.has(url)) {
        newImages.push({
          id: createLocalId("image"),
          name: "",
          url,
        });
      }
    }

    updateSpaces(
      normalizedSpaces.map((s) => {
        if (s.id !== spaceId) return s;
        return { ...s, images: [...keptImages, ...newImages] };
      })
    );

    closePicker();
  };

  return (
    <div className={styles.card}>
      <h3>Spaces</h3>
      <p style={{ marginTop: "-6px", marginBottom: "14px", fontSize: "13px", color: "#475569" }}>
        Organize your gallery into named spaces. Each space can have multiple images and each image can have a custom label.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "#1e3a8a" }}>
          <strong>Step 1:</strong> Add a space name
        </div>
        <div style={{ border: "1px solid #dcfce7", background: "#f0fdf4", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "#166534" }}>
          <strong>Step 2:</strong> Click "Add Images" to select multiple
        </div>
        <div style={{ border: "1px solid #ede9fe", background: "#f5f3ff", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "#5b21b6" }}>
          <strong>Step 3:</strong> Confirm selection + add optional labels
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {loadingOptions
            ? "Loading available property images..."
            : `Available property images: ${imageOptionsWithSpaceImages.length} | Spaces: ${normalizedSpaces.length}`}
        </div>
        <button type="button" className={styles.saveBtn} style={{ padding: "10px 14px", fontSize: "13px" }} onClick={addSpace}>
          Add Space
        </button>
      </div>

      {optionsError ? (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#b91c1c" }}>
          {optionsError}
        </div>
      ) : null}

      {!loadingOptions && imageOptionsWithSpaceImages.length === 0 ? (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748b" }}>
          Upload curated/gallery/highlight images first, then create spaces from those images.
        </div>
      ) : null}

      <div style={{ marginTop: "16px", display: "grid", gap: "14px" }}>
        {normalizedSpaces.length === 0 ? (
          <div style={{ padding: "12px", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#64748b", fontSize: "13px" }}>
            No spaces added yet.
          </div>
        ) : null}

        {normalizedSpaces.map((space) => {
          const isPickerOpen = pickerOpenForSpaceId === space.id;

          return (
            <div key={space.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", background: "#f8fafc" }}>
              {/* Space header */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <input
                  type="text"
                  value={space.name}
                  onChange={(event) => updateSpaceName(space.id, event.target.value)}
                  placeholder="Space name"
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
                <button
                  type="button"
                  className={styles.cancelBtn}
                  style={{ padding: "10px 12px", color: "#b91c1c", borderColor: "#fecaca" }}
                  onClick={() => removeSpace(space.id)}
                >
                  Remove Space
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {(space.images || []).length} image{(space.images || []).length !== 1 ? "s" : ""} added
                </div>
                <button
                  type="button"
                  className={styles.saveBtn}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: isPickerOpen ? "#64748b" : undefined,
                  }}
                  onClick={() => isPickerOpen ? closePicker() : openPicker(space.id)}
                >
                  {isPickerOpen ? "Cancel" : "Add / Edit Images"}
                </button>
              </div>

              {/* Multi-select image picker */}
              {isPickerOpen ? (
                <div style={{
                  marginBottom: "14px",
                  border: "2px solid #3b82f6",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "#eff6ff",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a8a" }}>
                      Select images (click to toggle) — {pendingSelections.size} selected
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        style={{ padding: "7px 14px", fontSize: "12px" }}
                        onClick={() => setPendingSelections(new Set())}
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        style={{ padding: "7px 14px", fontSize: "12px" }}
                        onClick={() => confirmSelections(space.id)}
                      >
                        ✓ Confirm Selection ({pendingSelections.size})
                      </button>
                    </div>
                  </div>

                  {loadingOptions ? (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Loading property images...
                    </div>
                  ) : imageOptionsWithSpaceImages.length ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                        gap: "12px",
                        maxHeight: "480px",
                        overflowY: "auto",
                        padding: "4px",
                      }}
                    >
                      {imageOptionsWithSpaceImages.map((option) => {
                        const isSelected = pendingSelections.has(option.url);
                        return (
                          <button
                            key={`picker-${space.id}-${option.url}`}
                            type="button"
                            onClick={() => togglePendingSelection(option.url)}
                            style={{
                              position: "relative",
                              border: isSelected ? "3px solid #0f766e" : "2px solid #d1d5db",
                              borderRadius: "10px",
                              background: isSelected ? "#ecfeff" : "#fff",
                              padding: "5px",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.15s ease",
                              boxShadow: isSelected ? "0 0 0 2px rgba(15,118,110,0.2)" : "none",
                            }}
                          >
                            {/* Selection checkmark badge */}
                            {isSelected && (
                              <div style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "#0f766e",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: 700,
                                zIndex: 2,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              }}>
                                ✓
                              </div>
                            )}
                            {/* Fullscreen preview button */}
                            <div
                              onClick={(e) => { e.stopPropagation(); setFullscreenUrl(option.url); }}
                              style={{
                                position: "absolute",
                                top: "8px",
                                left: "8px",
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                background: "rgba(0,0,0,0.55)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                cursor: "pointer",
                                zIndex: 3,
                                backdropFilter: "blur(2px)",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.55)"}
                              title="Preview full size"
                            >
                              ⛶
                            </div>
                            <img
                              src={option.url}
                              alt={inferImageNameFromUrl(option.url)}
                              style={{
                                width: "100%",
                                height: "140px",
                                objectFit: "cover",
                                borderRadius: "7px",
                                opacity: isSelected ? 1 : 0.85,
                                transition: "opacity 0.15s ease",
                              }}
                            />
                            <div
                              style={{
                                marginTop: "5px",
                                fontSize: "11px",
                                color: isSelected ? "#0f766e" : "#475569",
                                fontWeight: isSelected ? 600 : 400,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                padding: "0 2px",
                              }}
                            >
                              {option.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      No property images available to select.
                    </div>
                  )}
                </div>
              ) : null}

              {/* Display selected images in the space */}
              {(space.images || []).length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "12px",
                }}>
                  {(space.images || []).map((image) => (
                    <div key={image.id} style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "8px",
                      background: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}>
                      {image.url ? (
                        <div style={{ position: "relative" }}>
                          <div
                            onClick={() => setFullscreenUrl(image.url)}
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              background: "rgba(0,0,0,0.5)",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "15px",
                              cursor: "pointer",
                              zIndex: 2,
                              backdropFilter: "blur(2px)",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.5)"}
                            title="View full size"
                          >
                            ⛶
                          </div>
                          <img
                            src={image.url}
                            alt={image.name || "Space image"}
                            style={{
                              width: "100%",
                              height: "170px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #dbeafe",
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "170px",
                          borderRadius: "8px",
                          border: "1px dashed #cbd5e1",
                          background: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          color: "#94a3b8",
                        }}>
                          No image
                        </div>
                      )}
                      <input
                        type="text"
                        value={image.name || ""}
                        placeholder="Label (optional)"
                        onChange={(event) => updateImageLabel(space.id, image.id, event.target.value)}
                        style={{
                          padding: "7px 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "12px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        style={{
                          padding: "6px 8px",
                          fontSize: "11px",
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                          width: "100%",
                        }}
                        onClick={() => removeImageFromSpace(space.id, image.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: "16px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  textAlign: "center",
                }}>
                  No images added yet. Click "Add / Edit Images" to select from your property images.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen lightbox overlay */}
      {fullscreenUrl && (
        <div
          onClick={() => setFullscreenUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreenUrl(null); }}
            style={{
              position: "absolute",
              top: "20px",
              right: "24px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: "22px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          >
            ✕
          </button>
          <img
            src={fullscreenUrl}
            alt="Full size preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: "10px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SpacesManager;
