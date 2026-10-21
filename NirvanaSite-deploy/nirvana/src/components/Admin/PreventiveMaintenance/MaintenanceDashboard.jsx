import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaClock, FaExclamationCircle, FaExclamationTriangle, FaFileCsv } from "react-icons/fa";
import MaintenanceShell from "./MaintenanceShell";
import styles from "./Maintenance.module.css";
import { getMaintenanceWorkspace, downloadMaintenanceExport } from "../../../lib/preventiveMaintenanceApi";
import { MAINTENANCE_STATUS } from "../../../lib/preventiveMaintenance";

const cards = [
  { key: "on_track", icon: FaCheckCircle, vars: { "--status-bg": "#f0fdf4", "--status-border": "#bbf7d0", "--status-text": "#166534" } },
  { key: "upcoming", icon: FaClock, vars: { "--status-bg": "#fff7ed", "--status-border": "#fed7aa", "--status-text": "#b45309" } },
  { key: "urgent", icon: FaExclamationCircle, vars: { "--status-bg": "#fef2f2", "--status-border": "#fecaca", "--status-text": "#b91c1c" } },
  { key: "overdue", icon: FaExclamationTriangle, vars: { "--status-bg": "#faf5ff", "--status-border": "#d8b4fe", "--status-text": "#6b21a8" } },
  { key: "unscheduled", icon: FaExclamationCircle, vars: { "--status-bg": "#f8fafc", "--status-border": "#cbd5e1", "--status-text": "#475569" } },
];

const prettyEvent = (value) => String(value || "").replace(/_/g, " ");
const dateLabel = (value) => value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  useEffect(() => { getMaintenanceWorkspace().then(setData).catch((e) => setError(e.message)); }, []);
  const priority = useMemo(() => (data?.schedules || []).filter((item) => ["overdue", "urgent", "upcoming"].includes(item.status)).slice(0, 10), [data]);
  const propertyMap = useMemo(() => new Map((data?.properties || []).map((item) => [item.id, item])), [data]);
  const taskMap = useMemo(() => new Map((data?.catalog || []).map((item) => [item.id, item])), [data]);

  return <MaintenanceShell title="Preventive Maintenance" subtitle="Portfolio-wide maintenance health and upcoming work">
    {error && <div className={styles.alert}>{error}</div>}
    <div className={styles.toolbar}>
      <div><h2 className={styles.sectionTitle}>Maintenance overview</h2><span className={styles.muted}>Select a status to open the matching tasks.</span></div>
      <button className={styles.button} disabled={exporting} onClick={async () => { setExporting(true); try { await downloadMaintenanceExport(); } catch (e) { setError(e.message); } finally { setExporting(false); } }}><FaFileCsv /> {exporting ? "Preparing…" : "Export all history"}</button>
    </div>
    {!data ? <div className={`${styles.card} ${styles.loading}`}>Loading maintenance dashboard…</div> : <>
      <div className={styles.statsGrid}>
        {cards.map(({ key, icon: Icon, vars }) => <button key={key} className={styles.statCard} style={vars} onClick={() => navigate(`/admin/preventive-maintenance/tasks?status=${key}`)}>
          <span className={styles.statTop}><span>{MAINTENANCE_STATUS[key].label}</span><Icon /></span>
          <span className={styles.statValue}>{data.counts[key] || 0}</span>
        </button>)}
      </div>
      <div className={styles.dashboardGrid}>
        <section className={`${styles.card} ${styles.cardPadding}`}>
          <h2 className={styles.sectionTitle}>Needs attention</h2>
          <p className={styles.muted}>Tasks are ordered by their next due date.</p>
          <div className={styles.list}>{priority.length ? priority.map((item) => <div className={styles.listItem} key={item.id}>
            <div className={styles.listMain}><strong>{item.task?.name || "Maintenance task"}</strong><span>{item.property?.name} · Due {item.current_due_on}</span></div>
            <span className={`${styles.badge} ${styles[item.status]}`}>{item.status === "overdue" ? "! " : ""}{MAINTENANCE_STATUS[item.status].label}</span>
          </div>) : <div className={styles.empty}>No upcoming or overdue work.</div>}</div>
        </section>
        <section className={`${styles.card} ${styles.cardPadding}`}>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <p className={styles.muted}>The latest recorded maintenance changes.</p>
          <div className={styles.list}>{(data.events || []).filter((event) => event.event_type !== "csv_exported").slice(0, 8).map((event) => <div className={styles.listItem} key={event.id}>
            <div className={styles.listMain}><strong style={{ textTransform: "capitalize" }}>{prettyEvent(event.event_type)}</strong><span>{propertyMap.get(event.property_id)?.name || taskMap.get(event.catalog_task_id)?.name || "Maintenance"} · {event.actor_name}</span></div>
            <span className={styles.muted}>{dateLabel(event.created_at)}</span>
          </div>)}</div>
        </section>
      </div>
    </>}
  </MaintenanceShell>;
}
