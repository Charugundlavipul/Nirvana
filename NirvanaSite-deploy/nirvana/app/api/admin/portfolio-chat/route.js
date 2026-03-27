import { apiErrorResponse, noStoreJson } from "../../../../src/lib/server/apiResponses";
import { answerPortfolioQuestion } from "../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { adminClient } = await requireAdminAccess(request);
    const payload = await request.json();
    const result = await answerPortfolioQuestion(adminClient, {
      question: `${payload?.question || ""}`.trim(),
      preferredHubId: `${payload?.preferredHubId || ""}`.trim(),
    });
    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
