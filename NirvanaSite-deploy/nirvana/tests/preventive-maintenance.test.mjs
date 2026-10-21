import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addRecurrence,
  getMaintenanceStatus,
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

test("team selections are deduplicated and restricted to configured choices", () => {
  assert.deepEqual(normalizeTeams(["STR", "Leadership", "STR", "Other"]), ["STR", "Leadership"]);
});

test("schema preserves completion, undo, due adjustment, attachments, and team history", async () => {
  const schema = await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS preventive_maintenance_catalog/);
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

test("maintenance API enforces notes for completion, undo, and due-date updates", async () => {
  const route = await readFile(new URL("../app/api/admin/preventive-maintenance/route.js", import.meta.url), "utf8");
  assert.match(route, /A completion note is required/);
  assert.match(route, /A reason is required to mark a completion as undone/);
  assert.match(route, /A reason is required when changing a due date/);
  assert.match(route, /current_due_on: completion\.due_on_snapshot/);
  assert.match(route, /completed_by_name/);
});
