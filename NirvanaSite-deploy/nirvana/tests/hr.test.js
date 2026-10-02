import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  computePayrollTotals,
  countBusinessDays,
  countLeaveDays,
  leaveBalance,
  normalizeRole,
  regularPayForSalary,
  salaryLineItemsForPeriod,
  variablePayLineForPeriod,
  variablePayOccurrences,
} from "../src/lib/hr.js";

test("legacy roles normalize to the new role names", () => {
  assert.equal(normalizeRole("superadmin"), "admin");
  assert.equal(normalizeRole("editor"), "employee");
  assert.equal(normalizeRole("owner"), "owner");
});

test("leave counts all calendar days inclusively for any day of the week", () => {
  assert.equal(countLeaveDays("2026-09-11", "2026-09-14"), 4);
  assert.equal(countLeaveDays("2026-09-12", "2026-09-13"), 2);
  assert.equal(countLeaveDays("2026-09-14", "2026-09-14", "half"), 0.5);
  assert.throws(() => countLeaveDays("2026-12-31", "2027-01-01"), /calendar years/);
  assert.throws(() => countLeaveDays("2026-09-15", "2026-09-14"), /before start date/);
});

test("pending and approved leave reserve the allowance", () => {
  assert.deepEqual(leaveBalance(15, [
    { status: "approved", requested_days: 4 },
    { status: "pending", requested_days: 2.5 },
    { status: "rejected", requested_days: 5 },
  ]), { allowance: 15, approved: 4, pending: 2.5, available: 8.5 });
});

test("salary payroll uses decimal-safe pay-period amounts", () => {
  assert.equal(regularPayForSalary(78000, "biweekly"), 3000);
  assert.equal(regularPayForSalary(120000, "monthly"), 10000);
});

test("monthly variable pay is a separate line for each month-end in the period", () => {
  assert.equal(variablePayOccurrences("2026-08-01", "2026-09-30", "monthly"), 2);
  assert.deepEqual(variablePayLineForPeriod(
    { variable_pay: 5000, variable_pay_frequency: "monthly" },
    "2026-08-01",
    "2026-09-30"
  ), { line_type: "variable_pay", description: "Monthly variable pay (2 periods)", amount: 10000 });
});

test("yearly variable pay is included only in a period containing December 31", () => {
  const compensation = {
    annual_salary: 120000,
    pay_frequency: "monthly",
    variable_pay: 25000,
    variable_pay_frequency: "annually",
  };
  assert.equal(variablePayLineForPeriod(compensation, "2026-12-01", "2026-12-30"), null);
  assert.deepEqual(salaryLineItemsForPeriod(compensation, "2026-12-01", "2026-12-31"), [
    { line_type: "regular_earnings", description: "Fixed salary", amount: 10000 },
    { line_type: "variable_pay", description: "Yearly variable pay", amount: 25000 },
  ]);
});

test("payroll totals keep employer tax outside employee net", () => {
  assert.deepEqual(computePayrollTotals([
    { line_type: "regular_earnings", amount: 3000 },
    { line_type: "variable_pay", amount: 200 },
    { line_type: "additional_earnings", amount: 125.55 },
    { line_type: "employee_tax", amount: 600.11 },
    { line_type: "pretax_deduction", amount: 100 },
    { line_type: "posttax_deduction", amount: 25.44 },
    { line_type: "reimbursement", amount: 80 },
    { line_type: "employer_tax", amount: 240 },
  ]), {
    grossPay: 3325.55,
    employeeTaxes: 600.11,
    deductions: 125.44,
    reimbursements: 80,
    employerTaxes: 240,
    netPay: 2680,
  });
});

test("bank payloads round-trip through authenticated encryption", async () => {
  process.env.HR_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const { decryptBankPayload, encryptBankPayload, lastFour } = await import("../src/lib/server/hrCrypto.js");
  const source = { routingNumber: "021000021", accountNumber: "1234567890" };
  const encrypted = encryptBankPayload(source);
  assert.equal(encrypted.encrypted_payload.includes(source.accountNumber), false);
  assert.deepEqual(decryptBankPayload(encrypted), source);
  assert.equal(lastFour(source.accountNumber), "7890");
});

test("generated INR paystub is a PDF and contains no bank source data", async () => {
  const { createPaystubPdf } = await import("../src/lib/server/paystubPdf.js");
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await createPaystubPdf({
    run: { period_start: "2026-09-01", period_end: "2026-09-15", pay_date: "2026-09-18" },
    paystub: { paystub_number: "PS-TEST", employee_name_snapshot: "Example Employee", salary_note_snapshot: "Annual bonus ₹25,000", currency: "INR", gross_pay: 3500, employee_taxes: 500, deductions: 100, reimbursements: 25, net_pay: 2925 },
    items: [{ line_type: "regular_earnings", description: "Fixed salary", amount: 3000 }, { line_type: "variable_pay", description: "Monthly variable pay", amount: 500 }],
    ytd: { grossPay: 9000, employeeTaxes: 1500, netPay: 7275 },
  });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.equal(pdf.includes(Buffer.from("1234567890")), false);
  const parsed = await PDFDocument.load(pdf);
  assert.equal(parsed.getAuthor(), "CGtrix Animation Studios Pvt. Ltd.");
  assert.equal(parsed.getCreator(), "CGtrix HR Portal");
  assert.equal(parsed.getPageCount(), 1);
  assert.ok(pdf.length > 20000, "the official CGtrix logo should be embedded");
});

test("schema migrates legacy roles and leaves account mutation owner-only", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /UPDATE admin_users SET role = 'admin' WHERE role = 'superadmin'/);
  assert.match(schema, /CHECK \(role IN \('owner', 'admin', 'employee'\)\)/);
  assert.doesNotMatch(schema, /CREATE POLICY "Superadmins can add admin users"/);
  assert.match(schema, /current_admin_role\(\) = 'owner'/);
  assert.match(schema, /variable_pay_frequency TEXT NOT NULL DEFAULT 'monthly'/);
  assert.match(schema, /'regular_earnings', 'variable_pay', 'additional_earnings'/);
  assert.match(schema, /employee_paystubs_payroll_run_id_fkey[\s\S]*REFERENCES payroll_runs\(id\) ON DELETE CASCADE/);
  assert.match(schema, /employee_notifications_payroll_run_id_fkey[\s\S]*REFERENCES payroll_runs\(id\) ON DELETE CASCADE/);
});

test("employee history only exposes generated active paystubs and run deletion removes stored files", async () => {
  const route = await readFile(new URL("../app/api/admin/hr/route.js", import.meta.url), "utf8");
  assert.match(route, /payroll_runs!inner\(period_start, period_end, pay_date, status\)/);
  assert.match(route, /\.not\("pdf_path", "is", null\)/);
  assert.match(route, /\.in\("payroll_runs\.status", \["finalized", "paid"\]\)/);
  assert.match(route, /storage[\s\S]*\.from\("paystubs"\)[\s\S]*\.remove\(pdfPaths\.slice/);
  assert.match(route, /from\("employee_paystubs"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("payroll_run_id", run\.id\)/);
});

test("Indian bank payloads with IFSC and alphanumeric details round-trip cleanly", async () => {
  process.env.HR_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const { decryptBankPayload, encryptBankPayload, lastFour } = await import("../src/lib/server/hrCrypto.js");
  const indianBank = {
    accountNumber: "5010023456789",
    routingNumber: "HDFC0000261",
    ifscCode: "HDFC0000261",
    accountHolderName: "Charugundla Vipul",
    bankName: "HDFC Bank",
    branchName: "Indiranagar Branch, Bengaluru",
    upiId: "vipul@okhdfcbank",
  };
  const encrypted = encryptBankPayload(indianBank);
  assert.equal(encrypted.encrypted_payload.includes(indianBank.accountNumber), false);
  assert.deepEqual(decryptBankPayload(encrypted), indianBank);
  assert.equal(lastFour(indianBank.accountNumber), "6789");
  assert.equal(lastFour(indianBank.ifscCode), "0261");
});

test("schema and API support Indian banking details and IFSC routing", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /account_holder_name TEXT/);
  assert.match(schema, /branch_name TEXT/);
  assert.match(schema, /upi_id TEXT/);
  assert.match(schema, /routing_last4 ~ '\^\[A-Za-z0-9\]\{4\}\$'/);
  assert.match(schema, /account_type IN \('savings', 'current', 'salary', 'checking'\)/);

  const route = await readFile(new URL("../app/api/admin/hr/route.js", import.meta.url), "utf8");
  assert.match(route, /isIfsc/);
  assert.match(route, /accountHolderName/);
  assert.match(route, /branchName/);
  assert.match(route, /upiId/);
});

test("employee deletion removes user completely and schema cascades deletions", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /employee_directory_user_id_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(schema, /employee_compensation_user_id_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(schema, /leave_entitlements_user_id_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(schema, /leave_requests_user_id_fkey[\s\S]*ON DELETE CASCADE/);

  const route = await readFile(new URL("../app/api/admin/hr/route.js", import.meta.url), "utf8");
  assert.match(route, /action === "delete_employee"/);
  assert.match(route, /from\("employee_directory"\)\.delete\(\)\.eq\("user_id", targetId\)/);
  assert.match(route, /auth\.admin\.deleteUser\(targetId\)/);
});

test("payroll zip generator creates valid ZIP archives containing paystub PDFs", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("PS-001_Alice.pdf", Buffer.from("%PDF-1.4 test paystub 1"));
  zip.file("PS-002_Bob.pdf", Buffer.from("%PDF-1.4 test paystub 2"));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString("hex"), "504b0304"); // PK.. standard zip signature

  const readBack = await JSZip.loadAsync(buffer);
  assert.ok(readBack.file("PS-001_Alice.pdf"));
  assert.ok(readBack.file("PS-002_Bob.pdf"));

  const zipRoute = await readFile(new URL("../app/api/admin/hr/payroll/[id]/zip/route.js", import.meta.url), "utf8");
  assert.match(zipRoute, /role !== "owner"/);
  assert.match(zipRoute, /run\.status === "draft"/);
  assert.match(zipRoute, /adminClient\.storage[\s\S]*\.from\("paystubs"\)[\s\S]*\.download/);
  assert.match(zipRoute, /application\/zip/);
});

test("payroll manager displays monthly fixed and monthly variable for employees", async () => {
  const { regularPayForSalary } = await import("../src/lib/hr.js");
  const monthlyFixed = regularPayForSalary(420000, "monthly");
  assert.equal(monthlyFixed, 35000);

  const managerFile = await readFile(new URL("../src/components/Admin/HR/PayrollManager.jsx", import.meta.url), "utf8");
  assert.match(managerFile, /Monthly fixed:/);
  assert.match(managerFile, /Monthly variable:/);
  assert.match(managerFile, /regularPayForSalary\(comp\.annual_salary,\s*"monthly"\)/);
});

test("payroll csv export route and UI export employee name, monthly salary, and bank details for every run", async () => {
  const csvRoute = await readFile(new URL("../app/api/admin/hr/payroll/[id]/csv/route.js", import.meta.url), "utf8");
  assert.match(csvRoute, /Name of Employee/);
  assert.match(csvRoute, /Monthly Salary \(Total\)/);
  assert.match(csvRoute, /Bank Details/);
  assert.match(csvRoute, /decryptBankPayload/);
  assert.match(csvRoute, /text\/csv/);

  const managerFile = await readFile(new URL("../src/components/Admin/HR/PayrollManager.jsx", import.meta.url), "utf8");
  assert.match(managerFile, /downloadPayrollCsv/);
  assert.match(managerFile, /handleDownloadCsv/);
  assert.match(managerFile, /Export CSV \(Bank Details\)/);
  assert.match(managerFile, /Export \.csv/);
});

test("payroll history renders published runs as expandable accordions with per-person pay statements cards", async () => {
  const managerFile = await readFile(new URL("../src/components/Admin/HR/PayrollManager.jsx", import.meta.url), "utf8");
  assert.match(managerFile, /details className=\{styles\.payrollEmployee\} key=\{historyRun\.id\}/);
  assert.match(managerFile, /article className=\{styles\.paystubCard\}/);
  assert.match(managerFile, /stub\.employee_name_snapshot/);
  assert.match(managerFile, /downloadPaystub\(stub\)/);
});

test("payroll manager displays total payroll amount for runs in workspace header and history", async () => {
  const managerFile = await readFile(new URL("../src/components/Admin/HR/PayrollManager.jsx", import.meta.url), "utf8");
  assert.match(managerFile, /Total payroll:/);
  assert.match(managerFile, /currentRunTotal/);
  assert.match(managerFile, /runTotal > 0 && ` · Total payroll: \$\{formatSalaryAmount\(runTotal, historyRun\.currency\)\}`/);
});

test("people manager displays pay statements cards for selected employee", async () => {
  const peopleFile = await readFile(new URL("../src/components/Admin/HR/PeopleManager.jsx", import.meta.url), "utf8");
  assert.match(peopleFile, /Pay statements/);
  assert.match(peopleFile, /article className=\{styles\.paystubCard\}/);
  assert.match(peopleFile, /downloadPaystub\(stub\)/);
  assert.match(peopleFile, /selected\.paystubs/);
});



