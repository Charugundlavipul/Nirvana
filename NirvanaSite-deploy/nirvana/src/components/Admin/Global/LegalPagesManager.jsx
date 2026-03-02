import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { sanitizeRichText } from "../../../lib/richText";
import RichTextContent from "../../common/RichTextContent";
import styles from "../Properties/PropertyEditor.module.css";

const PAGES = [
    { key: "terms_and_conditions", label: "Terms & Conditions" },
    { key: "privacy_policy", label: "Privacy Policy" },
];

const LegalPagesManager = () => {
    const [activeKey, setActiveKey] = useState(PAGES[0].key);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef(null);

    // Load content when tab changes
    useEffect(() => {
        loadContent(activeKey);
    }, [activeKey]);

    // Sync editor innerHTML with content state
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (document.activeElement === editor) return;
        const sanitized = sanitizeRichText(content || "");
        if (editor.innerHTML !== sanitized) {
            editor.innerHTML = sanitized;
        }
    }, [content, loading, activeKey]);

    const loadContent = async (key) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("site_content")
                .select("*")
                .eq("key", key)
                .single();

            if (error && error.code !== "PGRST116") throw error;

            if (data) {
                setTitle(data.title || "");
                setContent(data.content || "");
                setEffectiveDate(data.effective_date || "");
                setLastUpdated(data.last_updated || "");
            } else {
                setTitle(PAGES.find((p) => p.key === key)?.label || "");
                setContent("");
                setEffectiveDate("");
                setLastUpdated("");
            }
        } catch (err) {
            console.error("Error loading content:", err);
            alert("Failed to load content.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from("site_content")
                .upsert(
                    {
                        key: activeKey,
                        title,
                        content,
                        effective_date: effectiveDate || null,
                        last_updated: lastUpdated || null,
                        updated_at: now,
                    },
                    { onConflict: "key" }
                );
            if (error) throw error;
            alert("Saved successfully!");
        } catch (err) {
            console.error("Error saving:", err);
            alert("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Rich text helpers (same pattern as PropertyEditor)
    const normalizeEditorHtml = (value) => {
        let normalized = `${value || ""}`;
        normalized = normalized
            .replace(/<b(\s|>)/gi, "<strong$1")
            .replace(/<\/b>/gi, "</strong>")
            .replace(/<i(\s|>)/gi, "<em$1")
            .replace(/<\/i>/gi, "</em>")
            .replace(/<div>/gi, "<p>")
            .replace(/<\/div>/gi, "</p>")
            .replace(/&nbsp;/gi, " ")
            .replace(/<p><br><\/p>/gi, "");
        return sanitizeRichText(normalized).trim();
    };

    const syncFromEditor = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const next = normalizeEditorHtml(editor.innerHTML);
        setContent((prev) => (prev === next ? prev : next));
    };

    const runCmd = (command, value = null) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, value);
        syncFromEditor();
    };

    const setBlock = (tag) => runCmd("formatBlock", `<${tag}>`);

    const createLink = () => {
        const url = window.prompt("Enter URL", "https://");
        if (!url) return;
        runCmd("createLink", url);
    };

    const activeLabel = PAGES.find((p) => p.key === activeKey)?.label || "";

    return (
        <div>
            {/* Sub-tabs for T&C / Privacy */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {PAGES.map((page) => (
                    <button
                        key={page.key}
                        onClick={() => setActiveKey(page.key)}
                        style={{
                            padding: "10px 20px",
                            border: activeKey === page.key ? "2px solid #171717" : "1px solid #ddd",
                            borderRadius: "8px",
                            background: activeKey === page.key ? "#171717" : "#fff",
                            color: activeKey === page.key ? "#fff" : "#666",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        {page.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading...</div>
            ) : (
                <div className={styles.formGrid}>
                    {/* Title */}
                    <div className={styles.card}>
                        <h3>{activeLabel}</h3>
                        <div className={styles.fieldGroup}>
                            <label>Page Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={`e.g. ${activeLabel}`}
                            />
                        </div>
                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <label>Effective Date</label>
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label>Last Updated</label>
                                <input
                                    type="date"
                                    value={lastUpdated}
                                    onChange={(e) => setLastUpdated(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div className={styles.card}>
                        <h3>Content (Rich Text)</h3>
                        <div className={styles.richEditorShell}>
                            <div className={styles.richToolbar}>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => runCmd("bold")}><strong>B</strong></button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => runCmd("italic")}><em>I</em></button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => runCmd("underline")}><u>U</u></button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("h2")}>H2</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("h3")}>H3</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("h4")}>H4</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => setBlock("p")}>P</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => runCmd("insertUnorderedList")}>• List</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={() => runCmd("insertOrderedList")}>1. List</button>
                                <button type="button" className={styles.richToolbarBtn} onClick={createLink}>Link</button>
                            </div>
                            <div
                                ref={editorRef}
                                className={styles.richEditor}
                                contentEditable
                                role="textbox"
                                aria-multiline="true"
                                data-placeholder={`Write your ${activeLabel.toLowerCase()} content here...`}
                                onInput={syncFromEditor}
                                onBlur={syncFromEditor}
                                suppressContentEditableWarning
                                style={{ minHeight: "400px" }}
                            />
                        </div>
                        <p className={styles.richHelpText}>
                            Use the toolbar to format text. Preview below shows exactly what visitors will see.
                        </p>
                    </div>

                    {/* Preview */}
                    <div className={styles.card}>
                        <h3>Preview</h3>
                        <div className={styles.richPreview}>
                            <p className={styles.richPreviewTitle}>{title || activeLabel}</p>
                            {content ? (
                                <RichTextContent value={content} className={styles.richPreviewContent} />
                            ) : (
                                <p style={{ color: "#999", fontStyle: "italic", fontSize: "14px" }}>
                                    No content yet. Start typing above.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Save */}
                    <div className={styles.actionBar}>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : `Save ${activeLabel}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LegalPagesManager;
