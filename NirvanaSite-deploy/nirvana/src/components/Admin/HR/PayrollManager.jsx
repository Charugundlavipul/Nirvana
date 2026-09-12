import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../AdminLayout";
import { downloadPaystub, getPayroll, hrAction } from "../../../lib/hrApi";
import { computePayrollTotals, salaryLineItemsForPeriod } from "../../../lib/hr";
import styles from "./Hr.module.css";

const today = new Date().toISOString().slice(0, 10);
const lineTypes = [
  ["regular_earnings", "Regular earnings"],
  ["variable_pay", "Variable pay"],
  ["additional_earnings", "Additional earnings"],
  ["employee_tax", "Employee tax"],
  ["pretax_deduction", "Pre-tax deduction"],
  ["posttax_deduction", "Post-tax deduction"],
  ["reimbursement", "Reimbursement"],
  ["employer_tax", "Employer tax"],
];

const isActive = (person) => person.private_profile?.employment_status !== "inactive";

export default function PayrollManager() {
  const [role, setRole] = useState(null);
  const [data, setData] = useState({ runs: [], paystubs: [], people: [] });
  const [runId, setRunId] = useState("");
  const [itemsByEmployee, setItemsByEmployee] = useState({});
  const [dirtyEmployees, setDirtyEmployees] = useState(() => new Set());
  const [form, setForm] = useState({ periodStart: today, periodEnd: today, payDate: today, currency: "USD", notes: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const result = await getPayroll();
    setRole(result.role);
    setData(result);
    setRunId((currentId) => result.runs.some((candidate) => candidate.id === currentId)
      ? currentId
      : result.runs.find((candidate) => candidate.status === "draft")?.id || result.runs[0]?.id || "");
  };

  useEffect(() => {
    load().catch((error) => {
      setRole("forbidden");
      setMessage(error.message);
    });
  }, []);

  const run = useMemo(() => data.runs.find((candidate) => candidate.id === runId), [data.runs, runId]);
  const runStubs = useMemo(() => new Map(
    data.paystubs.filter((paystub) => paystub.payroll_run_id === runId).map((paystub) => [paystub.user_id, paystub])
  ), [data.paystubs, runId]);
  const activePeople = useMemo(() => data.people.filter(isActive), [data.people]);
  const runPeople = useMemo(() => data.people.filter((person) => isActive(person) || runStubs.has(person.user_id)), [data.people, runStubs]);

  useEffect(() => {
    const nextItems = {};
    for (const person of runPeople) {
      const paystub = runStubs.get(person.user_id);
      if (paystub?.paystub_line_items?.length) {
        nextItems[person.user_id] = paystub.paystub_line_items.map((item) => ({ ...item }));
      } else if (run?.status === "draft" && isActive(person) && person.compensation) {
        nextItems[person.user_id] = salaryLineItemsForPeriod(person.compensation, run.period_start, run.period_end);
      } else {
        nextItems[person.user_id] = [];
      }
    }
    setItemsByEmployee(nextItems);
    setDirtyEmployees(new Set());
  }, [run, runPeople, runStubs]);

  const perform = async (callback, success) => {
    setBusy(true);
    setMessage("");
    try {
      await callback();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const markDirty = (employeeId) => setDirtyEmployees((current) => new Set(current).add(employeeId));
  const setEmployeeItems = (employeeId, nextItems) => {
    setItemsByEmployee((current) => ({ ...current, [employeeId]: nextItems }));
    markDirty(employeeId);
  };

  const deleteRun = (targetRun) => {
    const permanentWarning = targetRun.status === "draft"
      ? "This cannot be undone."
      : "This permanently deletes the payroll record, every employee paystub, and all stored PDF files. This cannot be undone.";
    if (window.confirm(`Delete this ${targetRun.status} payroll run for ${targetRun.period_start} through ${targetRun.period_end}? ${permanentWarning}`)) {
      perform(
        () => hrAction("delete_payroll_run", { runId: targetRun.id }),
        targetRun.status === "draft" ? "Payroll draft deleted." : "Payroll run and stored PDFs deleted."
      );
    }
  };

  const saveEntireDraft = () => perform(
    () => hrAction("save_payroll_run_draft", {
      runId: run.id,
      employees: activePeople.map((person) => ({ userId: person.user_id, items: itemsByEmployee[person.user_id] || [] })),
    }),
    `Entire payroll draft saved for ${activePeople.length} employee(s).`
  );

  const saveEmployee = (person, items) => perform(
    () => hrAction("save_paystub", { runId: run.id, userId: person.user_id, items }),
    `${person.first_name || "Employee"} ${person.last_name || ""} payroll entry saved.`.replace(/\s+/g, " ")
  );

  const missingSalaryCount = activePeople.filter((person) => !person.compensation).length;
  const activeAddedCount = activePeople.filter((person) => runStubs.has(person.user_id)).length;
  const allEmployeesAdded = activePeople.length > 0 && activePeople.every((person) => runStubs.has(person.user_id));
  const canSaveDraft = run?.status === "draft" && activePeople.length > 0 && missingSalaryCount === 0
    && activePeople.every((person) => (itemsByEmployee[person.user_id] || []).length > 0);

  if (role === null) return <AdminLayout title="Payroll" subtitle="Superadmin-entered payroll records and private paystubs"><div className={styles.card}>Loading payroll…</div></AdminLayout>;
  if (role !== "owner") return <AdminLayout title="Payroll" subtitle="Superadmin workspace"><div className={styles.alert}>{message || "Superadmin access is required."}</div></AdminLayout>;

  return (
    <AdminLayout title="Payroll" subtitle="Superadmin-entered payroll records and private paystubs">
      {message && <div className={`${styles.alert} ${/(created|saved|finalized|paid|voided|deleted)/i.test(message) ? styles.success : ""}`}>{message}</div>}
      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.full}`}>
          <h2>Create payroll run</h2>
          <div className={styles.formGrid}>
            {[["periodStart", "Period start", "date"], ["periodEnd", "Period end", "date"], ["payDate", "Pay date", "date"], ["currency", "Currency", "text"]].map(([key, label, type]) => (
              <div className={styles.field} key={key}><label>{label}</label><input type={type} maxLength={key === "currency" ? 3 : undefined} className={styles.input} value={form[key]} onChange={(event) => setForm({ ...form, [key]: key === "currency" ? event.target.value.toUpperCase() : event.target.value })} /></div>
            ))}
          </div>
          <div className={styles.actions}><button className={styles.button} disabled={busy} onClick={() => perform(() => hrAction("create_payroll_run", form), "Payroll run created.")}>Create draft</button></div>
        </section>

        <section className={`${styles.card} ${styles.full}`}>
          <h2>Payroll workspace</h2>
          <div className={styles.field}>
            <label>Payroll run</label>
            <select className={styles.select} value={runId} onChange={(event) => setRunId(event.target.value)}>
              <option value="">Select run</option>
              {data.runs.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.pay_date} · {candidate.period_start}–{candidate.period_end} · {candidate.status}</option>)}
            </select>
          </div>

          {run && <>
            <div className={styles.payrollRosterHeader}>
              <div><strong>{runPeople.length} employee(s)</strong><span>{run.status === "draft" ? `${activeAddedCount} added · ${activePeople.length - activeAddedCount} not yet added` : `${runStubs.size} included in this run`}</span></div>
              <span className={styles.badge}>{run.status}</span>
            </div>

            <div className={styles.payrollRoster}>
              {runPeople.map((person) => {
                const paystub = runStubs.get(person.user_id);
                const employeeItems = itemsByEmployee[person.user_id] || [];
                const hasSalary = Boolean(person.compensation);
                const dirty = dirtyEmployees.has(person.user_id);
                const status = !isActive(person) && !paystub ? "Inactive" : !hasSalary && !paystub ? "Missing salary" : dirty ? "Changes not saved" : paystub ? (run.status === "draft" ? "Added" : "Included") : run.status === "draft" ? "Ready to add" : "Not included";
                let totals = null;
                try { totals = employeeItems.length ? computePayrollTotals(employeeItems) : null; } catch { totals = null; }
                return (
                  <details className={styles.payrollEmployee} key={person.user_id}>
                    <summary>
                      <div className={styles.payrollEmployeeName}><strong>{person.first_name || "Profile"} {person.last_name || "incomplete"}</strong><span>{hasSalary ? `${person.compensation.currency} ${person.compensation.annual_salary} annual fixed salary · ${person.compensation.pay_frequency}` : "Salary not configured"}</span></div>
                      <span className={`${styles.badge} ${["Missing salary", "Not included"].includes(status) ? styles.badgeDanger : ["Ready to add", "Changes not saved"].includes(status) ? styles.badgePending : ""}`}>{status}</span>
                    </summary>
                    <div className={styles.payrollEmployeeBody}>
                      {!hasSalary && !paystub ? <div className={styles.empty}>Add this employee&apos;s salary in People before saving the payroll draft.</div> : <>
                        {person.compensation?.salary_note && <p className={styles.muted}>Salary note: {person.compensation.salary_note}</p>}
                        <div>{employeeItems.map((item, index) => {
                          const lockedVariablePay = item.line_type === "variable_pay";
                          const readOnly = run.status !== "draft" || lockedVariablePay;
                          return <div className={styles.lineGrid} key={item.id || `${item.line_type}-${index}`}><select disabled={readOnly} className={styles.select} value={item.line_type} onChange={(event) => setEmployeeItems(person.user_id, employeeItems.map((old, itemIndex) => itemIndex === index ? { ...old, line_type: event.target.value } : old))}>{lineTypes.map(([value, label]) => <option value={value} disabled={value === "variable_pay" && !lockedVariablePay} key={value}>{label}</option>)}</select><input disabled={readOnly} className={styles.input} value={item.description} onChange={(event) => setEmployeeItems(person.user_id, employeeItems.map((old, itemIndex) => itemIndex === index ? { ...old, description: event.target.value } : old))} /><input disabled={readOnly} type="number" min="0" step="0.01" className={styles.input} value={item.amount} onChange={(event) => setEmployeeItems(person.user_id, employeeItems.map((old, itemIndex) => itemIndex === index ? { ...old, amount: event.target.value } : old))} />{run.status === "draft" && !lockedVariablePay && <button className={`${styles.button} ${styles.danger}`} onClick={() => setEmployeeItems(person.user_id, employeeItems.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div>;
                        })}</div>
                        {run.status === "draft" && <div className={styles.actions}>
                          <button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => setEmployeeItems(person.user_id, [...employeeItems, { line_type: "additional_earnings", description: "Additional earnings", amount: 0 }])}>Add line</button>
                          <button className={styles.button} disabled={busy || !employeeItems.length || Boolean(paystub && !dirty)} onClick={() => saveEmployee(person, employeeItems)}>{paystub ? (dirty ? "Save changes" : "Added") : "Add employee"}</button>
                        </div>}
                        {totals && <div className={styles.metricRow} style={{ marginTop: 18 }}><div className={styles.metric}><span>Gross</span><strong>{totals.grossPay.toFixed(2)}</strong></div><div className={styles.metric}><span>Taxes</span><strong>{totals.employeeTaxes.toFixed(2)}</strong></div><div className={styles.metric}><span>Deductions</span><strong>{totals.deductions.toFixed(2)}</strong></div><div className={styles.metric}><span>Net</span><strong>{totals.netPay.toFixed(2)}</strong></div></div>}
                        {paystub?.pdf_path && <div className={styles.actions}><button className={`${styles.button} ${styles.secondary}`} onClick={() => downloadPaystub(paystub)}>Download paystub</button></div>}
                      </>}
                    </div>
                  </details>
                );
              })}
              {!runPeople.length && <div className={styles.empty}>No employees are available.</div>}
            </div>

            {run.status === "draft" && missingSalaryCount > 0 && <div className={styles.alert} style={{ marginTop: 16, marginBottom: 0 }}>{missingSalaryCount} active employee(s) need salary information before the entire draft can be saved.</div>}
            <div className={styles.actions}>
              {run.status === "draft" && <button className={styles.button} disabled={busy || !canSaveDraft} onClick={saveEntireDraft}>Save entire draft</button>}
              {run.status === "draft" && <button className={styles.button} disabled={busy || !allEmployeesAdded || dirtyEmployees.size > 0} onClick={() => perform(() => hrAction("finalize_payroll_run", { runId: run.id }), "Payroll finalized and paystubs generated.")}>Finalize run</button>}
              {run.status === "finalized" && <button className={styles.button} disabled={busy} onClick={() => perform(() => hrAction("set_payroll_status", { runId: run.id, status: "paid" }), "Payroll marked paid.")}>Mark paid</button>}
              {["finalized", "paid"].includes(run.status) && <button className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => perform(() => hrAction("set_payroll_status", { runId: run.id, status: "void" }), "Payroll voided.")}>Void run</button>}
              <button className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => deleteRun(run)}>{run.status === "draft" ? "Delete draft" : "Delete run"}</button>
            </div>
          </>}
        </section>

        <section className={`${styles.card} ${styles.full}`}>
          <h2>Payroll history</h2>
          <div className={styles.list}>
            {data.runs.map((historyRun) => <div className={styles.row} key={historyRun.id}><div className={styles.rowMain}><strong>Pay date {historyRun.pay_date}</strong><span>{historyRun.period_start} – {historyRun.period_end} · {data.paystubs.filter((paystub) => paystub.payroll_run_id === historyRun.id).length} employee(s)</span></div><div className={styles.actions} style={{ margin: 0 }}><span className={`${styles.badge} ${historyRun.status === "void" ? styles.badgeDanger : ""}`}>{historyRun.status}</span><button className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => deleteRun(historyRun)}>{historyRun.status === "draft" ? "Delete draft" : "Delete run"}</button></div></div>)}
            {!data.runs.length && <div className={styles.empty}>No payroll runs yet.</div>}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
