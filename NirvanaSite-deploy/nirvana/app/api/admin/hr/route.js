import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../src/lib/server/supabaseAdmin";
import { decryptBankPayload, encryptBankPayload, lastFour } from "../../../../src/lib/server/hrCrypto";
import {
  computePayrollTotals,
  countBusinessDays,
  countLeaveDays,
  leaveBalance,
  salaryLineItemsForPeriod,
  variablePayLineForPeriod,
} from "../../../../src/lib/hr";
import { createPaystubPdf } from "../../../../src/lib/server/paystubPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });

const cleanText = (value, max = 500) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
};

const throwStatus = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

async function audit(adminClient, actorId, eventType, entityType, entityId, subjectId, metadata = {}) {
  const { error } = await adminClient.from("hr_audit_events").insert({
    actor_user_id: actorId,
    subject_user_id: subjectId || null,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    metadata,
  });
  if (error) throw error;
}

async function assertEmployee(adminClient, userId) {
  const { data, error } = await adminClient
    .from("employee_directory")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throwStatus("Employee not found.", 404);
}

async function directoryWithRoles(adminClient) {
  const [{ data: directory, error: directoryError }, { data: roles, error: rolesError }] = await Promise.all([
    adminClient.from("employee_directory").select("user_id, first_name, last_name").order("first_name"),
    adminClient.from("admin_users").select("user_id, role"),
  ]);
  if (directoryError) throw directoryError;
  if (rolesError) throw rolesError;
  const roleMap = new Map((roles || []).map((row) => [row.user_id, row.role]));
  return (directory || []).map((row) => ({ ...row, role: roleMap.get(row.user_id) || "employee" }));
}

async function getSummary(adminClient, user, role) {
  const year = new Date().getUTCFullYear();
  const [directory, profileResult, compensationResult, bankResult, entitlementResult, requestsResult, paystubsResult, notificationsResult] =
    await Promise.all([
      directoryWithRoles(adminClient),
      adminClient.from("employee_private_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      adminClient.from("employee_compensation").select("*").eq("user_id", user.id).order("effective_from", { ascending: false }),
      adminClient.from("employee_bank_accounts").select("bank_name, account_type, account_last4, routing_last4, updated_at").eq("user_id", user.id).maybeSingle(),
      adminClient.from("leave_entitlements").select("*").eq("user_id", user.id).eq("calendar_year", year).maybeSingle(),
      adminClient.from("leave_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      adminClient.from("employee_paystubs").select("*, payroll_runs(period_start, period_end, pay_date, status)").eq("user_id", user.id).order("created_at", { ascending: false }),
      adminClient.from("employee_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
  for (const result of [profileResult, compensationResult, bankResult, entitlementResult, requestsResult, paystubsResult, notificationsResult]) {
    if (result.error) throw result.error;
  }
  const ownDirectory = directory.find((entry) => entry.user_id === user.id) || null;
  const requests = requestsResult.data || [];
  return {
    role,
    email: user.email,
    directory: role === "owner" ? directory : [],
    profile: { ...(ownDirectory || {}), ...(profileResult.data || {}) },
    compensation: compensationResult.data || [],
    bank: bankResult.data || null,
    leave: {
      year,
      entitlement: entitlementResult.data || null,
      balance: leaveBalance(entitlementResult.data?.allowance_days || 0, requests),
      requests,
    },
    paystubs: paystubsResult.data || [],
    notifications: notificationsResult.data || [],
  };
}

async function getPeople(adminClient) {
  const year = new Date().getUTCFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [directory, privateResult, compensationResult, bankResult, entitlementResult, leaveResult, authResult] = await Promise.all([
    directoryWithRoles(adminClient),
    adminClient.from("employee_private_profiles").select("*"),
    adminClient.from("employee_compensation").select("*").lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`).order("effective_from", { ascending: false }),
    adminClient.from("employee_bank_accounts").select("user_id, bank_name, account_type, account_last4, routing_last4, updated_at"),
    adminClient.from("leave_entitlements").select("*").eq("calendar_year", year),
    adminClient.from("leave_requests").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  for (const result of [privateResult, compensationResult, bankResult, entitlementResult, leaveResult]) {
    if (result.error) throw result.error;
  }
  if (authResult.error) throw authResult.error;
  const byId = (rows) => new Map((rows || []).map((row) => [row.user_id, row]));
  const privateById = byId(privateResult.data);
  const compById = new Map();
  for (const row of compensationResult.data || []) {
    if (!compById.has(row.user_id)) compById.set(row.user_id, row);
  }
  const bankById = byId(bankResult.data);
  const entitlementById = byId(entitlementResult.data);
  const leaveById = new Map();
  for (const request of leaveResult.data || []) leaveById.set(request.user_id, [...(leaveById.get(request.user_id) || []), request]);
  const authById = new Map((authResult.data?.users || []).map((row) => [row.id, row]));
  return directory.map((employee) => ({
    ...employee,
    email: authById.get(employee.user_id)?.email || "",
    last_sign_in_at: authById.get(employee.user_id)?.last_sign_in_at || null,
    private_profile: privateById.get(employee.user_id) || null,
    compensation: compById.get(employee.user_id) || null,
    bank: bankById.get(employee.user_id) || null,
    entitlement: entitlementById.get(employee.user_id) || null,
    leave_requests: leaveById.get(employee.user_id) || [],
  }));
}

function preparePaystubItems(requestedItems, compensation, run) {
  const salaryItems = salaryLineItemsForPeriod(compensation, run.period_start, run.period_end);
  const requiredVariablePay = variablePayLineForPeriod(compensation, run.period_start, run.period_end);
  const items = Array.isArray(requestedItems) && requestedItems.length ? [...requestedItems] : salaryItems;
  const withoutVariablePay = items.filter((item) => (item.line_type || item.lineType) !== "variable_pay");
  if (requiredVariablePay) {
    const regularIndex = withoutVariablePay.findIndex((item) => (item.line_type || item.lineType) === "regular_earnings");
    withoutVariablePay.splice(regularIndex >= 0 ? regularIndex + 1 : 0, 0, requiredVariablePay);
  }
  return withoutVariablePay.map((item, index) => ({
    line_type: item.line_type || item.lineType,
    description: cleanText(item.description, 160) || "Payroll item",
    amount: Number(item.amount),
    sort_order: index,
  }));
}

export async function GET(request) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "summary";
    if (view === "summary") return noStore(await getSummary(adminClient, user, role));
    if (view === "people") {
      if (role !== "owner") throwStatus("Owner access required.", 403);
      const people = await getPeople(adminClient);
      await audit(adminClient, user.id, "people_workspace_viewed", "employee_profiles", null, null, { employee_count: people.length });
      return noStore({ role, people });
    }
    if (view === "payroll") {
      if (role !== "owner") throwStatus("Owner access required.", 403);
      const [runsResult, paystubsResult, people] = await Promise.all([
        adminClient.from("payroll_runs").select("*").order("pay_date", { ascending: false }),
        adminClient.from("employee_paystubs").select("*, paystub_line_items(*)").order("created_at", { ascending: false }),
        getPeople(adminClient),
      ]);
      if (runsResult.error) throw runsResult.error;
      if (paystubsResult.error) throw paystubsResult.error;
      return noStore({ role, runs: runsResult.data || [], paystubs: paystubsResult.data || [], people });
    }
    if (view === "bank") {
      const targetId = searchParams.get("userId") || user.id;
      if (targetId !== user.id && role !== "owner") throwStatus("Forbidden.", 403);
      const { data, error } = await adminClient.from("employee_bank_accounts").select("*").eq("user_id", targetId).maybeSingle();
      if (error) throw error;
      if (!data) return noStore({ bank: null });
      await audit(adminClient, user.id, "bank_revealed", "bank_account", targetId, targetId);
      return noStore({
        bank: {
          bank_name: data.bank_name,
          account_type: data.account_type,
          ...decryptBankPayload(data),
        },
      });
    }
    throwStatus("Unknown HR view.", 404);
  } catch (error) {
    return noStore({ error: error.message || "HR request failed." }, error.status || 500);
  }
}

export async function POST(request) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const body = await request.json();
    const action = String(body.action || "");
    const ownerOnly = () => {
      if (role !== "owner") throwStatus("Owner access required.", 403);
    };

    if (action === "update_profile") {
      const targetId = body.userId || user.id;
      if (targetId !== user.id && role !== "owner") throwStatus("Forbidden.", 403);
      await assertEmployee(adminClient, targetId);
      const directory = {
        user_id: targetId,
        first_name: cleanText(body.firstName, 100) || "",
        last_name: cleanText(body.lastName, 100) || "",
      };
      const privateProfile = {
        user_id: targetId,
        phone: cleanText(body.phone, 50),
        address_line_1: cleanText(body.addressLine1, 200),
        address_line_2: cleanText(body.addressLine2, 200),
        city: cleanText(body.city, 100),
        region: cleanText(body.region, 100),
        postal_code: cleanText(body.postalCode, 30),
        country: cleanText(body.country, 100),
      };
      if (role === "owner") {
        privateProfile.job_title = cleanText(body.jobTitle, 150);
        privateProfile.hire_date = body.hireDate || null;
        privateProfile.employment_status = body.employmentStatus === "inactive" ? "inactive" : "active";
      }
      const [{ error: directoryError }, { error: profileError }] = await Promise.all([
        adminClient.from("employee_directory").upsert(directory),
        adminClient.from("employee_private_profiles").upsert(privateProfile),
      ]);
      if (directoryError) throw directoryError;
      if (profileError) throw profileError;
      await audit(adminClient, user.id, "profile_updated", "employee_profile", targetId, targetId);
      return noStore({ ok: true });
    }

    if (action === "update_bank") {
      const targetId = body.userId || user.id;
      if (targetId !== user.id && role !== "owner") throwStatus("Forbidden.", 403);
      await assertEmployee(adminClient, targetId);
      const accountNumber = String(body.accountNumber || "").replace(/\s+/g, "");
      const routingNumber = String(body.routingNumber || "").replace(/\s+/g, "");
      if (!/^\d{4,34}$/.test(accountNumber) || !/^\d{4,20}$/.test(routingNumber)) {
        throwStatus("Account and routing numbers must contain valid digits.");
      }
      if (!["checking", "savings"].includes(body.accountType)) throwStatus("Choose a valid account type.");
      const encrypted = encryptBankPayload({ accountNumber, routingNumber });
      const { error } = await adminClient.from("employee_bank_accounts").upsert({
        user_id: targetId,
        bank_name: cleanText(body.bankName, 150),
        account_type: body.accountType,
        account_last4: lastFour(accountNumber),
        routing_last4: lastFour(routingNumber),
        ...encrypted,
      });
      if (error) throw error;
      await audit(adminClient, user.id, "bank_updated", "bank_account", targetId, targetId);
      return noStore({ ok: true });
    }

    if (action === "submit_leave") {
      const requestedDays = countLeaveDays(body.startDate, body.endDate, body.dayPortion || "full");
      const year = new Date(`${body.startDate}T00:00:00Z`).getUTCFullYear();
      const [{ data: entitlement, error: entitlementError }, { data: requests, error: requestsError }, { data: profile, error: profileError }, { data: overlaps, error: overlapError }] = await Promise.all([
        adminClient.from("leave_entitlements").select("allowance_days").eq("user_id", user.id).eq("calendar_year", year).maybeSingle(),
        adminClient.from("leave_requests").select("requested_days, status").eq("user_id", user.id).gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`),
        adminClient.from("employee_private_profiles").select("employment_status").eq("user_id", user.id).maybeSingle(),
        adminClient.from("leave_requests").select("id").eq("user_id", user.id).in("status", ["pending", "approved"]).lte("start_date", body.endDate).gte("end_date", body.startDate).limit(1),
      ]);
      if (entitlementError) throw entitlementError;
      if (requestsError) throw requestsError;
      if (profileError) throw profileError;
      if (overlapError) throw overlapError;
      if (profile?.employment_status === "inactive") throwStatus("Inactive employees cannot request leave.", 403);
      if (overlaps?.length) throwStatus("This request overlaps existing pending or approved leave.");
      const balance = leaveBalance(entitlement?.allowance_days || 0, requests || []);
      if (requestedDays > balance.available) throwStatus("This request exceeds your available leave balance.");
      const { data, error } = await adminClient.from("leave_requests").insert({
        user_id: user.id,
        start_date: body.startDate,
        end_date: body.endDate,
        day_portion: body.dayPortion || "full",
        requested_days: requestedDays,
        reason: cleanText(body.reason, 1000),
      }).select().single();
      if (error) throw error;
      await audit(adminClient, user.id, "leave_submitted", "leave_request", data.id, user.id, { requested_days: requestedDays });
      return noStore({ request: data });
    }

    if (action === "cancel_leave") {
      const { data: leave, error: findError } = await adminClient.from("leave_requests").select("*").eq("id", body.requestId).maybeSingle();
      if (findError) throw findError;
      if (!leave || leave.user_id !== user.id || leave.status !== "pending") throwStatus("Only your pending request can be cancelled.", 403);
      const { error } = await adminClient.from("leave_requests").update({ status: "cancelled" }).eq("id", leave.id);
      if (error) throw error;
      await audit(adminClient, user.id, "leave_cancelled", "leave_request", leave.id, user.id);
      return noStore({ ok: true });
    }

    if (action === "set_entitlement") {
      ownerOnly();
      const targetId = String(body.userId || "");
      const year = Number(body.year);
      const allowance = Number(body.allowanceDays);
      if (!targetId || !Number.isInteger(year) || allowance < 0) throwStatus("Valid employee, year, and allowance are required.");
      await assertEmployee(adminClient, targetId);
      const { data: requests, error: requestsError } = await adminClient
        .from("leave_requests").select("requested_days, status").eq("user_id", targetId)
        .gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
      if (requestsError) throw requestsError;
      const committed = (requests || []).filter((row) => ["pending", "approved"].includes(row.status))
        .reduce((sum, row) => sum + Number(row.requested_days), 0);
      const overrideReason = cleanText(body.overrideReason, 500);
      if (allowance < committed && !overrideReason) throwStatus("An override reason is required below committed leave.");
      const { error } = await adminClient.from("leave_entitlements").upsert({
        user_id: targetId,
        calendar_year: year,
        allowance_days: allowance,
        override_reason: overrideReason,
        updated_by: user.id,
      }, { onConflict: "user_id,calendar_year" });
      if (error) throw error;
      await audit(adminClient, user.id, "leave_entitlement_updated", "leave_entitlement", `${targetId}:${year}`, targetId, { allowance_days: allowance, override: Boolean(overrideReason) });
      return noStore({ ok: true });
    }

    if (action === "review_leave") {
      ownerOnly();
      const decision = String(body.decision || "");
      if (!["approved", "rejected", "reversed"].includes(decision)) throwStatus("Invalid leave decision.");
      const { data: leave, error: findError } = await adminClient.from("leave_requests").select("*").eq("id", body.requestId).maybeSingle();
      if (findError) throw findError;
      if (!leave) throwStatus("Leave request not found.", 404);
      if (decision === "reversed" ? leave.status !== "approved" : leave.status !== "pending") {
        throwStatus("The leave request is no longer eligible for this decision.");
      }
      const { error } = await adminClient.from("leave_requests").update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        decision_note: cleanText(body.note, 1000),
      }).eq("id", leave.id);
      if (error) throw error;
      await adminClient.from("employee_notifications").insert({
        user_id: leave.user_id,
        kind: "leave_decision",
        title: `Leave ${decision}`,
        message: `Your ${leave.requested_days}-day leave request is ${decision}.`,
        action_url: "/admin/leave",
      });
      await audit(adminClient, user.id, `leave_${decision}`, "leave_request", leave.id, leave.user_id);
      return noStore({ ok: true });
    }

    if (action === "set_compensation") {
      ownerOnly();
      const targetId = String(body.userId || "");
      const salary = Number(body.annualSalary);
      const variablePay = body.variablePay === "" || body.variablePay == null ? 0 : Number(body.variablePay);
      const variablePayFrequency = String(body.variablePayFrequency || "monthly");
      const salaryNote = cleanText(body.salaryNote, 1000);
      const currency = String(body.currency || "USD").toUpperCase();
      const frequency = String(body.payFrequency || "");
      const effectiveFrom = body.effectiveFrom;
      if (!targetId || !Number.isFinite(salary) || salary < 0 || !Number.isFinite(variablePay) || variablePay < 0 || !["monthly", "annually"].includes(variablePayFrequency) || !/^[A-Z]{3}$/.test(currency) || !["weekly", "biweekly", "semimonthly", "monthly"].includes(frequency) || !effectiveFrom) {
        throwStatus("Valid salary settings are required.");
      }
      await assertEmployee(adminClient, targetId);
      const { data: currentCompensation, error: currentError } = await adminClient
        .from("employee_compensation").select("id, effective_from").eq("user_id", targetId).is("effective_to", null).maybeSingle();
      if (currentError) throw currentError;
      if (currentCompensation && currentCompensation.effective_from > effectiveFrom) {
        throwStatus("A new salary term cannot start before the current salary term.");
      }
      if (currentCompensation?.effective_from === effectiveFrom) {
        const { error: updateError } = await adminClient.from("employee_compensation").update({
          annual_salary: salary,
          variable_pay: variablePay,
          variable_pay_frequency: variablePayFrequency,
          salary_note: salaryNote,
          currency,
          pay_frequency: frequency,
        }).eq("id", currentCompensation.id);
        if (updateError) throw updateError;
        await audit(adminClient, user.id, "compensation_updated", "employee_compensation", currentCompensation.id, targetId, { currency, pay_frequency: frequency, variable_pay_frequency: variablePayFrequency, effective_from: effectiveFrom });
        return noStore({ ok: true });
      }
      const dayBefore = new Date(`${effectiveFrom}T00:00:00Z`);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const { error: closeError } = await adminClient.from("employee_compensation")
        .update({ effective_to: dayBefore.toISOString().slice(0, 10) }).eq("user_id", targetId).is("effective_to", null).lt("effective_from", effectiveFrom);
      if (closeError) throw closeError;
      const { error } = await adminClient.from("employee_compensation").insert({
        user_id: targetId,
        annual_salary: salary,
        variable_pay: variablePay,
        variable_pay_frequency: variablePayFrequency,
        salary_note: salaryNote,
        currency,
        pay_frequency: frequency,
        effective_from: effectiveFrom,
        created_by: user.id,
      });
      if (error) throw error;
      await audit(adminClient, user.id, "compensation_updated", "employee_compensation", targetId, targetId, { currency, pay_frequency: frequency, variable_pay_frequency: variablePayFrequency, effective_from: effectiveFrom });
      return noStore({ ok: true });
    }

    if (action === "create_payroll_run") {
      ownerOnly();
      if (!body.periodStart || !body.periodEnd || !body.payDate) throwStatus("Payroll dates are required.");
      if (body.periodEnd < body.periodStart) throwStatus("Payroll period end cannot be before its start.");
      const runCurrency = String(body.currency || "USD").toUpperCase();
      if (!/^[A-Z]{3}$/.test(runCurrency)) throwStatus("Use a three-letter currency code.");
      const { data, error } = await adminClient.from("payroll_runs").insert({
        period_start: body.periodStart,
        period_end: body.periodEnd,
        pay_date: body.payDate,
        currency: runCurrency,
        notes: cleanText(body.notes, 1000),
        created_by: user.id,
      }).select().single();
      if (error) throw error;
      await audit(adminClient, user.id, "payroll_run_created", "payroll_run", data.id, null);
      return noStore({ run: data });
    }

    if (action === "delete_payroll_run") {
      ownerOnly();
      const runId = String(body.runId || "");
      const { data: run, error: runError } = await adminClient
        .from("payroll_runs")
        .select("id, status")
        .eq("id", runId)
        .maybeSingle();
      if (runError) throw runError;
      if (!run) throwStatus("Payroll run not found.", 404);

      const { data: paystubs, error: findPaystubsError } = await adminClient
        .from("employee_paystubs")
        .select("id, pdf_path")
        .eq("payroll_run_id", run.id);
      if (findPaystubsError) throw findPaystubsError;

      const pdfPaths = (paystubs || []).map((paystub) => paystub.pdf_path).filter(Boolean);
      for (let index = 0; index < pdfPaths.length; index += 100) {
        const { error: storageError } = await adminClient.storage
          .from("paystubs")
          .remove(pdfPaths.slice(index, index + 100));
        if (storageError) throw storageError;
      }

      const { error: paystubError } = await adminClient
        .from("employee_paystubs")
        .delete()
        .eq("payroll_run_id", run.id);
      if (paystubError) throw paystubError;

      const { data: deletedRun, error: deleteError } = await adminClient
        .from("payroll_runs")
        .delete()
        .eq("id", run.id)
        .select("id")
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!deletedRun) throwStatus("Payroll run was not deleted.", 409);

      await audit(adminClient, user.id, "payroll_run_deleted", "payroll_run", run.id, null, {
        previous_status: run.status,
        deleted_paystub_count: (paystubs || []).length,
        deleted_pdf_count: pdfPaths.length,
      });
      return noStore({ ok: true, deletedPdfCount: pdfPaths.length });
    }

    if (action === "save_payroll_run_draft") {
      ownerOnly();
      const runId = String(body.runId || "");
      const submittedEmployees = Array.isArray(body.employees) ? body.employees : [];
      const submittedById = new Map(submittedEmployees.map((entry) => [String(entry.userId || ""), entry]));
      const { data: run, error: runError } = await adminClient.from("payroll_runs").select("*").eq("id", runId).maybeSingle();
      if (runError) throw runError;
      if (!run || run.status !== "draft") throwStatus("Only draft payroll runs can be saved.");

      const [profilesResult, directoryResult, existingResult] = await Promise.all([
        adminClient.from("employee_private_profiles").select("user_id, job_title").eq("employment_status", "active"),
        adminClient.from("employee_directory").select("user_id, first_name, last_name"),
        adminClient.from("employee_paystubs").select("id, user_id").eq("payroll_run_id", run.id),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (directoryResult.error) throw directoryResult.error;
      if (existingResult.error) throw existingResult.error;
      const activeProfiles = profilesResult.data || [];
      const directory = directoryResult.data || [];
      const existingPaystubs = existingResult.data || [];
      const activeIds = activeProfiles.map((profile) => profile.user_id);
      if (!activeIds.length) throwStatus("No active employees are available for this payroll run.");
      const missingSubmissions = activeIds.filter((employeeId) => !submittedById.has(employeeId));
      const unexpectedSubmissions = [...submittedById.keys()].filter((employeeId) => !activeIds.includes(employeeId));
      if (missingSubmissions.length || unexpectedSubmissions.length) {
        throwStatus("The payroll draft must include every active employee and no inactive employees. Refresh and try again.", 409);
      }

      const [compensationResult, priorVoidResult] = await Promise.all([
        adminClient.from("employee_compensation").select("*").in("user_id", activeIds).lte("effective_from", run.pay_date).or(`effective_to.is.null,effective_to.gte.${run.pay_date}`).order("effective_from", { ascending: false }),
        adminClient.from("employee_paystubs").select("id, user_id, payroll_runs!inner(period_start, period_end, status)").in("user_id", activeIds).eq("payroll_runs.status", "void").eq("payroll_runs.period_start", run.period_start).eq("payroll_runs.period_end", run.period_end),
      ]);
      if (compensationResult.error) throw compensationResult.error;
      if (priorVoidResult.error) throw priorVoidResult.error;

      const directoryById = new Map(directory.map((entry) => [entry.user_id, entry]));
      const profileById = new Map(activeProfiles.map((entry) => [entry.user_id, entry]));
      const compensationById = new Map();
      for (const compensation of compensationResult.data || []) {
        if (!compensationById.has(compensation.user_id)) compensationById.set(compensation.user_id, compensation);
      }
      const priorVoidById = new Map();
      for (const priorVoid of priorVoidResult.data || []) {
        if (!priorVoidById.has(priorVoid.user_id)) priorVoidById.set(priorVoid.user_id, priorVoid.id);
      }
      const employeesMissingSalary = activeIds.filter((employeeId) => !compensationById.has(employeeId));
      if (employeesMissingSalary.length) {
        const names = employeesMissingSalary.map((employeeId) => {
          const employee = directoryById.get(employeeId);
          return `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() || "Unnamed employee";
        });
        throwStatus(`Add salary information for: ${names.join(", ")}.`, 409);
      }

      const preparedById = new Map();
      const paystubRows = activeIds.map((employeeId) => {
        const compensation = compensationById.get(employeeId);
        const employee = directoryById.get(employeeId) || {};
        const items = preparePaystubItems(submittedById.get(employeeId)?.items, compensation, run);
        const totals = computePayrollTotals(items);
        if (totals.netPay < 0) throwStatus(`Net pay cannot be negative for ${employee.first_name || "an employee"}.`);
        preparedById.set(employeeId, items);
        return {
          payroll_run_id: run.id,
          user_id: employeeId,
          employee_name_snapshot: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Employee",
          job_title_snapshot: profileById.get(employeeId)?.job_title || null,
          annual_salary_snapshot: compensation.annual_salary,
          pay_frequency_snapshot: compensation.pay_frequency,
          variable_pay_snapshot: compensation.variable_pay || 0,
          variable_pay_frequency_snapshot: compensation.variable_pay_frequency || "monthly",
          salary_note_snapshot: compensation.salary_note || null,
          currency: compensation.currency,
          gross_pay: totals.grossPay,
          employee_taxes: totals.employeeTaxes,
          deductions: totals.deductions,
          reimbursements: totals.reimbursements,
          employer_taxes: totals.employerTaxes,
          net_pay: totals.netPay,
          replacement_for: priorVoidById.get(employeeId) || null,
        };
      });

      const { data: savedPaystubs, error: saveError } = await adminClient.from("employee_paystubs")
        .upsert(paystubRows, { onConflict: "payroll_run_id,user_id" }).select();
      if (saveError) throw saveError;
      const savedByUserId = new Map((savedPaystubs || []).map((paystub) => [paystub.user_id, paystub]));
      const savedIds = (savedPaystubs || []).map((paystub) => paystub.id);
      if (savedIds.length) {
        const { error: deleteItemsError } = await adminClient.from("paystub_line_items").delete().in("paystub_id", savedIds);
        if (deleteItemsError) throw deleteItemsError;
        const lineItems = activeIds.flatMap((employeeId) => {
          const paystub = savedByUserId.get(employeeId);
          return (preparedById.get(employeeId) || []).map((item) => ({ ...item, paystub_id: paystub.id }));
        });
        if (lineItems.length) {
          const { error: insertItemsError } = await adminClient.from("paystub_line_items").insert(lineItems);
          if (insertItemsError) throw insertItemsError;
        }
      }

      const stalePaystubIds = existingPaystubs.filter((paystub) => !activeIds.includes(paystub.user_id)).map((paystub) => paystub.id);
      if (stalePaystubIds.length) {
        const { error: staleError } = await adminClient.from("employee_paystubs").delete().in("id", stalePaystubIds);
        if (staleError) throw staleError;
      }
      await audit(adminClient, user.id, "payroll_run_draft_saved", "payroll_run", run.id, null, { employee_count: activeIds.length });
      return noStore({ ok: true, employeeCount: activeIds.length });
    }

    if (action === "save_paystub") {
      ownerOnly();
      const { data: run, error: runError } = await adminClient.from("payroll_runs").select("*").eq("id", body.runId).maybeSingle();
      if (runError) throw runError;
      if (!run || run.status !== "draft") throwStatus("Only draft payroll runs can be edited.");
      const targetId = String(body.userId || "");
      await assertEmployee(adminClient, targetId);
      const [{ data: directory, error: directoryError }, { data: profile, error: profileError }, { data: compensation, error: compensationError }] = await Promise.all([
        adminClient.from("employee_directory").select("*").eq("user_id", targetId).single(),
        adminClient.from("employee_private_profiles").select("job_title").eq("user_id", targetId).maybeSingle(),
        adminClient.from("employee_compensation").select("*").eq("user_id", targetId).lte("effective_from", run.pay_date).or(`effective_to.is.null,effective_to.gte.${run.pay_date}`).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (directoryError) throw directoryError;
      if (profileError) throw profileError;
      if (compensationError) throw compensationError;
      if (!compensation) throwStatus("Add salary information before creating this paystub.");
      const sanitizedItems = preparePaystubItems(body.items, compensation, run);
      const totals = computePayrollTotals(sanitizedItems);
      if (totals.netPay < 0) throwStatus("Net pay cannot be negative.");
      let replacementFor = body.replacementFor || null;
      if (!replacementFor) {
        const { data: priorVoid, error: priorVoidError } = await adminClient.from("employee_paystubs")
          .select("id, payroll_runs!inner(period_start, period_end, status)")
          .eq("user_id", targetId)
          .eq("payroll_runs.status", "void")
          .eq("payroll_runs.period_start", run.period_start)
          .eq("payroll_runs.period_end", run.period_end)
          .limit(1)
          .maybeSingle();
        if (priorVoidError) throw priorVoidError;
        replacementFor = priorVoid?.id || null;
      }
      const { data: paystub, error: paystubError } = await adminClient.from("employee_paystubs").upsert({
        payroll_run_id: run.id,
        user_id: targetId,
        employee_name_snapshot: `${directory.first_name || ""} ${directory.last_name || ""}`.trim() || "Employee",
        job_title_snapshot: profile?.job_title || null,
        annual_salary_snapshot: compensation.annual_salary,
        pay_frequency_snapshot: compensation.pay_frequency,
        variable_pay_snapshot: compensation.variable_pay || 0,
        variable_pay_frequency_snapshot: compensation.variable_pay_frequency || "monthly",
        salary_note_snapshot: compensation.salary_note || null,
        currency: compensation.currency,
        gross_pay: totals.grossPay,
        employee_taxes: totals.employeeTaxes,
        deductions: totals.deductions,
        reimbursements: totals.reimbursements,
        employer_taxes: totals.employerTaxes,
        net_pay: totals.netPay,
        replacement_for: replacementFor,
      }, { onConflict: "payroll_run_id,user_id" }).select().single();
      if (paystubError) throw paystubError;
      const { error: deleteError } = await adminClient.from("paystub_line_items").delete().eq("paystub_id", paystub.id);
      if (deleteError) throw deleteError;
      const { error: itemsError } = await adminClient.from("paystub_line_items").insert(sanitizedItems.map((item) => ({ ...item, paystub_id: paystub.id })));
      if (itemsError) throw itemsError;
      return noStore({ paystub: { ...paystub, paystub_line_items: sanitizedItems } });
    }

    if (action === "finalize_payroll_run") {
      ownerOnly();
      const { data: run, error: runError } = await adminClient.from("payroll_runs").select("*").eq("id", body.runId).maybeSingle();
      if (runError) throw runError;
      if (!run || run.status !== "draft") throwStatus("Only draft payroll runs can be finalized.");
      const [stubsResult, activeProfilesResult] = await Promise.all([
        adminClient.from("employee_paystubs").select("*, paystub_line_items(*)").eq("payroll_run_id", run.id),
        adminClient.from("employee_private_profiles").select("user_id").eq("employment_status", "active"),
      ]);
      if (stubsResult.error) throw stubsResult.error;
      if (activeProfilesResult.error) throw activeProfilesResult.error;
      const paystubs = stubsResult.data || [];
      const paystubUserIds = new Set(paystubs.map((paystub) => paystub.user_id));
      const missingEmployeeCount = (activeProfilesResult.data || []).filter((profile) => !paystubUserIds.has(profile.user_id)).length;
      if (!paystubs.length || missingEmployeeCount) {
        throwStatus(`Save the entire draft before finalizing. ${missingEmployeeCount || "All"} active employee(s) are missing.`, 409);
      }
      for (let index = 0; index < paystubs.length; index += 1) {
        const stub = paystubs[index];
        const paystubNumber = stub.paystub_number || `PS-${run.pay_date.slice(0, 4)}-${run.id.slice(0, 6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
        const { data: history, error: historyError } = await adminClient.from("employee_paystubs")
          .select("gross_pay, employee_taxes, net_pay, payroll_runs!inner(pay_date, status)").eq("user_id", stub.user_id);
        if (historyError) throw historyError;
        const year = run.pay_date.slice(0, 4);
        const prior = (history || []).filter((entry) => entry.payroll_runs?.pay_date?.startsWith(year) && ["finalized", "paid"].includes(entry.payroll_runs?.status));
        const ytd = {
          grossPay: prior.reduce((sum, row) => sum + Number(row.gross_pay), 0) + Number(stub.gross_pay),
          employeeTaxes: prior.reduce((sum, row) => sum + Number(row.employee_taxes), 0) + Number(stub.employee_taxes),
          netPay: prior.reduce((sum, row) => sum + Number(row.net_pay), 0) + Number(stub.net_pay),
        };
        const pdf = await createPaystubPdf({
          companyName: process.env.PAYSTUB_COMPANY_NAME || "Nirvana Luxury Vacations",
          run,
          paystub: { ...stub, paystub_number: paystubNumber },
          items: stub.paystub_line_items || [],
          ytd,
        });
        const path = `${stub.user_id}/${run.id}/${stub.id}.pdf`;
        const { error: uploadError } = await adminClient.storage.from("paystubs").upload(path, pdf, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw uploadError;
        const { error: updateError } = await adminClient.from("employee_paystubs").update({ paystub_number: paystubNumber, pdf_path: path }).eq("id", stub.id);
        if (updateError) throw updateError;
      }
      const timestamp = new Date().toISOString();
      const { error: finalizeError } = await adminClient.from("payroll_runs").update({ status: "finalized", finalized_by: user.id, finalized_at: timestamp }).eq("id", run.id);
      if (finalizeError) throw finalizeError;
      const notifications = paystubs.map((stub) => ({ user_id: stub.user_id, kind: "paystub_ready", title: "New paystub available", message: `Your paystub for ${run.period_start} through ${run.period_end} is ready.`, action_url: "/admin/profile" }));
      await adminClient.from("employee_notifications").insert(notifications);
      await audit(adminClient, user.id, "payroll_run_finalized", "payroll_run", run.id, null, { employee_count: paystubs.length });
      return noStore({ ok: true });
    }

    if (action === "set_payroll_status") {
      ownerOnly();
      const status = String(body.status || "");
      const { data: run, error: findError } = await adminClient.from("payroll_runs").select("*").eq("id", body.runId).maybeSingle();
      if (findError) throw findError;
      if (!run) throwStatus("Payroll run not found.", 404);
      if (status === "paid" && run.status !== "finalized") throwStatus("Only finalized payroll can be marked paid.");
      if (status === "void" && !["finalized", "paid"].includes(run.status)) throwStatus("Only finalized or paid payroll can be voided.");
      if (!["paid", "void"].includes(status)) throwStatus("Invalid payroll status.");
      const patch = status === "paid" ? { status, paid_at: new Date().toISOString() } : { status, voided_at: new Date().toISOString() };
      const { error } = await adminClient.from("payroll_runs").update(patch).eq("id", run.id);
      if (error) throw error;
      await audit(adminClient, user.id, `payroll_run_${status}`, "payroll_run", run.id, null);
      return noStore({ ok: true });
    }

    if (action === "mark_notifications_read") {
      const { error } = await adminClient.from("employee_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
      if (error) throw error;
      return noStore({ ok: true });
    }

    throwStatus("Unknown HR action.", 404);
  } catch (error) {
    return noStore({ error: error.message || "HR request failed." }, error.status || 500);
  }
}
