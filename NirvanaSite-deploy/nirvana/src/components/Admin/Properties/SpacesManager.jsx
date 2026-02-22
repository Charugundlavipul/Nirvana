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
  const [pickerOpenByImageId, setPickerOpenByImageId] = useState({});
  const [draftSpaces, setDraftSpaces] = useState(() =>
    normalizeDraftSpaces(normalizePropertySpaces(spaces))
  );
  const normalizedSpaces = useMemo(() => draftSpaces, [draftSpaces]);

  useEffect(() => {
    setDraftSpaces(normalizeDraftSpaces(normalizePropertySpaces(spaces)));
    setPickerOpenByImageId({});
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
  };

  const updateSpaceName = (spaceId, name) => {
    updateSpaces(
      normalizedSpaces.map((space) =>
        space.id === spaceId ? { ...space, name } : space
      )
    );
  };

  const addImageToSpace = (spaceId) => {
    const newImageId = createLocalId("image");
    updateSpaces(
      normalizedSpaces.map((space) => {
        if (space.id !== spaceId) return space;
        const nextImages = [
          ...(space.images || []),
          {
            id: newImageId,
            name: "",
            url: "",
          },
        ];
        return { ...space, images: nextImages };
      })
    );
    setPickerOpenByImageId((prev) => ({ ...prev, [newImageId]: true }));
  };

  const updateImageField = (spaceId, imageId, field, value) => {
    updateSpaces(
      normalizedSpaces.map((space) => {
        if (space.id !== spaceId) return space;
        const nextImages = (space.images || []).map((image) => {
          if (image.id !== imageId) return image;
          return { ...image, [field]: value };
        });
        return { ...space, images: nextImages };
      })
    );
    if (field === "url") {
      setPickerOpenByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
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
    setPickerOpenByImageId((prev) => {
      if (!prev[imageId]) return prev;
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
  };

  const togglePicker = (imageId) => {
    setPickerOpenByImageId((prev) => ({
      ...prev,
      [imageId]: !prev[imageId],
    }));
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
          <strong>Step 2:</strong> Add image slots
        </div>
        <div style={{ border: "1px solid #ede9fe", background: "#f5f3ff", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "#5b21b6" }}>
          <strong>Step 3:</strong> Choose image + optional label
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

        {normalizedSpaces.map((space) => (
          <div key={space.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", background: "#f8fafc" }}>
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
            <div style={{ marginTop: "-6px", marginBottom: "10px", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {(space.images || []).length} image slots
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {(space.images || []).map((image) => (
                <div key={image.id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", background: "#fff" }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.name || "Space image"}
                        style={{ width: "100px", height: "62px", objectFit: "cover", borderRadius: "6px", border: "1px solid #dbeafe" }}
                      />
                    ) : (
                      <div style={{ width: "100px", height: "62px", borderRadius: "6px", border: "1px dashed #cbd5e1", background: "#fff" }} />
                    )}

                    <button
                      type="button"
                      className={styles.cancelBtn}
                      style={{ padding: "9px 10px", minWidth: "120px" }}
                      onClick={() => togglePicker(image.id)}
                    >
                      {pickerOpenByImageId[image.id] ? "Hide Images" : "Choose Image"}
                    </button>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        border: image.url ? "1px solid #86efac" : "1px solid #fecaca",
                        color: image.url ? "#166534" : "#991b1b",
                        background: image.url ? "#f0fdf4" : "#fef2f2",
                        fontWeight: 600,
                      }}
                    >
                      {image.url ? "Image Selected" : "Image Not Selected"}
                    </span>

                    <input
                      type="text"
                      value={image.name || ""}
                      placeholder="Image label (optional)"
                      onChange={(event) => updateImageField(space.id, image.id, "name", event.target.value)}
                      style={{ padding: "9px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", flex: "1 1 220px", minWidth: "180px" }}
                    />

                    <button
                      type="button"
                      className={styles.cancelBtn}
                      style={{ padding: "9px 10px", minWidth: "110px" }}
                      onClick={() => removeImageFromSpace(space.id, image.id)}
                    >
                      Remove Image
                    </button>
                  </div>

                  {pickerOpenByImageId[image.id] ? (
                    <div style={{ marginTop: "10px" }}>
                      {loadingOptions ? (
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Loading property images...
                        </div>
                      ) : imageOptionsWithSpaceImages.length ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
                            gap: "8px",
                            maxHeight: "240px",
                            overflowY: "auto",
                            padding: "2px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => updateImageField(space.id, image.id, "url", "")}
                            style={{
                              border: image.url ? "1px solid #d1d5db" : "2px solid #991b1b",
                              borderRadius: "8px",
                              background: image.url ? "#fff" : "#fef2f2",
                              padding: "6px",
                              cursor: "pointer",
                              textAlign: "left",
                              minHeight: "96px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                            }}
                          >
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#991b1b" }}>No Image</div>
                            <div style={{ marginTop: "4px", fontSize: "10px", color: "#64748b" }}>
                              Keep this slot unselected
                            </div>
                          </button>
                          {imageOptionsWithSpaceImages.map((option) => {
                            const selected = option.url === image.url;
                            return (
                              <button
                                key={`${image.id}-${option.url}`}
                                type="button"
                                onClick={() => updateImageField(space.id, image.id, "url", option.url)}
                                style={{
                                  border: selected ? "2px solid #0f766e" : "1px solid #d1d5db",
                                  borderRadius: "8px",
                                  background: selected ? "#ecfeff" : "#fff",
                                  padding: "4px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <img
                                  src={option.url}
                                  alt={inferImageNameFromUrl(option.url)}
                                  style={{ width: "100%", height: "68px", objectFit: "cover", borderRadius: "6px" }}
                                />
                                <div
                                  style={{
                                    marginTop: "4px",
                                    fontSize: "10px",
                                    color: "#475569",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
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
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.cancelBtn}
              style={{ marginTop: "12px", padding: "9px 12px", fontSize: "13px" }}
              onClick={() => addImageToSpace(space.id)}
            >
              Add Image Slot
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpacesManager;
