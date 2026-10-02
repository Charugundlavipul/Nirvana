import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";
import { decryptBankPayload } from "../../../../../../../src/lib/server/hrCrypto";
import { regularPayForSalary } from "../../../../../../../src/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCsvRow(fields) {
  return fields
    .map((val) => {
      const str = val === null || val === undefined ? "" : String(val);
      if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    })
    .join(",");
}

export async function GET(request, { params }) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    if (role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Superadmin access required." }, { status: 403 });
    }

    const { id } = await params;
    const { data: run, error: runError } = await adminClient
      .from("payroll_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (runError) throw runError;
    if (!run) {
      return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
    }

    if (run.status === "draft") {
      return NextResponse.json(
        { error: "Payroll run must be finalized before exporting disbursement CSV." },
        { status: 400 }
      );
    }

    // Fetch paystubs for this run
    const { data: paystubs, error: stubsError } = await adminClient
      .from("employee_paystubs")
      .select("id, user_id, paystub_number, employee_name_snapshot, gross_pay, employee_taxes, deductions, net_pay")
      .eq("payroll_run_id", id);

    if (stubsError) throw stubsError;

    // Fetch directory, active status, compensation, and bank accounts
    const [dirRes, profilesRes, compRes, banksRes] = await Promise.all([
      adminClient.from("employee_directory").select("user_id, first_name, last_name").order("first_name"),
      adminClient.from("employee_private_profiles").select("user_id, employment_status"),
      adminClient
        .from("employee_compensation")
        .select("*")
        .lte("effective_from", run.pay_date)
        .or(`effective_to.is.null,effective_to.gte.${run.pay_date}`)
        .order("effective_from", { ascending: false }),
      adminClient.from("employee_bank_accounts").select("*"),
    ]);

    if (dirRes.error) throw dirRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (compRes.error) throw compRes.error;
    if (banksRes.error) throw banksRes.error;

    const directory = dirRes.data || [];
    const profiles = profilesRes.data || [];
    const compensations = compRes.data || [];
    const bankAccounts = banksRes.data || [];

    const dirMap = new Map(directory.map((d) => [d.user_id, d]));
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const bankMap = new Map(bankAccounts.map((b) => [b.user_id, b]));
    const stubMap = new Map((paystubs || []).map((s) => [s.user_id, s]));

    const compMap = new Map();
    for (const c of compensations) {
      if (!compMap.has(c.user_id)) compMap.set(c.user_id, c);
    }

    // Determine target employees:
    // If paystubs exist, use paystubs list; if draft, ensure all active employees are included
    const employeeIds = new Set();
    for (const stub of paystubs || []) {
      employeeIds.add(stub.user_id);
    }
    if (run.status === "draft" || employeeIds.size === 0) {
      for (const emp of directory) {
        const prof = profileMap.get(emp.user_id);
        if (!prof || prof.employment_status !== "inactive") {
          employeeIds.add(emp.user_id);
        }
      }
    }

    const headers = [
      "Name of Employee",
      "Monthly Salary (Total)",
      "Bank Details",
      "Bank Name",
      "Account Number",
      "IFSC Code",
      "Branch Name",
      "UPI ID",
      "Account Holder Name",
      "Account Type",
      "Currency",
      "Pay Date",
      "Period Start",
      "Period End",
      "Status",
    ];

    const rows = [toCsvRow(headers)];

    for (const userId of employeeIds) {
      const stub = stubMap.get(userId);
      const dir = dirMap.get(userId);
      const comp = compMap.get(userId);
      const bankRow = bankMap.get(userId);

      const employeeName =
        stub?.employee_name_snapshot ||
        (dir ? `${dir.first_name || ""} ${dir.last_name || ""}`.trim() : "") ||
        "Employee";

      // Calculate Monthly Salary (Total)
      let monthlySalaryTotal = "0.00";
      if (stub && stub.net_pay != null) {
        monthlySalaryTotal = Number(stub.net_pay).toFixed(2);
      } else if (stub && stub.gross_pay != null) {
        monthlySalaryTotal = Number(stub.gross_pay).toFixed(2);
      } else if (comp) {
        const fixedMonthly = regularPayForSalary(comp.annual_salary, "monthly");
        const rawVar = Number(comp.variable_pay || 0);
        const monthlyVar =
          comp.variable_pay_frequency === "annually"
            ? Math.round((rawVar / 12) * 100) / 100
            : rawVar;
        monthlySalaryTotal = (fixedMonthly + monthlyVar).toFixed(2);
      }

      // Decrypt Bank Details
      let bankName = bankRow?.bank_name || "";
      let accountHolder = bankRow?.account_holder_name || "";
      let accountType = bankRow?.account_type || "";
      let branchName = bankRow?.branch_name || "";
      let upiId = bankRow?.upi_id || "";
      let accountNumber = "";
      let ifscCode = "";

      if (bankRow?.encrypted_payload && bankRow?.encryption_iv && bankRow?.encryption_tag) {
        try {
          const decrypted = decryptBankPayload(bankRow);
          if (decrypted.accountNumber) accountNumber = String(decrypted.accountNumber);
          if (decrypted.ifscCode) ifscCode = String(decrypted.ifscCode);
          else if (decrypted.routingNumber) ifscCode = String(decrypted.routingNumber);
          if (!accountHolder && decrypted.accountHolderName) accountHolder = decrypted.accountHolderName;
          if (!branchName && decrypted.branchName) branchName = decrypted.branchName;
          if (!upiId && decrypted.upiId) upiId = decrypted.upiId;
          if (!accountType && decrypted.accountType) accountType = decrypted.accountType;
        } catch (decryptErr) {
          console.warn(`Could not decrypt bank details for employee ${userId}:`, decryptErr.message);
        }
      }

      if (!accountNumber && bankRow?.account_last4) {
        accountNumber = `••••${bankRow.account_last4}`;
      }
      if (!ifscCode && bankRow?.routing_last4) {
        ifscCode = `••••${bankRow.routing_last4}`;
      }

      let bankDetailsString = "Not configured";
      if (bankName || accountNumber || ifscCode || upiId) {
        const parts = [];
        if (bankName) parts.push(bankName);
        if (accountNumber) parts.push(`A/C: ${accountNumber}`);
        if (ifscCode) parts.push(`IFSC: ${ifscCode}`);
        if (branchName) parts.push(`Branch: ${branchName}`);
        if (accountHolder) parts.push(`Holder: ${accountHolder}`);
        if (upiId) parts.push(`UPI: ${upiId}`);
        bankDetailsString = parts.join(" | ");
      }

      const currency = run.currency || comp?.currency || "INR";

      rows.push(
        toCsvRow([
          employeeName,
          monthlySalaryTotal,
          bankDetailsString,
          bankName,
          accountNumber,
          ifscCode,
          branchName,
          upiId,
          accountHolder,
          accountType,
          currency,
          run.pay_date,
          run.period_start,
          run.period_end,
          run.status,
        ])
      );
    }

    const csvContent = rows.join("\r\n");

    await adminClient.from("hr_audit_events").insert({
      actor_user_id: user.id,
      event_type: "payroll_csv_exported",
      entity_type: "payroll_run",
      entity_id: run.id,
      metadata: { employee_count: employeeIds.size, status: run.status },
    });

    const csvFilename = `Payroll_Disbursement_${run.period_start}_to_${run.period_end}_${run.status}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to export payroll CSV." },
      { status: error.status || 500 }
    );
  }
}
