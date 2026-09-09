import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { createAdminUser, setAdminUserActive, updateAdminUserEmail, updateAdminUserPassword, updateAdminUserRole } from "../../../lib/adminUsersApi";
import { getPeople, hrAction, revealBank } from "../../../lib/hrApi";
import styles from "./Hr.module.css";

const blankNew = { firstName: "", lastName: "", email: "", password: "", role: "employee" };
const blankSalary = () => ({
  annualSalary: "",
  currency: "USD",
  payFrequency: "monthly",
  effectiveFrom: new Date().toISOString().slice(0, 10),
});

export default function PeopleManager() {
  const [role, setRole] = useState(null);
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newUser, setNewUser] = useState(blankNew);
  const [edit, setEdit] = useState({});
  const [salary, setSalary] = useState(blankSalary);
  const [allowance, setAllowance] = useState({ allowanceDays: "", overrideReason: "" });
  const [revealedBank, setRevealedBank] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const result = await getPeople();
    setRole(result.role);
    setPeople(result.people);
    setSelectedId((id)=>result.people.some((person)=>person.user_id===id)?id:result.people[0]?.user_id||null);
  };
  useEffect(()=>{load().catch((error)=>{setRole('forbidden');setMessage(error.message);});},[]);
  const selected = useMemo(()=>people.find((person)=>person.user_id===selectedId),[people,selectedId]);
  useEffect(()=>{
    if (!selected) return;
    const p=selected.private_profile||{};
    const currentCompensation=selected.compensation;
    setEdit({ firstName:selected.first_name||'', lastName:selected.last_name||'', phone:p.phone||'', addressLine1:p.address_line_1||'', addressLine2:p.address_line_2||'', city:p.city||'', region:p.region||'', postalCode:p.postal_code||'', country:p.country||'', jobTitle:p.job_title||'', hireDate:p.hire_date||'', employmentStatus:p.employment_status||'active', email:selected.email||'', role:selected.role });
    setSalary(currentCompensation ? {
      annualSalary:String(currentCompensation.annual_salary ?? ''),
      currency:currentCompensation.currency||'USD',
      payFrequency:currentCompensation.pay_frequency||'monthly',
      effectiveFrom:currentCompensation.effective_from||new Date().toISOString().slice(0,10),
    } : blankSalary());
    setAllowance({allowanceDays:selected.entitlement?.allowance_days ?? '',overrideReason:''});
    setRevealedBank(null);
  },[selected]);

  const reviewableLeaveRequests = useMemo(
    () => (selected?.leave_requests || []).filter((request) => request.status !== 'cancelled'),
    [selected]
  );

  const perform = async (callback, success) => { setBusy(true); setMessage(''); try { await callback(); await load(); setMessage(success); } catch(error){setMessage(error.message);} finally{setBusy(false);} };
  if (role === null) return <AdminLayout title="People" subtitle="Owner-only employee administration"><div className={styles.card}>Loading employees…</div></AdminLayout>;
  if (role !== 'owner') return <AdminLayout title="People" subtitle="Owner workspace"><div className={styles.alert}>{message || 'Owner access is required.'}</div></AdminLayout>;
  return <AdminLayout title="People" subtitle="Owner-only employee administration">
    {message && <div className={`${styles.alert} ${/(saved|created|updated|changed)/i.test(message)?styles.success:''}`}>{message}</div>}
    <section className={styles.card} style={{marginBottom:20}}><h2>Create employee account</h2><p className={styles.muted}>Creates the sign-in, role, and employee profile together.</p><div className={styles.formGrid}>{[['firstName','First name','text'],['lastName','Last name','text'],['email','Work email','email'],['password','Temporary password','password']].map(([key,label,type])=><div className={styles.field} key={key}><label>{label}</label><input type={type} className={styles.input} value={newUser[key]} onChange={(e)=>setNewUser({...newUser,[key]:e.target.value})}/></div>)}<div className={styles.field}><label>Role</label><select className={styles.select} value={newUser.role} onChange={(e)=>setNewUser({...newUser,role:e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option><option value="owner">Owner</option></select></div></div><div className={styles.actions}><button disabled={busy} className={styles.button} onClick={()=>perform(async()=>{await createAdminUser(newUser);setNewUser(blankNew);},'Employee account created.')}>Create account</button></div></section>
    <div className={styles.split}>
      <aside className={styles.card}><h3>Team</h3><div className={styles.peopleList}>{people.map((person)=><button className={`${styles.personButton} ${person.user_id===selectedId?styles.personButtonActive:''}`} key={person.user_id} onClick={()=>setSelectedId(person.user_id)}><strong>{person.first_name||'Profile'} {person.last_name||'incomplete'}</strong><div className={styles.muted} style={{margin:0}}>{person.role} · {person.private_profile?.employment_status||'active'}</div></button>)}</div></aside>
      <div className={styles.grid}>{selected ? <>
        <section className={`${styles.card} ${styles.full}`}><h2>{selected.first_name||'Employee'} {selected.last_name||''}</h2><p className={styles.muted}>{selected.email} · Last sign-in {selected.last_sign_in_at ? new Date(selected.last_sign_in_at).toLocaleString() : 'never'}</p><div className={styles.formGrid}>{[['firstName','First name'],['lastName','Last name'],['email','Email'],['phone','Phone'],['jobTitle','Job title'],['hireDate','Hire date'],['addressLine1','Address line 1'],['addressLine2','Address line 2'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country']].map(([key,label])=><div className={`${styles.field} ${key.startsWith('address')?styles.fieldWide:''}`} key={key}><label>{label}</label><input type={key==='hireDate'?'date':key==='email'?'email':'text'} className={styles.input} value={edit[key]||''} onChange={(e)=>setEdit({...edit,[key]:e.target.value})}/></div>)}<div className={styles.field}><label>Role</label><select className={styles.select} value={edit.role||'employee'} onChange={(e)=>setEdit({...edit,role:e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option><option value="owner">Owner</option></select></div><div className={styles.field}><label>Status</label><select className={styles.select} value={edit.employmentStatus||'active'} onChange={(e)=>setEdit({...edit,employmentStatus:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div><div className={styles.actions}><button disabled={busy} className={styles.button} onClick={()=>perform(async()=>{await hrAction('update_profile',{userId:selected.user_id,...edit});if(edit.email!==selected.email)await updateAdminUserEmail({userId:selected.user_id,email:edit.email});if(edit.role!==selected.role)await updateAdminUserRole({userId:selected.user_id,role:edit.role});
if(edit.employmentStatus!==(selected.private_profile?.employment_status||'active'))await setAdminUserActive({userId:selected.user_id,active:edit.employmentStatus==='active'});},'Employee profile saved.')}>Save employee</button><button disabled={busy} className={`${styles.button} ${selected.private_profile?.employment_status==='active'?styles.danger:styles.secondary}`} onClick={()=>perform(()=>setAdminUserActive({userId:selected.user_id,active:selected.private_profile?.employment_status!=='active'}),selected.private_profile?.employment_status==='active'?'Employee deactivated.':'Employee reactivated.')}>{selected.private_profile?.employment_status==='active'?'Deactivate account':'Reactivate account'}</button></div></section>
        <section className={`${styles.card} ${styles.half}`}><h3>Salary</h3>{selected.compensation&&<p className={styles.muted}>Current annual salary: {new Intl.NumberFormat('en-US',{style:'currency',currency:selected.compensation.currency}).format(selected.compensation.annual_salary)}</p>}<div className={styles.formGrid}><div className={styles.field}><label>Annual salary</label><input type="number" min="0" step="0.01" className={styles.input} value={salary.annualSalary} onChange={(e)=>setSalary({...salary,annualSalary:e.target.value})}/></div><div className={styles.field}><label>Currency</label><input maxLength="3" className={styles.input} value={salary.currency} onChange={(e)=>setSalary({...salary,currency:e.target.value.toUpperCase()})}/></div><div className={styles.field}><label>Pay frequency</label><select className={styles.select} value={salary.payFrequency} onChange={(e)=>setSalary({...salary,payFrequency:e.target.value})}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></div><div className={styles.field}><label>Effective from</label><input type="date" className={styles.input} value={salary.effectiveFrom} onChange={(e)=>setSalary({...salary,effectiveFrom:e.target.value})}/></div></div><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={()=>perform(()=>hrAction('set_compensation',{userId:selected.user_id,...salary}),'Salary updated.')}>Add salary term</button></div></section>
        <section className={`${styles.card} ${styles.half}`}><h3>{new Date().getFullYear()} leave allowance</h3><div className={styles.formGrid}><div className={styles.field}><label>Paid days</label><input type="number" min="0" step="0.5" className={styles.input} value={allowance.allowanceDays} onChange={(e)=>setAllowance({...allowance,allowanceDays:e.target.value})}/></div><div className={styles.field}><label>Override reason, if reducing below committed</label><input className={styles.input} value={allowance.overrideReason} onChange={(e)=>setAllowance({...allowance,overrideReason:e.target.value})}/></div></div><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={()=>perform(()=>hrAction('set_entitlement',{userId:selected.user_id,year:new Date().getFullYear(),...allowance}),'Leave allowance saved.')}>Save allowance</button></div></section>
        <section className={`${styles.card} ${styles.full}`}><h3>Bank account</h3>{selected.bank?<div className={styles.row}><div className={styles.rowMain}><strong>{selected.bank.bank_name||'Bank account'}</strong><span>{selected.bank.account_type} · routing ••••{selected.bank.routing_last4} · account ••••{selected.bank.account_last4}</span>{revealedBank&&<span style={{display:'block'}}>Routing {revealedBank.routingNumber} · Account {revealedBank.accountNumber}</span>}</div><button className={`${styles.button} ${styles.secondary}`} onClick={async()=>setRevealedBank((await revealBank(selected.user_id)).bank)}>Reveal</button></div>:<div className={styles.empty}>No bank information supplied.</div>}</section>
        <section className={`${styles.card} ${styles.full}`}><h3>Leave review</h3><div className={styles.list}>{reviewableLeaveRequests.map((request)=><div className={styles.row} key={request.id}><div className={styles.rowMain}><strong>{request.start_date} – {request.end_date}</strong><span>{request.requested_days} day(s) · {request.reason||'No reason supplied'}{request.decision_note?` · ${request.decision_note}`:''}</span></div><div className={styles.actions} style={{margin:0}}><span className={styles.badge}>{request.status}</span>{request.status==='pending'&&<><button className={styles.button} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'approved'}),'Leave approved.')}>Approve</button><button className={`${styles.button} ${styles.danger}`} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'rejected'}),'Leave rejected.')}>Reject</button></>}{request.status==='approved'&&<button className={`${styles.button} ${styles.danger}`} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'reversed'}),'Leave approval reversed.')}>Reverse</button>}</div></div>)}{!reviewableLeaveRequests.length&&<div className={styles.empty}>No leave requests.</div>}</div></section>
        <section className={`${styles.card} ${styles.full}`}><h3>Owner password reset</h3><p className={styles.muted}>Admins cannot reset employee passwords. Owners can issue a replacement when necessary.</p><div className={styles.formGrid}><div className={styles.field}><label>New temporary password</label><input type="password" className={styles.input} id="owner-reset-password"/></div></div><div className={styles.actions}><button className={`${styles.button} ${styles.danger}`} onClick={()=>{const input=document.getElementById('owner-reset-password');perform(()=>updateAdminUserPassword({userId:selected.user_id,password:input.value}),'Password changed.').then(()=>{input.value='';});}}>Reset password</button></div></section>
      </> : <div className={`${styles.card} ${styles.full}`}>Loading people…</div>}</div>
    </div>
  </AdminLayout>;
}
