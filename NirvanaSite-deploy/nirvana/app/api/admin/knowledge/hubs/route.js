import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";
import { listKnowledgeHubs } from "../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { adminClient } = await requireAdminAccess(request);
    const hubs = await listKnowledgeHubs(adminClient);
    return noStoreJson({ hubs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
