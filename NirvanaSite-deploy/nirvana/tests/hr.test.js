import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  computePayrollTotals,
  countBusinessDays,
  leaveBalance,
  normalizeRole,
  regularPayForSalary,
} from "../src/lib/hr.js";

test("legacy roles normalize to the new role names", () => {
  assert.equal(normalizeRole("superadmin"), "admin");
  assert.equal(normalizeRole("editor"), "employee");
  assert.equal(normalizeRole("owner"), "owner");
});

test("leave counts weekdays inclusively", () => {
  assert.equal(countBusinessDays("2026-09-11", "2026-09-14"), 2);
  assert.equal(countBusinessDays("2026-09-14", "2026-09-14", "half"), 0.5);
  assert.throws(() => countBusinessDays("2026-12-31", "2027-01-01"), /calendar years/);
  assert.throws(() => countBusinessDays("2026-09-12", "2026-09-13"), /no business days/);
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

test("payroll totals keep employer tax outside employee net", () => {
  assert.deepEqual(computePayrollTotals([
    { line_type: "regular_earnings", amount: 3000 },
    { line_type: "additional_earnings", amount: 125.55 },
    { line_type: "employee_tax", amount: 600.11 },
    { line_type: "pretax_deduction", amount: 100 },
    { line_type: "posttax_deduction", amount: 25.44 },
    { line_type: "reimbursement", amount: 80 },
    { line_type: "employer_tax", amount: 240 },
  ]), {
    grossPay: 3125.55,
    employeeTaxes: 600.11,
    deductions: 125.44,
    reimbursements: 80,
    employerTaxes: 240,
    netPay: 2480,
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

test("generated paystub is a PDF and contains no bank source data", async () => {
  const { createPaystubPdf } = await import("../src/lib/server/paystubPdf.js");
  const pdf = await createPaystubPdf({
    companyName: "Nirvana Luxury Vacations",
    run: { period_start: "2026-09-01", period_end: "2026-09-15", pay_date: "2026-09-18" },
    paystub: { paystub_number: "PS-TEST", employee_name_snapshot: "Example Employee", currency: "USD", gross_pay: 3000, employee_taxes: 500, deductions: 100, reimbursements: 25, net_pay: 2425 },
    items: [{ line_type: "regular_earnings", description: "Regular salary", amount: 3000 }],
    ytd: { grossPay: 9000, employeeTaxes: 1500, netPay: 7275 },
  });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.equal(pdf.includes(Buffer.from("1234567890")), false);
});

test("schema migrates legacy roles and leaves account mutation owner-only", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /UPDATE admin_users SET role = 'admin' WHERE role = 'superadmin'/);
  assert.match(schema, /CHECK \(role IN \('owner', 'admin', 'employee'\)\)/);
  assert.doesNotMatch(schema, /CREATE POLICY "Superadmins can add admin users"/);
  assert.match(schema, /current_admin_role\(\) = 'owner'/);
});
