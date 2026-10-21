import React, { useEffect, useMemo, useState } from "react";
import { FaArchive, FaCheckCircle, FaChevronDown, FaPlus } from "react-icons/fa";
import MaintenanceShell from "./MaintenanceShell";
import styles from "./Maintenance.module.css";
import { getMaintenanceWorkspace, maintenanceAction } from "../../../lib/preventiveMaintenanceApi";
import { recurrenceLabel } from "../../../lib/preventiveMaintenance";

const blankSchedule = { baselineDate: "", recurrenceCount: 1, recurrenceUnit: "month" };

export default function MaintenanceCatalog() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);

  const load = async () => {
    const result = await getMaintenanceWorkspace();
    setData(result);
    const next = {};
    for (const schedule of result.schedules || []) {
      next[`${schedule.catalog_task_id}:${schedule.property_id}`] = {
        baselineDate: schedule.baseline_date || "",
        recurrenceCount: schedule.recurrence_count,
        recurrenceUnit: schedule.recurrence_unit,
      };
    }
    setDrafts(next);
  };
  useEffect(() => { load().catch((e) => setMessage({ type: "error", text: e.message })); }, []);
  const activeTasks = useMemo(() => (data?.catalog || []).filter((item) => item.is_active), [data]);
  const scheduleMap = useMemo(() => new Map((data?.schedules || []).map((item) => [`${item.catalog_task_id}:${item.property_id}`, item])), [data]);
  const setDraft = (key, patch) => setDrafts((current) => ({ ...current, [key]: { ...blankSchedule, ...(current[key] || {}), ...patch } }));

  async function createTask(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy("create"); setMessage(null);
    try {
      await maintenanceAction("create_catalog", form);
      setForm({ name: "", description: "" });
      await load();
      setMessage({ type: "success", text: "Maintenance task added to the catalog." });
    } catch (e) { setMessage({ type: "error", text: e.message }); } finally { setBusy(""); }
  }

  async function saveSchedule(taskId, propertyId) {
    const key = `${taskId}:${propertyId}`;
    const draft = { ...blankSchedule, ...(drafts[key] || {}) };
    setBusy(key); setMessage(null);
    try {
      await maintenanceAction("upsert_schedule", { taskId, propertyId, ...draft });
      await load();
      setMessage({ type: "success", text: "Property schedule saved." });
    } catch (e) { setMessage({ type: "error", text: e.message }); } finally { setBusy(""); }
  }

  async function archiveTask(task) {
    if (!window.confirm(`Archive “${task.name}”? Existing history will be preserved.`)) return;
    setBusy(`archive:${task.id}`); setMessage(null);
    try { await maintenanceAction("archive_catalog", { taskId: task.id }); await load(); setMessage({ type: "success", text: "Catalog task archived." }); }
    catch (e) { setMessage({ type: "error", text: e.message }); } finally { setBusy(""); }
  }

  return <MaintenanceShell title="Maintenance Catalog" subtitle="Create standard tasks and configure a recurrence for every property">
    {message && <div className={`${styles.alert} ${message.type === "success" ? styles.success : ""}`}>{message.text}</div>}
    {data?.canConfigure && <form className={`${styles.card} ${styles.formCard}`} onSubmit={createTask}>
      <div className={styles.field}><label>Preventive maintenance task name</label><input className={styles.input} value={form.name} maxLength={160} placeholder="e.g. Replace HVAC filters" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className={styles.field}><label>Description (optional)</label><input className={styles.input} value={form.description} maxLength={1000} placeholder="Short instructions or scope" onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <button className={styles.button} disabled={busy === "create"}><FaPlus /> {busy === "create" ? "Adding…" : "Add task"}</button>
    </form>}
    {!data ? <div className={`${styles.card} ${styles.loading}`}>Loading catalog…</div> : <div className={styles.catalogList}>
      {activeTasks.map((task) => {
        const configured = (data.properties || []).filter((property) => scheduleMap.has(`${task.id}:${property.id}`)).length;
        return <details className={`${styles.card} ${styles.catalogItem}`} key={task.id}>
          <summary className={styles.catalogSummary}>
            <div className={styles.summaryTitle}><strong>{task.name}</strong><span>{task.description || "No description"} · {configured} of {data.properties.length} properties configured</span></div>
            <span className={`${styles.badge} ${configured === data.properties.length ? styles.on_track : styles.unscheduled}`}>{configured === data.properties.length ? <><FaCheckCircle /> Ready</> : `${data.properties.length - configured} remaining`}</span>
            <FaChevronDown aria-hidden="true" />
          </summary>
          <div className={styles.propertyRows}>
            {(data.properties || []).map((property) => {
              const key = `${task.id}:${property.id}`;
              const schedule = scheduleMap.get(key);
              const draft = { ...blankSchedule, ...(drafts[key] || {}) };
              return <div className={styles.scheduleRow} key={property.id}>
                <div className={styles.propertyName}><strong>{property.name}</strong><span>{schedule ? `${recurrenceLabel(schedule.recurrence_count, schedule.recurrence_unit)} · Due ${schedule.current_due_on}` : "Schedule required"}</span></div>
                <div className={styles.field}><label>Starting/last completion</label><input className={styles.input} type="date" value={draft.baselineDate} disabled={!data.canConfigure} onChange={(e) => setDraft(key, { baselineDate: e.target.value })} /></div>
                <div className={styles.field}><label>Every</label><input className={styles.input} type="number" min="1" step="1" value={draft.recurrenceCount} disabled={!data.canConfigure} onChange={(e) => setDraft(key, { recurrenceCount: e.target.value })} /></div>
                <div className={styles.field}><label>Unit</label><select className={styles.select} value={draft.recurrenceUnit} disabled={!data.canConfigure} onChange={(e) => setDraft(key, { recurrenceUnit: e.target.value })}><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option><option value="year">Years</option></select></div>
                <div className={styles.propertyName}><span>Next due</span><strong>{schedule?.current_due_on || "After applying"}</strong></div>
                {data.canConfigure && <button type="button" className={`${styles.button} ${styles.smallButton}`} disabled={busy === key} onClick={() => saveSchedule(task.id, property.id)}>{busy === key ? "Saving…" : schedule ? "Update" : "Apply"}</button>}
              </div>;
            })}
            {data.canConfigure && <div className={styles.toolbar} style={{ marginTop: 14, marginBottom: 0 }}><span className={styles.muted}>Schedules take effect immediately; no approval is required.</span><button className={`${styles.button} ${styles.dangerButton} ${styles.smallButton}`} disabled={busy === `archive:${task.id}`} onClick={() => archiveTask(task)}><FaArchive /> Archive task</button></div>}
          </div>
        </details>;
      })}
      {!activeTasks.length && <div className={`${styles.card} ${styles.empty}`}>No maintenance tasks yet. Add the first catalog task above.</div>}
    </div>}
  </MaintenanceShell>;
}
