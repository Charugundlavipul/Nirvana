import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";
import { requireAdminAccess } from "../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
    try {
        const { adminClient } = await requireAdminAccess(request, ["owner", "superadmin", "editor"]);
        const { requestId } = await request.json().catch(() => ({}));

        if (!requestId) {
            return apiErrorResponse(new Error("requestId is required."), 400);
        }

        // Use service role adminClient to enforce delete without RLS blocking the action
        const { error } = await adminClient
            .from("approval_requests")
            .delete()
            .eq("id", requestId);

        if (error) throw error;
        return noStoreJson({ success: true });

    } catch (error) {
        console.error("Draft discard API error:", error);
        return apiErrorResponse(error);
    }
}
