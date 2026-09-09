import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../src/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const { id } = await params;
    const { data: paystub, error } = await adminClient
      .from("employee_paystubs")
      .select("id, user_id, pdf_path, paystub_number")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!paystub || !paystub.pdf_path) return NextResponse.json({ error: "Paystub PDF not found." }, { status: 404 });
    if (role !== "owner" && paystub.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const { data, error: downloadError } = await adminClient.storage.from("paystubs").download(paystub.pdf_path);
    if (downloadError) throw downloadError;
    await adminClient.from("hr_audit_events").insert({
      actor_user_id: user.id,
      subject_user_id: paystub.user_id,
      event_type: "paystub_downloaded",
      entity_type: "employee_paystub",
      entity_id: paystub.id,
    });
    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${paystub.paystub_number || "paystub"}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to download paystub." }, { status: error.status || 500 });
  }
}
