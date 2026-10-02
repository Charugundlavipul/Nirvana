import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { createAdminUser, setAdminUserActive, updateAdminUserEmail, updateAdminUserPassword, updateAdminUserRole } from "../../../lib/adminUsersApi";
import { downloadPaystub, getPeople, hrAction, revealBank } from "../../../lib/hrApi";
import { formatRole, regularPayForSalary } from "../../../lib/hr";
import styles from "./Hr.module.css";

const formatSalaryAmount = (amount, currency = "INR") => {
  const num = Number(amount || 0);
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatted = num.toLocaleString(locale, {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
};

const formatPayDate = (value, options) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...options }).format(date);
};

const blankNew = { firstName: "", lastName: "", email: "", password: "", role: "employee" };
const blankSalary = () => ({
  annualSalary: "",
  variablePay: "",
  variablePayFrequency: "monthly",
  salaryNote: "",
  currency: "USD",
  payFrequency: "monthly",
  effectiveFrom: new Date().toISOString().slice(0, 10),
});

export default function PeopleManager() {
  const [role, setRole] = useState(null);
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState(blankNew);
  const [edit, setEdit] = useState({});
  const [salary, setSalary] = useState(blankSalary);
  const [allowance, setAllowance] = useState({ allowanceDays: "", overrideReason: "" });
  const [revealedBank, setRevealedBank] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const load = async () => {
    const result = await getPeople();
    setRole(result.role);
    setPeople(result.people);
    if (result.currentUserId) setCurrentUserId(result.currentUserId);
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
      variablePay:String(currentCompensation.variable_pay ?? ''),
      variablePayFrequency:currentCompensation.variable_pay_frequency||'monthly',
      salaryNote:currentCompensation.salary_note||'',
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
  if (role === null) return <AdminLayout title="People" subtitle="Superadmin-only employee administration"><div className={styles.card}>Loading employees…</div></AdminLayout>;
  if (role !== 'owner') return <AdminLayout title="People" subtitle="Superadmin workspace"><div className={styles.alert}>{message || 'Superadmin access is required.'}</div></AdminLayout>;
  return <AdminLayout title="People" subtitle="Superadmin-only employee administration">
    {message && <div className={`${styles.alert} ${/(saved|created|updated|changed|deleted)/i.test(message)?styles.success:''}`}>{message}</div>}

    {showCreate ? (
      <section className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>Create employee account</h2>
            <p className={styles.muted}>Creates the sign-in, role, and employee profile together.</p>
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            style={{ padding: "6px 14px", fontSize: "13px" }}
            onClick={() => { setShowCreate(false); setNewUser(blankNew); }}
          >
            ✕ Close
          </button>
        </div>
        <div className={styles.formGrid}>
          {[['firstName','First name','text'],['lastName','Last name','text'],['email','Work email','email'],['password','Temporary password','password']].map(([key,label,type]) => (
            <div className={styles.field} key={key}>
              <label>{label}</label>
              <input type={type} className={styles.input} value={newUser[key]} onChange={(e) => setNewUser({...newUser,[key]:e.target.value})} />
            </div>
          ))}
          <div className={styles.field}>
            <label>Role</label>
            <select className={styles.select} value={newUser.role} onChange={(e) => setNewUser({...newUser,role:e.target.value})}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
              <option value="owner">Superadmin</option>
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            disabled={busy}
            className={styles.button}
            onClick={() =>
              perform(async () => {
                await createAdminUser(newUser);
                setNewUser(blankNew);
                setShowCreate(false);
              }, "Employee account created.")
            }
          >
            Create account
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => { setShowCreate(false); setNewUser(blankNew); }}
          >
            Cancel
          </button>
        </div>
      </section>
    ) : (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          className={styles.button}
          onClick={() => setShowCreate(true)}
        >
          + Create New Employee
        </button>
      </div>
    )}

    <div className={styles.split}>
      <aside className={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Team ({people.length})</h3>
          {!showCreate && (
            <button
              type="button"
              className={styles.button}
              style={{ padding: "5px 10px", fontSize: "12px" }}
              onClick={() => setShowCreate(true)}
            >
              + New
            </button>
          )}
        </div>
        <div className={styles.peopleList}>
          {people.map((person) => (
            <button
              className={`${styles.personButton} ${person.user_id === selectedId ? styles.personButtonActive : ''}`}
              key={person.user_id}
              onClick={() => setSelectedId(person.user_id)}
            >
              <strong>{person.first_name || 'Profile'} {person.last_name || 'incomplete'}</strong>
              <div className={styles.muted} style={{ margin: 0 }}>
                {formatRole(person.role)} · {person.private_profile?.employment_status || 'active'}
              </div>
            </button>
          ))}
        </div>
      </aside>
      <div className={styles.grid}>{selected ? <>
        <section className={`${styles.card} ${styles.full}`}><h2>{selected.first_name||'Employee'} {selected.last_name||''}</h2><p className={styles.muted}>{selected.email} · Last sign-in {selected.last_sign_in_at ? new Date(selected.last_sign_in_at).toLocaleString() : 'never'}</p><div className={styles.formGrid}>{[['firstName','First name'],['lastName','Last name'],['email','Email'],['phone','Phone'],['jobTitle','Job title'],['hireDate','Hire date'],['addressLine1','Address line 1'],['addressLine2','Address line 2'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country']].map(([key,label])=><div className={`${styles.field} ${key.startsWith('address')?styles.fieldWide:''}`} key={key}><label>{label}</label><input type={key==='hireDate'?'date':key==='email'?'email':'text'} className={styles.input} value={edit[key]||''} onChange={(e)=>setEdit({...edit,[key]:e.target.value})}/></div>)}<div className={styles.field}><label>Role</label><select className={styles.select} value={edit.role||'employee'} onChange={(e)=>setEdit({...edit,role:e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option><option value="owner">Superadmin</option></select></div><div className={styles.field}><label>Status</label><select className={styles.select} value={edit.employmentStatus||'active'} onChange={(e)=>setEdit({...edit,employmentStatus:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div><div className={styles.actions}><button disabled={busy} className={styles.button} onClick={()=>perform(async()=>{await hrAction('update_profile',{userId:selected.user_id,...edit});if(edit.email!==selected.email)await updateAdminUserEmail({userId:selected.user_id,email:edit.email});if(edit.role!==selected.role)await updateAdminUserRole({userId:selected.user_id,role:edit.role});
if(edit.employmentStatus!==(selected.private_profile?.employment_status||'active'))await setAdminUserActive({userId:selected.user_id,active:edit.employmentStatus==='active'});},'Employee profile saved.')}>Save employee</button><button disabled={busy} className={`${styles.button} ${selected.private_profile?.employment_status==='active'?styles.secondary:styles.secondary}`} onClick={()=>perform(()=>setAdminUserActive({userId:selected.user_id,active:selected.private_profile?.employment_status!=='active'}),selected.private_profile?.employment_status==='active'?'Employee deactivated.':'Employee reactivated.')}>{selected.private_profile?.employment_status==='active'?'Deactivate account':'Reactivate account'}</button>{role === 'owner' && <button disabled={busy || selected.user_id === currentUserId} className={`${styles.button} ${styles.danger}`} style={{ marginLeft: 'auto' }} title={selected.user_id === currentUserId ? "Superadmin cannot delete their own account" : "Permanently delete user (Superadmin only)"} onClick={()=>{const name = `${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.email; if(!window.confirm(`Permanently delete ${name}? This will remove them completely from the directory, revoke sign-in access, and delete all associated records.`)) return; perform(async ()=>{ await hrAction('delete_employee', { userId: selected.user_id }); setSelectedId(null); }, 'Employee permanently deleted and removed from directory.'); }}>Delete user</button>}</div></section>
        <section className={`${styles.card} ${styles.half}`}><h3>Salary</h3>{selected.compensation&&<p className={styles.muted}>Current: <strong>{formatSalaryAmount(regularPayForSalary(selected.compensation.annual_salary,'monthly'),selected.compensation.currency)} / mo fixed</strong> · <strong>{formatSalaryAmount(selected.compensation.variable_pay_frequency==='annually'?Math.round((Number(selected.compensation.variable_pay||0)/12)*100)/100:Number(selected.compensation.variable_pay||0),selected.compensation.currency)} / mo variable</strong> <span style={{opacity:0.85}}>(Annual: {formatSalaryAmount(selected.compensation.annual_salary,selected.compensation.currency)})</span></p>}<div className={styles.formGrid}><div className={styles.field}><label>Annual fixed salary</label><input type="number" min="0" step="0.01" className={styles.input} value={salary.annualSalary} onChange={(e)=>setSalary({...salary,annualSalary:e.target.value})}/></div><div className={styles.field}><label>Currency</label><input maxLength="3" className={styles.input} value={salary.currency} onChange={(e)=>setSalary({...salary,currency:e.target.value.toUpperCase()})}/></div><div className={styles.field}><label>Fixed salary pay frequency</label><select className={styles.select} value={salary.payFrequency} onChange={(e)=>setSalary({...salary,payFrequency:e.target.value})}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></div><div className={styles.field}><label>Effective from</label><input type="date" className={styles.input} value={salary.effectiveFrom} onChange={(e)=>setSalary({...salary,effectiveFrom:e.target.value})}/></div><div className={styles.field}><label>Variable pay amount</label><input type="number" min="0" step="0.01" className={styles.input} value={salary.variablePay} onChange={(e)=>setSalary({...salary,variablePay:e.target.value})}/></div><div className={styles.field}><label>Variable pay frequency</label><select className={styles.select} value={salary.variablePayFrequency} onChange={(e)=>setSalary({...salary,variablePayFrequency:e.target.value})}><option value="monthly">Monthly</option><option value="annually">Yearly</option></select></div><div className={`${styles.field} ${styles.fieldWide}`}><label>Salary note</label><textarea className={styles.textarea} maxLength="1000" value={salary.salaryNote} onChange={(e)=>setSalary({...salary,salaryNote:e.target.value})}/></div></div><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={()=>perform(()=>hrAction('set_compensation',{userId:selected.user_id,...salary}),'Salary updated.')}>Save salary term</button></div></section>
        <section className={`${styles.card} ${styles.half}`}><h3>{new Date().getFullYear()} leave allowance</h3><div className={styles.formGrid}><div className={styles.field}><label>Paid days</label><input type="number" min="0" step="0.5" className={styles.input} value={allowance.allowanceDays} onChange={(e)=>setAllowance({...allowance,allowanceDays:e.target.value})}/></div><div className={styles.field}><label>Override reason, if reducing below committed</label><input className={styles.input} value={allowance.overrideReason} onChange={(e)=>setAllowance({...allowance,overrideReason:e.target.value})}/></div></div><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={()=>perform(()=>hrAction('set_entitlement',{userId:selected.user_id,year:new Date().getFullYear(),...allowance}),'Leave allowance saved.')}>Save allowance</button></div></section>
        <section className={`${styles.card} ${styles.full}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Salary update audit trail</h3>
              <p className={styles.muted} style={{ margin: '2px 0 0' }}>
                Immutable historical record of every salary and compensation change for {selected.first_name || 'this employee'} (Admin only).
              </p>
            </div>
            {(selected.salary_audit_logs || []).length > 0 && (
              <span className={styles.badge} style={{ fontSize: 12, padding: '4px 10px', background: '#e0e7ff', color: '#3730a3' }}>
                {(selected.salary_audit_logs || []).length} update(s)
              </span>
            )}
          </div>

          {(selected.salary_audit_logs || []).length > 0 ? (
            <div className={styles.list} style={{ gap: 12 }}>
              {(selected.salary_audit_logs || []).map((log, idx) => {
                const formattedDate = new Date(log.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isInitial = log.change_type === 'initial_created' || log.previous_annual_salary == null;
                const salaryDiff = !isInitial && log.previous_annual_salary != null
                  ? Number(log.annual_salary) - Number(log.previous_annual_salary)
                  : 0;

                return (
                  <div className={styles.row} key={log.id || idx} style={{ alignItems: 'flex-start', padding: 14 }}>
                    <div className={styles.rowMain} style={{ gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 14 }}>
                            {formatSalaryAmount(log.annual_salary, log.currency)} / yr
                          </strong>
                          <span style={{ fontSize: 13, color: '#64748b' }}>
                            ({formatSalaryAmount(regularPayForSalary(log.annual_salary, 'monthly'), log.currency)} / mo)
                          </span>
                          {!isInitial && salaryDiff !== 0 && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: salaryDiff > 0 ? '#166534' : '#991b1b',
                              background: salaryDiff > 0 ? '#dcfce7' : '#fee2e2',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}>
                              {salaryDiff > 0 ? `+${formatSalaryAmount(salaryDiff, log.currency)}` : `-${formatSalaryAmount(Math.abs(salaryDiff), log.currency)}`}
                            </span>
                          )}
                          {isInitial && (
                            <span className={styles.badge} style={{ fontSize: 10, background: '#f1f5f9', color: '#475569' }}>
                              Initial term
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                          {formattedDate}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#475569', marginTop: 4 }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Variable pay: </span>
                          <strong>
                            {Number(log.variable_pay || 0) > 0
                              ? `${formatSalaryAmount(log.variable_pay, log.currency)} (${log.variable_pay_frequency || 'monthly'})`
                              : 'None'}
                          </strong>
                          {!isInitial && log.previous_variable_pay != null && Number(log.previous_variable_pay) !== Number(log.variable_pay || 0) && (
                            <span style={{ color: '#94a3b8', marginLeft: 4 }}>
                              (was {formatSalaryAmount(log.previous_variable_pay, log.previous_currency || log.currency)})
                            </span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Effective from: </span>
                          <strong>{log.effective_from}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Pay frequency: </span>
                          <span style={{ textTransform: 'capitalize' }}>{log.pay_frequency}</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Updated by: </span>
                          <strong>{log.changed_by_name || log.changed_by_email || 'Superadmin'}</strong>
                          {log.changed_by_email && log.changed_by_name && log.changed_by_name !== log.changed_by_email && (
                            <span style={{ color: '#94a3b8' }}> ({log.changed_by_email})</span>
                          )}
                        </div>
                      </div>

                      {log.salary_note && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#334155', fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #cbd5e1' }}>
                          Note: "{log.salary_note}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              No salary update history recorded yet. Future changes to this employee's salary will be automatically logged here.
            </div>
          )}
        </section>
        <section className={`${styles.card} ${styles.full}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Bank account (Indian Banking)</h3>
            {selected.bank && (
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={async () => {
                  if (revealedBank) setRevealedBank(null);
                  else setRevealedBank((await revealBank(selected.user_id)).bank);
                }}
              >
                {revealedBank ? 'Hide' : 'Reveal full details'}
              </button>
            )}
          </div>
          {selected.bank ? (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <strong>
                  {selected.bank.bank_name || 'Bank account'}
                  {selected.bank.branch_name ? ` · ${selected.bank.branch_name}` : ''}
                </strong>
                <span>
                  {selected.bank.account_holder_name ? `${selected.bank.account_holder_name} · ` : ''}
                  <span style={{ textTransform: 'capitalize' }}>{selected.bank.account_type || 'savings'} account</span>
                  {` · IFSC ••••${selected.bank.routing_last4} · A/C ••••${selected.bank.account_last4}`}
                  {selected.bank.upi_id ? ` · UPI: ${selected.bank.upi_id}` : ''}
                </span>
                {revealedBank && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#ecfdf5', borderRadius: 8, color: '#065f46', fontSize: 12, fontWeight: 600 }}>
                    <div>IFSC: <strong>{revealedBank.ifscCode || revealedBank.routingNumber}</strong> · A/C: <strong>{revealedBank.accountNumber}</strong></div>
                    {revealedBank.account_holder_name && <div>A/C Holder: {revealedBank.account_holder_name}</div>}
                    {revealedBank.branch_name && <div>Branch: {revealedBank.branch_name}</div>}
                    {revealedBank.upi_id && <div>UPI: {revealedBank.upi_id}</div>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>No bank information supplied.</div>
          )}
        </section>
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.paystubHeading}>
            <div>
              <h3 style={{ margin: 0 }}>Pay statements</h3>
              <p className={styles.muted} style={{ margin: "2px 0 0" }}>Complete monthly payslip history for {selected.first_name || 'this employee'}.</p>
            </div>
            {(selected.paystubs || []).length > 0 && (
              <span className={styles.paystubCount}>{(selected.paystubs || []).length} available</span>
            )}
          </div>
          <div className={styles.paystubList} style={{ maxHeight: "none", marginTop: 12, gap: 10 }}>
            {(selected.paystubs || []).map((stub) => {
              const run = stub.payroll_runs || {};
              return (
                <article className={styles.paystubCard} key={stub.id}>
                  <div className={styles.paystubMonth} aria-hidden="true">
                    <strong>{formatPayDate(run.pay_date, { month: "short" })}</strong>
                    <span>{formatPayDate(run.pay_date, { year: "numeric" })}</span>
                  </div>
                  <div className={styles.paystubDetails}>
                    <strong>{stub.paystub_number}</strong>
                    <span>{formatPayDate(run.period_start, { day: "2-digit", month: "short" })} - {formatPayDate(run.period_end, { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <small>Paid {formatPayDate(run.pay_date, { day: "2-digit", month: "short", year: "numeric" })}</small>
                  </div>
                  <div className={styles.paystubAmount}>
                    <span>Net pay</span>
                    <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: stub.currency || "INR" }).format(stub.net_pay)}</strong>
                  </div>
                  <button type="button" className={styles.button} onClick={() => downloadPaystub(stub)}>Download PDF</button>
                </article>
              );
            })}
            {!(selected.paystubs || []).length && (
              <div className={styles.empty}>No generated pay statements yet for this employee.</div>
            )}
          </div>
        </section>
        <section className={`${styles.card} ${styles.full}`}><h3>Leave review</h3><div className={styles.list}>{reviewableLeaveRequests.map((request)=><div className={styles.row} key={request.id}><div className={styles.rowMain}><strong>{request.start_date} – {request.end_date}</strong><span>{request.requested_days} day(s) · {request.reason||'No reason supplied'}{request.decision_note?` · ${request.decision_note}`:''}</span></div><div className={styles.actions} style={{margin:0}}><span className={`${styles.badge} ${request.status==='pending'?styles.badgePending:['rejected','cancelled','reversed'].includes(request.status)?styles.badgeDanger:styles.badgeSuccess}`}><span className={styles.badgeDot} />{request.status}</span>{request.status==='pending'&&<><button className={styles.button} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'approved'}),'Leave approved.')}>Approve</button><button className={`${styles.button} ${styles.danger}`} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'rejected'}),'Leave rejected.')}>Reject</button></>}{request.status==='approved'&&<button className={`${styles.button} ${styles.danger}`} onClick={()=>perform(()=>hrAction('review_leave',{requestId:request.id,decision:'reversed'}),'Leave approval reversed.')}>Reverse</button>}</div></div>)}{!reviewableLeaveRequests.length&&<div className={styles.empty}>No leave requests.</div>}</div></section>
        <section className={`${styles.card} ${styles.full}`}><h3>Superadmin password reset</h3><p className={styles.muted}>Admins cannot reset employee passwords. Superadmins can issue a replacement when necessary.</p><div className={styles.formGrid}><div className={styles.field}><label>New temporary password</label><input type="password" className={styles.input} id="owner-reset-password"/></div></div><div className={styles.actions}><button className={`${styles.button} ${styles.danger}`} onClick={()=>{const input=document.getElementById('owner-reset-password');perform(()=>updateAdminUserPassword({userId:selected.user_id,password:input.value}),'Password changed.').then(()=>{input.value='';});}}>Reset password</button></div></section>
      </> : <div className={`${styles.card} ${styles.full}`}>Loading people…</div>}</div>
    </div>
  </AdminLayout>;
}
