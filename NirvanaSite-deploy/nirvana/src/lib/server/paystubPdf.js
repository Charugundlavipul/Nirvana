import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const money = (amount, currency) => {
  const currencyCode = String(currency || "USD").toUpperCase();
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
  return `${currencyCode} ${formattedAmount}`;
};

export async function createPaystubPdf({ companyName, run, paystub, items, ytd }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.09, 0.09, 0.09);
  const green = rgb(0.26, 0.35, 0.24);
  let y = 742;

  const draw = (text, x, size = 10, font = regular, color = dark) => {
    page.drawText(String(text ?? ""), { x, y, size, font, color });
  };
  draw(companyName || "Nirvana Luxury Vacations", 44, 19, bold, green);
  draw("PAY STATEMENT", 430, 13, bold);
  y -= 34;
  draw(`Paystub: ${paystub.paystub_number}`, 44, 9);
  draw(`Pay date: ${run.pay_date}`, 390, 9);
  y -= 18;
  draw(`Employee: ${paystub.employee_name_snapshot}`, 44, 11, bold);
  draw(`Period: ${run.period_start} – ${run.period_end}`, 330, 9);
  if (paystub.job_title_snapshot) {
    y -= 16;
    draw(paystub.job_title_snapshot, 44, 9);
  }

  y -= 30;
  page.drawRectangle({ x: 40, y: y - 8, width: 532, height: 24, color: rgb(0.94, 0.96, 0.93) });
  draw("Description", 48, 10, bold);
  draw("Type", 330, 10, bold);
  draw("Amount", 500, 10, bold);
  y -= 26;
  for (const item of items) {
    draw(String(item.description || "").slice(0, 48), 48, 9);
    draw(String(item.line_type || "").replaceAll("_", " ").slice(0, 24), 330, 9);
    draw(money(item.amount, paystub.currency), 490, 9);
    y -= 18;
    if (y < 260) break;
  }

  y -= 18;
  const summary = [
    ["Gross pay", paystub.gross_pay],
    ["Employee taxes", paystub.employee_taxes],
    ["Deductions", paystub.deductions],
    ["Reimbursements", paystub.reimbursements],
    ["Net pay", paystub.net_pay],
  ];
  for (const [label, amount] of summary) {
    draw(label, 330, label === "Net pay" ? 12 : 10, label === "Net pay" ? bold : regular);
    draw(money(amount, paystub.currency), 490, label === "Net pay" ? 12 : 10, label === "Net pay" ? bold : regular);
    y -= label === "Net pay" ? 24 : 18;
  }

  y -= 8;
  draw("Year to date", 44, 11, bold, green);
  y -= 18;
  draw(`Gross: ${money(ytd.grossPay, paystub.currency)}`, 44, 9);
  draw(`Taxes: ${money(ytd.employeeTaxes, paystub.currency)}`, 210, 9);
  draw(`Net: ${money(ytd.netPay, paystub.currency)}`, 370, 9);
  y -= 48;
  draw("This statement records owner-entered payroll data and is not proof of a bank transfer.", 44, 8, regular, rgb(0.35, 0.35, 0.35));
  return Buffer.from(await pdf.save());
}
