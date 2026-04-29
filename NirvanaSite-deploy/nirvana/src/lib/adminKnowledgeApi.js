import { supabase } from "../supabaseClient";

async function getValidSession() {
  // First, try to get the current session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // If we have a valid session, return it immediately.
  if (!sessionError && session?.access_token) {
    return session;
  }

  // Session is missing or expired — attempt a silent refresh.
  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession?.access_token) {
    throw new Error("Admin session is required. Please log in again.");
  }

  return refreshedSession;
}

async function adminRequest(path, options = {}) {
  const session = await getValidSession();

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Admin request failed.");
  }

  return payload;
}

export async function fetchKnowledgeHubs() {
  return adminRequest("/api/admin/knowledge/hubs");
}

export async function fetchKnowledgeHub(hubId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}`);
}

export async function syncKnowledgeHub(hubId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sync`, {
    method: "POST",
  });
}

export async function refreshKnowledgeSystemContext(hubId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}`, {
    method: "POST",
  });
}

export async function createManualKnowledgeSource(hubId, payload) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "manual",
      ...payload,
    }),
  });
}

export async function uploadKnowledgeSource(hubId, payload) {
  const formData = new FormData();
  formData.set("mode", "upload");
  formData.set("title", payload.title || "");
  formData.set("description", payload.description || "");
  formData.set("file", payload.file);

  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sources`, {
    method: "POST",
    body: formData,
  });
}

export async function saveKnowledgeSection(hubId, payload) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeSection(hubId, sectionId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export async function acceptKnowledgeSectionSuggestion(hubId, sectionId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sections/${sectionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "accept_suggestion" }),
  });
}

export async function dismissKnowledgeSectionSuggestion(hubId, sectionId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sections/${sectionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "dismiss_suggestion" }),
  });
}

export async function saveKnowledgeQuestion(hubId, payload) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeQuestion(hubId, questionId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function askKnowledgeHubQuestion(payload) {
  return adminRequest("/api/admin/knowledge/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeSource(hubId, sourceId) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sources/${sourceId}`, {
    method: "DELETE",
  });
}

export async function updateManualKnowledgeSource(hubId, sourceId, payload) {
  return adminRequest(`/api/admin/knowledge/hubs/${hubId}/sources/${sourceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
