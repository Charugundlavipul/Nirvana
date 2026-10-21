import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../src/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { adminClient } = await requireAdminAccess(request);
    const { id } = await params;
    const { data: attachment, error } = await adminClient
      .from("preventive_maintenance_attachments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    const { data: file, error: downloadError } = await adminClient.storage
      .from("preventive-maintenance")
      .download(attachment.storage_path);
    if (downloadError) throw downloadError;
    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${String(attachment.original_filename).replace(/["\r\n]/g, "")}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to download attachment." }, { status: error.status || 500 });
  }
}
