import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CGTRIX_PAYSTUB_BRAND, getCgtrixLogoBytes } from "./cgtrixPaystubBrand.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const colors = {
  ink: rgb(0.08, 0.11, 0.16),
  slate: rgb(0.31, 0.36, 0.43),
  muted: rgb(0.46, 0.51, 0.58),
  line: rgb(0.86, 0.88, 0.91),
  paper: rgb(0.97, 0.975, 0.98),
  white: rgb(1, 1, 1),
  red: rgb(0.91, 0.05, 0.09),
  navy: rgb(0.075, 0.10, 0.15),
  green: rgb(0.10, 0.42, 0.27),
};

const typeLabels = {
  regular_earnings: "Fixed earnings",
  variable_pay: "Variable pay",
  additional_earnings: "Additional earnings",
  employee_tax: "Employee tax",
  pretax_deduction: "Pre-tax deduction",
  posttax_deduction: "Post-tax deduction",
  reimbursement: "Reimbursement",
  employer_tax: "Employer tax",
};

const money = (amount, currency) => {
  const currencyCode = String(currency || "INR").toUpperCase();
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
  return `${currencyCode} ${formattedAmount}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

export async function createPaystubPdf({ company = CGTRIX_PAYSTUB_BRAND, logoBytes, run, paystub, items = [], ytd }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = { ...CGTRIX_PAYSTUB_BRAND, ...(company || {}) };
  const yearToDate = ytd || { grossPay: 0, employeeTaxes: 0, netPay: 0 };
  let logo = null;
  try {
    logo = await pdf.embedPng(logoBytes || getCgtrixLogoBytes());
  } catch {
    // The company name remains visible if a future logo asset cannot be decoded.
  }

  let page;
  let y;

  const safe = (value, font = regular) => Array.from(String(value ?? ""), (character) => {
    try {
      font.encodeText(character);
      return character;
    } catch {
      return "?";
    }
  }).join("");

  const draw = (text, x, size = 10, font = regular, color = colors.ink, options = {}) => {
    page.drawText(safe(text, font), { x, y, size, font, color, ...options });
  };

  const drawRight = (text, right, size = 10, font = regular, color = colors.ink) => {
    const cleaned = safe(text, font);
    page.drawText(cleaned, { x: right - font.widthOfTextAtSize(cleaned, size), y, size, font, color });
  };

  const line = (fromX, toX, atY = y, color = colors.line, thickness = 0.7) => {
    page.drawLine({ start: { x: fromX, y: atY }, end: { x: toX, y: atY }, color, thickness });
  };

  const addPage = (continuation = false) => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 9, width: PAGE_WIDTH, height: 9, color: colors.red });
    if (continuation) {
      y = 746;
      draw(brand.name, MARGIN, 13, bold, colors.ink);
      drawRight(`PAYSLIP CONTINUED  |  ${paystub.paystub_number || "Draft"}`, PAGE_WIDTH - MARGIN, 9, bold, colors.slate);
      y -= 22;
      line(MARGIN, PAGE_WIDTH - MARGIN);
      y -= 24;
    }
  };

  const drawItemsHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 26, color: colors.navy });
    draw("DESCRIPTION", MARGIN + 10, 8, bold, colors.white);
    draw("CATEGORY", 334, 8, bold, colors.white);
    drawRight("AMOUNT", PAGE_WIDTH - MARGIN - 10, 8, bold, colors.white);
    y -= 26;
  };

  addPage();
  page.drawRectangle({ x: 0, y: 650, width: PAGE_WIDTH, height: 133, color: colors.navy });
  if (logo) {
    const fitted = logo.scaleToFit(176, 38);
    page.drawRectangle({ x: MARGIN, y: 727, width: 190, height: 43, color: colors.white, borderColor: colors.white, borderWidth: 1 });
    page.drawImage(logo, { x: MARGIN + 7, y: 729 + ((38 - fitted.height) / 2), width: fitted.width, height: fitted.height });
  }
  y = logo ? 713 : 750;
  draw(brand.name, MARGIN, logo ? 10 : 18, bold, colors.white);
  y -= 16;
  for (const addressLine of brand.addressLines || []) {
    draw(addressLine, MARGIN, 7.5, regular, rgb(0.84, 0.87, 0.91));
    y -= 11;
  }
  draw(`${brand.email}  |  ${brand.phone}  |  ${brand.website}`, MARGIN, 7.5, regular, rgb(0.84, 0.87, 0.91));

  y = 748;
  drawRight("PAYSLIP", PAGE_WIDTH - MARGIN, 22, bold, colors.white);
  y = 728;
  drawRight("Employee pay statement", PAGE_WIDTH - MARGIN, 8.5, regular, rgb(0.84, 0.87, 0.91));

  y = 625;
  draw("EMPLOYEE", MARGIN, 7.5, bold, colors.muted);
  draw("PAY PERIOD", 325, 7.5, bold, colors.muted);
  y -= 18;
  draw(paystub.employee_name_snapshot || "Employee", MARGIN, 14, bold);
  draw(`${formatDate(run.period_start)} - ${formatDate(run.period_end)}`, 325, 11, bold);
  y -= 17;
  draw(paystub.job_title_snapshot || "Team member", MARGIN, 9, regular, colors.slate);
  draw(`Pay date: ${formatDate(run.pay_date)}`, 325, 9, regular, colors.slate);
  y -= 17;
  draw(`Paystub no: ${paystub.paystub_number || "Draft"}`, MARGIN, 8, regular, colors.muted);
  draw(`Currency: ${paystub.currency || run.currency || "INR"}`, 325, 8, regular, colors.muted);

  y -= 31;
  drawItemsHeader();
  const orderedItems = [...items].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  for (const item of orderedItems) {
    if (y < 292) {
      addPage(true);
      drawItemsHeader();
    }
    draw(String(item.description || "Payroll item").slice(0, 49), MARGIN + 10, 9);
    draw(typeLabels[item.line_type] || String(item.line_type || "Other").replaceAll("_", " "), 334, 8.5, regular, colors.slate);
    drawRight(money(item.amount, paystub.currency), PAGE_WIDTH - MARGIN - 10, 9, bold);
    y -= 21;
    line(MARGIN, PAGE_WIDTH - MARGIN, y + 8, colors.line, 0.45);
  }
  if (!orderedItems.length) {
    draw("No payroll line items", MARGIN + 10, 9, regular, colors.muted);
    y -= 22;
  }

  if (y < 278) addPage(true);
  y -= 8;
  const summaryTop = y;
  page.drawRectangle({ x: 314, y: summaryTop - 137, width: 258, height: 147, color: colors.paper, borderColor: colors.line, borderWidth: 0.8 });
  y = summaryTop - 14;
  const summary = [
    ["Gross pay", paystub.gross_pay],
    ["Employee taxes", paystub.employee_taxes],
    ["Deductions", paystub.deductions],
    ["Reimbursements", paystub.reimbursements],
  ];
  for (const [label, amount] of summary) {
    draw(label, 328, 9, regular, colors.slate);
    drawRight(money(amount, paystub.currency), 558, 9, regular, colors.ink);
    y -= 21;
  }
  line(328, 558, y + 7, colors.line, 0.8);
  y -= 5;
  draw("NET PAY", 328, 10, bold, colors.green);
  drawRight(money(paystub.net_pay, paystub.currency), 558, 14, bold, colors.green);

  y = summaryTop - 4;
  draw("YEAR TO DATE", MARGIN, 8, bold, colors.muted);
  y -= 24;
  draw("Gross", MARGIN, 8, regular, colors.muted);
  y -= 15;
  draw(money(yearToDate.grossPay, paystub.currency), MARGIN, 11, bold);
  y -= 26;
  draw("Employee taxes", MARGIN, 8, regular, colors.muted);
  y -= 15;
  draw(money(yearToDate.employeeTaxes, paystub.currency), MARGIN, 11, bold);
  y -= 26;
  draw("Net pay", MARGIN, 8, regular, colors.muted);
  y -= 15;
  draw(money(yearToDate.netPay, paystub.currency), MARGIN, 11, bold);

  if (paystub.salary_note_snapshot) {
    y = Math.min(y, summaryTop - 165);
    draw("SALARY NOTE", MARGIN, 8, bold, colors.muted);
    y -= 16;
    draw(String(paystub.salary_note_snapshot).slice(0, 94), MARGIN, 8.5, regular, colors.slate);
  }

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 44, color: colors.paper });
  y = 24;
  draw("Confidential payroll document", MARGIN, 7.5, bold, colors.slate);
  drawRight("This statement is not proof of a bank transfer.", PAGE_WIDTH - MARGIN, 7.5, regular, colors.muted);

  pdf.setTitle(`${paystub.paystub_number || "Payslip"} - ${paystub.employee_name_snapshot || "Employee"}`);
  pdf.setAuthor(brand.name);
  pdf.setSubject(`Payslip for ${formatDate(run.period_start)} to ${formatDate(run.period_end)}`);
  pdf.setCreator("CGtrix HR Portal");
  return Buffer.from(await pdf.save());
}
