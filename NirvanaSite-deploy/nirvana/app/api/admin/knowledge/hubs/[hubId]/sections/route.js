import { apiErrorResponse, noStoreJson } from "../../../../../../../src/lib/server/apiResponses";
import { saveSection } from "../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await request.json();
    const section = await saveSection(adminClient, {
      hubId,
      sectionId: payload?.sectionId || null,
      title: payload?.title || "",
      summary: payload?.summary || "",
      contentMarkdown: payload?.contentMarkdown || "",
      displayOrder: Number.parseInt(payload?.displayOrder, 10),
      userId: user.id,
    });
    return noStoreJson({ section });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
