import React, { useEffect, useMemo, useState } from "react";
import { FaArchive, FaEdit, FaListAlt, FaPlus } from "react-icons/fa";
import MaintenanceShell from "./MaintenanceShell";
import styles from "./Maintenance.module.css";
import { getMaintenanceWorkspace, maintenanceAction } from "../../../lib/preventiveMaintenanceApi";

export default function MaintenanceCatalog2() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingTask, setEditingTask] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);

  const load = async () => setData(await getMaintenanceWorkspace());
  useEffect(() => { load().catch((error) => setMessage({ type: "error", text: error.message })); }, []);

  const activeTasks = useMemo(() => (data?.catalog || []).filter((item) => item.is_active), [data]);
  const scheduleCounts = useMemo(() => {
    const counts = new Map();
    for (const schedule of data?.schedules || []) {
      counts.set(schedule.catalog_task_id, (counts.get(schedule.catalog_task_id) || 0) + 1);
    }
    return counts;
  }, [data]);

  async function createTask(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy("create"); setMessage(null);
    try {
      await maintenanceAction("create_catalog", form);
      setForm({ name: "", description: "" });
      await load();
      setMessage({ type: "success", text: "Maintenance task added to the catalog." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setBusy(""); }
  }

  async function updateTask(event) {
    event.preventDefault();
    if (!editingTask?.name.trim()) return;
    const key = `edit:${editingTask.id}`;
    setBusy(key); setMessage(null);
    try {
      await maintenanceAction("update_catalog", {
        taskId: editingTask.id,
        name: editingTask.name,
        description: editingTask.description,
      });
      await load();
      setEditingTask(null);
      setMessage({ type: "success", text: "Task name and description updated." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setBusy(""); }
  }

  async function archiveTask(task) {
    if (!window.confirm(`Archive “${task.name}”? Existing schedules and history will be preserved.`)) return;
    const key = `archive:${task.id}`;
    setBusy(key); setMessage(null);
    try {
      await maintenanceAction("archive_catalog", { taskId: task.id });
      await load();
      setMessage({ type: "success", text: "Catalog task archived." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setBusy(""); }
  }

  return <MaintenanceShell title="Maintenance Catalog" subtitle="A simple list of standard maintenance tasks">
    {message && <div className={`${styles.alert} ${message.type === "success" ? styles.success : ""}`}>{message.text}</div>}
    {data?.canConfigure && <form className={`${styles.card} ${styles.formCard}`} onSubmit={createTask}>
      <div className={styles.field}><label>Preventive maintenance task name</label><input className={styles.input} value={form.name} maxLength={160} placeholder="e.g. Replace HVAC filters" onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
      <div className={styles.field}><label>Description (optional)</label><input className={styles.input} value={form.description} maxLength={1000} placeholder="Short instructions or scope" onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
      <button className={styles.button} disabled={busy === "create"}><FaPlus /> {busy === "create" ? "Adding…" : "Add task"}</button>
    </form>}

    {!data ? <div className={`${styles.card} ${styles.loading}`}>Loading catalog…</div> : <section className={`${styles.card} ${styles.flatListCard}`}>
      <div className={styles.flatListHeading}>
        <div><h2 className={styles.sectionTitle}>Catalog items</h2><span className={styles.muted}>{activeTasks.length} active task{activeTasks.length === 1 ? "" : "s"}</span></div>
        <FaListAlt aria-hidden="true" />
      </div>
      <div className={styles.flatCatalogList}>
        {activeTasks.map((task) => <div className={styles.flatCatalogRow} key={task.id}>
          <div className={styles.catalogRowIcon}><FaListAlt aria-hidden="true" /></div>
          <div className={styles.flatRowMain}>
            <strong>{task.name}</strong>
            <span>{task.description || "No description"}</span>
          </div>
          <span className={styles.catalogUsage}>{scheduleCounts.get(task.id) || 0} scheduled</span>
          {data.canConfigure && <div className={styles.rowActions}>
            <button type="button" className={`${styles.button} ${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setEditingTask({ id: task.id, name: task.name, description: task.description || "" })}><FaEdit /> Edit</button>
            <button type="button" className={`${styles.button} ${styles.dangerButton} ${styles.smallButton}`} disabled={busy === `archive:${task.id}`} onClick={() => archiveTask(task)}><FaArchive /> Archive</button>
          </div>}
        </div>)}
        {!activeTasks.length && <div className={styles.empty}>No maintenance tasks yet. Add the first catalog item above.</div>}
      </div>
    </section>}

    {editingTask && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTask(null); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-catalog-2-task-title">
        <h2 id="edit-catalog-2-task-title">Edit task details</h2>
        <p className={styles.muted}>Schedules and maintenance history will remain unchanged.</p>
        <form className={styles.modalForm} onSubmit={updateTask}>
          <div className={styles.field}><label>Preventive maintenance task name</label><input className={styles.input} value={editingTask.name} maxLength={160} required autoFocus onChange={(event) => setEditingTask({ ...editingTask, name: event.target.value })} /></div>
          <div className={styles.field}><label>Description (optional)</label><textarea className={styles.textarea} value={editingTask.description} maxLength={1000} onChange={(event) => setEditingTask({ ...editingTask, description: event.target.value })} /></div>
          <div className={styles.modalActions}><button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={() => setEditingTask(null)}>Cancel</button><button className={styles.button} disabled={busy === `edit:${editingTask.id}`}>{busy === `edit:${editingTask.id}` ? "Saving…" : "Save task details"}</button></div>
        </form>
      </section>
    </div>}
  </MaintenanceShell>;
}
