import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";
import { createPaystubPdf } from "../../../../../../../src/lib/server/paystubPdf";
import { computePayrollTotals, salaryLineItemsForPeriod } from "../../../../../../../src/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        { error: "Payroll run must be finalized before downloading all paystubs." },
        { status: 400 }
      );
    }

    const isDraft = false;

    // Fetch existing paystubs for this run
    const { data: existingPaystubs, error: stubsError } = await adminClient
      .from("employee_paystubs")
      .select("id, user_id, paystub_number, employee_name_snapshot, pdf_path, gross_pay, employee_taxes, deductions, net_pay, paystub_line_items(*)")
      .eq("payroll_run_id", id);

    if (stubsError) throw stubsError;

    let paystubs = existingPaystubs || [];

    // If draft run and no paystubs saved yet, gather active employees to build draft paystubs
    if (isDraft && paystubs.length === 0) {
      const [dirRes, profilesRes, compRes] = await Promise.all([
        adminClient.from("employee_directory").select("user_id, first_name, last_name"),
        adminClient.from("employee_private_profiles").select("user_id, employment_status"),
        adminClient
          .from("employee_compensation")
          .select("*")
          .lte("effective_from", run.pay_date)
          .or(`effective_to.is.null,effective_to.gte.${run.pay_date}`)
          .order("effective_from", { ascending: false }),
      ]);

      const profMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const compMap = new Map();
      for (const c of compRes.data || []) {
        if (!compMap.has(c.user_id)) compMap.set(c.user_id, c);
      }

      paystubs = (dirRes.data || [])
        .filter((d) => {
          const prof = profMap.get(d.user_id);
          return !prof || prof.employment_status !== "inactive";
        })
        .map((d, idx) => {
          const comp = compMap.get(d.user_id);
          const items = comp ? salaryLineItemsForPeriod(comp, run.period_start, run.period_end) : [];
          const totals = items.length ? computePayrollTotals(items) : { grossPay: 0, employeeTaxes: 0, deductions: 0, netPay: 0 };
          return {
            id: `draft-${d.user_id}`,
            user_id: d.user_id,
            paystub_number: `DRAFT-PS-${run.pay_date.slice(0, 4)}-${String(idx + 1).padStart(3, "0")}`,
            employee_name_snapshot: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Employee",
            pdf_path: null,
            gross_pay: totals.grossPay,
            employee_taxes: totals.employeeTaxes,
            deductions: totals.deductions,
            net_pay: totals.netPay,
            paystub_line_items: items,
          };
        });
    }

    if (!paystubs.length) {
      return NextResponse.json(
        { error: "No paystubs available for this payroll run." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (let index = 0; index < paystubs.length; index += 1) {
      const stub = paystubs[index];
      const safeName = (stub.employee_name_snapshot || "employee").replace(/[^a-zA-Z0-9_-]/g, "_");
      const stubNumber = stub.paystub_number || `PS-${String(index + 1).padStart(3, "0")}`;
      const fileName = `${stubNumber}_${safeName}.pdf`;

      if (stub.pdf_path) {
        const { data: pdfBlob, error: downloadError } = await adminClient.storage
          .from("paystubs")
          .download(stub.pdf_path);

        if (!downloadError && pdfBlob) {
          const arrayBuffer = await pdfBlob.arrayBuffer();
          zip.file(fileName, arrayBuffer);
          continue;
        }
      }

      // Generate PDF dynamically if not stored (e.g. draft run)
      try {
        const pdfBytes = await createPaystubPdf({
          run,
          paystub: { ...stub, paystub_number: stubNumber },
          items: stub.paystub_line_items || [],
          ytd: {
            grossPay: Number(stub.gross_pay || 0),
            employeeTaxes: Number(stub.employee_taxes || 0),
            netPay: Number(stub.net_pay || 0),
          },
        });
        zip.file(fileName, Buffer.from(pdfBytes));
      } catch (genErr) {
        console.warn(`Could not generate PDF for paystub ${stub.id}:`, genErr.message);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    await adminClient.from("hr_audit_events").insert({
      actor_user_id: user.id,
      event_type: "payroll_zip_downloaded",
      entity_type: "payroll_run",
      entity_id: run.id,
      metadata: { paystub_count: paystubs.length, run_status: run.status },
    });

    const zipFilename = `Payroll_${run.period_start}_to_${run.period_end}_${run.status}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to generate payroll ZIP archive." },
      { status: error.status || 500 }
    );
  }
}
