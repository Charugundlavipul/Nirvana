import { apiErrorResponse, noStoreJson } from "../../../../../src/lib/server/apiResponses";
import { requireAdminAccess } from "../../../../../src/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const parseApprovalObject = (val) => {
    if (typeof val === "string") {
        try { return JSON.parse(val); } catch (e) { return {}; }
    }
    return val || {};
};

export async function POST(request) {
    try {
        // Authenticate as a valid admin/editor, and get the service-role client (adminClient)
        const { adminClient, user, role } = await requireAdminAccess(request, ["owner", "superadmin", "editor"]);
        const requestPayload = await request.json().catch(() => ({}));

        const {
            requestId,
            entityType,
            action,
            entityId,
            payload,
            beforeSnapshot,
            comment,
            submittedBy
        } = requestPayload;

        if (!entityType || !action) {
            return apiErrorResponse(new Error("entityType and action are required."), 400);
        }

        if (requestId) {
            const { data: existing, error: findByIdError } = await adminClient
                .from("approval_requests")
                .select("*")
                .eq("id", requestId)
                .maybeSingle();

            if (findByIdError) throw findByIdError;
            if (!existing) {
                return apiErrorResponse(new Error("Draft request not found."), 404);
            }

            const ownerId = existing.submitted_by ? String(existing.submitted_by) : "";
            const userId = String(user.id || "");
            const isOwner = ownerId && ownerId === userId;
            const canManageAnyDraft = role === "owner" || role === "superadmin";

            if (!isOwner && !canManageAnyDraft) {
                return apiErrorResponse(new Error("You can only edit your own draft requests."), 403);
            }

            const mergedPayload = {
                ...parseApprovalObject(existing.payload),
                ...payload,
            };

            const { data: updatedById, error: updateByIdError } = await adminClient
                .from("approval_requests")
                .update({
                    payload: mergedPayload,
                    before_snapshot: beforeSnapshot ?? existing.before_snapshot,
                    status: "pending",
                    comment: comment ?? existing.comment,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (updateByIdError) throw updateByIdError;
            return noStoreJson({ data: updatedById, updated: true, merged: true });
        }

        // If there's an entityId, we look for an existing request to merge with.
        // Using adminClient bypasses RLS, allowing multiple admins to collaborate on the same draft.
        if (entityId) {
            const { data: existing, error: findError } = await adminClient
                .from("approval_requests")
                .select("*")
                .eq("entity_type", entityType)
                .eq("entity_id", entityId)
                .in("status", ["pending", "revision_requested"])
                .order("submitted_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (findError) throw findError;

            if (existing) {
                // Merge payloads: incoming payload overwrites existing fields.
                const mergedPayload = {
                    ...parseApprovalObject(existing.payload),
                    ...payload,
                };

                const { data: updatedData, error: updateError } = await adminClient
                    .from("approval_requests")
                    .update({
                        payload: mergedPayload,
                        before_snapshot: beforeSnapshot ?? existing.before_snapshot,
                        status: "pending",
                        comment: comment ?? existing.comment,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return noStoreJson({ data: updatedData, updated: true, merged: true });
            }
        }

        // No entityId or no existing request found -> Create new request.
        const { data: insertedData, error: insertError } = await adminClient
            .from("approval_requests")
            .insert({
                entity_type: entityType,
                action,
                entity_id: entityId || null,
                payload,
                before_snapshot: beforeSnapshot || null,
                submitted_by: submittedBy || user.id,
                comment,
                status: "pending"
            })
            .select()
            .single();

        if (insertError) throw insertError;
        return noStoreJson({ data: insertedData, updated: false, merged: false });

    } catch (error) {
        console.error("Draft merge API error:", error);
        return apiErrorResponse(error);
    }
}
