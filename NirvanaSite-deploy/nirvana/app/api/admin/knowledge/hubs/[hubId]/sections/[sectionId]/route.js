import { apiErrorResponse, noStoreJson } from "../../../../../../../../src/lib/server/apiResponses";
import {
  acceptSectionSuggestion,
  deleteSection,
  dismissSectionSuggestion,
} from "../../../../../../../../src/lib/server/knowledgeBase";
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

export async function PATCH(request, { params }) {
  try {
    const { hubId, sectionId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await request.json().catch(() => ({}));
    const action = `${payload?.action || ""}`.trim();

    if (action === "accept_suggestion") {
      const section = await acceptSectionSuggestion(adminClient, {
        hubId,
        sectionId,
        userId: user.id,
      });
      return noStoreJson({ section });
    }

    if (action === "dismiss_suggestion") {
      const section = await dismissSectionSuggestion(adminClient, {
        hubId,
        sectionId,
        userId: user.id,
      });
      return noStoreJson({ section });
    }

    throw new Error("Unsupported section action.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}
