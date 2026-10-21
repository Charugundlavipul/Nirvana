import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../src/lib/server/supabaseAdmin";
import { getMaintenanceStatus, recurrenceLabel } from "../../../../../src/lib/preventiveMaintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(",");
}

function safeFilename(value) {
  return String(value || "maintenance").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request) {
  try {
    const { adminClient, user } = await requireAdminAccess(request);
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || "";

    let eventsQuery = adminClient.from("preventive_maintenance_events").select("*").order("created_at", { ascending: false });
    let schedulesQuery = adminClient.from("preventive_maintenance_schedules").select("*");
    if (propertyId) {
      eventsQuery = eventsQuery.eq("property_id", propertyId);
      schedulesQuery = schedulesQuery.eq("property_id", propertyId);
    }
    const [propertiesResult, catalogResult, schedulesResult, eventsResult, completionsResult, attachmentsResult, directoryResult] = await Promise.all([
      adminClient.from("properties").select("id, name"),
      adminClient.from("preventive_maintenance_catalog").select("id, name"),
      schedulesQuery,
      eventsQuery,
      adminClient.from("preventive_maintenance_completions").select("id, schedule_id, completed_on, completed_by_name, note, undone_at, undo_reason"),
      adminClient.from("preventive_maintenance_attachments").select("completion_id, original_filename"),
      adminClient.from("employee_directory").select("first_name, last_name").eq("user_id", user.id).maybeSingle(),
    ]);
    for (const result of [propertiesResult, catalogResult, schedulesResult, eventsResult, completionsResult, attachmentsResult]) {
      if (result.error) throw result.error;
    }
    const propertyMap = new Map((propertiesResult.data || []).map((item) => [item.id, item.name]));
    const taskMap = new Map((catalogResult.data || []).map((item) => [item.id, item.name]));
    const scheduleMap = new Map((schedulesResult.data || []).map((item) => [item.id, item]));
    const completionMap = new Map((completionsResult.data || []).map((item) => [item.id, item]));
    const attachmentMap = new Map();
    for (const item of attachmentsResult.data || []) {
      attachmentMap.set(item.completion_id, [...(attachmentMap.get(item.completion_id) || []), item.original_filename]);
    }

    const headers = [
      "Property", "Maintenance Task", "Event", "Event Timestamp", "Current Status", "Current Due Date",
      "Previous Due Date", "New Due Date", "Recurrence", "Completion Date", "Note / Reason", "Changed By",
      "Completion State", "Attachments",
    ];
    const rows = [csvRow(headers)];
    for (const event of eventsResult.data || []) {
      if (event.event_type === "csv_exported") continue;
      const schedule = scheduleMap.get(event.schedule_id);
      const completion = completionMap.get(event.completion_id);
      rows.push(csvRow([
        propertyMap.get(event.property_id) || "",
        taskMap.get(event.catalog_task_id) || "",
        event.event_type.replace(/_/g, " "),
        event.created_at,
        schedule ? getMaintenanceStatus(schedule.current_due_on).replace(/_/g, " ") : "",
        schedule?.current_due_on || "",
        event.previous_due_on || "",
        event.new_due_on || "",
        schedule ? recurrenceLabel(schedule.recurrence_count, schedule.recurrence_unit) : "",
        completion?.completed_on || "",
        event.note || completion?.note || "",
        event.actor_name || completion?.completed_by_name || "",
        completion ? (completion.undone_at ? "Undone" : "Completed") : "",
        (attachmentMap.get(event.completion_id) || []).join(" | "),
      ]));
    }

    const selectedProperty = propertyId ? propertyMap.get(propertyId) : "";
    const actor = `${directoryResult.data?.first_name || ""} ${directoryResult.data?.last_name || ""}`.trim() || user.email || "Admin user";
    await adminClient.from("preventive_maintenance_events").insert({
      property_id: propertyId || null,
      event_type: "csv_exported",
      actor_user_id: user.id,
      actor_name: actor,
      note: propertyId ? `Property maintenance history exported for ${selectedProperty || propertyId}` : "Overall maintenance history exported",
      metadata: { property_id: propertyId || null, row_count: Math.max(0, rows.length - 1) },
    });

    const filename = propertyId
      ? `Preventive_Maintenance_${safeFilename(selectedProperty || propertyId)}.csv`
      : `Preventive_Maintenance_All_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(`\uFEFF${rows.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to export maintenance history." }, { status: error.status || 500 });
  }
}
