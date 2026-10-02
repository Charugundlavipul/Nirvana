import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";

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

    const { data: paystubs, error: stubsError } = await adminClient
      .from("employee_paystubs")
      .select("id, user_id, paystub_number, employee_name_snapshot, pdf_path")
      .eq("payroll_run_id", id)
      .not("pdf_path", "is", null);

    if (stubsError) throw stubsError;

    if (!paystubs || !paystubs.length) {
      return NextResponse.json(
        { error: "No generated paystubs found for this payroll run." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const stub of paystubs) {
      const { data: pdfBlob, error: downloadError } = await adminClient.storage
        .from("paystubs")
        .download(stub.pdf_path);

      if (downloadError) {
        console.warn(`Could not download PDF for paystub ${stub.id}:`, downloadError.message);
        continue;
      }

      const safeName = (stub.employee_name_snapshot || "employee").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${stub.paystub_number || "paystub"}_${safeName}.pdf`;
      const arrayBuffer = await pdfBlob.arrayBuffer();
      zip.file(fileName, arrayBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    await adminClient.from("hr_audit_events").insert({
      actor_user_id: user.id,
      event_type: "payroll_zip_downloaded",
      entity_type: "payroll_run",
      entity_id: run.id,
      metadata: { paystub_count: paystubs.length },
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
