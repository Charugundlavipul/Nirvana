import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { downloadPaystub, getHrSummary, hrAction, revealBank } from "../../../lib/hrApi";
import { formatRole, isOwnerRole } from "../../../lib/hr";
import styles from "./Hr.module.css";

const emptyBank = {
  accountHolderName: "",
  bankName: "",
  accountType: "savings",
  ifscCode: "",
  accountNumber: "",
  confirmAccountNumber: "",
  branchName: "",
  upiId: "",
};

const formatPayDate = (value, options) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...options }).format(date);
};

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
    setProfile({
      firstName: p.first_name || "",
      lastName: p.last_name || "",
      phone: p.phone || "",
      addressLine1: p.address_line_1 || "",
      addressLine2: p.address_line_2 || "",
      city: p.city || "",
      region: p.region || "",
      postalCode: p.postal_code || "",
      country: p.country || "",
    });
    if (result.bank) {
      setBank((old) => ({
        ...old,
        accountHolderName: result.bank.account_holder_name || old.accountHolderName || "",
        bankName: result.bank.bank_name || old.bankName || "",
        accountType: result.bank.account_type || old.accountType || "savings",
        branchName: result.bank.branch_name || old.branchName || "",
        upiId: result.bank.upi_id || old.upiId || "",
      }));
    }
  };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);
  const currentCompensation = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.compensation?.find((row) => row.effective_from <= today && (!row.effective_to || row.effective_to >= today)) || null;
  }, [data]);
  const paystubs = useMemo(() => [...(data?.paystubs || [])].sort((a, b) => (
    String(b.payroll_runs?.pay_date || "").localeCompare(String(a.payroll_runs?.pay_date || ""))
  )), [data]);

  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await hrAction("update_profile", profile); await load(); setMessage("Profile saved."); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };

  const handleRevealOrEditBank = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (revealed) {
        setRevealed(null);
      } else {
        const res = await revealBank();
        const b = res.bank || {};
        setRevealed(b);
        setBank({
          accountHolderName: b.account_holder_name || b.accountHolderName || data?.bank?.account_holder_name || "",
          bankName: b.bank_name || b.bankName || data?.bank?.bank_name || "",
          accountType: b.account_type || b.accountType || data?.bank?.account_type || "savings",
          branchName: b.branch_name || b.branchName || data?.bank?.branch_name || "",
          upiId: b.upi_id || b.upiId || data?.bank?.upi_id || "",
          ifscCode: b.ifscCode || b.routingNumber || "",
          accountNumber: b.accountNumber || "",
          confirmAccountNumber: b.accountNumber || "",
        });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveBank = async (event) => {
    event.preventDefault();
    if (bank.confirmAccountNumber && bank.accountNumber !== bank.confirmAccountNumber) {
      setMessage("Account number and confirmation do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await hrAction("update_bank", {
        accountHolderName: bank.accountHolderName,
        bankName: bank.bankName,
        accountType: bank.accountType,
        ifscCode: bank.ifscCode,
        accountNumber: bank.accountNumber,
        branchName: bank.branchName,
        upiId: bank.upiId,
      });
      setRevealed(null);
      await load();
      setMessage("Bank information securely saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <AdminLayout title="My Profile" subtitle="Your private employee record"><div className={styles.card}>{message || "Loading profile…"}</div></AdminLayout>;
  return (
    <AdminLayout title="My Profile" subtitle="Private to you and superadmins">
      {message && <div className={`${styles.alert} ${message.includes("saved") || message.includes("replaced") ? styles.success : ""}`}>{message}</div>}
      <div className={styles.grid}>
        <form className={`${styles.card} ${styles.half}`} onSubmit={saveProfile}>
          <h2>Personal details</h2><p className={styles.muted}>{data.email} · {formatRole(data.role)}</p>
          <div className={styles.formGrid}>
            {[['firstName','First name'],['lastName','Last name'],['phone','Phone'],['addressLine1','Address line 1'],['addressLine2','Address line 2'],['city','City'],['region','State / region'],['postalCode','Postal code'],['country','Country']].map(([key,label]) => (
              <div className={`${styles.field} ${key.startsWith('address') ? styles.fieldWide : ''}`} key={key}><label>{label}</label><input className={styles.input} value={profile[key] || ''} onChange={(e) => setProfile((old) => ({ ...old, [key]: e.target.value }))} /></div>
            ))}
          </div><div className={styles.actions}><button className={styles.button} disabled={busy}>Save profile</button></div>
        </form>
        <section className={`${styles.card} ${styles.half}`}>
          <h2>Employment & salary</h2><p className={styles.muted}>Salary settings can only be changed by a superadmin.</p>
          <div className={styles.row}><div className={styles.rowMain}><strong>{data.profile?.job_title || "Job title not set"}</strong><span>{data.profile?.employment_status || "active"} · Hired {data.profile?.hire_date || "not set"}</span></div></div>
          {currentCompensation ? <><div className={styles.metricRow} style={{ marginTop: 14 }}><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Annual fixed salary</span><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:currentCompensation.currency}).format(currentCompensation.annual_salary)}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Fixed pay frequency</span><strong style={{fontSize:18,textTransform:'capitalize'}}>{currentCompensation.pay_frequency}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Variable pay</span><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:currentCompensation.currency}).format(currentCompensation.variable_pay||0)}</strong></div><div className={styles.metric} style={{ gridColumn: 'span 2' }}><span>Variable pay frequency</span><strong style={{fontSize:18,textTransform:'capitalize'}}>{currentCompensation.variable_pay_frequency==='annually'?'Yearly':'Monthly'}</strong></div></div>{currentCompensation.salary_note&&<div className={styles.row} style={{marginTop:14}}><div className={styles.rowMain}><strong>Salary note</strong><span>{currentCompensation.salary_note}</span></div></div>}</> : <div className={styles.empty}>Salary information has not been added.</div>}
        </section>
        <form className={`${styles.card} ${styles.half}`} onSubmit={saveBank}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
            <div>
              <h2>Bank details (Indian Banking)</h2>
              <p className={styles.muted} style={{ margin: "4px 0 0" }}>
                Encrypted at rest. Payouts and payslips use these details.
              </p>
            </div>
            {data.bank && (
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
                disabled={busy}
                onClick={handleRevealOrEditBank}
              >
                {revealed ? "Hide details" : "Reveal / Edit details"}
              </button>
            )}
          </div>

          {data.bank && (
            <div className={styles.row} style={{ marginBottom: 16, background: "#f8fafc" }}>
              <div className={styles.rowMain}>
                <strong>
                  {data.bank.bank_name || "Bank account"}
                  {data.bank.branch_name ? ` · ${data.bank.branch_name}` : ""}
                </strong>
                <span>
                  {data.bank.account_holder_name ? `${data.bank.account_holder_name} · ` : ""}
                  <span style={{ textTransform: "capitalize" }}>{data.bank.account_type || "savings"} account</span>
                  {` · IFSC ••••${data.bank.routing_last4} · A/C ••••${data.bank.account_last4}`}
                  {data.bank.upi_id ? ` · UPI: ${data.bank.upi_id}` : ""}
                </span>
                {revealed && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#ecfdf5", borderRadius: 8, color: "#065f46", fontSize: 12, fontWeight: 600 }}>
                    <div>IFSC: <strong>{revealed.ifscCode || revealed.routingNumber}</strong> · A/C: <strong>{revealed.accountNumber}</strong></div>
                    {revealed.account_holder_name && <div>A/C Holder: {revealed.account_holder_name}</div>}
                    {revealed.branch_name && <div>Branch: {revealed.branch_name}</div>}
                    {revealed.upi_id && <div>UPI: {revealed.upi_id}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label>Account holder name *</label>
              <input
                className={styles.input}
                placeholder="Beneficiary name as registered with bank"
                value={bank.accountHolderName}
                onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Bank name *</label>
              <input
                className={styles.input}
                placeholder="e.g. State Bank of India, HDFC Bank"
                value={bank.bankName}
                onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Account type *</label>
              <select
                className={styles.select}
                value={bank.accountType}
                onChange={(e) => setBank({ ...bank, accountType: e.target.value })}
              >
                <option value="savings">Savings Account</option>
                <option value="salary">Salary Account</option>
                <option value="current">Current Account</option>
                <option value="checking">Checking (US / Global)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>IFSC code *</label>
              <input
                className={styles.input}
                placeholder="e.g. SBIN0001234 or HDFC0000261"
                maxLength={11}
                value={bank.ifscCode}
                onChange={(e) => setBank({ ...bank, ifscCode: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Branch name / City</label>
              <input
                className={styles.input}
                placeholder="e.g. Indiranagar Branch, Bengaluru"
                value={bank.branchName}
                onChange={(e) => setBank({ ...bank, branchName: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Account number *</label>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="9 to 18 digits"
                maxLength={30}
                value={bank.accountNumber}
                onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "") })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Confirm account number *</label>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="Re-enter account number"
                maxLength={30}
                value={bank.confirmAccountNumber}
                onChange={(e) => setBank({ ...bank, confirmAccountNumber: e.target.value.replace(/\D/g, "") })}
                required={!data.bank || Boolean(bank.accountNumber)}
              />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label>UPI ID / VPA (Optional)</label>
              <input
                className={styles.input}
                placeholder="e.g. yourname@okhdfcbank"
                value={bank.upiId}
                onChange={(e) => setBank({ ...bank, upiId: e.target.value.trim() })}
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.button} disabled={busy}>
              Save bank information
            </button>
            {data.bank && (
              <span className={styles.muted} style={{ margin: 0, fontSize: 12 }}>
                Saving replaces existing bank account details.
              </span>
            )}
          </div>
        </form>
        <section className={`${styles.card} ${styles.half}`}>
          <div className={styles.paystubHeading}>
            <div><h2>Pay statements</h2><p className={styles.muted}>Your complete monthly payslip history.</p></div>
            {paystubs.length > 0 && <span className={styles.paystubCount}>{paystubs.length} available</span>}
          </div>
          <div className={styles.paystubList}>
            {paystubs.map((stub) => {
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
                    <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: stub.currency }).format(stub.net_pay)}</strong>
                  </div>
                  <button type="button" className={styles.button} onClick={() => downloadPaystub(stub)}>Download PDF</button>
                </article>
              );
            })}
            {!paystubs.length && <div className={styles.empty}>No generated pay statements yet. New monthly payslips will appear here after payroll is finalized.</div>}
          </div>
        </section>
        {isOwnerRole(data.role) && Boolean(data.directory?.length) && (
          <section className={`${styles.card} ${styles.full}`}><h2>Staff directory</h2><p className={styles.muted}>Only names and portal roles are shared.</p><div className={styles.directory}>{data.directory.map((person)=><div className={styles.person} key={person.user_id}><strong>{person.first_name || 'Profile'} {person.last_name || 'incomplete'}</strong><span>{formatRole(person.role)}</span></div>)}</div></section>
        )}
        <section className={`${styles.card} ${styles.full}`}><h2>Notifications</h2><div className={styles.list}>{data.notifications?.map((notice)=><div className={`${styles.notification} ${notice.read_at ? styles.notificationRead : ''}`} key={notice.id}><strong>{notice.title}</strong><div className={styles.muted} style={{margin:0}}>{notice.message}</div></div>)}{!data.notifications?.length && <div className={styles.empty}>No notifications.</div>}</div>{data.notifications?.some((n)=>!n.read_at) && <div className={styles.actions}><button className={`${styles.button} ${styles.secondary}`} onClick={async()=>{await hrAction('mark_notifications_read');await load();}}>Mark all read</button></div>}</section>
      </div>
    </AdminLayout>
  );
}
