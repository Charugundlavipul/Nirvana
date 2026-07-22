"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCheckCircle, FaChevronRight, FaClock, FaExternalLinkAlt, FaSearch, FaShareAlt, FaUpload } from "react-icons/fa";
import AdminLayout from "../AdminLayout";
import { fetchPageMetadataAdmin, isSuperAdminRole, savePageMetadataAdmin } from "../../../lib/adminApi";
import { compressImageToWebp } from "../../../lib/imageCompressor";
import { supabase } from "../../../supabaseClient";
import styles from "./PageMetadataManager.module.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  keywords: [],
  canonicalPathname: "",
  openGraphTitle: "",
  openGraphDescription: "",
  openGraphImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  noindex: false,
  follow: true,
};

function toForm(metadata = {}, pageKey = "") {
  return {
    ...EMPTY_FORM,
    ...metadata,
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
    canonicalPathname: metadata.canonicalPathname || pageKey,
    noindex: Boolean(metadata.noindex),
    follow: metadata.follow !== false,
  };
}

function CharacterCount({ value, recommended, maximum }) {
  const length = String(value || "").length;
  const tone = length > maximum ? styles.countError : length > recommended ? styles.countWarning : "";
  return <span className={`${styles.characterCount} ${tone}`}>{length}/{maximum}</span>;
}

function Field({ label, hint, count, children, required = false }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldHeader}>
        <span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>
        {count}
      </span>
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

const PageMetadataManager = () => {
  const [pages, setPages] = useState([]);
  const [role, setRole] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All pages");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ openGraphImage: false, twitterImage: false });
  const [notice, setNotice] = useState(null);
  const fileInputRefs = useRef({});

  const loadPages = async (preferredKey = null) => {
    setLoading(true);
    try {
      const result = await fetchPageMetadataAdmin();
      setPages(result.pages || []);
      setRole(result.role || null);
      const nextKey = preferredKey || selectedKey || result.pages?.[0]?.pageKey || "";
      setSelectedKey(nextKey);
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to load page metadata." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const selectedPage = useMemo(
    () => pages.find((page) => page.pageKey === selectedKey) || null,
    [pages, selectedKey]
  );

  useEffect(() => {
    if (!selectedPage) return;
    setForm(toForm(selectedPage.draft?.metadata || selectedPage.effective || selectedPage, selectedPage.pageKey));
    setComment("");
  }, [selectedPage]);

  const groups = useMemo(
    () => ["All pages", ...Array.from(new Set(pages.map((page) => page.group))).filter(Boolean)],
    [pages]
  );

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pages.filter((page) => {
      if (group !== "All pages" && page.group !== group) return false;
      return !query || `${page.label} ${page.pageKey} ${page.group}`.toLowerCase().includes(query);
    });
  }, [pages, search, group]);

  const groupedPages = useMemo(() => {
    return filteredPages.reduce((result, page) => {
      const key = page.group || "Other pages";
      if (!result[key]) result[key] = [];
      result[key].push(page);
      return result;
    }, {});
  }, [filteredPages]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isReviewer = isSuperAdminRole(role);
  const previewTitle = form.openGraphTitle || form.title || "Page title";
  const previewDescription = form.openGraphDescription || form.description || "Page description";

  const handleImageUpload = async (event, fieldKey) => {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile || !selectedPage) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(originalFile.type)) {
      setNotice({ type: "error", text: "Please upload a JPG, PNG, or WebP image." });
      return;
    }
    if (originalFile.size > 12 * 1024 * 1024) {
      setNotice({ type: "error", text: "The selected image is larger than 12 MB." });
      return;
    }

    setUploading((current) => ({ ...current, [fieldKey]: true }));
    setNotice(null);
    try {
      const file = await compressImageToWebp(originalFile, { maxWidth: 1600, quality: 0.82 });
      const pageFolder = selectedPage.pageKey === "/"
        ? "home"
        : selectedPage.pageKey.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `page-metadata/${pageFolder}/${fieldKey}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("property-assets")
        .upload(storagePath, file, { contentType: file.type || "image/webp", upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("property-assets").getPublicUrl(storagePath);
      if (!publicData?.publicUrl) throw new Error("The image uploaded, but its public URL could not be created.");
      update(fieldKey, publicData.publicUrl);
      setNotice({ type: "success", text: "Image uploaded. Publish or submit the metadata to save this change." });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to upload the image." });
    } finally {
      setUploading((current) => ({ ...current, [fieldKey]: false }));
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedPage) return;
    if (!form.title.trim() || !form.description.trim()) {
      setNotice({ type: "error", text: "Add both an SEO title and a meta description before saving." });
      return;
    }
    if (form.title.length > 120 || form.description.length > 320) {
      setNotice({ type: "error", text: "Shorten the title or description to the displayed maximum length." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const result = await savePageMetadataAdmin({ pageKey: selectedPage.pageKey, metadata: form, comment });
      setNotice({
        type: "success",
        text: result.status === "published"
          ? "Metadata published successfully."
          : "Changes submitted for approval. They will not appear on the public site until approved.",
      });
      await loadPages(selectedPage.pageKey);
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to save metadata." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Page Metadata" subtitle="Control how every public page appears in search results and social shares">
      <div className={styles.shell}>
        <aside className={styles.pagePanel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Website pages</h2>
              <p>{pages.length} routes found automatically</p>
            </div>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <FaSearch aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages..." aria-label="Search pages" />
            </div>
            <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Filter page type">
              {groups.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className={styles.pageList}>
            {loading ? <div className={styles.listMessage}>Loading pages...</div> : null}
            {!loading && filteredPages.length === 0 ? <div className={styles.listMessage}>No pages match your search.</div> : null}
            {Object.entries(groupedPages).map(([groupName, items]) => (
              <div key={groupName} className={styles.pageGroup}>
                <h3>{groupName}</h3>
                {items.map((page) => (
                  <button
                    type="button"
                    key={page.pageKey}
                    className={`${styles.pageItem} ${page.pageKey === selectedKey ? styles.pageItemActive : ""}`}
                    onClick={() => { setNotice(null); setSelectedKey(page.pageKey); }}
                  >
                    <span className={styles.pageItemText}>
                      <strong>{page.label}</strong>
                      <small>{page.pageKey}</small>
                    </span>
                    {page.draft ? (
                      <span className={`${styles.statusDot} ${page.draft.status === "revision_requested" ? styles.revisionDot : ""}`} title={page.draft.status === "revision_requested" ? "Revision requested" : "Pending approval"} />
                    ) : page.published ? (
                      <FaCheckCircle className={styles.publishedIcon} title="Customized" />
                    ) : null}
                    <FaChevronRight className={styles.chevron} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <main className={styles.editorPanel}>
          {!selectedPage && !loading ? <div className={styles.emptyEditor}>Select a page to edit its metadata.</div> : null}
          {selectedPage ? (
            <form onSubmit={handleSave}>
              <div className={styles.editorHeader}>
                <div>
                  <div className={styles.eyebrow}>Editing metadata</div>
                  <h2>{selectedPage.label}</h2>
                  <a href={selectedPage.pageKey} target="_blank" rel="noreferrer">{selectedPage.pageKey} <FaExternalLinkAlt /></a>
                </div>
                <div className={styles.headerStatus}>
                  {selectedPage.draft ? <span className={styles.pendingBadge}><FaClock /> {selectedPage.draft.status === "revision_requested" ? "Revision requested" : "Pending approval"}</span> : null}
                  {selectedPage.published ? <span className={styles.liveBadge}><FaCheckCircle /> Custom metadata live</span> : <span className={styles.defaultBadge}>Using page defaults</span>}
                </div>
              </div>

              {selectedPage.draft?.status === "revision_requested" ? (
                <div className={styles.revisionBanner}>
                  <strong>Changes requested by reviewer</strong>
                  <p>{selectedPage.draft.comment || "Please review this metadata and resubmit it."}</p>
                </div>
              ) : null}

              {notice ? <div className={`${styles.notice} ${notice.type === "error" ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

              <section className={styles.card}>
                <div className={styles.cardTitle}>
                  <div><h3>Search appearance</h3><p>The title and summary people see in Google and other search engines.</p></div>
                </div>
                <div className={styles.formGrid}>
                  <Field label="SEO title" required hint="Aim for 50–60 characters and put the most important words first." count={<CharacterCount value={form.title} recommended={60} maximum={120} />}>
                    <input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Meta description" required hint="A clear summary around 120–160 characters usually displays best." count={<CharacterCount value={form.description} recommended={160} maximum={320} />}>
                    <textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={320} rows={4} />
                  </Field>
                  <Field label="Keywords" hint="Optional. Separate phrases with commas; keep them focused on this page.">
                    <input value={form.keywords.join(", ")} onChange={(event) => update("keywords", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="luxury cabin, direct booking, Lake Norman" />
                  </Field>
                  <Field label="Canonical URL" hint="The preferred URL for this content. A site path is usually best.">
                    <input value={form.canonicalPathname} onChange={(event) => update("canonicalPathname", event.target.value)} placeholder={selectedPage.pageKey} />
                  </Field>
                </div>

                <div className={styles.googlePreview} aria-label="Search result preview">
                  <span>nirvanaluxevacations.com{selectedPage.pageKey}</span>
                  <h4>{form.title || "Page title"}</h4>
                  <p>{form.description || "Your page description will appear here."}</p>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>
                  <div><h3>Social sharing</h3><p>Optional overrides for Facebook, LinkedIn, messaging apps, and X.</p></div>
                  <FaShareAlt aria-hidden="true" />
                </div>
                <div className={styles.twoColumns}>
                  <div className={styles.formGrid}>
                    <Field label="Social title" hint="Leave blank to use the SEO title."><input value={form.openGraphTitle} onChange={(event) => update("openGraphTitle", event.target.value)} maxLength={120} placeholder={form.title} /></Field>
                    <Field label="Social description" hint="Leave blank to use the meta description."><textarea value={form.openGraphDescription} onChange={(event) => update("openGraphDescription", event.target.value)} maxLength={320} rows={3} placeholder={form.description} /></Field>
                    <Field label="Social image" hint="Upload a JPG, PNG, or WebP image. A 1200 × 630 px image is recommended.">
                      <div className={styles.imageFieldRow}>
                        <input value={form.openGraphImage} onChange={(event) => update("openGraphImage", event.target.value)} placeholder="Paste an image URL or upload a file" />
                        <input ref={(element) => { fileInputRefs.current.openGraphImage = element; }} type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} onChange={(event) => handleImageUpload(event, "openGraphImage")} />
                        <button type="button" className={styles.uploadButton} disabled={uploading.openGraphImage} onClick={() => fileInputRefs.current.openGraphImage?.click()}>
                          <FaUpload aria-hidden="true" /> {uploading.openGraphImage ? "Uploading..." : form.openGraphImage ? "Replace" : "Upload image"}
                        </button>
                      </div>
                    </Field>
                  </div>
                  <div className={styles.socialPreview}>
                    <div className={styles.previewImage}>
                      {form.openGraphImage ? <img src={form.openGraphImage} alt="Social sharing preview" /> : <span>Add a social image URL to preview it</span>}
                    </div>
                    <div className={styles.previewCopy}><small>NIRVANALUXEVACATIONS.COM</small><strong>{previewTitle}</strong><p>{previewDescription}</p></div>
                  </div>
                </div>

                <details className={styles.advanced}>
                  <summary>Customize X / Twitter separately</summary>
                  <div className={styles.formGrid}>
                    <Field label="X / Twitter title"><input value={form.twitterTitle} onChange={(event) => update("twitterTitle", event.target.value)} maxLength={120} placeholder={previewTitle} /></Field>
                    <Field label="X / Twitter description"><textarea value={form.twitterDescription} onChange={(event) => update("twitterDescription", event.target.value)} maxLength={320} rows={3} placeholder={previewDescription} /></Field>
                    <Field label="X / Twitter image">
                      <div className={styles.imageFieldRow}>
                        <input value={form.twitterImage} onChange={(event) => update("twitterImage", event.target.value)} placeholder={form.openGraphImage || "Paste an image URL or upload a file"} />
                        <input ref={(element) => { fileInputRefs.current.twitterImage = element; }} type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} onChange={(event) => handleImageUpload(event, "twitterImage")} />
                        <button type="button" className={styles.uploadButton} disabled={uploading.twitterImage} onClick={() => fileInputRefs.current.twitterImage?.click()}>
                          <FaUpload aria-hidden="true" /> {uploading.twitterImage ? "Uploading..." : form.twitterImage ? "Replace" : "Upload image"}
                        </button>
                      </div>
                    </Field>
                  </div>
                </details>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}><div><h3>Search engine controls</h3><p>Use these carefully; hiding a page can remove it from search results.</p></div></div>
                <div className={styles.toggleGrid}>
                  <label className={styles.toggleCard}>
                    <input type="checkbox" checked={!form.noindex} onChange={(event) => update("noindex", !event.target.checked)} />
                    <span><strong>Allow search indexing</strong><small>Search engines may include this page in results.</small></span>
                  </label>
                  <label className={styles.toggleCard}>
                    <input type="checkbox" checked={form.follow} onChange={(event) => update("follow", event.target.checked)} />
                    <span><strong>Allow link following</strong><small>Search engines may follow links found on this page.</small></span>
                  </label>
                </div>
              </section>

              {!isReviewer ? (
                <section className={styles.approvalNote}>
                  <Field label="Note for reviewer" hint="Optional: explain the goal or context for your changes.">
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="What changed, and why?" />
                  </Field>
                </section>
              ) : null}

              <div className={styles.formActions}>
                <div>
                  <strong>{isReviewer ? "Publish immediately" : "Approval required"}</strong>
                  <span>{isReviewer ? "Your changes will become the live metadata." : "A superadmin will review these changes before they go live."}</span>
                </div>
                <button type="submit" disabled={saving}>{saving ? "Saving..." : isReviewer ? "Publish metadata" : selectedPage.draft ? "Resubmit changes" : "Submit for approval"}</button>
              </div>
            </form>
          ) : null}
        </main>
      </div>
    </AdminLayout>
  );
};

export default PageMetadataManager;
