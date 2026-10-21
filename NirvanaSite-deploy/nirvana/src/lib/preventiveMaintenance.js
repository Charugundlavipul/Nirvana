export const MAINTENANCE_UNITS = ["day", "week", "month", "year"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function todayDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDateString(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function addRecurrence(dateString, count, unit) {
  if (!isDateString(dateString)) throw new Error("A valid starting date is required.");
  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Recurrence must be a positive whole number.");
  if (!MAINTENANCE_UNITS.includes(unit)) throw new Error("Unsupported recurrence unit.");

  const date = new Date(`${dateString}T00:00:00Z`);
  if (unit === "day") date.setUTCDate(date.getUTCDate() + amount);
  if (unit === "week") date.setUTCDate(date.getUTCDate() + (amount * 7));
  if (unit === "month" || unit === "year") {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    if (unit === "month") date.setUTCMonth(date.getUTCMonth() + amount);
    if (unit === "year") date.setUTCFullYear(date.getUTCFullYear() + amount);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
  }
  return date.toISOString().slice(0, 10);
}

export function daysUntil(dateString, today = todayDateString()) {
  if (!isDateString(dateString) || !isDateString(today)) return null;
  return Math.round(
    (new Date(`${dateString}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000,
  );
}

export function getMaintenanceStatus(dueDate, today = todayDateString()) {
  const days = daysUntil(dueDate, today);
  if (days === null) return "unscheduled";
  if (days < 0) return "overdue";
  if (days <= 7) return "urgent";
  if (days <= 21) return "upcoming";
  return "on_track";
}

export function recurrenceLabel(count, unit) {
  const amount = Number(count);
  return `Every ${amount} ${unit}${amount === 1 ? "" : "s"}`;
}

export function latestCompletionDate(completions = [], baselineDate = "") {
  const dates = [
    baselineDate,
    ...completions.filter((item) => !item?.undone_at).map((item) => item?.completed_on),
  ].filter(isDateString);
  return dates.sort().at(-1) || "";
}

export function maintenanceScheduleChanged(schedule, draft) {
  if (!schedule) return true;

  return Number(draft?.recurrenceCount) !== Number(schedule.recurrence_count)
    || String(draft?.recurrenceUnit || "") !== String(schedule.recurrence_unit || "");
}

export const MAINTENANCE_STATUS = {
  overdue: { label: "Overdue", color: "purple" },
  urgent: { label: "Due within 7 days", color: "red" },
  upcoming: { label: "Due in 8–21 days", color: "orange" },
  on_track: { label: "On track", color: "green" },
  unscheduled: { label: "Not scheduled", color: "gray" },
};

export function normalizeTeams(value) {
  const allowed = new Set(["STR", "LTR", "Leadership"]);
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim()))]
    .filter((item) => allowed.has(item));
}
