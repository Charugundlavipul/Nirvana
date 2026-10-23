import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addRecurrence,
  getMaintenanceStatus,
  latestCompletionDate,
  maintenanceScheduleChanged,
  normalizeTeams,
  recurrenceLabel,
} from "../src/lib/preventiveMaintenance.js";

test("maintenance recurrence supports days, weeks, months, years, and month-end clipping", () => {
  assert.equal(addRecurrence("2026-01-31", 1, "month"), "2026-02-28");
  assert.equal(addRecurrence("2028-02-29", 1, "year"), "2029-02-28");
  assert.equal(addRecurrence("2026-10-01", 4, "week"), "2026-10-29");
  assert.equal(addRecurrence("2026-10-01", 2, "day"), "2026-10-03");
  assert.equal(recurrenceLabel(6, "month"), "Every 6 months");
});

test("maintenance status bands are complete and non-overlapping", () => {
  const today = "2026-10-21";
  assert.equal(getMaintenanceStatus("2026-10-20", today), "overdue");
  assert.equal(getMaintenanceStatus("2026-10-21", today), "urgent");
  assert.equal(getMaintenanceStatus("2026-10-28", today), "urgent");
  assert.equal(getMaintenanceStatus("2026-10-29", today), "upcoming");
  assert.equal(getMaintenanceStatus("2026-11-11", today), "upcoming");
  assert.equal(getMaintenanceStatus("2026-11-12", today), "on_track");
  assert.equal(getMaintenanceStatus("", today), "unscheduled");
});

test("latest completion uses the latest date, including the initial baseline", () => {
  const completions = [
    { completed_on: "2026-09-15", undone_at: null },
    { completed_on: "2026-12-01", undone_at: "2026-12-02T00:00:00Z" },
    { completed_on: "2026-10-15", undone_at: null },
  ];
  assert.equal(latestCompletionDate(completions, "2026-10-01"), "2026-10-15");
  assert.equal(latestCompletionDate(completions, "2026-11-01"), "2026-11-01");
});

test("team selections are deduplicated and restricted to configured choices", () => {
  assert.deepEqual(normalizeTeams(["STR", "Leadership", "STR", "Other"]), ["STR", "Leadership"]);
});

test("catalog schedules are dirty only when an editable value changes", () => {
  const schedule = {
    baseline_date: "2026-10-01",
    current_due_on: "2026-11-01",
    recurrence_count: 1,
    recurrence_unit: "month",
  };
  const unchangedDraft = {
    baselineDate: "2026-10-01",
    nextDueOn: "",
    recurrenceCount: "1",
    recurrenceUnit: "month",
  };

  assert.equal(maintenanceScheduleChanged(schedule, unchangedDraft), false);
  assert.equal(maintenanceScheduleChanged(schedule, { ...unchangedDraft, recurrenceCount: "2" }), true);
  assert.equal(maintenanceScheduleChanged(schedule, { ...unchangedDraft, recurrenceUnit: "week" }), true);
  assert.equal(maintenanceScheduleChanged(schedule, { ...unchangedDraft, baselineDate: "2026-10-02" }), false);
  assert.equal(maintenanceScheduleChanged(null, unchangedDraft), true);

  const manualSchedule = { ...schedule, baseline_date: null };
  assert.equal(maintenanceScheduleChanged(manualSchedule, { ...unchangedDraft, baselineDate: "", nextDueOn: "2026-11-01" }), false);
  assert.equal(maintenanceScheduleChanged(manualSchedule, { ...unchangedDraft, baselineDate: "", nextDueOn: "2026-11-02" }), false);
});

test("schema preserves completion, undo, due adjustment, attachments, and team history", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS preventive_maintenance_catalog/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS preventive_maintenance_exclusions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS preventive_maintenance_schedules/);
  assert.match(schema, /due_on_snapshot DATE NOT NULL/);
  assert.match(schema, /undo_reason TEXT/);
  assert.match(schema, /preventive_maintenance_due_adjustments/);
  assert.match(schema, /'preventive-maintenance'[\s\S]*FALSE[\s\S]*10485760/);
  assert.match(schema, /teams TEXT\[\] NOT NULL DEFAULT ARRAY\[\]::TEXT\[\]/);
});

test("canonical schema does not rerun completed destructive data migrations", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /UPDATE properties SET is_published = TRUE/);
  assert.doesNotMatch(schema, /INSERT INTO property_curated_images[\s\S]*SELECT[\s\S]*FROM property_images/);
  assert.doesNotMatch(schema, /DELETE FROM property_images/);
  assert.doesNotMatch(schema, /UPDATE knowledge_hubs\s+(?:kh\s+)?SET/);
  assert.doesNotMatch(schema, /INSERT INTO salary_audit_logs/);
});

test("maintenance API derives due dates from the latest completion and supports history edits", async () => {
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  assert.match(route, /function dueFromLatestCompletion/);
  assert.match(route, /\.order\("completed_on", \{ ascending: false \}\)/);
  assert.match(route, /action === "update_completion"/);
  assert.match(route, /delete_completion/);
  assert.match(route, /requestedCompletionId/);
  assert.doesNotMatch(route, /action === "update_due"/);
  assert.match(route, /A reason is required to mark a completion as undone/);
  assert.match(route, /completed_by_name/);
});

test("catalog properties can be excluded and restored without deleting maintenance history", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceCatalog.jsx", import.meta.url), "utf8");
  assert.match(schema, /PRIMARY KEY \(catalog_task_id, property_id\)/);
  assert.match(schema, /'property_excluded', 'property_restored'/);
  assert.match(route, /action === "exclude_property"/);
  assert.match(route, /is_active: false/);
  assert.match(route, /action === "restore_property"/);
  assert.match(catalog, /Remove property/);
  assert.match(catalog, /Restore/);
});

test("catalog schedules require an explicit next due date when no baseline exists", async () => {
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceCatalog.jsx", import.meta.url), "utf8");
  assert.match(route, /requestedNextDue/);
  assert.match(route, /Choose the next due date when there is no starting or last completion date/);
  assert.match(route, /baselineDate\s*\?\s*addRecurrence\(baselineDate/);
  assert.match(route, /next_due_source: existing \? "latest_completion" : baselineDate \? "calculated_from_baseline" : "manually_selected"/);
  assert.match(catalog, /Next due date/);
  assert.match(catalog, /required=\{!draft\.baselineDate\}/);
  assert.match(catalog, /!schedule && <div className=\{styles\.field\}><label>Starting\/last completion/);
  assert.match(catalog, /!schedule && <div className=\{styles\.field\}>[\s\S]*<label>Next due date/);
});

test("task history shows editable completions instead of audit events", async () => {
  const tasks = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceTasks.jsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceDashboard.jsx", import.meta.url), "utf8");
  assert.match(tasks, /Completion history/);
  assert.match(tasks, /mode: "edit"/);
  assert.match(tasks, /maintenanceAction\("update_completion"/);
  assert.match(tasks, /Recorded by/);
  assert.match(tasks, /maintenanceAction\("delete_completion"/);
  assert.match(tasks, /setTimeout\(\(\) => setMessage\(null\), 10000\)/);
  assert.doesNotMatch(tasks, /scheduleEventMap|Complete property history|Update due date/);
  assert.match(dashboard, /Recent completions/);
  assert.doesNotMatch(dashboard, /data\.events/);
});

test("the initial baseline date becomes an editable completion-history record", async () => {
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261021000000_backfill_maintenance_baseline_completions.sql", import.meta.url), "utf8");
  assert.match(route, /Initial completion recorded during schedule setup/);
  assert.match(route, /completed_on: baselineDate/);
  assert.match(route, /completion\.completed_on === schedule\.baseline_date/);
  assert.match(migration, /schedule\.baseline_date IS NOT NULL/);
  assert.match(migration, /NOT EXISTS/);
  assert.match(migration, /completion\.completed_on = schedule\.baseline_date/);
});

test("catalog task names and descriptions can be edited by configurators", async () => {
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceCatalog.jsx", import.meta.url), "utf8");
  assert.match(route, /action === "update_catalog"[\s\S]*assertConfigurator\(role\)/);
  assert.match(catalog, /Edit task details/);
  assert.match(catalog, /maintenanceAction\("update_catalog"/);
  assert.match(catalog, /Task name and description updated/);
});

test("maintenance offers a toggleable flat catalog and property-first row view", async () => {
  const app = await readFile(new URL("../src/components/Admin/AdminApp.jsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceShell.jsx", import.meta.url), "utf8");
  const catalog2 = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceCatalog2.jsx", import.meta.url), "utf8");
  const properties = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/MaintenanceProperties.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/components/Admin/PreventiveMaintenance/Maintenance.module.css", import.meta.url), "utf8");

  assert.match(app, /preventive-maintenance\/catalog-2/);
  assert.match(app, /preventive-maintenance\/properties/);
  assert.match(shell, /role="switch"/);
  assert.match(shell, /label: "Catalog"/);
  assert.doesNotMatch(shell, /Catalog 2/);
  assert.match(shell, /Property view/);
  assert.doesNotMatch(catalog2, /<details className=\{`\$\{styles\.card\} \$\{styles\.catalogItem\}`\}/);
  assert.match(catalog2, /flatCatalogRow/);
  assert.match(properties, /Select a property…/);
  assert.match(properties, /Near due/);
  assert.match(properties, /1–7 days/);
  assert.match(properties, /8–21 days/);
  assert.doesNotMatch(properties, /key: "completed"/);
  assert.match(properties, /Recently completed/);
  assert.match(properties, /Last 30 days/);
  assert.match(properties, /recentCompletionRows/);
  assert.doesNotMatch(properties, /Completion history/);
  assert.match(properties, /propertyTaskRow/);
  assert.match(properties, /maintenanceAction\("upsert_schedule"/);
  assert.match(properties, /Recorded by/);
  assert.match(properties, /maintenanceAction\("delete_completion"/);
  assert.match(properties, /setTimeout\(\(\) => setMessage\(null\), 10000\)/);
  assert.match(properties, /Create schedule/);
  assert.doesNotMatch(properties, /Switch to Classic view to configure it/);
  assert.match(styles, /--property-task-columns:/);
  assert.match(styles, /grid-template-columns: var\(--property-task-columns\)/);
  assert.match(styles, /\.propertyTaskTop > \.rowActions \{ grid-column: 4;/);
});
