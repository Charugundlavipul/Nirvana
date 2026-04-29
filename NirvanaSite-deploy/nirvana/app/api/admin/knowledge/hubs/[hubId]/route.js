import { apiErrorResponse, noStoreJson } from "../../../../../../src/lib/server/apiResponses";
import { getKnowledgeHubPayload, syncKnowledgeHub } from "../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient } = await requireAdminAccess(request);
    const payload = await getKnowledgeHubPayload(adminClient, hubId);
    return noStoreJson(payload);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const result = await syncKnowledgeHub(adminClient, hubId, {
      userId: user.id,
    });
    return noStoreJson({ result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
