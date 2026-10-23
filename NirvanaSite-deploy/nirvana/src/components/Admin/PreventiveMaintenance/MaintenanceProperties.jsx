import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaDownload, FaEdit, FaExclamationTriangle, FaFileCsv, FaPlus, FaTrashAlt } from "react-icons/fa";
import MaintenanceShell from "./MaintenanceShell";
import styles from "./Maintenance.module.css";
import { completeMaintenanceTask, downloadMaintenanceAttachment, downloadMaintenanceExport, getMaintenanceWorkspace, maintenanceAction } from "../../../lib/preventiveMaintenanceApi";
import { addRecurrence, MAINTENANCE_STATUS, recurrenceLabel, todayDateString } from "../../../lib/preventiveMaintenance";

const blankSchedule = { baselineDate: "", nextDueOn: "", recurrenceCount: 1, recurrenceUnit: "month" };

const dateLabel = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "";

const recordedAtLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return "an unknown date";
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

const activeCompletions = (schedule) => [...(schedule?.completions || [])]
  .filter((item) => !item.undone_at)
  .sort((a, b) => b.completed_on.localeCompare(a.completed_on) || b.created_at.localeCompare(a.created_at));

const calculatedDueDate = (draft) => {
  if (!draft.baselineDate) return "";
  try {
    return addRecurrence(draft.baselineDate, Number(draft.recurrenceCount), draft.recurrenceUnit);
  } catch {
    return "";
  }
};

const filters = [
  { key: "all", label: "All tasks" },
  { key: "urgent", label: "Near due", hint: "1–7 days" },
  { key: "upcoming", label: "Upcoming", hint: "8–21 days" },
  { key: "overdue", label: "Overdue", hint: "Past due" },
  { key: "recently_completed", label: "Recently completed", hint: "Last 30 days" },
  { key: "on_track", label: "On track", hint: "More than 21 days" },
  { key: "unscheduled", label: "Not scheduled", hint: "No due date" },
];

function CompletionModal({ mode, schedule, completion, busy, onClose, onSubmit }) {
  const editing = mode === "edit";
  const [form, setForm] = useState({
    completedOn: editing ? completion.completed_on : todayDateString(),
    note: editing ? completion.note : "",
    files: [],
  });

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="property-maintenance-modal-title">
      <h2 id="property-maintenance-modal-title">{editing ? "Edit completion" : "Record task completion"}</h2>
      <p className={styles.muted}>{schedule.task?.name} · {schedule.property?.name}</p>
      <form className={styles.modalForm} onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <div className={styles.field}><label>Completed on</label><input className={styles.input} type="date" value={form.completedOn} onChange={(event) => setForm({ ...form, completedOn: event.target.value })} required /></div>
        <div className={styles.field}><label>Note (optional)</label><textarea className={styles.textarea} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="What was completed?" /></div>
        {!editing && <div className={styles.field}><label>Attachments (optional, up to 5)</label><input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => setForm({ ...form, files: [...event.target.files].slice(0, 5) })} /><span className={styles.muted}>Images or PDF, maximum 10 MB each.</span></div>}
        <span className={styles.muted}>The next due date will be calculated from the latest completion date.</span>
        <div className={styles.modalActions}><button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={onClose}>Cancel</button><button className={styles.button} disabled={busy}>{busy ? "Saving…" : editing ? "Save completion" : "Record completion"}</button></div>
      </form>
    </section>
  </div>;
}

export default function MaintenanceProperties() {
  const [data, setData] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [configuringId, setConfiguringId] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState(blankSchedule);
  const [scheduleBusy, setScheduleBusy] = useState("");
  const [deletingCompletionId, setDeletingCompletionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => setData(await getMaintenanceWorkspace());
  useEffect(() => { load().catch((error) => setMessage({ type: "error", text: error.message })); }, []);
  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(null), 10000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const selectedProperty = data?.properties.find((item) => item.id === selectedPropertyId);
  const propertyRows = useMemo(() => {
    if (!data || !selectedPropertyId) return [];
    const scheduled = data.schedules
      .filter((item) => item.property_id === selectedPropertyId)
      .map((schedule) => ({ id: schedule.id, kind: "scheduled", schedule, task: schedule.task, status: schedule.status }));
    const scheduledTaskIds = new Set(scheduled.map((item) => item.schedule.catalog_task_id));
    const exclusions = new Set((data.exclusions || []).map((item) => `${item.catalog_task_id}:${item.property_id}`));
    const unscheduled = (data.catalog || [])
      .filter((task) => task.is_active && !scheduledTaskIds.has(task.id) && !exclusions.has(`${task.id}:${selectedPropertyId}`))
      .map((task) => ({ id: `unscheduled:${task.id}`, kind: "unscheduled", task, status: "unscheduled" }));

    return [...scheduled, ...unscheduled].sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "scheduled" ? -1 : 1;
      return (left.schedule?.current_due_on || "9999-12-31").localeCompare(right.schedule?.current_due_on || "9999-12-31")
        || (left.task?.name || "").localeCompare(right.task?.name || "");
    });
  }, [data, selectedPropertyId]);

  const recentCompletionRows = useMemo(() => {
    if (!data || !selectedPropertyId) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    return data.schedules
      .filter((schedule) => schedule.property_id === selectedPropertyId)
      .flatMap((schedule) => activeCompletions(schedule)
        .filter((completion) => completion.completed_on >= cutoffDate)
        .map((completion) => ({
          id: `completion:${completion.id}`,
          schedule,
          task: schedule.task,
          completion,
        })))
      .sort((left, right) => right.completion.completed_on.localeCompare(left.completion.completed_on)
        || right.completion.created_at.localeCompare(left.completion.created_at));
  }, [data, selectedPropertyId]);

  const filterCounts = useMemo(() => Object.fromEntries(filters.map(({ key }) => {
    if (key === "recently_completed") return [key, recentCompletionRows.length];
    return [key, propertyRows.filter((item) => key === "all" || item.status === key).length];
  })), [propertyRows, recentCompletionRows]);

  const visibleRows = useMemo(() => propertyRows.filter((item) => {
    if (activeFilter === "all") return true;
    return item.status === activeFilter;
  }), [activeFilter, propertyRows]);

  async function submitModal(form) {
    setBusy(true); setMessage(null);
    try {
      let result;
      if (modal.mode === "complete") result = await completeMaintenanceTask({ scheduleId: modal.schedule.id, completedOn: form.completedOn, note: form.note, files: form.files });
      if (modal.mode === "edit") result = await maintenanceAction("update_completion", { scheduleId: modal.schedule.id, completionId: modal.completion.id, completedOn: form.completedOn, note: form.note });
      await load();
      setModal(null);
      const warning = result?.attachmentWarnings?.length ? ` Some attachments could not be saved: ${result.attachmentWarnings.join("; ")}` : "";
      setMessage({ type: "success", text: `${modal.mode === "complete" ? "Completion recorded." : "Completion updated."} Next due date recalculated.${warning}` });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setBusy(false); }
  }

  function openScheduleEditor(item) {
    setConfiguringId(item.id);
    setScheduleDraft(item.schedule ? {
      baselineDate: "",
      nextDueOn: item.schedule.current_due_on || "",
      recurrenceCount: item.schedule.recurrence_count,
      recurrenceUnit: item.schedule.recurrence_unit,
    } : blankSchedule);
  }

  async function saveSchedule(item) {
    const draft = { ...blankSchedule, ...scheduleDraft };
    if (!item.schedule && !draft.baselineDate && !draft.nextDueOn) {
      setMessage({ type: "error", text: "Choose a next due date when no starting or last completion date is available." });
      return;
    }

    const key = `schedule:${item.id}`;
    setScheduleBusy(key); setMessage(null);
    try {
      await maintenanceAction("upsert_schedule", {
        taskId: item.task.id,
        propertyId: selectedPropertyId,
        ...draft,
      });
      await load();
      setConfiguringId("");
      setMessage({ type: "success", text: item.schedule ? "Maintenance schedule updated." : "Maintenance schedule created." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setScheduleBusy(""); }
  }

  async function deleteCompletion(schedule, completion) {
    if (!window.confirm(`Delete the completion recorded for ${dateLabel(completion.completed_on)}? The task's next due date will be recalculated.`)) return;
    setDeletingCompletionId(completion.id); setMessage(null);
    try {
      await maintenanceAction("delete_completion", {
        scheduleId: schedule.id,
        completionId: completion.id,
        reason: "Completion record deleted from history.",
      });
      await load();
      setMessage({ type: "success", text: "Completion record deleted. Next due date recalculated." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setDeletingCompletionId(""); }
  }

  return <MaintenanceShell title="Maintenance Properties" subtitle="Choose a property, then review its maintenance work in rows">
    {message && <div className={`${styles.alert} ${message.type === "success" ? styles.success : ""}`}>{message.text}</div>}
    {!data ? <div className={`${styles.card} ${styles.loading}`}>Loading properties…</div> : <>
      <section className={`${styles.card} ${styles.propertyPicker}`}>
        <div>
          <label htmlFor="maintenance-property">Property</label>
          <span>Select one property to see its catalog tasks, due work, and recent completions.</span>
        </div>
        <select id="maintenance-property" className={styles.propertySelect} value={selectedPropertyId} onChange={(event) => { setSelectedPropertyId(event.target.value); setActiveFilter("all"); setConfiguringId(""); }}>
          <option value="">Select a property…</option>
          {data.properties.map((property) => <option value={property.id} key={property.id}>{property.name}{property.location ? ` — ${property.location}` : ""}</option>)}
        </select>
      </section>

      {!selectedProperty && <div className={`${styles.card} ${styles.propertyPrompt}`}><strong>Choose a property to get started</strong><span>The maintenance rows and status options will appear here.</span></div>}

      {selectedProperty && <section className={styles.propertyWorkspace}>
        <div className={styles.toolbar}>
          <div><h2 className={styles.sectionTitle}>{selectedProperty.name}</h2><span className={styles.muted}>{propertyRows.length} catalog task{propertyRows.length === 1 ? "" : "s"} for this property</span></div>
          <button className={styles.button} onClick={() => downloadMaintenanceExport(selectedProperty.id).catch((error) => setMessage({ type: "error", text: error.message }))}><FaFileCsv /> Export completion log</button>
        </div>

        <div className={styles.statusFilterRow} role="tablist" aria-label="Filter property maintenance tasks">
          {filters.map((filter) => <button key={filter.key} type="button" role="tab" aria-selected={activeFilter === filter.key} className={`${styles.statusFilterButton} ${activeFilter === filter.key ? styles.statusFilterButtonActive : ""}`} onClick={() => setActiveFilter(filter.key)}>
            <span className={styles.statusFilterTop}><span>{filter.label}</span><strong>{filterCounts[filter.key]}</strong></span>
            {filter.hint && <small>{filter.hint}</small>}
          </button>)}
        </div>

        <div className={`${styles.card} ${styles.propertyTaskTable}`}>
          <div className={styles.propertyTaskHeader}>
            {activeFilter === "recently_completed" ? <><span>Task</span><span>Completed</span><span>Recorded by</span><span>Actions</span></> : <><span>Task</span><span>Schedule</span><span>Status</span><span>Actions</span></>}
          </div>
          {activeFilter === "recently_completed" && recentCompletionRows.map(({ id, schedule, task, completion }) => <article className={styles.propertyTaskRow} key={id}>
            <div className={styles.propertyTaskTop}>
              <div className={styles.flatRowMain}>
                <strong>{task?.name || "Maintenance task"}</strong>
                <span>{completion.note || task?.description || "No completion note"}</span>
                {completion.attachments?.length > 0 && <div className={styles.attachments}>{completion.attachments.map((attachment) => <button className={styles.attachment} key={attachment.id} onClick={() => downloadMaintenanceAttachment(attachment)}><FaDownload /> {attachment.original_filename}</button>)}</div>}
              </div>
              <div className={styles.scheduleSummary}><strong>{dateLabel(completion.completed_on)}</strong><span>{recurrenceLabel(schedule.recurrence_count, schedule.recurrence_unit)}</span></div>
              <div className={styles.scheduleSummary}><strong>{completion.completed_by_name || "Unknown user"}</strong><span>{recordedAtLabel(completion.created_at)}</span></div>
              <div className={styles.rowActions}>
                <button type="button" className={`${styles.button} ${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setModal({ mode: "edit", schedule, completion })}><FaEdit /> Edit</button>
                <button type="button" className={`${styles.button} ${styles.dangerButton} ${styles.smallButton}`} disabled={deletingCompletionId === completion.id} onClick={() => deleteCompletion(schedule, completion)}><FaTrashAlt /> {deletingCompletionId === completion.id ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </article>)}
          {visibleRows.map((item) => {
            const schedule = item.schedule;
            return <article className={styles.propertyTaskRow} key={item.id}>
              <div className={styles.propertyTaskTop}>
                <div className={styles.flatRowMain}>
                  <strong>{item.task?.name || "Maintenance task"}</strong>
                  <span>{item.task?.description || "No description"}</span>
                </div>
                <div className={styles.scheduleSummary}>{schedule ? <><strong>{recurrenceLabel(schedule.recurrence_count, schedule.recurrence_unit)}</strong><span>Due {dateLabel(schedule.current_due_on)}</span></> : <><strong>Schedule needed</strong><span>Configure this task for {selectedProperty.name}</span></>}</div>
                <div><span className={`${styles.badge} ${styles[item.status]}`}>{item.status === "overdue" && <FaExclamationTriangle />}{item.status === "on_track" && <FaCheckCircle />}{MAINTENANCE_STATUS[item.status].label}</span></div>
                <div className={styles.rowActions}>
                  {data.canConfigure && <button type="button" className={`${styles.button} ${styles.secondaryButton} ${styles.smallButton}`} onClick={() => configuringId === item.id ? setConfiguringId("") : openScheduleEditor(item)}><FaEdit /> {configuringId === item.id ? "Cancel" : schedule ? "Edit schedule" : "Configure"}</button>}
                  {schedule && <button className={`${styles.button} ${styles.smallButton}`} onClick={() => setModal({ mode: "complete", schedule })}><FaPlus /> Add record</button>}
                </div>
              </div>
              {configuringId === item.id && <div className={styles.scheduleEditor}>
                <div className={styles.scheduleEditorHeading}>
                  <div><strong>{schedule ? "Edit schedule" : "Set up schedule"}</strong><span>{schedule ? "Changing recurrence recalculates the next due date from the latest completion." : "Use a last completion date, or enter the first due date directly."}</span></div>
                </div>
                <div className={`${styles.scheduleEditorGrid} ${schedule ? styles.scheduleEditorGridCompact : ""}`}>
                  {!schedule && <div className={styles.field}><label>Starting/last completion</label><input className={styles.input} type="date" value={scheduleDraft.baselineDate} onChange={(event) => setScheduleDraft({ ...scheduleDraft, baselineDate: event.target.value })} /></div>}
                  <div className={styles.field}><label>Every</label><input className={styles.input} type="number" min="1" step="1" value={scheduleDraft.recurrenceCount} onWheel={(event) => event.currentTarget.blur()} onChange={(event) => setScheduleDraft({ ...scheduleDraft, recurrenceCount: event.target.value })} /></div>
                  <div className={styles.field}><label>Unit</label><select className={styles.select} value={scheduleDraft.recurrenceUnit} onChange={(event) => setScheduleDraft({ ...scheduleDraft, recurrenceUnit: event.target.value })}><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option><option value="year">Years</option></select></div>
                  {!schedule && <div className={styles.field}>
                    <label>Next due date</label>
                    <input className={styles.input} type="date" value={scheduleDraft.baselineDate ? calculatedDueDate(scheduleDraft) : scheduleDraft.nextDueOn} disabled={Boolean(scheduleDraft.baselineDate)} required={!scheduleDraft.baselineDate} onChange={(event) => setScheduleDraft({ ...scheduleDraft, nextDueOn: event.target.value })} />
                    <span className={styles.fieldHint}>{scheduleDraft.baselineDate ? "Calculated from the last completion" : "Required when there is no last completion date"}</span>
                  </div>}
                  <div className={styles.scheduleEditorActions}>
                    <button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={() => setConfiguringId("")}>Cancel</button>
                    <button type="button" className={styles.button} disabled={scheduleBusy === `schedule:${item.id}`} onClick={() => saveSchedule(item)}>{scheduleBusy === `schedule:${item.id}` ? "Saving…" : schedule ? "Update schedule" : "Create schedule"}</button>
                  </div>
                </div>
              </div>}
            </article>;
          })}
          {activeFilter === "recently_completed" && !recentCompletionRows.length && <div className={styles.empty}>No completions were recorded for {selectedProperty.name} in the last 30 days.</div>}
          {activeFilter !== "recently_completed" && !visibleRows.length && <div className={styles.empty}>No tasks match this status for {selectedProperty.name}.</div>}
        </div>
      </section>}
    </>}
    {modal && <CompletionModal mode={modal.mode} schedule={modal.schedule} completion={modal.completion} busy={busy} onClose={() => setModal(null)} onSubmit={submitModal} />}
  </MaintenanceShell>;
}
