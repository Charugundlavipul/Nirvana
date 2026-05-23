import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import {
    submitOrUpdateApproval,
    getCurrentAdminRole,
    isSuperAdminRole,
    fetchMyPendingDrafts,
    parseApprovalObject,
    resubmitApprovalRequest
} from '../../../lib/adminApi';
import { FaEdit, FaPlus, FaTrash, FaCheck, FaTimes, FaImage, FaChevronLeft } from 'react-icons/fa';
import AdminLayout from '../AdminLayout';
import { compressImageToWebp } from '../../../lib/imageCompressor';
import RichTextContent from '../../common/RichTextContent';
import { sanitizeRichText } from '../../../lib/richText';
import formStyles from "../Properties/PropertyEditor.module.css";

const BLOG_FALLBACK_LOGO = "/favicon.png";

const DEFAULT_BLOG_FORM = {
    id: null,
    draft_request_id: null,
    draft_action: null,
    draft_status: null,
    draft_comment: "",
    base_snapshot: null,
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Travel Guides",
    author_name: "Nirvana Luxe Team",
    author_image_url: BLOG_FALLBACK_LOGO,
    cover_image: "",
    published: false
};

const getBlogSchemaErrorMessage = (error) => {
    const message = error?.message || "";
    const missingColumnMatch = message.match(/Could not find the '([^']+)' column of 'blogs'/i);
    if (missingColumnMatch) {
        return `Blogs schema is missing the ${missingColumnMatch[1]} column in Supabase. Run the updated nirvana/supabase_schema.sql so the full blogs table is repaired.`;
    }
    return message || "Unknown error";
};

const getDraftStatusLabel = (blog) => {
    if (!blog?.is_draft_request) {
        return blog?.published ? 'Published' : 'Draft';
    }

    if (blog.draft_action === 'delete') {
        return blog.draft_status === 'revision_requested' ? 'Delete Needs Changes' : 'Delete Requested';
    }

    return blog.draft_status === 'revision_requested' ? 'Needs Changes' : 'Pending Review';
};

const getDraftStatusStyles = (blog) => {
    if (!blog?.is_draft_request) {
        return blog?.published
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
    }

    if (blog.draft_status === 'revision_requested') {
        return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
    }

    if (blog.draft_action === 'delete') {
        return 'bg-rose-100 text-rose-700 hover:bg-rose-200';
    }

    return 'bg-sky-100 text-sky-700 hover:bg-sky-200';
};

const buildDraftBlogRows = (liveBlogs, draftRequests) => {
    const liveRows = (liveBlogs || []).map((blog) => ({
        ...blog,
        row_id: blog.id,
        is_draft_request: false,
        draft_request_id: null,
        draft_action: null,
        draft_status: null,
        base_snapshot: blog,
    }));
    const liveById = new Map((liveBlogs || []).map((blog) => [blog.id, blog]));
    const rowIndexByEntityId = new Map(liveRows.map((row, index) => [row.id, index]));

    for (const request of draftRequests || []) {
        if (String(request.entity_type || '').toLowerCase() !== 'blog') continue;

        const payload = parseApprovalObject(request.payload);
        const beforeSnapshot = parseApprovalObject(request.before_snapshot);
        const entityId = request.entity_id || null;
        const publishedBlog = entityId ? liveById.get(entityId) || null : null;
        const draftRow = {
            ...publishedBlog,
            ...beforeSnapshot,
            ...payload,
            id: entityId,
            row_id: request.id,
            is_draft_request: true,
            draft_request_id: request.id,
            draft_action: request.action,
            draft_status: request.status,
            draft_comment: request.comment || "",
            submitted_at: request.submitted_at,
            base_snapshot: Object.keys(beforeSnapshot).length ? beforeSnapshot : publishedBlog,
            title: payload.title || beforeSnapshot.title || publishedBlog?.title || "Untitled Draft",
            slug: payload.slug || beforeSnapshot.slug || publishedBlog?.slug || "",
            excerpt: payload.excerpt || beforeSnapshot.excerpt || publishedBlog?.excerpt || "",
            content: payload.content || beforeSnapshot.content || publishedBlog?.content || "",
            category: payload.category || beforeSnapshot.category || publishedBlog?.category || "Travel Guides",
            author_name: payload.author_name || beforeSnapshot.author_name || publishedBlog?.author_name || "Nirvana Luxe Team",
            author_image_url: payload.author_image_url || beforeSnapshot.author_image_url || publishedBlog?.author_image_url || BLOG_FALLBACK_LOGO,
            cover_image: payload.cover_image || beforeSnapshot.cover_image || publishedBlog?.cover_image || "",
            published: typeof payload.published === 'boolean'
                ? payload.published
                : typeof beforeSnapshot.published === 'boolean'
                    ? beforeSnapshot.published
                    : Boolean(publishedBlog?.published),
        };

        if (entityId && rowIndexByEntityId.has(entityId)) {
            liveRows[rowIndexByEntityId.get(entityId)] = draftRow;
        } else {
            liveRows.unshift(draftRow);
        }
    }

    return liveRows.sort((a, b) => {
        const aTime = new Date(a.submitted_at || a.created_at || 0).getTime();
        const bTime = new Date(b.submitted_at || b.created_at || 0).getTime();
        return bTime - aTime;
    });
};

const BlogManager = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const [contentMode, setContentMode] = useState("visual");
    const contentEditorRef = useRef(null);
    const isSuper = isSuperAdminRole(adminRole);

    const [formData, setFormData] = useState(DEFAULT_BLOG_FORM);

    useEffect(() => {
        let cancelled = false;

        const loadInitialState = async () => {
            const role = await getCurrentAdminRole();
            if (cancelled) return;
            setAdminRole(role);
            await fetchBlogs(role);
        };

        loadInitialState();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const editor = contentEditorRef.current;
        if (!editor) return;
        if (document.activeElement === editor) return;
        const sanitized = sanitizeRichText(formData.content || "");
        if (editor.innerHTML !== sanitized) {
            editor.innerHTML = sanitized;
        }
    }, [formData.content, isEditing, contentMode]);

    const fetchBlogs = async (roleOverride = adminRole) => {
        setLoading(true);

        const [{ data, error }, draftRows] = await Promise.all([
            supabase
                .from('blogs')
                .select('*')
                .order('created_at', { ascending: false }),
            isSuperAdminRole(roleOverride) ? Promise.resolve([]) : fetchMyPendingDrafts()
        ]);

        if (error) {
            console.error("Error loading blogs:", error);
        } else {
            setBlogs(buildDraftBlogRows(data || [], draftRows || []));
        }

        setLoading(false);
    };

    const togglePublish = async (id, currentStatus) => {
        const { data: userData } = await supabase.auth.getUser();

        if (isSuper) {
            const { error } = await supabase
                .from('blogs')
                .update({
                    published: !currentStatus,
                    published_at: !currentStatus ? new Date().toISOString() : null
                })
                .eq('id', id);

            if (error) alert("Error: " + error.message);
            else fetchBlogs();
        } else {
            const publishedBlog = blogs.find((blog) => blog.id === id && !blog.is_draft_request) || {};
            const payload = { published: !currentStatus };
            await submitOrUpdateApproval({
                entityType: 'blog',
                action: 'update',
                entityId: id,
                payload,
                beforeSnapshot: publishedBlog,
                submittedBy: userData?.user?.id,
                comment: `Requested to ${currentStatus ? 'Unpublish' : 'Publish'} blog`
            });
            alert('Toggle publish request submitted to approval queue.');
            fetchBlogs();
        }
    };

    const deleteBlog = async (id) => {
        const blogToRemove = blogs.find((blog) => blog.id === id && !blog.is_draft_request);

        if (window.confirm(`Are you sure you want to ${isSuper ? 'DELETE' : 'request deletion for'} this article?`)) {
            const { data: userData } = await supabase.auth.getUser();

            if (isSuper) {
                const { error } = await supabase.from('blogs').delete().eq('id', id);
                if (error) alert("Error: " + error.message);
                else fetchBlogs();
            } else {
                await submitOrUpdateApproval({
                    entityType: 'blog',
                    action: 'delete',
                    entityId: id,
                    payload: { id },
                    beforeSnapshot: blogToRemove || {},
                    submittedBy: userData?.user?.id,
                    comment: 'Requested blog deletion'
                });
                alert('Delete request submitted to approval queue.');
                fetchBlogs();
            }
        }
    };

    const handleCreate = () => {
        setFormData(DEFAULT_BLOG_FORM);
        setIsEditing(true);
    };

    const handleEdit = (blog) => {
        setFormData({
            ...DEFAULT_BLOG_FORM,
            id: blog.id,
            draft_request_id: blog.draft_request_id || null,
            draft_action: blog.draft_action || null,
            draft_status: blog.draft_status || null,
            draft_comment: blog.draft_comment || "",
            base_snapshot: blog.base_snapshot || null,
            title: blog.title || "",
            slug: blog.slug || "",
            excerpt: blog.excerpt || "",
            content: blog.content || "",
            category: blog.category || "Travel Guides",
            author_name: blog.author_name || "Nirvana Luxe Team",
            author_image_url: blog.author_image_url || BLOG_FALLBACK_LOGO,
            cover_image: blog.cover_image || "",
            published: Boolean(blog.published)
        });
        setIsEditing(true);
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const compressedBlob = await compressImageToWebp(file, { quality: 0.8, maxWidth: 1920 });
            const fileName = `blog/${Date.now()}-${file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')}.webp`;

            const { error: uploadErr } = await supabase.storage
                .from("property-assets")
                .upload(fileName, compressedBlob, { contentType: 'image/webp' });

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage.from("property-assets").getPublicUrl(fileName);
            setFormData((prev) => ({ ...prev, [field]: publicUrl }));
        } catch (error) {
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

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

    const syncContentFromEditor = () => {
        const editor = contentEditorRef.current;
        if (!editor) return;
        const nextContent = normalizeEditorHtml(editor.innerHTML);
        setFormData((prev) =>
            prev.content === nextContent
                ? prev
                : { ...prev, content: nextContent }
        );
    };

    const getCurrentEditorBlockTag = () => {
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorElement =
            anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
        return anchorElement?.closest?.("h1,h2,h3,h4,p,blockquote,li,div")?.tagName?.toLowerCase() || null;
    };

    const runEditorCommand = (command, value = null) => {
        const editor = contentEditorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false, value);
        syncContentFromEditor();
    };

    const setBlock = (tag) => {
        const editor = contentEditorRef.current;
        if (!editor) return;
        editor.focus();

        const variants = [tag, tag.toUpperCase(), `<${tag}>`];
        for (const variant of variants) {
            document.execCommand("formatBlock", false, variant);
            if (getCurrentEditorBlockTag() === tag) {
                break;
            }
        }

        syncContentFromEditor();
    };

    const createLink = () => {
        const url = window.prompt("Enter URL", "https://");
        if (!url) return;
        runEditorCommand("createLink", url);
    };

    const handleContentPaste = (event) => {
        event.preventDefault();
        const html = event.clipboardData?.getData("text/html");
        const text = event.clipboardData?.getData("text/plain") || "";

        if (html) {
            document.execCommand("insertHTML", false, normalizeEditorHtml(html));
        } else if (text) {
            document.execCommand("insertText", false, text);
        }

        syncContentFromEditor();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const { id, draft_request_id, draft_action, draft_status, base_snapshot, ...payload } = formData;
            const sanitizedPayload = {
                ...payload,
                content: sanitizeRichText(payload.content),
            };
            const { data: userData } = await supabase.auth.getUser();

            if (isSuper) {
                const blogPayload = {
                    ...sanitizedPayload,
                    updated_at: new Date().toISOString()
                };

                let result;
                if (id) {
                    result = await supabase.from('blogs').update(blogPayload).eq('id', id);
                } else {
                    result = await supabase.from('blogs').insert([blogPayload]);
                }

                if (result.error) throw result.error;
                alert(id ? 'Blog updated successfully!' : 'Blog created successfully!');
            } else {
                const beforeSnapshot = base_snapshot || (id ? blogs.find((blog) => blog.id === id && !blog.is_draft_request) || null : null);
                let error = null;

                if (draft_request_id) {
                    ({ error } = await resubmitApprovalRequest(
                        draft_request_id,
                        sanitizedPayload,
                        beforeSnapshot,
                        draft_status === 'revision_requested'
                            ? `Resubmitted blog: ${formData.title}`
                            : `Updated draft: ${formData.title}`
                    ));
                } else {
                    ({ error } = await submitOrUpdateApproval({
                        entityType: 'blog',
                        action: draft_action || (id ? "update" : "create"),
                        entityId: id || null,
                        payload: sanitizedPayload,
                        beforeSnapshot,
                        submittedBy: userData?.user?.id,
                        comment: id ? `Updated blog: ${formData.title}` : `Created new blog: ${formData.title}`
                    }));
                }

                if (error) throw error;
                alert(draft_request_id ? 'Draft updated successfully.' : 'Draft submitted to approval queue.');
            }

            setIsEditing(false);
            fetchBlogs();
        } catch (error) {
            alert("Error saving: " + getBlogSchemaErrorMessage(error));
        }
    };

    if (isEditing) {
        return (
            <AdminLayout title={formData.id ? "Edit Post" : "New Post"}>
                <div className="p-4 sm:p-6">
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
                        <FaChevronLeft /> Back to List
                    </button>

                    <div className={formStyles.card}>
                        <form onSubmit={handleSave} className={formStyles.formGrid}>
                            {formData.draft_status === 'revision_requested' && formData.draft_comment && (
                                <div
                                    style={{
                                        background: "#fff7ed",
                                        border: "1px solid #fdba74",
                                        color: "#9a3412",
                                        borderRadius: "14px",
                                        padding: "14px 16px",
                                        fontSize: "14px",
                                        lineHeight: 1.5
                                    }}
                                >
                                    <strong style={{ display: "block", marginBottom: "4px" }}>Revision Note</strong>
                                    {formData.draft_comment}
                                </div>
                            )}
                            <div className={formStyles.row}>
                                <div className={formStyles.fieldGroup}>
                                    <label>Article Title</label>
                                    <input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                        required
                                        placeholder="e.g. 5 Best Hikes in the Smokies"
                                    />
                                </div>
                                <div className={formStyles.fieldGroup}>
                                    <label>URL Slug</label>
                                    <input
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={formStyles.row}>
                                <div className={formStyles.fieldGroup}>
                                    <label>Author Name</label>
                                    <input
                                        value={formData.author_name}
                                        onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                                        placeholder="Nirvana Luxe Team"
                                    />
                                </div>
                                <div className={formStyles.fieldGroup}>
                                    <label>Author Profile Pic</label>
                                    <div className="flex flex-wrap items-center gap-4 w-full">
                                        {formData.author_image_url && (
                                            <div className="w-10 h-10 rounded-full shadow-sm overflow-hidden border flex-shrink-0">
                                                <img src={formData.author_image_url} className="w-full h-full object-cover" alt="author" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "author_image_url")} disabled={uploading} className="text-sm w-full sm:w-auto" />
                                    </div>
                                </div>
                            </div>

                            <div className={formStyles.row}>
                                <div className={formStyles.fieldGroup}>
                                    <label>Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Travel Guides">Travel Guides</option>
                                        <option value="Destinations">Destinations</option>
                                        <option value="Property Spotlights">Property Spotlights</option>
                                        <option value="Local News">Local News</option>
                                    </select>
                                </div>
                                <div className={formStyles.fieldGroup}>
                                    <label>Cover Image</label>
                                    <div className="flex flex-wrap items-center gap-4 w-full">
                                        {formData.cover_image && (
                                            <div className="w-16 h-16 rounded shadow-sm overflow-hidden border flex-shrink-0">
                                                <img src={formData.cover_image} className="w-full h-full object-cover" alt="cover" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "cover_image")} disabled={uploading} className="text-sm w-full sm:w-auto" />
                                    </div>
                                    {uploading && <span className="text-xs text-slate-400 mt-1 block">Compressing & Uploading...</span>}
                                </div>
                            </div>

                            <div className={formStyles.fieldGroup}>
                                <label>Short Excerpt</label>
                                <textarea
                                    rows={2}
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    placeholder="Brief summary for the feed page..."
                                />
                            </div>

                            <div className={formStyles.fieldGroup}>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <label className="mb-0">Content</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            className={formStyles.richToolbarBtn}
                                            onClick={() => setContentMode("visual")}
                                            style={contentMode === "visual" ? { background: "#171717", color: "#fff", borderColor: "#171717" } : undefined}
                                        >
                                            Visual Editor
                                        </button>
                                        <button
                                            type="button"
                                            className={formStyles.richToolbarBtn}
                                            onClick={() => setContentMode("html")}
                                            style={contentMode === "html" ? { background: "#171717", color: "#fff", borderColor: "#171717" } : undefined}
                                        >
                                            HTML
                                        </button>
                                    </div>
                                </div>
                                {contentMode === "visual" ? (
                                    <>
                                        <div className={formStyles.richEditorShell}>
                                            <div className={formStyles.richToolbar}>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("bold")}><strong>B</strong></button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("italic")}><em>I</em></button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("underline")}><u>U</u></button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("h1")}>H1</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("h2")}>H2</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("h3")}>H3</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("h4")}>H4</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("p")}>P</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("insertUnorderedList")}>List</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("insertOrderedList")}>1. List</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => setBlock("blockquote")}>Quote</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={createLink}>Link</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("unlink")}>Unlink</button>
                                                <button type="button" className={formStyles.richToolbarBtn} onClick={() => runEditorCommand("removeFormat")}>Clear</button>
                                            </div>
                                            <div
                                                ref={contentEditorRef}
                                                className={formStyles.richEditor}
                                                contentEditable
                                                role="textbox"
                                                aria-multiline="true"
                                                data-placeholder="Write the article content here..."
                                                onInput={syncContentFromEditor}
                                                onBlur={syncContentFromEditor}
                                                onPaste={handleContentPaste}
                                                suppressContentEditableWarning
                                                style={{ minHeight: "360px" }}
                                            />
                                        </div>
                                        <p className={formStyles.richHelpText}>
                                            Type directly, paste formatted content, and use the toolbar for headings, lists, quotes, and links.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <textarea
                                            rows={16}
                                            className="font-mono text-sm"
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            required
                                            placeholder="<p>Write your article here...</p>"
                                        />
                                        <p className={formStyles.richHelpText}>
                                            HTML mode is for advanced cleanup and embeds. The saved output is sanitized before publish.
                                        </p>
                                    </>
                                )}
                                <div className={formStyles.richPreview}>
                                    <p className={formStyles.richPreviewTitle}>Preview</p>
                                    {formData.content ? (
                                        <RichTextContent value={formData.content} className={formStyles.richPreviewContent} />
                                    ) : (
                                        <p className={formStyles.richHelpText} style={{ marginTop: 0 }}>
                                            No content yet. Start typing above.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className={`${formStyles.actionBar} flex flex-col-reverse sm:flex-row gap-3 sm:gap-4`}>
                                <button type="button" className={`${formStyles.cancelBtn} w-full sm:w-auto`} onClick={() => setIsEditing(false)}>Discard</button>
                                <button type="submit" className={`${formStyles.saveBtn} w-full sm:w-auto`}>
                                    {isSuper
                                        ? (formData.id ? "Save Changes" : "Create Post")
                                        : (formData.draft_request_id ? "Update Draft" : "Submit for Approval")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Journal & Blogs" subtitle="Manage your travel guides and informational content.">
            <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">All Articles</h2>
                        <p className="text-sm text-slate-500">
                            {isSuper
                                ? "Only published articles appear on the public Journal."
                                : "Published articles and your pending blog drafts appear here. Open a draft anytime to revise and resubmit it."}
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center justify-center gap-2 bg-[#60BD68] text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors shadow-lg font-bold w-full sm:w-auto"
                    >
                        <FaPlus /> Create New Post
                    </button>
                </div>

                {/* Desktop view: Table */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse font-sans">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <tr>
                                <th className="p-4 font-semibold">Title</th>
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading Journal...</td></tr>
                            ) : blogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400">
                                        <div className="mb-4 text-slate-300"><FaImage size={48} className="mx-auto" /></div>
                                        {isSuper
                                            ? "Your journal is empty. Let's write the first post!"
                                            : "You have no published posts or draft submissions yet."}
                                    </td>
                                </tr>
                            ) : blogs.map((blog) => (
                                <tr key={blog.row_id || blog.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {blog.cover_image && <img src={blog.cover_image} className="w-10 h-10 rounded object-cover shadow-sm" alt="thumb" />}
                                            <div>
                                                <div className="font-bold text-slate-900">{blog.title}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">/{blog.slug}</div>
                                                {blog.draft_comment && blog.is_draft_request && (
                                                    <div className="text-[11px] text-slate-500 mt-1 italic max-w-[420px] truncate">
                                                        Note: {blog.draft_comment}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">{blog.category}</td>
                                    <td className="p-4">
                                        {blog.is_draft_request ? (
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${getDraftStatusStyles(blog)}`}>
                                                {blog.draft_status === 'revision_requested' ? <FaTimes size={8} /> : <FaCheck size={8} />}
                                                {getDraftStatusLabel(blog)}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => togglePublish(blog.id, blog.published)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${getDraftStatusStyles(blog)}`}
                                            >
                                                {blog.published ? <FaCheck size={8} /> : <FaTimes size={8} />}
                                                {getDraftStatusLabel(blog)}
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-4 flex items-center justify-end gap-2 text-slate-400">
                                        {blog.draft_action !== 'delete' && (
                                            <button onClick={() => handleEdit(blog)} className="p-2 hover:bg-slate-100 hover:text-amber-500 rounded transition-all" title={blog.is_draft_request ? "Edit Draft" : "Edit Article"}>
                                                <FaEdit size={18} />
                                            </button>
                                        )}
                                        {blog.id && !blog.is_draft_request && (
                                            <button onClick={() => deleteBlog(blog.id)} className="p-2 hover:bg-slate-100 hover:text-red-500 rounded transition-all" title="Delete Article">
                                                <FaTrash size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view: Cards list */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {loading ? (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                            Loading Journal...
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                            <div className="mb-4 text-slate-300"><FaImage size={48} className="mx-auto" /></div>
                            {isSuper
                                ? "Your journal is empty. Let's write the first post!"
                                : "You have no published posts or draft submissions yet."}
                        </div>
                    ) : (
                        blogs.map((blog) => (
                            <div key={blog.row_id || blog.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex gap-3">
                                    {blog.cover_image && (
                                        <img src={blog.cover_image} className="w-16 h-16 rounded object-cover shadow-sm flex-shrink-0" alt="thumb" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-900 leading-snug break-words">{blog.title}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">/{blog.slug}</div>
                                        <div className="text-xs text-slate-500 mt-1">{blog.category}</div>
                                    </div>
                                </div>
                                {blog.draft_comment && blog.is_draft_request && (
                                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg italic">
                                        Note: {blog.draft_comment}
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <div>
                                        {blog.is_draft_request ? (
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${getDraftStatusStyles(blog)}`}>
                                                {blog.draft_status === 'revision_requested' ? <FaTimes size={8} /> : <FaCheck size={8} />}
                                                {getDraftStatusLabel(blog)}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => togglePublish(blog.id, blog.published)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${getDraftStatusStyles(blog)}`}
                                            >
                                                {blog.published ? <FaCheck size={8} /> : <FaTimes size={8} />}
                                                {getDraftStatusLabel(blog)}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500">
                                        {blog.draft_action !== 'delete' && (
                                            <button onClick={() => handleEdit(blog)} className="p-2 bg-slate-50 hover:bg-slate-100 hover:text-amber-500 rounded-lg transition-all" title={blog.is_draft_request ? "Edit Draft" : "Edit Article"}>
                                                <FaEdit size={16} />
                                            </button>
                                        )}
                                        {blog.id && !blog.is_draft_request && (
                                            <button onClick={() => deleteBlog(blog.id)} className="p-2 bg-slate-50 hover:bg-slate-100 hover:text-red-500 rounded-lg transition-all" title="Delete Article">
                                                <FaTrash size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default BlogManager;
