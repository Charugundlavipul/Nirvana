import { apiErrorResponse, noStoreJson } from "../../../../../../src/lib/server/apiResponses";
import { getKnowledgeHubPayload } from "../../../../../../src/lib/server/knowledgeBase";
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
