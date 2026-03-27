import { apiErrorResponse, noStoreJson } from "../../../../../../../../src/lib/server/apiResponses";
import { requireAdminAccess } from "../../../../../../../../src/lib/server/supabaseAdmin";
import {
  syncKnowledgeHub,
  updateManualSource,
} from "../../../../../../../../src/lib/server/knowledgeBase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const { hubId, sourceId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);

    // Get source info before deleting in case we need storage cleanup
    const { data: source, error: sourceError } = await adminClient
      .from("knowledge_sources")
      .select("storage_path")
      .eq("id", sourceId)
      .eq("hub_id", hubId)
      .single();

    if (sourceError && sourceError.code !== "PGRST116") throw sourceError;

    // Remove from storage if there was a file
    if (source && source.storage_path) {
      await adminClient.storage.from("knowledge-sources").remove([source.storage_path]);
    }

    // Delete record
    const { error: deleteError } = await adminClient
      .from("knowledge_sources")
      .delete()
      .eq("id", sourceId)
      .eq("hub_id", hubId);

    if (deleteError) throw deleteError;

    await syncKnowledgeHub(adminClient, hubId, { userId: user.id });

    return noStoreJson({ ok: true, deletedId: sourceId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { hubId, sourceId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await request.json();

    const source = await updateManualSource(adminClient, {
      hubId,
      sourceId,
      title: `${payload?.title || ""}`,
      description: `${payload?.description || ""}`,
      contentText: `${payload?.contentText || ""}`,
      userId: user.id,
    });

    return noStoreJson({ source });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
