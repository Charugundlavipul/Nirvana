import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../src/lib/server/supabaseAdmin";
import {
  MAINTENANCE_UNITS,
  addRecurrence,
  getMaintenanceStatus,
  isDateString,
  todayDateString,
} from "../../../../src/lib/preventiveMaintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function text(value, max = 2000) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, max) : "";
}

function assertConfigurator(role) {
  if (!['owner', 'admin'].includes(role)) fail("Admin access is required to change maintenance schedules.", 403);
}

async function actorName(adminClient, user) {
  const { data } = await adminClient
    .from("employee_directory")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();
  return `${data?.first_name || ""} ${data?.last_name || ""}`.trim() || user.email || "Admin user";
}

async function loadWorkspace(adminClient, role) {
  const [propertiesResult, catalogResult, exclusionsResult, schedulesResult, completionsResult, attachmentsResult, eventsResult] = await Promise.all([
    adminClient.from("properties").select("id, name, slug, location").order("name"),
    adminClient.from("preventive_maintenance_catalog").select("*").order("name"),
    adminClient.from("preventive_maintenance_exclusions").select("catalog_task_id, property_id, excluded_by, created_at"),
    adminClient.from("preventive_maintenance_schedules").select("*").eq("is_active", true).order("current_due_on"),
    adminClient.from("preventive_maintenance_completions").select("*").order("created_at", { ascending: false }).limit(1000),
    adminClient.from("preventive_maintenance_attachments").select("*").order("created_at", { ascending: false }),
    adminClient.from("preventive_maintenance_events").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);
  for (const result of [propertiesResult, catalogResult, exclusionsResult, schedulesResult, completionsResult, attachmentsResult, eventsResult]) {
    if (result.error) throw result.error;
  }

  const properties = propertiesResult.data || [];
  const catalog = catalogResult.data || [];
  const exclusions = exclusionsResult.data || [];
  const exclusionKeys = new Set(exclusions.map((item) => `${item.catalog_task_id}:${item.property_id}`));
  const propertyMap = new Map(properties.map((item) => [item.id, item]));
  const catalogMap = new Map(catalog.map((item) => [item.id, item]));
  const attachmentMap = new Map();
  for (const attachment of attachmentsResult.data || []) {
    attachmentMap.set(attachment.completion_id, [...(attachmentMap.get(attachment.completion_id) || []), attachment]);
  }
  const completions = (completionsResult.data || []).map((completion) => ({
    ...completion,
    attachments: attachmentMap.get(completion.id) || [],
  }));
  const completionMap = new Map();
  for (const completion of completions) {
    completionMap.set(completion.schedule_id, [...(completionMap.get(completion.schedule_id) || []), completion]);
  }
  const schedules = (schedulesResult.data || []).filter((schedule) => (
    catalogMap.get(schedule.catalog_task_id)?.is_active
    && !exclusionKeys.has(`${schedule.catalog_task_id}:${schedule.property_id}`)
  )).map((schedule) => ({
    ...schedule,
    property: propertyMap.get(schedule.property_id) || null,
    task: catalogMap.get(schedule.catalog_task_id) || null,
    status: getMaintenanceStatus(schedule.current_due_on),
    completions: completionMap.get(schedule.id) || [],
  }));
  const counts = { overdue: 0, urgent: 0, upcoming: 0, on_track: 0, unscheduled: 0 };
  for (const schedule of schedules) counts[schedule.status] += 1;
  const activeCatalog = catalog.filter((item) => item.is_active);
  const expectedSchedules = activeCatalog.reduce(
    (total, task) => total + properties.filter((property) => !exclusionKeys.has(`${task.id}:${property.id}`)).length,
    0,
  );
  counts.unscheduled = Math.max(0, expectedSchedules - schedules.length);

  return {
    role,
    canConfigure: ['owner', 'admin'].includes(role),
    properties,
    catalog,
    exclusions,
    schedules,
    completions,
    events: eventsResult.data || [],
    counts,
  };
}

export async function GET(request) {
  try {
    const { adminClient, role } = await requireAdminAccess(request);
    return json(await loadWorkspace(adminClient, role));
  } catch (error) {
    return json({ error: error.message || "Unable to load preventive maintenance." }, error.status || 500);
  }
}

async function readBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      body: Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
      files: form.getAll("files").filter((value) => typeof value !== "string" && value.size > 0),
    };
  }
  return { body: await request.json(), files: [] };
}

export async function POST(request) {
  try {
    const { adminClient, user, role } = await requireAdminAccess(request);
    const { body, files } = await readBody(request);
    const action = text(body.action, 80);
    const actor = await actorName(adminClient, user);

    if (action === "create_catalog") {
      assertConfigurator(role);
      const name = text(body.name, 160);
      if (!name) fail("Task name is required.");
      const { data, error } = await adminClient.from("preventive_maintenance_catalog").insert({
        name,
        description: text(body.description, 1000) || null,
        created_by: user.id,
        updated_by: user.id,
      }).select("*").single();
      if (error) throw error;
      await adminClient.from("preventive_maintenance_events").insert({
        catalog_task_id: data.id, event_type: "catalog_created", actor_user_id: user.id, actor_name: actor,
        note: `Catalog task created: ${name}`,
      });
      return json({ ok: true, task: data });
    }

    if (action === "update_catalog") {
      assertConfigurator(role);
      const taskId = text(body.taskId, 80);
      const name = text(body.name, 160);
      if (!taskId || !name) fail("Task and name are required.");
      const { data, error } = await adminClient.from("preventive_maintenance_catalog").update({
        name, description: text(body.description, 1000) || null, updated_by: user.id,
      }).eq("id", taskId).select("*").single();
      if (error) throw error;
      await adminClient.from("preventive_maintenance_events").insert({
        catalog_task_id: taskId, event_type: "catalog_updated", actor_user_id: user.id, actor_name: actor,
        note: `Catalog task updated: ${name}`,
      });
      return json({ ok: true, task: data });
    }

    if (action === "archive_catalog") {
      assertConfigurator(role);
      const taskId = text(body.taskId, 80);
      if (!taskId) fail("Task is required.");
      const { error } = await adminClient.from("preventive_maintenance_catalog").update({
        is_active: false, updated_by: user.id,
      }).eq("id", taskId);
      if (error) throw error;
      const { error: scheduleArchiveError } = await adminClient.from("preventive_maintenance_schedules").update({
        is_active: false, updated_by: user.id,
      }).eq("catalog_task_id", taskId);
      if (scheduleArchiveError) throw scheduleArchiveError;
      await adminClient.from("preventive_maintenance_events").insert({
        catalog_task_id: taskId, event_type: "catalog_archived", actor_user_id: user.id, actor_name: actor,
        note: text(body.reason, 500) || "Catalog task archived",
      });
      return json({ ok: true });
    }

    if (action === "upsert_schedule") {
      assertConfigurator(role);
      const taskId = text(body.taskId, 80);
      const propertyId = text(body.propertyId, 80);
      const recurrenceCount = Number(body.recurrenceCount);
      const recurrenceUnit = text(body.recurrenceUnit, 20);
      const baselineDate = text(body.baselineDate, 10) || null;
      if (!taskId || !propertyId) fail("Task and property are required.");
      if (!Number.isInteger(recurrenceCount) || recurrenceCount < 1) fail("Recurrence must be a positive whole number.");
      if (!MAINTENANCE_UNITS.includes(recurrenceUnit)) fail("Choose a valid recurrence unit.");
      if (baselineDate && !isDateString(baselineDate)) fail("Starting date is invalid.");
      const nextDue = addRecurrence(baselineDate || todayDateString(), recurrenceCount, recurrenceUnit);
      const { error: exclusionError } = await adminClient.from("preventive_maintenance_exclusions")
        .delete().eq("catalog_task_id", taskId).eq("property_id", propertyId);
      if (exclusionError) throw exclusionError;
      const { data: existing, error: existingError } = await adminClient.from("preventive_maintenance_schedules")
        .select("*").eq("catalog_task_id", taskId).eq("property_id", propertyId).maybeSingle();
      if (existingError) throw existingError;
      let schedule;
      if (existing) {
        const { data, error } = await adminClient.from("preventive_maintenance_schedules").update({
          recurrence_count: recurrenceCount,
          recurrence_unit: recurrenceUnit,
          baseline_date: baselineDate,
          current_due_on: nextDue,
          is_active: true,
          updated_by: user.id,
          version: existing.version + 1,
        }).eq("id", existing.id).eq("version", existing.version).select("*").maybeSingle();
        if (error) throw error;
        if (!data) fail("This schedule changed while you were editing it. Please refresh and try again.", 409);
        schedule = data;
      } else {
        const { data, error } = await adminClient.from("preventive_maintenance_schedules").insert({
          catalog_task_id: taskId,
          property_id: propertyId,
          recurrence_count: recurrenceCount,
          recurrence_unit: recurrenceUnit,
          baseline_date: baselineDate,
          current_due_on: nextDue,
          created_by: user.id,
          updated_by: user.id,
        }).select("*").single();
        if (error) throw error;
        schedule = data;
      }
      await adminClient.from("preventive_maintenance_events").insert({
        property_id: propertyId,
        catalog_task_id: taskId,
        schedule_id: schedule.id,
        event_type: existing ? "schedule_updated" : "schedule_created",
        actor_user_id: user.id,
        actor_name: actor,
        previous_due_on: existing?.current_due_on || null,
        new_due_on: nextDue,
        metadata: { recurrence_count: recurrenceCount, recurrence_unit: recurrenceUnit, baseline_date: baselineDate },
      });
      return json({ ok: true, schedule });
    }

    if (action === "exclude_property") {
      assertConfigurator(role);
      const taskId = text(body.taskId, 80);
      const propertyId = text(body.propertyId, 80);
      if (!taskId || !propertyId) fail("Task and property are required.");
      const [{ data: existingExclusion, error: exclusionLookupError }, { data: schedule, error: scheduleLookupError }] = await Promise.all([
        adminClient.from("preventive_maintenance_exclusions").select("catalog_task_id").eq("catalog_task_id", taskId).eq("property_id", propertyId).maybeSingle(),
        adminClient.from("preventive_maintenance_schedules").select("*").eq("catalog_task_id", taskId).eq("property_id", propertyId).maybeSingle(),
      ]);
      if (exclusionLookupError) throw exclusionLookupError;
      if (scheduleLookupError) throw scheduleLookupError;
      const { error: excludeError } = await adminClient.from("preventive_maintenance_exclusions").upsert({
        catalog_task_id: taskId,
        property_id: propertyId,
        excluded_by: user.id,
      }, { onConflict: "catalog_task_id,property_id" });
      if (excludeError) throw excludeError;
      if (schedule?.is_active) {
        const { data: deactivated, error: deactivateError } = await adminClient.from("preventive_maintenance_schedules").update({
          is_active: false,
          updated_by: user.id,
          version: schedule.version + 1,
        }).eq("id", schedule.id).eq("version", schedule.version).select("id").maybeSingle();
        if (deactivateError || !deactivated) {
          if (!existingExclusion) {
            await adminClient.from("preventive_maintenance_exclusions").delete().eq("catalog_task_id", taskId).eq("property_id", propertyId);
          }
          if (deactivateError) throw deactivateError;
          fail("This schedule changed while you were removing the property. Please refresh and try again.", 409);
        }
      }
      if (!existingExclusion) {
        await adminClient.from("preventive_maintenance_events").insert({
          property_id: propertyId,
          catalog_task_id: taskId,
          schedule_id: schedule?.id || null,
          event_type: "property_excluded",
          actor_user_id: user.id,
          actor_name: actor,
          note: "Property removed from this preventive maintenance task. Existing history was preserved.",
        });
      }
      return json({ ok: true });
    }

    if (action === "restore_property") {
      assertConfigurator(role);
      const taskId = text(body.taskId, 80);
      const propertyId = text(body.propertyId, 80);
      if (!taskId || !propertyId) fail("Task and property are required.");
      const { data: removed, error: restoreError } = await adminClient.from("preventive_maintenance_exclusions")
        .delete().eq("catalog_task_id", taskId).eq("property_id", propertyId).select("catalog_task_id").maybeSingle();
      if (restoreError) throw restoreError;
      if (removed) {
        await adminClient.from("preventive_maintenance_events").insert({
          property_id: propertyId,
          catalog_task_id: taskId,
          event_type: "property_restored",
          actor_user_id: user.id,
          actor_name: actor,
          note: "Property restored to this preventive maintenance task. A schedule must be applied before it becomes active.",
        });
      }
      return json({ ok: true });
    }

    const scheduleId = text(body.scheduleId, 80);
    if (!["complete", "undo_completion", "update_due"].includes(action)) fail("Unknown maintenance action.", 404);
    const { data: schedule, error: scheduleError } = await adminClient.from("preventive_maintenance_schedules")
      .select("*").eq("id", scheduleId).eq("is_active", true).maybeSingle();
    if (scheduleError) throw scheduleError;
    if (!schedule) fail("Maintenance schedule not found.", 404);

    if (action === "update_due") {
      assertConfigurator(role);
      const newDueOn = text(body.newDueOn, 10);
      const reason = text(body.reason, 1000);
      if (!isDateString(newDueOn)) fail("Choose a valid due date.");
      if (!reason) fail("A reason is required when changing a due date.");
      const { data: adjustment, error: adjustmentError } = await adminClient.from("preventive_maintenance_due_adjustments").insert({
        schedule_id: schedule.id,
        previous_due_on: schedule.current_due_on,
        new_due_on: newDueOn,
        reason,
        adjusted_by: user.id,
        adjusted_by_name: actor,
      }).select("*").single();
      if (adjustmentError) throw adjustmentError;
      const { data: updated, error: updateError } = await adminClient.from("preventive_maintenance_schedules").update({
        current_due_on: newDueOn, updated_by: user.id, version: schedule.version + 1,
      }).eq("id", schedule.id).eq("version", schedule.version).select("id").maybeSingle();
      if (updateError || !updated) {
        await adminClient.from("preventive_maintenance_due_adjustments").delete().eq("id", adjustment.id);
        if (updateError) throw updateError;
        fail("This task changed while you were editing it. Please refresh and try again.", 409);
      }
      await adminClient.from("preventive_maintenance_events").insert({
        property_id: schedule.property_id, catalog_task_id: schedule.catalog_task_id, schedule_id: schedule.id,
        event_type: "due_date_updated", actor_user_id: user.id, actor_name: actor,
        previous_due_on: schedule.current_due_on, new_due_on: newDueOn, note: reason,
      });
      return json({ ok: true });
    }

    if (action === "complete") {
      const note = text(body.note, 3000);
      const completedOn = text(body.completedOn, 10) || todayDateString();
      if (!note) fail("A completion note is required.");
      if (!isDateString(completedOn)) fail("Completion date is invalid.");
      if (files.length > 5) fail("Attach no more than 5 files.");
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
      for (const file of files) {
        if (!allowedTypes.has(file.type)) fail(`${file.name} is not a supported file type.`);
        if (file.size > 10485760) fail(`${file.name} is larger than 10 MB.`);
      }
      const nextDue = addRecurrence(completedOn, schedule.recurrence_count, schedule.recurrence_unit);
      const completionId = crypto.randomUUID();
      const { error: completionError } = await adminClient.from("preventive_maintenance_completions").insert({
        id: completionId,
        schedule_id: schedule.id,
        completed_on: completedOn,
        due_on_snapshot: schedule.current_due_on,
        generated_next_due_on: nextDue,
        note,
        completed_by: user.id,
        completed_by_name: actor,
      });
      if (completionError) throw completionError;
      const { data: updated, error: updateError } = await adminClient.from("preventive_maintenance_schedules").update({
        current_due_on: nextDue, updated_by: user.id, version: schedule.version + 1,
      }).eq("id", schedule.id).eq("version", schedule.version).select("id").maybeSingle();
      if (updateError || !updated) {
        await adminClient.from("preventive_maintenance_completions").delete().eq("id", completionId);
        if (updateError) throw updateError;
        fail("This task was updated by someone else. Please refresh and try again.", 409);
      }

      const attachmentWarnings = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
        const path = `${schedule.property_id}/${schedule.id}/${completionId}/${crypto.randomUUID()}-${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await adminClient.storage.from("preventive-maintenance").upload(path, buffer, {
          contentType: file.type, upsert: false,
        });
        if (uploadError) {
          attachmentWarnings.push(`${file.name}: ${uploadError.message}`);
          continue;
        }
        const { data: attachment, error: attachmentError } = await adminClient.from("preventive_maintenance_attachments").insert({
          completion_id: completionId,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        }).select("id").single();
        if (attachmentError) {
          await adminClient.storage.from("preventive-maintenance").remove([path]);
          attachmentWarnings.push(`${file.name}: ${attachmentError.message}`);
          continue;
        }
        await adminClient.from("preventive_maintenance_events").insert({
          property_id: schedule.property_id, catalog_task_id: schedule.catalog_task_id, schedule_id: schedule.id,
          completion_id: completionId, event_type: "attachment_added", actor_user_id: user.id, actor_name: actor,
          metadata: { attachment_id: attachment.id, filename: file.name },
        });
      }
      await adminClient.from("preventive_maintenance_events").insert({
        property_id: schedule.property_id, catalog_task_id: schedule.catalog_task_id, schedule_id: schedule.id,
        completion_id: completionId, event_type: "task_completed", actor_user_id: user.id, actor_name: actor,
        previous_due_on: schedule.current_due_on, new_due_on: nextDue, note,
        metadata: { completed_on: completedOn },
      });
      return json({ ok: true, completionId, nextDue, attachmentWarnings });
    }

    const reason = text(body.reason, 1000);
    if (!reason) fail("A reason is required to mark a completion as undone.");
    const { data: completion, error: completionLookupError } = await adminClient.from("preventive_maintenance_completions")
      .select("*").eq("schedule_id", schedule.id).is("undone_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (completionLookupError) throw completionLookupError;
    if (!completion) fail("There is no active completion to undo.");
    const now = new Date().toISOString();
    const { data: undone, error: undoError } = await adminClient.from("preventive_maintenance_completions").update({
      undone_at: now, undone_by: user.id, undone_by_name: actor, undo_reason: reason,
    }).eq("id", completion.id).is("undone_at", null).select("id").maybeSingle();
    if (undoError) throw undoError;
    if (!undone) fail("This completion has already been undone.", 409);
    const { data: restored, error: restoreError } = await adminClient.from("preventive_maintenance_schedules").update({
      current_due_on: completion.due_on_snapshot, updated_by: user.id, version: schedule.version + 1,
    }).eq("id", schedule.id).eq("version", schedule.version).select("id").maybeSingle();
    if (restoreError || !restored) {
      await adminClient.from("preventive_maintenance_completions").update({
        undone_at: null, undone_by: null, undone_by_name: null, undo_reason: null,
      }).eq("id", completion.id);
      if (restoreError) throw restoreError;
      fail("This task changed while you were undoing it. Please refresh and try again.", 409);
    }
    await adminClient.from("preventive_maintenance_due_adjustments").update({
      superseded_at: now, superseded_by: user.id,
    }).eq("schedule_id", schedule.id).gt("created_at", completion.created_at).is("superseded_at", null);
    await adminClient.from("preventive_maintenance_events").insert({
      property_id: schedule.property_id, catalog_task_id: schedule.catalog_task_id, schedule_id: schedule.id,
      completion_id: completion.id, event_type: "completion_undone", actor_user_id: user.id, actor_name: actor,
      previous_due_on: schedule.current_due_on, new_due_on: completion.due_on_snapshot, note: reason,
    });
    return json({ ok: true, restoredDueOn: completion.due_on_snapshot });
  } catch (error) {
    return json({ error: error.message || "Preventive maintenance action failed." }, error.status || 500);
  }
}
