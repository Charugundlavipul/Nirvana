import { adminRequest } from "./adminApi";

export const getMaintenanceWorkspace = () => adminRequest("/api/admin/preventive-maintenance");

export const maintenanceAction = (action, payload = {}) => adminRequest("/api/admin/preventive-maintenance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action, ...payload }),
});

export const completeMaintenanceTask = async ({ scheduleId, completedOn, note, files = [] }) => {
  const form = new FormData();
  form.set("action", "complete");
  form.set("scheduleId", scheduleId);
  form.set("completedOn", completedOn);
  form.set("note", note);
  files.forEach((file) => form.append("files", file));
  return adminRequest("/api/admin/preventive-maintenance", { method: "POST", body: form });
};

async function download(path, fallbackName) {
  const response = await adminRequest(path, { raw: true });
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const downloadMaintenanceExport = (propertyId = "") =>
  download(`/api/admin/preventive-maintenance/export${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ""}`, "preventive-maintenance.csv");

export const downloadMaintenanceAttachment = (attachment) =>
  download(`/api/admin/preventive-maintenance/attachments/${attachment.id}`, attachment.original_filename || "attachment");
