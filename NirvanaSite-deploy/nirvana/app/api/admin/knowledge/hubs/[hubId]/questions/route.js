import { apiErrorResponse, noStoreJson } from "../../../../../../../src/lib/server/apiResponses";
import { saveQuestion } from "../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await request.json();
    const question = await saveQuestion(adminClient, {
      hubId,
      questionId: payload?.questionId || null,
      sectionId: payload?.sectionId || null,
      question: payload?.question || "",
      answer: payload?.answer || "",
      displayOrder: Number.parseInt(payload?.displayOrder, 10),
      userId: user.id,
    });
    return noStoreJson({ question });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
