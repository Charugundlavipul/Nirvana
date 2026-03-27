import { apiErrorResponse, noStoreJson } from "../../../../../../../src/lib/server/apiResponses";
import { reindexKnowledgeHub } from "../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const result = await reindexKnowledgeHub(adminClient, hubId, {
      userId: user.id,
    });
    return noStoreJson({ result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
