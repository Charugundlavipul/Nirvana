import { adminRequest } from "./adminApi";

export const getHrSummary = () => adminRequest("/api/admin/hr");
export const getPeople = () => adminRequest("/api/admin/hr?view=people");
export const getPayroll = () => adminRequest("/api/admin/hr?view=payroll");
export const revealBank = (userId) => adminRequest(`/api/admin/hr?view=bank${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`);

export const hrAction = (action, payload = {}) => adminRequest("/api/admin/hr", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action, ...payload }),
});

export async function downloadPaystub(paystub) {
  const response = await adminRequest(`/api/admin/hr/paystubs/${paystub.id}`, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${paystub.paystub_number || "paystub"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadPayrollZip(run, filename) {
  const runId = typeof run === "object" ? run.id : run;
  const defaultName = typeof run === "object"
    ? `Payroll_${run.period_start}_to_${run.period_end}.zip`
    : `payroll_${runId}.zip`;
  const response = await adminRequest(`/api/admin/hr/payroll/${runId}/zip`, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || defaultName;
  link.click();
  URL.revokeObjectURL(url);
}

