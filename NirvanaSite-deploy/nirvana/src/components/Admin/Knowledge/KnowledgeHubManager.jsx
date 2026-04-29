import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";
import AdminLayout from "../AdminLayout";
import styles from "./KnowledgeHubManager.module.css";
import {
  acceptKnowledgeSectionSuggestion,
  askKnowledgeHubQuestion,
  createManualKnowledgeSource,
  deleteKnowledgeQuestion,
  deleteKnowledgeSection,
  dismissKnowledgeSectionSuggestion,
  updateManualKnowledgeSource,
  fetchKnowledgeHub,
  fetchKnowledgeHubs,
  refreshKnowledgeSystemContext,
  saveKnowledgeQuestion,
  saveKnowledgeSection,
  syncKnowledgeHub,
  uploadKnowledgeSource,
  deleteKnowledgeSource,
} from "../../../lib/adminKnowledgeApi";
import {
  STANDARD_KNOWLEDGE_SECTIONS,
  isStandardKnowledgeSectionSlug,
} from "../../../lib/knowledgeSectionCatalog";

const EMPTY_SECTION_FORM = {
  sectionId: null,
  title: "",
  summary: "",
  contentMarkdown: "",
  displayOrder: 0,
};

const EMPTY_QUESTION_FORM = {
  questionId: null,
  sectionId: "",
  question: "",
  answer: "",
  displayOrder: 0,
};

const EMPTY_NOTE_FORM = {
  title: "",
  description: "",
  contentText: "",
};

const EMPTY_UPLOAD_FORM = {
  title: "",
  description: "",
  file: null,
};

const EMPTY_SOURCE_EDIT_FORM = {
  title: "",
  description: "",
  contentText: "",
};

function formatEvidenceType(value) {
  if (value === "source") return "Source";
  if (value === "section") return "Section";
  if (value === "question") return "Q&A";
  return "Evidence";
}

function formatEvidenceTitle(item) {
  const title = `${item?.title || item?.detailTitle || ""}`.trim();
  return title.replace(/^(Source|Section|Q&A):\s*/i, "") || "Untitled evidence";
}

function getVerificationStatus(item) {
  const status = `${item?.metadata?.verification_status || ""}`.trim().toLowerCase();
  if (["system", "source_backed", "manual_override", "conflict", "unverified"].includes(status)) {
    return status;
  }
  if (item?.section_origin === "system") return "system";
  return "unverified";
}

function formatVerificationLabel(status) {
  if (status === "system") return "System";
  if (status === "source_backed") return "Source-backed";
  if (status === "manual_override") return "Override";
  if (status === "conflict") return "Conflict";
  return "Needs review";
}

function verificationClassName(status) {
  if (status === "system") return "verificationSystem";
  if (status === "source_backed") return "verificationSourceBacked";
  if (status === "manual_override") return "verificationManualOverride";
  if (status === "conflict") return "verificationConflict";
  return "verificationUnverified";
}

function formatDateLabel(value) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateSourcePreview(value, maxLength = 260) {
  const normalized = `${value || ""}`.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function isSystemKnowledgeSection(section) {
  return (
    section?.section_origin === "system" ||
    section?.metadata?.system_section === "source_appendix"
  );
}

function isStandardKnowledgeSection(section) {
  return (
    Boolean(section?.metadata?.standard_section) ||
    isStandardKnowledgeSectionSlug(section?.slug)
  );
}

function getSuggestedSectionEdit(section) {
  const suggestion = section?.suggested_edit;
  if (!suggestion) return null;
  if (!suggestion.title && !suggestion.summary && !suggestion.content_markdown) {
    return null;
  }
  return suggestion;
}

function getSourceTimestamp(source) {
  if (!source) return { label: "Updated", value: "" };
  if (source.source_type === "system_snapshot") {
    return {
      label: "Refreshed",
      value:
        source.last_processed_at ||
        source.metadata?.system_updated_at ||
        source.updated_at ||
        source.created_at ||
        "",
    };
  }

  return {
    label: "Updated",
    value: source.updated_at || source.created_at || "",
  };
}

function renderKnowledgeContent(content) {
  const lines = `${content || ""}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;
  const bulletLines = lines.filter((line) => line.startsWith("- "));
  if (bulletLines.length >= Math.ceil(lines.length / 2)) {
    return (
      <ul className={styles.bulletList}>
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>
            {line.startsWith("- ") ? line.slice(2) : line}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.paragraphGroup}>
      {lines.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

const KnowledgeHubManager = () => {
  const [hubs, setHubs] = useState([]);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [hubData, setHubData] = useState(null);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [loadingHub, setLoadingHub] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [actingOnSuggestionId, setActingOnSuggestionId] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [refreshingSources, setRefreshingSources] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState(null);
  const [openSectionIds, setOpenSectionIds] = useState([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [noteForm, setNoteForm] = useState(EMPTY_NOTE_FORM);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);
  const [editSourceForm, setEditSourceForm] = useState(EMPTY_SOURCE_EDIT_FORM);
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION_FORM);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [inlineQuestionSectionId, setInlineQuestionSectionId] = useState("");
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatResult, setChatResult] = useState(null);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceTab, setSourceTab] = useState("upload"); // "upload" | "text"
  const [openQuestionIds, setOpenQuestionIds] = useState([]);

  const selectedHub = useMemo(
    () => hubs.find((hub) => hub.id === selectedHubId) || null,
    [hubs, selectedHubId]
  );

  useEffect(() => {
    loadHubs();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedHubId) {
      window.localStorage.removeItem("adminKnowledgeActiveHubId");
      return;
    }
    window.localStorage.setItem("adminKnowledgeActiveHubId", selectedHubId);
  }, [selectedHubId]);

  async function loadHubs(nextHubId = null) {
    setLoadingHubs(true);
    setStatus(null);
    try {
      const payload = await fetchKnowledgeHubs();
      const nextHubs = Array.isArray(payload?.hubs) ? payload.hubs : [];
      setHubs(nextHubs);

      const hubId = nextHubId || selectedHubId || nextHubs[0]?.id || "";
      if (hubId) {
        setSelectedHubId(hubId);
        setChatResult(null);
        setShowEvidence(false);
        await loadHub(hubId);
      }
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setLoadingHubs(false);
    }
  }

  async function loadHub(hubId) {
    if (!hubId) return;
    setLoadingHub(true);
    try {
      const payload = await fetchKnowledgeHub(hubId);
      setHubData(payload);
      resetSourceEditor();
      resetSectionComposer();
      resetQuestionComposer();
      setOpenQuestionIds([]);
      const nextOpen = (payload?.sections || []).slice(0, 2).map((section) => section.id);
      setOpenSectionIds(nextOpen);
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setLoadingHub(false);
    }
  }

  const filteredSections = useMemo(() => {
    const sections = hubData?.sections || [];
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return sections;

    return sections.filter((section) => {
      return `${section.title} ${section.summary} ${section.content_markdown}`
        .toLowerCase()
        .includes(query);
    });
  }, [deferredSearch, hubData]);

  const editingSection = useMemo(
    () => (hubData?.sections || []).find((section) => section.id === editingSectionId) || null,
    [editingSectionId, hubData]
  );

  const editingStandardSection = isStandardKnowledgeSection(editingSection);

  const editableSections = useMemo(
    () => (hubData?.sections || []).filter((section) => !isSystemKnowledgeSection(section)),
    [hubData]
  );

  const allQuestions = useMemo(() => {
    const questionMap = new Map();
    (hubData?.sections || []).forEach((section) => {
      (section.questions || []).forEach((question) => {
        if (!questionMap.has(question.id)) {
          questionMap.set(question.id, question);
        }
      });
    });
    (hubData?.orphanQuestions || []).forEach((question) => {
      if (!questionMap.has(question.id)) {
        questionMap.set(question.id, question);
      }
    });
    return Array.from(questionMap.values());
  }, [hubData]);

  const filteredQuestions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return allQuestions;
    return allQuestions.filter((item) =>
      `${item.question} ${item.answer}`.toLowerCase().includes(query)
    );
  }, [allQuestions, deferredSearch]);

  const suggestedQuestions = useMemo(() => {
    const seen = new Set();
    return (hubData?.suggestedQuestions || []).filter((item) => {
      const normalized = `${item?.question || ""}`.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }, [hubData]);

  const filteredSuggestedQuestions = useMemo(() => {
    const normalizedQuery = chatQuestion.trim().toLowerCase();
    if (!normalizedQuery) {
      return suggestedQuestions.slice(0, 6);
    }

    return suggestedQuestions
      .filter((item) => item.question.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [chatQuestion, suggestedQuestions]);

  const hasExactSuggestedQuestion = useMemo(() => {
    const normalizedQuery = chatQuestion.trim().toLowerCase();
    if (!normalizedQuery) return false;
    return suggestedQuestions.some(
      (item) => item.question.trim().toLowerCase() === normalizedQuery
    );
  }, [chatQuestion, suggestedQuestions]);

  function toggleSection(sectionId) {
    setOpenSectionIds((previous) =>
      previous.includes(sectionId)
        ? previous.filter((id) => id !== sectionId)
        : [...previous, sectionId]
    );
  }

  function ensureSectionOpen(sectionId) {
    if (!sectionId) return;
    setOpenSectionIds((previous) =>
      previous.includes(sectionId) ? previous : [...previous, sectionId]
    );
  }

  function toggleQuestion(questionId) {
    setOpenQuestionIds((previous) =>
      previous.includes(questionId)
        ? previous.filter((id) => id !== questionId)
        : [...previous, questionId]
    );
  }

  function resetSectionComposer() {
    setSectionForm(EMPTY_SECTION_FORM);
    setEditingSectionId(null);
    setShowSectionForm(false);
  }

  function resetSourceEditor() {
    setEditingSourceId(null);
    setEditSourceForm(EMPTY_SOURCE_EDIT_FORM);
  }

  function resetQuestionComposer() {
    setQuestionForm(EMPTY_QUESTION_FORM);
    setEditingQuestionId(null);
    setInlineQuestionSectionId("");
    setShowQuestionForm(false);
  }

  async function handleSync() {
    if (!selectedHubId) return;
    setSyncing(true);
    setStatus(null);
    try {
      await syncKnowledgeHub(selectedHubId);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Knowledge reindexed from the current hub content." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleAskQuestion(questionOverride = "") {
    const question = (questionOverride || chatQuestion).trim();
    if (!selectedHubId || !question) return;

    setChatting(true);
    setStatus(null);
    setChatResult(null);
    setShowEvidence(false);
    try {
      const result = await askKnowledgeHubQuestion({
        hubId: selectedHubId,
        question,
      });
      setChatQuestion(question);
      setShowQuestionPicker(false);
      setShowEvidence(false);
      setChatResult(result);
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setChatting(false);
    }
  }

  async function handleNoteSubmit(event) {
    event.preventDefault();
    if (!selectedHubId) return;
    setSavingSource(true);
    setStatus(null);
    try {
      await createManualKnowledgeSource(selectedHubId, noteForm);
      setNoteForm(EMPTY_NOTE_FORM);
      setShowNoteForm(false);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Manual source saved and knowledge base refreshed." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSavingSource(false);
    }
  }

  async function handleUploadSubmit(event) {
    event.preventDefault();
    if (!selectedHubId || !uploadForm.file) return;
    setSavingSource(true);
    setStatus(null);
    try {
      await uploadKnowledgeSource(selectedHubId, uploadForm);
      setUploadForm(EMPTY_UPLOAD_FORM);
      setShowUploadForm(false);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Source uploaded and knowledge base refreshed." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSavingSource(false);
    }
  }

  async function handleDeleteSource(sourceId) {
    if (!selectedHubId || !sourceId) return;
    if (!window.confirm("Are you sure you want to delete this source? The knowledge base will be refreshed immediately after deletion.")) return;

    setDeletingSourceId(sourceId);
    setStatus(null);
    try {
      await deleteKnowledgeSource(selectedHubId, sourceId);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Source deleted and knowledge base refreshed." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setDeletingSourceId(null);
    }
  }

  async function handleRefreshSources() {
    if (!selectedHubId) return;
    setRefreshingSources(true);
    setStatus(null);
    try {
      await refreshKnowledgeSystemContext(selectedHubId);
      await loadHub(selectedHubId);
      setStatus({
        type: "success",
        text: "System snapshots refreshed from current property and admin data.",
      });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setRefreshingSources(false);
    }
  }

  function startSourceEdit(source) {
    if (!source || source.source_type !== "manual_note") return;
    setEditingSourceId(source.id);
    setEditSourceForm({
      title: source.title || "",
      description: source.description || "",
      contentText: source.content_text || "",
    });
  }

  async function handleSourceUpdate(event) {
    event.preventDefault();
    if (!selectedHubId || !editingSourceId) return;
    setSavingSource(true);
    setStatus(null);
    try {
      await updateManualKnowledgeSource(selectedHubId, editingSourceId, editSourceForm);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Source updated and knowledge base refreshed." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSavingSource(false);
    }
  }

  async function handleSectionSubmit(event) {
    event.preventDefault();
    if (!selectedHubId) return;
    setSavingSection(true);
    setStatus(null);
    try {
      await saveKnowledgeSection(selectedHubId, sectionForm);
      resetSectionComposer();
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Section saved. Run Sync knowledge to refresh embeddings." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSavingSection(false);
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (!selectedHubId) return;
    setSavingQuestion(true);
    setStatus(null);
    try {
      await saveKnowledgeQuestion(selectedHubId, questionForm);
      resetQuestionComposer();
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Q&A saved. Run Sync knowledge to refresh embeddings." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDeleteSection(section) {
    if (!selectedHubId || !section?.id) return;
    const questionCount = (section.questions || []).length;
    const confirmationText = questionCount
      ? `Delete "${section.title}" and its ${questionCount} attached Q&A item${questionCount === 1 ? "" : "s"}? This removes them from live answers immediately.`
      : `Delete "${section.title}"? This removes it from live answers immediately.`;
    if (!window.confirm(confirmationText)) return;

    setDeletingSectionId(section.id);
    setStatus(null);
    try {
      const result = await deleteKnowledgeSection(selectedHubId, section.id);
      resetSectionComposer();
      resetQuestionComposer();
      await loadHub(selectedHubId);
      const deletedCount = result?.deletedQuestionIds?.length || 0;
      setStatus({
        type: "success",
        text: deletedCount
          ? `Section deleted with ${deletedCount} attached Q&A item${deletedCount === 1 ? "" : "s"}.`
          : "Section deleted.",
      });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setDeletingSectionId(null);
    }
  }

  async function handleAcceptSectionSuggestion(section) {
    if (!selectedHubId || !section?.id) return;
    setActingOnSuggestionId(section.id);
    setStatus(null);
    try {
      await acceptKnowledgeSectionSuggestion(selectedHubId, section.id);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Suggested section edit accepted." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setActingOnSuggestionId(null);
    }
  }

  async function handleDismissSectionSuggestion(section) {
    if (!selectedHubId || !section?.id) return;
    setActingOnSuggestionId(section.id);
    setStatus(null);
    try {
      await dismissKnowledgeSectionSuggestion(selectedHubId, section.id);
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Suggested section edit dismissed." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setActingOnSuggestionId(null);
    }
  }

  async function handleDeleteQuestion(question) {
    if (!selectedHubId || !question?.id) return;
    if (!window.confirm(`Delete the Q&A "${question.question}"? This removes it from live answers immediately.`)) {
      return;
    }

    setDeletingQuestionId(question.id);
    setStatus(null);
    try {
      await deleteKnowledgeQuestion(selectedHubId, question.id);
      resetQuestionComposer();
      await loadHub(selectedHubId);
      setStatus({ type: "success", text: "Q&A deleted." });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setDeletingQuestionId(null);
    }
  }

  function startSectionEdit(section = null) {
    if (section && isSystemKnowledgeSection(section)) {
      setStatus({
        type: "error",
        text: "Source-preserved system sections are read-only. Update the sources to refresh them.",
      });
      return;
    }

    resetQuestionComposer();
    setSectionForm(
      section
        ? {
          sectionId: section.id,
          title: section.title || "",
          summary: section.summary || "",
          contentMarkdown: section.content_markdown || "",
          displayOrder: section.display_order || 0,
        }
        : EMPTY_SECTION_FORM
    );

    if (section) {
      ensureSectionOpen(section.id);
      setEditingSectionId(section.id);
      setShowSectionForm(false);
      return;
    }

    setEditingSectionId(null);
    setShowSectionForm(true);
  }

  function startQuestionEdit(question = null, sectionId = "") {
    if (sectionId) {
      const targetSection = (hubData?.sections || []).find((section) => section.id === sectionId);
      if (targetSection && isSystemKnowledgeSection(targetSection)) {
        setStatus({
          type: "error",
          text: "Q&A cannot be attached to the source-preserved system appendix.",
        });
        return;
      }
    }

    resetSectionComposer();
    setQuestionForm(
      question
        ? {
          questionId: question.id,
          sectionId: question.section_id || sectionId || "",
          question: question.question || "",
          answer: question.answer || "",
          displayOrder: question.display_order || 0,
        }
        : {
          ...EMPTY_QUESTION_FORM,
          sectionId,
        }
    );

    if (question) {
      const nextSectionId = question.section_id || sectionId || "";
      ensureSectionOpen(nextSectionId);
      setOpenQuestionIds((previous) =>
        previous.includes(question.id) ? previous : [...previous, question.id]
      );
      setEditingQuestionId(question.id);
      setInlineQuestionSectionId(nextSectionId);
      setShowQuestionForm(false);
      return;
    }

    if (sectionId) {
      ensureSectionOpen(sectionId);
      setEditingQuestionId(null);
      setInlineQuestionSectionId(sectionId);
      setShowQuestionForm(false);
      return;
    }

    setEditingQuestionId(null);
    setInlineQuestionSectionId("");
    setShowQuestionForm(true);
  }

  return (
    <AdminLayout
      title="Knowledge Hub"
      subtitle="Preserved sources, property-specific knowledge, and admin-only AI retrieval."
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Hospitality knowledge orchestration</p>
            <h2>General and property hubs stay grounded in preserved sources.</h2>
            <p className={styles.heroText}>
              Upload files, add manual notes, and let Gemini suggest source-backed edits for
              existing sections. Admins decide what gets accepted.
            </p>
          </div>
          <div className={styles.heroControls}>
            <label className={styles.selectLabel}>
              Knowledge scope
              <select
                value={selectedHubId}
                onChange={(event) => {
                  setSelectedHubId(event.target.value);
                  setChatResult(null);
                  setShowEvidence(false);
                  loadHub(event.target.value);
                }}
                disabled={loadingHubs}
              >
                {hubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.scope_type === "general"
                      ? "General Knowledge Base"
                      : hub.property?.name || hub.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={styles.syncButton}
              onClick={handleSync}
              disabled={!selectedHubId || syncing || loadingHub}
            >
              {syncing ? "Syncing..." : "Sync knowledge"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={handleRefreshSources}
              disabled={!selectedHubId || refreshingSources || loadingHub}
              title="Refresh all system snapshots from original property data"
            >
              <FaSyncAlt
                className={refreshingSources ? styles.spinning : ""}
                size={14}
                style={{ marginRight: "10px" }}
              />
              {refreshingSources ? "Refreshing sources..." : "Refresh sources"}
            </button>
          </div>
        </section>

        {status ? (
          <div
            className={`${styles.statusBanner} ${status.type === "error" ? styles.statusError : styles.statusSuccess
              }`}
          >
            {status.text}
          </div>
        ) : null}

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span>Hub</span>
            <strong>
              {selectedHub?.scope_type === "general"
                ? "General Knowledge Base"
                : selectedHub?.property?.name || selectedHub?.title || "Loading"}
            </strong>
          </div>
          <div className={styles.statCard}>
            <span>Sync status</span>
            <strong>{hubData?.stats?.syncStatus || "Loading"}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Sections</span>
            <strong>{hubData?.stats?.sectionCount ?? 0}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Sources</span>
            <strong>{hubData?.stats?.sourceCount ?? 0}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Last synced</span>
            <strong>{formatDateLabel(hubData?.stats?.lastSyncedAt)}</strong>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {selectedHub?.scope_type !== "general" ? (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Ask the AI</h3>
                    <p>Query the active RAG context that admins will use for answers.</p>
                  </div>
                </div>

                <div className={styles.askComposer}>
                  <div className={styles.questionPicker}>
                    <input
                      className={styles.textInput}
                      value={chatQuestion}
                      onChange={(event) => {
                        setChatQuestion(event.target.value);
                        setShowQuestionPicker(true);
                      }}
                      onFocus={() => setShowQuestionPicker(true)}
                      onBlur={() => {
                        setTimeout(() => setShowQuestionPicker(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAskQuestion();
                        }
                      }}
                      placeholder="Search saved prompts or ask a custom question..."
                    />
                    {showQuestionPicker &&
                      (filteredSuggestedQuestions.length || chatQuestion.trim()) ? (
                      <div className={styles.suggestionDropdown}>
                        {filteredSuggestedQuestions.length ? (
                          <div className={styles.suggestionGroup}>
                            <span className={styles.suggestionLabel}>Saved prompts</span>
                            {filteredSuggestedQuestions.map((item) => (
                              <button
                                key={item.id}
                                className={styles.suggestionItem}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setChatQuestion(item.question);
                                  setShowQuestionPicker(false);
                                }}
                              >
                                {item.question}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {chatQuestion.trim() && !hasExactSuggestedQuestion ? (
                          <button
                            className={`${styles.suggestionItem} ${styles.customSuggestion}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setShowQuestionPicker(false)}
                          >
                            <span className={styles.customSuggestionLabel}>Custom question</span>
                            <span>{chatQuestion.trim()}</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <p className={styles.askHint}>
                      Pick a saved prompt from the dropdown or keep typing to ask a custom
                      question.
                    </p>
                  </div>

                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleAskQuestion()}
                    disabled={!chatQuestion.trim() || chatting}
                  >
                    {chatting ? "Thinking..." : "Ask question"}
                  </button>
                </div>

                {chatResult ? (
                  <div className={styles.chatResult}>
                    <h4>Answer</h4>
                    <p>{chatResult.answer}</p>

                    <div className={styles.answerActions}>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => setShowEvidence((previous) => !previous)}
                      >
                        {showEvidence
                          ? "Hide sources"
                          : `Show sources (${chatResult.citations?.length || 0})`}
                      </button>
                    </div>

                    {showEvidence && (chatResult.citations || []).length ? (
                      <div className={styles.evidenceList}>
                        {chatResult.citations.map((item) => (
                          <article key={item.key} className={styles.evidenceCard}>
                            <div className={styles.evidenceHeader}>
                              <div>
                                <strong>{formatEvidenceTitle(item)}</strong>
                                <p>
                                  {formatEvidenceType(item.chunkType)}
                                  {item.source?.source_type
                                    ? ` • ${item.source.source_type}`
                                    : ""}
                                </p>
                              </div>
                              <span className={styles.sourceBadge}>
                                {Math.round((item.similarity || 0) * 100)}% match
                              </span>
                            </div>
                            {item.excerpt ? (
                              <p className={styles.evidenceExcerpt}>{item.excerpt}</p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

              </section>
            ) : null}

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Sources ({hubData?.sources?.length || 0})</h3>
                  <p>Original files and notes are preserved and used for refreshes.</p>
                </div>
              </div>

              <div className={styles.inlineActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setShowAddSource((previous) => !previous);
                  }}
                >
                  {showAddSource ? "Close" : "Add source"}
                </button>
              </div>

              {showAddSource ? (
                <div style={{ marginTop: "20px" }}>
                  <div className={styles.sourceTabs}>
                    <button
                      className={`${styles.sourceTab} ${sourceTab === "upload" ? styles.activeSourceTab : ""}`}
                      onClick={() => setSourceTab("upload")}
                    >
                      File upload
                    </button>
                    <button
                      className={`${styles.sourceTab} ${sourceTab === "text" ? styles.activeSourceTab : ""}`}
                      onClick={() => setSourceTab("text")}
                    >
                      Paste text
                    </button>
                  </div>

                  {sourceTab === "text" ? (
                    <form className={styles.formCard} onSubmit={handleNoteSubmit}>
                      <input
                        className={styles.textInput}
                        value={noteForm.title}
                        onChange={(event) =>
                          setNoteForm((previous) => ({ ...previous, title: event.target.value }))
                        }
                        placeholder="Source title"
                        required
                      />
                      <textarea
                        className={styles.textArea}
                        value={noteForm.description}
                        onChange={(event) =>
                          setNoteForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Short description"
                        rows={2}
                      />
                      <textarea
                        className={styles.textArea}
                        value={noteForm.contentText}
                        onChange={(event) =>
                          setNoteForm((previous) => ({
                            ...previous,
                            contentText: event.target.value,
                          }))
                        }
                        placeholder="Paste hospitality knowledge, house rules, vendor notes, troubleshooting details, etc."
                        rows={7}
                        required
                      />
                      <button className={styles.primaryButton} disabled={savingSource}>
                        {savingSource ? "Saving..." : "Add source"}
                      </button>
                    </form>
                  ) : (
                    <form className={styles.formCard} onSubmit={handleUploadSubmit}>
                      <input
                        className={styles.textInput}
                        value={uploadForm.title}
                        onChange={(event) =>
                          setUploadForm((previous) => ({ ...previous, title: event.target.value }))
                        }
                        placeholder="Optional display title"
                      />
                      <textarea
                        className={styles.textArea}
                        value={uploadForm.description}
                        onChange={(event) =>
                          setUploadForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Short description"
                        rows={2}
                      />
                      <input
                        className={styles.fileInput}
                        type="file"
                        accept=".pdf,.txt,.md,.markdown,.json,.csv,.html,.xml,.yml,.yaml"
                        onChange={(event) =>
                          setUploadForm((previous) => ({
                            ...previous,
                            file: event.target.files?.[0] || null,
                          }))
                        }
                        required
                      />
                      <button className={styles.primaryButton} disabled={savingSource}>
                        {savingSource ? "Uploading..." : "Upload source"}
                      </button>
                    </form>
                  )}
                </div>
              ) : null}

              <div className={styles.sourceList}>
                {(hubData?.sources || []).map((source) => {
                  const isManualTextSource = source.source_type === "manual_note";
                  const isSystemSnapshot = source.source_type === "system_snapshot";
                  const isEditingSource = editingSourceId === source.id;
                  const sourcePreview = truncateSourcePreview(source.content_text);
                  const sourceTimestamp = getSourceTimestamp(source);

                  return (
                    <article key={source.id} className={styles.sourceCard}>
                      <div className={styles.sourceHeader}>
                        <div>
                          <strong>{source.title}</strong>
                          <p>{source.description || source.source_type}</p>
                        </div>
                        <div className={styles.sourceActions}>
                          <span className={styles.sourceBadge}>{source.source_type}</span>
                          {isManualTextSource ? (
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={() =>
                                isEditingSource ? resetSourceEditor() : startSourceEdit(source)
                              }
                              disabled={savingSource}
                            >
                              {isEditingSource ? "Cancel" : "Edit"}
                            </button>
                          ) : null}
                          {!source.source_type?.startsWith("system_") && (
                            <button
                              type="button"
                              className={styles.deleteSourceButton}
                              onClick={() => handleDeleteSource(source.id)}
                              disabled={deletingSourceId === source.id}
                            >
                              {deletingSourceId === source.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isManualTextSource && !isEditingSource && sourcePreview ? (
                        <p className={styles.sourcePreview}>{sourcePreview}</p>
                      ) : null}
                      {isEditingSource ? (
                        <form className={styles.inlineSourceEditor} onSubmit={handleSourceUpdate}>
                          <label className={styles.fieldLabel}>
                            <span>Title</span>
                            <input
                              className={styles.textInput}
                              value={editSourceForm.title}
                              onChange={(event) =>
                                setEditSourceForm((previous) => ({
                                  ...previous,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Source title"
                              required
                            />
                          </label>
                          <label className={styles.fieldLabel}>
                            <span>Description</span>
                            <input
                              className={styles.textInput}
                              value={editSourceForm.description}
                              onChange={(event) =>
                                setEditSourceForm((previous) => ({
                                  ...previous,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="Short description"
                            />
                          </label>
                          <label className={styles.fieldLabel}>
                            <span>Source text</span>
                            <textarea
                              className={styles.textArea}
                              value={editSourceForm.contentText}
                              onChange={(event) =>
                                setEditSourceForm((previous) => ({
                                  ...previous,
                                  contentText: event.target.value,
                                }))
                              }
                              placeholder="Paste or edit the source text"
                              rows={8}
                              required
                            />
                          </label>
                          <div className={styles.formActions}>
                            <button className={styles.primaryButton} disabled={savingSource}>
                              {savingSource ? "Saving..." : "Save source"}
                            </button>
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={resetSourceEditor}
                              disabled={savingSource}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : null}
                      <small>
                        {sourceTimestamp.label} {formatDateLabel(sourceTimestamp.value)}
                      </small>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Knowledge for this scope</h3>
                  <p>
                    {STANDARD_KNOWLEDGE_SECTIONS.length} standard sections are fixed for every
                    knowledge base. Custom sections can be added manually.
                  </p>
                </div>
                <div className={styles.headerActions}>
                  <input
                    className={styles.searchInput}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sections..."
                  />
                  <button className={styles.secondaryButton} onClick={() => startSectionEdit()}>
                    Add custom section
                  </button>
                </div>
              </div>

              {showSectionForm ? (
                <form className={styles.formCard} onSubmit={handleSectionSubmit}>
                  <h4>{sectionForm.sectionId ? "Edit section" : "New custom section"}</h4>
                  <input
                    className={styles.textInput}
                    value={sectionForm.title}
                    onChange={(event) =>
                      setSectionForm((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Custom section title"
                    disabled={editingStandardSection}
                    required
                  />
                  <textarea
                    className={styles.textArea}
                    value={sectionForm.summary}
                    onChange={(event) =>
                      setSectionForm((previous) => ({ ...previous, summary: event.target.value }))
                    }
                    placeholder="Short section summary"
                    rows={2}
                  />
                  <textarea
                    className={styles.textArea}
                    value={sectionForm.contentMarkdown}
                    onChange={(event) =>
                      setSectionForm((previous) => ({
                        ...previous,
                        contentMarkdown: event.target.value,
                      }))
                    }
                    placeholder={"- Bullet point one\n- Bullet point two"}
                    rows={6}
                    required
                  />
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={resetSectionComposer}
                    >
                      Cancel
                    </button>
                    <button className={styles.primaryButton} disabled={savingSection}>
                      {savingSection ? "Saving..." : "Save section"}
                    </button>
                  </div>
                </form>
              ) : null}

              {loadingHub ? <div className={styles.loading}>Loading knowledge...</div> : null}

              {!loadingHub && !filteredSections.length ? (
                <div className={styles.emptyState}>No sections match your search.</div>
              ) : null}

              <div className={styles.sectionList}>
                {filteredSections.map((section) => {
                  const isOpen = openSectionIds.includes(section.id);
                  const sectionVerification = getVerificationStatus(section);
                  const isSystemSection = isSystemKnowledgeSection(section);
                  const isStandardSection = isStandardKnowledgeSection(section);
                  const suggestedEdit = getSuggestedSectionEdit(section);
                  const showSuggestedEdit = Boolean(suggestedEdit);
                  const isSuggestionActionPending = actingOnSuggestionId === section.id;
                  return (
                    <article key={section.id} className={styles.sectionCard}>
                      <button
                        className={styles.sectionHeader}
                        onClick={() => toggleSection(section.id)}
                      >
                        <div>
                          <h4>{section.title}</h4>
                          <p>{section.summary || "Operational section"}</p>
                        </div>
                        <div className={styles.sectionMeta}>
                          <span>{section.source_items?.length || 0} sources</span>
                          <span
                            className={`${styles.verificationBadge} ${styles[verificationClassName(sectionVerification)]}`}
                          >
                            {formatVerificationLabel(sectionVerification)}
                          </span>
                          {showSuggestedEdit ? (
                            <span className={styles.suggestedEditBadge}>Suggested edits</span>
                          ) : null}
                          {isStandardSection ? (
                            <span className={styles.standardBadge}>Standard</span>
                          ) : null}
                        </div>
                      </button>

                      {isOpen ? (
                        <div className={styles.sectionBody}>
                          {editingSectionId === section.id ? (
                            <form className={styles.formCard} onSubmit={handleSectionSubmit}>
                              <h4>Edit section</h4>
                              <input
                                className={styles.textInput}
                                value={sectionForm.title}
                                onChange={(event) =>
                                  setSectionForm((previous) => ({
                                    ...previous,
                                    title: event.target.value,
                                  }))
                                }
                                placeholder="Section title"
                                disabled={editingStandardSection}
                                required
                              />
                              <textarea
                                className={styles.textArea}
                                value={sectionForm.summary}
                                onChange={(event) =>
                                  setSectionForm((previous) => ({
                                    ...previous,
                                    summary: event.target.value,
                                  }))
                                }
                                placeholder="Short section summary"
                                rows={2}
                              />
                              <textarea
                                className={styles.textArea}
                                value={sectionForm.contentMarkdown}
                                onChange={(event) =>
                                  setSectionForm((previous) => ({
                                    ...previous,
                                    contentMarkdown: event.target.value,
                                  }))
                                }
                                placeholder={"- Bullet point one\n- Bullet point two"}
                                rows={6}
                                required
                              />
                              <div className={styles.formActions}>
                                <button
                                  type="button"
                                  className={styles.ghostButton}
                                  onClick={resetSectionComposer}
                                >
                                  Cancel
                                </button>
                                <button
                                  className={styles.primaryButton}
                                  disabled={savingSection}
                                >
                                  {savingSection ? "Saving..." : "Save section"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className={styles.sectionBlock}>
                                {section.content_markdown ? (
                                  <div className={styles.sectionSummaryContent}>
                                    {renderKnowledgeContent(section.content_markdown)}
                                  </div>
                                ) : (
                                  <p className={styles.sectionSummaryText}>
                                    {section.summary || "No content available for this section."}
                                  </p>
                                )}
                              </div>

                              {showSuggestedEdit ? (
                                <div className={styles.suggestedEditCard}>
                                  <div className={styles.sectionBlockHeader}>
                                    <span className={styles.sectionBlockEyebrow}>
                                      Suggested edits
                                    </span>
                                    <span className={styles.sectionBlockCount}>
                                      {formatDateLabel(suggestedEdit.generated_at)}
                                    </span>
                                  </div>
                                  <p className={styles.suggestedEditNote}>
                                    This edit is not applied automatically. Accept it to update the
                                    section, or dismiss it to keep the current content.
                                  </p>
                                  {suggestedEdit.title &&
                                    suggestedEdit.title.trim() !== section.title.trim() ? (
                                    <p className={styles.suggestedEditTitle}>
                                      Suggested title: {suggestedEdit.title}
                                    </p>
                                  ) : null}
                                  {suggestedEdit.content_markdown ? (
                                    <div className={styles.sectionSummaryContent}>
                                      {renderKnowledgeContent(suggestedEdit.content_markdown)}
                                    </div>
                                  ) : (
                                    <p className={styles.sectionSummaryText}>
                                      {suggestedEdit.summary}
                                    </p>
                                  )}
                                  {(suggestedEdit.source_items || []).length ? (
                                    <div className={styles.citationRow}>
                                      {suggestedEdit.source_items.map((item) => (
                                        <span key={item.id} className={styles.citationChip}>
                                          {item.title}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <div className={styles.inlineActions}>
                                    <button
                                      type="button"
                                      className={styles.primaryButton}
                                      onClick={() => handleAcceptSectionSuggestion(section)}
                                      disabled={isSuggestionActionPending}
                                    >
                                      {isSuggestionActionPending ? "Saving..." : "Accept suggestion"}
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.ghostButton}
                                      onClick={() => handleDismissSectionSuggestion(section)}
                                      disabled={isSuggestionActionPending}
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {!isSystemSection ? (
                                <div className={styles.inlineActions}>
                                  <button
                                    type="button"
                                    className={styles.ghostButton}
                                    onClick={() => startSectionEdit(section)}
                                    disabled={deletingSectionId === section.id}
                                  >
                                    Edit section
                                  </button>
                                  {!isStandardSection ? (
                                    <button
                                      type="button"
                                      className={styles.deleteButton}
                                      onClick={() => handleDeleteSection(section)}
                                      disabled={deletingSectionId === section.id}
                                    >
                                      {deletingSectionId === section.id
                                        ? "Deleting..."
                                        : "Delete section"}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}

                              {(section.source_items || []).length ? (
                                <div className={styles.citationRow}>
                                  {section.source_items.map((item) => (
                                    <span key={item.id} className={styles.citationChip}>
                                      {item.title}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default KnowledgeHubManager;
