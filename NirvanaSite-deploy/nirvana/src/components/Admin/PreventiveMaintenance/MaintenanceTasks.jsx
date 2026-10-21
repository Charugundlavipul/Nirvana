import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheck, FaDownload, FaExclamationTriangle, FaFileCsv, FaHistory, FaRedo, FaUndo } from "react-icons/fa";
import MaintenanceShell from "./MaintenanceShell";
import styles from "./Maintenance.module.css";
import { completeMaintenanceTask, downloadMaintenanceAttachment, downloadMaintenanceExport, getMaintenanceWorkspace, maintenanceAction } from "../../../lib/preventiveMaintenanceApi";
import { MAINTENANCE_STATUS, recurrenceLabel, todayDateString } from "../../../lib/preventiveMaintenance";

const labelEvent = (value) => String(value || "").replace(/_/g, " ");
const dateTime = (value) => value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

function Modal({ mode, schedule, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ completedOn: todayDateString(), note: "", newDueOn: schedule.current_due_on, reason: "", files: [] });
  const title = mode === "complete" ? "Mark task as done" : mode === "due" ? "Update due date" : "Mark completion as undone";
  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="maintenance-modal-title">
      <h2 id="maintenance-modal-title">{title}</h2><p className={styles.muted}>{schedule.task?.name} · {schedule.property?.name}</p>
      <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
        {mode === "complete" && <><div className={styles.field}><label>Completion date</label><input className={styles.input} type="date" value={form.completedOn} onChange={(e) => setForm({ ...form, completedOn: e.target.value })} required /></div><div className={styles.field}><label>Completion note *</label><textarea className={styles.textarea} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Describe the work completed" required /></div><div className={styles.field}><label>Attachments (optional, up to 5)</label><input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => setForm({ ...form, files: [...e.target.files].slice(0, 5) })} /><span className={styles.muted}>Images or PDF, maximum 10 MB each.</span></div></>}
        {mode === "due" && <><div className={styles.field}><label>Current due date</label><input className={styles.input} value={schedule.current_due_on} disabled /></div><div className={styles.field}><label>New due date</label><input className={styles.input} type="date" value={form.newDueOn} onChange={(e) => setForm({ ...form, newDueOn: e.target.value })} required /></div><div className={styles.field}><label>Reason *</label><textarea className={styles.textarea} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is the due date changing?" required /></div></>}
        {mode === "undo" && <><div className={styles.alert}>This restores the exact due date from before the latest completion: <strong>{schedule.completions.find((item) => !item.undone_at)?.due_on_snapshot}</strong>.</div><div className={styles.field}><label>Reason for undoing *</label><textarea className={styles.textarea} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Explain why this completion is being undone" required /></div></>}
        <div className={styles.modalActions}><button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={onClose}>Cancel</button><button className={styles.button} disabled={busy}>{busy ? "Saving…" : mode === "complete" ? "Mark done" : mode === "due" ? "Update date" : "Mark undone"}</button></div>
      </form>
    </section>
  </div>;
}

export default function MaintenanceTasks() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const [data, setData] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const load = async () => { const result = await getMaintenanceWorkspace(); setData(result); setSelectedPropertyId((current) => current || result.properties[0]?.id || ""); };
  useEffect(() => { load().catch((e) => setMessage({ type: "error", text: e.message })); }, []);
  const propertySchedules = useMemo(() => (data?.schedules || []).filter((item) => item.property_id === selectedPropertyId && (!statusFilter || item.status === statusFilter)), [data, selectedPropertyId, statusFilter]);
  const selectedProperty = data?.properties.find((item) => item.id === selectedPropertyId);
  const exclusionSet = useMemo(() => new Set((data?.exclusions || []).map((item) => `${item.catalog_task_id}:${item.property_id}`)), [data]);
  const missingCatalogTasks = useMemo(() => {
    if (!data || !selectedPropertyId) return [];
    const scheduledTaskIds = new Set(data.schedules.filter((item) => item.property_id === selectedPropertyId).map((item) => item.catalog_task_id));
    return data.catalog.filter((item) => item.is_active && !exclusionSet.has(`${item.id}:${selectedPropertyId}`) && !scheduledTaskIds.has(item.id));
  }, [data, selectedPropertyId, exclusionSet]);
  const propertyEvents = useMemo(() => (data?.events || []).filter((event) => event.property_id === selectedPropertyId), [data, selectedPropertyId]);
  const scheduleEventMap = useMemo(() => {
    const map = new Map();
    for (const event of data?.events || []) if (event.schedule_id) map.set(event.schedule_id, [...(map.get(event.schedule_id) || []), event]);
    return map;
  }, [data]);

  async function submitModal(form) {
    setBusy(true); setMessage(null);
    try {
      let result;
      if (modal.mode === "complete") result = await completeMaintenanceTask({ scheduleId: modal.schedule.id, completedOn: form.completedOn, note: form.note, files: form.files });
      if (modal.mode === "due") result = await maintenanceAction("update_due", { scheduleId: modal.schedule.id, newDueOn: form.newDueOn, reason: form.reason });
      if (modal.mode === "undo") result = await maintenanceAction("undo_completion", { scheduleId: modal.schedule.id, reason: form.reason });
      await load(); setModal(null);
      const warning = result?.attachmentWarnings?.length ? ` Some attachments could not be saved: ${result.attachmentWarnings.join("; ")}` : "";
      setMessage({ type: "success", text: `${modal.mode === "complete" ? "Task completed." : modal.mode === "due" ? "Due date updated." : "Completion undone and previous due date restored."}${warning}` });
    } catch (e) { setMessage({ type: "error", text: e.message }); } finally { setBusy(false); }
  }

  return <MaintenanceShell title="Maintenance Tasks" subtitle="Complete, reschedule, and review property maintenance">
    {message && <div className={`${styles.alert} ${message.type === "success" ? styles.success : ""}`}>{message.text}</div>}
    {!data ? <div className={`${styles.card} ${styles.loading}`}>Loading property tasks…</div> : <>
      <div className={styles.toolbar}><div><h2 className={styles.sectionTitle}>Choose a property</h2><span className={styles.muted}>{statusFilter ? `Showing ${MAINTENANCE_STATUS[statusFilter]?.label || statusFilter} tasks` : "The most urgent status is shown on each property."}</span></div></div>
      <div className={styles.propertyGrid}>{data.properties.map((property) => {
        const schedules = data.schedules.filter((item) => item.property_id === property.id);
        const urgent = schedules.filter((item) => item.status === "urgent").length;
        const overdue = schedules.filter((item) => item.status === "overdue").length;
        const scheduledTaskIds = new Set(schedules.map((item) => item.catalog_task_id));
        const missing = data.catalog.filter((item) => item.is_active && !exclusionSet.has(`${item.id}:${property.id}`) && !scheduledTaskIds.has(item.id)).length;
        const worst = overdue ? "overdue" : urgent ? "urgent" : schedules.some((item) => item.status === "upcoming") ? "upcoming" : missing ? "unscheduled" : "on_track";
        return <button key={property.id} className={`${styles.card} ${styles.propertyCard} ${selectedPropertyId === property.id ? styles.propertyCardActive : ""}`} onClick={() => setSelectedPropertyId(property.id)}>
          <div className={styles.propertyCardHeader}><div><h3>{property.name}</h3><span className={styles.muted}>{property.location || "Property"}</span></div><span className={`${styles.badge} ${styles[worst]}`}>{worst === "overdue" && <FaExclamationTriangle />} {MAINTENANCE_STATUS[worst].label}</span></div>
          <div className={styles.propertyCounts}><span>{schedules.length} scheduled</span><span>{missing} needed</span><span>{urgent} urgent</span><span>{overdue} overdue</span></div>
        </button>;
      })}</div>

      {selectedProperty && <section style={{ marginTop: 26 }}>
        <div className={styles.toolbar}><div><h2 className={styles.sectionTitle}>{selectedProperty.name}</h2><span className={styles.muted}>{propertySchedules.length} visible maintenance task{propertySchedules.length === 1 ? "" : "s"}</span></div><button className={styles.button} onClick={() => downloadMaintenanceExport(selectedProperty.id).catch((e) => setMessage({ type: "error", text: e.message }))}><FaFileCsv /> Export property history</button></div>
        <div className={styles.taskList}>{propertySchedules.map((schedule) => {
          const events = scheduleEventMap.get(schedule.id) || [];
          const latestActive = schedule.completions.find((item) => !item.undone_at);
          return <article className={`${styles.card} ${styles.taskCard}`} key={schedule.id}>
            <div className={styles.taskHeader}><div><h3>{schedule.task?.name || "Maintenance task"}</h3><span className={styles.muted}>{recurrenceLabel(schedule.recurrence_count, schedule.recurrence_unit)} · Due {schedule.current_due_on}</span></div><span className={`${styles.badge} ${styles[schedule.status]}`}>{schedule.status === "overdue" && <FaExclamationTriangle />} {MAINTENANCE_STATUS[schedule.status].label}</span></div>
            <div className={styles.taskActions}><button className={`${styles.button} ${styles.smallButton}`} onClick={() => setModal({ mode: "complete", schedule })}><FaCheck /> Mark as done</button>{data.canConfigure && <button className={`${styles.button} ${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setModal({ mode: "due", schedule })}><FaRedo /> Update due date</button>}{latestActive && <button className={`${styles.button} ${styles.dangerButton} ${styles.smallButton}`} onClick={() => setModal({ mode: "undo", schedule })}><FaUndo /> Mark as undone</button>}</div>
            <details className={styles.historyDetails}><summary><FaHistory /> View history ({events.length})</summary><div className={styles.timeline}>{events.map((event) => {
              const completion = event.completion_id ? schedule.completions.find((item) => item.id === event.completion_id) : null;
              return <div className={styles.timelineItem} key={event.id}><strong>{labelEvent(event.event_type)}</strong><span>{dateTime(event.created_at)} · {event.actor_name}{event.previous_due_on || event.new_due_on ? ` · ${event.previous_due_on || "—"} → ${event.new_due_on || "—"}` : ""}</span>{event.note && <p>{event.note}</p>}{completion?.attachments?.length > 0 && <div className={styles.attachments}>{completion.attachments.map((attachment) => <button className={styles.attachment} key={attachment.id} onClick={() => downloadMaintenanceAttachment(attachment)}><FaDownload /> {attachment.original_filename}</button>)}</div>}</div>;
            })}{!events.length && <div className={styles.empty}>No history yet.</div>}</div></details>
          </article>;
        })}{!propertySchedules.length && <div className={`${styles.card} ${styles.empty}`}>{statusFilter ? "No tasks for this property match the selected status." : "No maintenance schedules have been configured for this property."}</div>}</div>
        {(!statusFilter || statusFilter === "unscheduled") && missingCatalogTasks.length > 0 && <div className={`${styles.card} ${styles.cardPadding}`} style={{ marginTop: 18 }}>
          <div className={styles.toolbar} style={{ marginBottom: 10 }}><div><h3 className={styles.sectionTitle}>Schedules needed</h3><span className={styles.muted}>{missingCatalogTasks.length} catalog task{missingCatalogTasks.length === 1 ? " is" : "s are"} not configured for this property.</span></div><Link className={styles.button} to="/admin/preventive-maintenance/catalog">Open catalog</Link></div>
          <div className={styles.list}>{missingCatalogTasks.map((task) => <div className={styles.listItem} key={task.id}><div className={styles.listMain}><strong>{task.name}</strong><span>{task.description || "Recurrence has not been configured"}</span></div><span className={`${styles.badge} ${styles.unscheduled}`}>Not scheduled</span></div>)}</div>
        </div>}
        <details className={`${styles.card} ${styles.cardPadding}`} style={{ marginTop: 18 }}>
          <summary style={{ cursor: "pointer", color: "#424334", fontWeight: 800 }}><FaHistory /> Complete property history ({propertyEvents.length})</summary>
          <div className={styles.timeline}>{propertyEvents.map((event) => <div className={styles.timelineItem} key={event.id}><strong>{labelEvent(event.event_type)}</strong><span>{dateTime(event.created_at)} · {event.actor_name}{event.previous_due_on || event.new_due_on ? ` · ${event.previous_due_on || "—"} → ${event.new_due_on || "—"}` : ""}</span>{event.note && <p>{event.note}</p>}</div>)}{!propertyEvents.length && <div className={styles.empty}>No property history yet.</div>}</div>
        </details>
      </section>}
    </>}
    {modal && <Modal mode={modal.mode} schedule={modal.schedule} busy={busy} onClose={() => setModal(null)} onSubmit={submitModal} />}
  </MaintenanceShell>;
}
