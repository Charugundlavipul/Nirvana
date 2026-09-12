import React, { useEffect, useState } from "react";
import AdminLayout from "../AdminLayout";
import { getHrSummary, hrAction } from "../../../lib/hrApi";
import styles from "./Hr.module.css";

export default function LeaveManager() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", dayPortion: "full", reason: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => setData(await getHrSummary());
  useEffect(() => { load().catch((error)=>setMessage(error.message)); }, []);
  const submit = async (event) => { event.preventDefault(); setBusy(true); setMessage(""); try { await hrAction("submit_leave", form); setForm({startDate:"",endDate:"",dayPortion:"full",reason:""}); await load(); setMessage("Leave request submitted."); } catch(error){setMessage(error.message);} finally{setBusy(false);} };
  if (!data) return <AdminLayout title="Leave" subtitle="Apply and monitor your allowance"><div className={styles.card}>{message || 'Loading leave…'}</div></AdminLayout>;
  const balance = data.leave.balance;
  return <AdminLayout title="Leave" subtitle={`${data.leave.year} paid leave`}>
    {message && <div className={`${styles.alert} ${message.includes('submitted') ? styles.success : ''}`}>{message}</div>}
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.full}`}><div className={styles.metricRow}><div className={styles.metric}><span>Allowance</span><strong>{balance.allowance}</strong></div><div className={styles.metric}><span>Approved</span><strong>{balance.approved}</strong></div><div className={styles.metric}><span>Pending</span><strong>{balance.pending}</strong></div><div className={styles.metric}><span>Available</span><strong>{balance.available}</strong></div></div></section>
      <form className={`${styles.card} ${styles.half}`} onSubmit={submit}><h2>Request leave</h2><p className={styles.muted}>Requests cannot cross calendar years.</p><div className={styles.formGrid}><div className={styles.field}><label>Start</label><input required type="date" className={styles.input} value={form.startDate} onChange={(e)=>setForm({...form,startDate:e.target.value,endDate:form.endDate || e.target.value})}/></div><div className={styles.field}><label>End</label><input required type="date" className={styles.input} min={form.startDate} value={form.endDate} onChange={(e)=>setForm({...form,endDate:e.target.value})}/></div><div className={`${styles.field} ${styles.fieldWide}`}><label>Duration</label><select className={styles.select} value={form.dayPortion} onChange={(e)=>setForm({...form,dayPortion:e.target.value})}><option value="full">Full day(s)</option><option value="half">Half day (single date)</option></select></div><div className={`${styles.field} ${styles.fieldWide}`}><label>Reason (optional)</label><textarea className={styles.textarea} value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}/></div></div><div className={styles.actions}><button disabled={busy || balance.available <= 0} className={styles.button}>Submit request</button></div></form>
      <section className={`${styles.card} ${styles.half}`}><h2>Request history</h2><div className={styles.list}>{data.leave.requests.map((request)=><div className={styles.row} key={request.id}><div className={styles.rowMain}><strong>{request.start_date} – {request.end_date}</strong><span>{request.requested_days} day(s){request.reason ? ` · ${request.reason}` : ''}</span></div><div className={styles.actions} style={{margin:0}}><span className={`${styles.badge} ${request.status==='pending'?styles.badgePending:['rejected','cancelled','reversed'].includes(request.status)?styles.badgeDanger:styles.badgeSuccess}`}><span className={styles.badgeDot} />{request.status}</span>{request.status==='pending' && <button className={`${styles.button} ${styles.danger}`} onClick={async()=>{await hrAction('cancel_leave',{requestId:request.id});await load();}}>Cancel</button>}</div></div>)}{!data.leave.requests.length && <div className={styles.empty}>No leave requests yet.</div>}</div></section>
    </div>
  </AdminLayout>;
}
