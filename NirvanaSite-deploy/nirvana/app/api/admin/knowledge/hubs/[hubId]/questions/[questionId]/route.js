import { apiErrorResponse, noStoreJson } from "../../../../../../../../src/lib/server/apiResponses";
import { deleteQuestion } from "../../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const { hubId, questionId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);

    const result = await deleteQuestion(adminClient, {
      hubId,
      questionId,
      userId: user.id,
    });

    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
