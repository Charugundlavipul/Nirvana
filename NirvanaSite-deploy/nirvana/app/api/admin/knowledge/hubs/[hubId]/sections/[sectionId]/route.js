import { apiErrorResponse, noStoreJson } from "../../../../../../../../src/lib/server/apiResponses";
import { deleteSection } from "../../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const { hubId, sectionId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);

    const result = await deleteSection(adminClient, {
      hubId,
      sectionId,
      userId: user.id,
    });

    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
