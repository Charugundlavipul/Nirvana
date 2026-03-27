import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";
import { requireAdminAccess } from "../../../../../src/lib/server/supabaseAdmin";
import { scheduleKnowledgeRefreshForAdminChange } from "../../../../../src/lib/server/knowledgeBase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await request.json().catch(() => ({}));

    const result = await scheduleKnowledgeRefreshForAdminChange(adminClient, {
      propertyIds: payload?.propertyIds || [],
      hubIds: payload?.hubIds || [],
      includeGeneral: Boolean(payload?.includeGeneral),
      includeAllPropertyHubs: Boolean(payload?.includeAllPropertyHubs),
      request: payload?.request || null,
      userId: user.id,
    });

    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
