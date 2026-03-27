import { apiErrorResponse, noStoreJson } from "../../../../../../../src/lib/server/apiResponses";
import {
  createManualSource,
  createUploadedSource,
} from "../../../../../../../src/lib/server/knowledgeBase";
import { requireAdminAccess } from "../../../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function parseSourcePayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      mode: `${formData.get("mode") || "upload"}`,
      title: `${formData.get("title") || ""}`,
      description: `${formData.get("description") || ""}`,
      contentText: `${formData.get("contentText") || ""}`,
      file: formData.get("file"),
    };
  }

  const payload = await request.json();
  return {
    mode: `${payload?.mode || "manual"}`,
    title: `${payload?.title || ""}`,
    description: `${payload?.description || ""}`,
    contentText: `${payload?.contentText || ""}`,
    file: null,
  };
}

export async function POST(request, { params }) {
  try {
    const { hubId } = await params;
    const { adminClient, user } = await requireAdminAccess(request);
    const payload = await parseSourcePayload(request);

    let source;
    if (payload.mode === "manual") {
      source = await createManualSource(adminClient, {
        hubId,
        title: payload.title,
        description: payload.description,
        contentText: payload.contentText,
        userId: user.id,
      });
    } else {
      source = await createUploadedSource(adminClient, {
        hubId,
        title: payload.title,
        description: payload.description,
        file: payload.file,
        userId: user.id,
      });
    }

    return noStoreJson({ source });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
