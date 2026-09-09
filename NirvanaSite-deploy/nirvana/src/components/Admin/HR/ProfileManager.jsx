import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { downloadPaystub, getHrSummary, hrAction, revealBank } from "../../../lib/hrApi";
import styles from "./Hr.module.css";

const emptyBank = { bankName: "", accountType: "checking", routingNumber: "", accountNumber: "" };

export default function ProfileManager() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({});
  const [bank, setBank] = useState(emptyBank);
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const result = await getHrSummary();
    setData(result);
    const p = result.profile || {};
    setProfile({ firstName: p.first_name || "", lastName: p.last_name || "", phone: p.phone || "", addressLine1: p.address_line_1 || "", addressLine2: p.address_line_2 || "", city: p.city || "", region: p.region || "", postalCode: p.postal_code || "", country: p.country || "" });
  };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);
  const currentCompensation = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.compensation?.find((row) => row.effective_from <= today && (!row.effective_to || row.effective_to >= today)) || null;
  }, [data]);

  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await hrAction("update_profile", profile); await load(); setMessage("Profile saved."); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const saveBank = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await hrAction("update_bank", bank); setBank(emptyBank); setRevealed(null); await load(); setMessage("Bank information securely replaced."); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };

  if (!data) return <AdminLayout title="My Profile" subtitle="Your private employee record"><div className={styles.card}>{message || "Loading profile…"}</div></AdminLayout>;
  return (
    <AdminLayout title="My Profile" subtitle="Private to you and owners">
      {message && <div className={`${styles.alert} ${message.includes("saved") || message.includes("replaced") ? styles.success : ""}`}>{message}</div>}
      <div className={styles.grid}>
        <form className={`${styles.card} ${styles.half}`} onSubmit={saveProfile}>
          <h2>Personal details</h2><p className={styles.muted}>{data.email} · {data.role}</p>
          <div className={styles.formGrid}>
            {[['firstName','First name'],['lastName','Last name'],['phone','Phone'],['addressLine1','Address line 1'],['addressLine2','Address line 2'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country']].map(([key,label]) => (
              <div className={`${styles.field} ${key.startsWith('address') ? styles.fieldWide : ''}`} key={key}><label>{label}</label><input className={styles.input} value={profile[key] || ''} onChange={(e) => setProfile((old) => ({ ...old, [key]: e.target.value }))} /></div>
            ))}
          </div><div className={styles.actions}><button className={styles.button} disabled={busy}>Save profile</button></div>
        </form>
        <section className={`${styles.card} ${styles.half}`}>
          <h2>Employment & salary</h2><p className={styles.muted}>Salary settings can only be changed by an owner.</p>
          <div className={styles.row}><div className={styles.rowMain}><strong>{data.profile?.job_title || "Job title not set"}</strong><span>{data.profile?.employment_status || "active"} · Hired {data.profile?.hire_date || "not set"}</span></div></div>
          {currentCompensation ? <><div className={styles.metricRow} style={{ marginTop: 14 }}><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Annual fixed salary</span><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:currentCompensation.currency}).format(currentCompensation.annual_salary)}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Fixed pay frequency</span><strong style={{fontSize:18,textTransform:'capitalize'}}>{currentCompensation.pay_frequency}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Variable pay</span><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:currentCompensation.currency}).format(currentCompensation.variable_pay||0)}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Variable pay frequency</span><strong style={{fontSize:18,textTransform:'capitalize'}}>{currentCompensation.variable_pay_frequency==='annually'?'Yearly':'Monthly'}</strong></div></div>{currentCompensation.salary_note&&<div className={styles.row} style={{marginTop:14}}><div className={styles.rowMain}><strong>Salary note</strong><span>{currentCompensation.salary_note}</span></div></div>}</> : <div className={styles.empty}>Salary information has not been added.</div>}
        </section>
        <form className={`${styles.card} ${styles.half}`} onSubmit={saveBank}>
          <h2>Bank information</h2><p className={styles.muted}>Encrypted at rest. Saving replaces the complete account.</p>
          {data.bank && <div className={styles.row}><div className={styles.rowMain}><strong>{data.bank.bank_name || 'Bank account'}</strong><span>{data.bank.account_type} · routing ••••{data.bank.routing_last4} · account ••••{data.bank.account_last4}</span>{revealed && <span style={{display:'block',marginTop:6}}>Routing {revealed.routingNumber} · Account {revealed.accountNumber}</span>}</div><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={async () => setRevealed((await revealBank()).bank)}>Reveal</button></div>}
          <div className={styles.formGrid} style={{marginTop:14}}>
            <div className={`${styles.field} ${styles.fieldWide}`}><label>Bank name</label><input className={styles.input} value={bank.bankName} onChange={(e)=>setBank({...bank,bankName:e.target.value})}/></div>
            <div className={styles.field}><label>Account type</label><select className={styles.select} value={bank.accountType} onChange={(e)=>setBank({...bank,accountType:e.target.value})}><option value="checking">Checking</option><option value="savings">Savings</option></select></div>
            <div className={styles.field}><label>Routing number</label><input className={styles.input} inputMode="numeric" value={bank.routingNumber} onChange={(e)=>setBank({...bank,routingNumber:e.target.value})}/></div>
            <div className={`${styles.field} ${styles.fieldWide}`}><label>Account number</label><input className={styles.input} inputMode="numeric" value={bank.accountNumber} onChange={(e)=>setBank({...bank,accountNumber:e.target.value})}/></div>
          </div><div className={styles.actions}><button className={styles.button} disabled={busy}>Save bank information</button></div>
        </form>
        <section className={`${styles.card} ${styles.half}`}><h2>Paystubs</h2><p className={styles.muted}>Your finalized payroll statements.</p><div className={styles.list}>{data.paystubs?.filter((stub)=>stub.pdf_path).map((stub)=><div className={styles.row} key={stub.id}><div className={styles.rowMain}><strong>{stub.paystub_number}</strong><span>{stub.payroll_runs?.period_start} – {stub.payroll_runs?.period_end} · Net {new Intl.NumberFormat('en-US',{style:'currency',currency:stub.currency}).format(stub.net_pay)}</span></div><button className={styles.button} onClick={()=>downloadPaystub(stub)}>Download PDF</button></div>)}{!data.paystubs?.some((stub)=>stub.pdf_path) && <div className={styles.empty}>No finalized paystubs yet.</div>}</div></section>
        <section className={`${styles.card} ${styles.full}`}><h2>Staff directory</h2><p className={styles.muted}>Only names and portal roles are shared.</p><div className={styles.directory}>{data.directory.map((person)=><div className={styles.person} key={person.user_id}><strong>{person.first_name || 'Profile'} {person.last_name || 'incomplete'}</strong><span>{person.role}</span></div>)}</div></section>
        <section className={`${styles.card} ${styles.full}`}><h2>Notifications</h2><div className={styles.list}>{data.notifications?.map((notice)=><div className={`${styles.notification} ${notice.read_at ? styles.notificationRead : ''}`} key={notice.id}><strong>{notice.title}</strong><div className={styles.muted} style={{margin:0}}>{notice.message}</div></div>)}{!data.notifications?.length && <div className={styles.empty}>No notifications.</div>}</div>{data.notifications?.some((n)=>!n.read_at) && <div className={styles.actions}><button className={`${styles.button} ${styles.secondary}`} onClick={async()=>{await hrAction('mark_notifications_read');await load();}}>Mark all read</button></div>}</section>
      </div>
    </AdminLayout>
  );
}
