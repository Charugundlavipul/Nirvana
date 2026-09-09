export const PAY_FREQUENCIES = ["weekly", "biweekly", "semimonthly", "monthly"];
export const HR_ROLES = ["owner", "admin", "employee"];

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "superadmin") return "admin";
  if (value === "editor" || value === "viewer") return "employee";
  return value;
}

export function isOwnerRole(role) {
  return normalizeRole(role) === "owner";
}

export function isContentReviewerRole(role) {
  return ["owner", "admin"].includes(normalizeRole(role));
}

export function countBusinessDays(startDate, endDate, dayPortion = "full") {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!startDate || !endDate || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    throw new Error("Valid leave dates are required.");
  }
  if (end < start) throw new Error("End date cannot be before start date.");
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    throw new Error("Leave requests cannot cross calendar years.");
  }
  if (dayPortion === "half" && startDate !== endDate) {
    throw new Error("Half-day leave is only available for a single date.");
  }

  let count = 0;
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  if (count === 0) throw new Error("The selected range contains no business days.");
  return dayPortion === "half" ? 0.5 : count;
}

export function toCents(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) throw new Error("Invalid monetary amount.");
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

export function regularPayForSalary(annualSalary, payFrequency) {
  const divisors = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
  const divisor = divisors[payFrequency];
  if (!divisor) throw new Error("Unsupported pay frequency.");
  return fromCents(Math.round(toCents(annualSalary) / divisor));
}

export function computePayrollTotals(lineItems = []) {
  const totals = {
    grossPay: 0,
    employeeTaxes: 0,
    deductions: 0,
    reimbursements: 0,
    employerTaxes: 0,
    netPay: 0,
  };

  for (const item of lineItems) {
    const cents = toCents(item.amount);
    switch (item.line_type || item.lineType) {
      case "regular_earnings":
      case "additional_earnings":
        totals.grossPay += cents;
        break;
      case "employee_tax":
        totals.employeeTaxes += cents;
        break;
      case "pretax_deduction":
      case "posttax_deduction":
        totals.deductions += cents;
        break;
      case "reimbursement":
        totals.reimbursements += cents;
        break;
      case "employer_tax":
        totals.employerTaxes += cents;
        break;
      default:
        throw new Error("Unsupported payroll line type.");
    }
  }

  totals.netPay = totals.grossPay - totals.employeeTaxes - totals.deductions + totals.reimbursements;
  return Object.fromEntries(Object.entries(totals).map(([key, cents]) => [key, fromCents(cents)]));
}

export function leaveBalance(allowance, requests = []) {
  const approved = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + Number(request.requested_days || 0), 0);
  const pending = requests
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + Number(request.requested_days || 0), 0);
  return {
    allowance: Number(allowance || 0),
    approved,
    pending,
    available: Number((Number(allowance || 0) - approved - pending).toFixed(2)),
  };
}
