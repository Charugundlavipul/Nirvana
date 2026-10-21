-- Make the starting/last completion entered during initial schedule setup
-- visible and editable in the completion history.
INSERT INTO preventive_maintenance_completions (
    schedule_id,
    completed_on,
    due_on_snapshot,
    generated_next_due_on,
    note,
    completed_by,
    completed_by_name,
    created_at
)
SELECT
    schedule.id,
    schedule.baseline_date,
    schedule.current_due_on,
    schedule.current_due_on,
    'Initial completion recorded during schedule setup',
    schedule.created_by,
    'Schedule setup',
    schedule.created_at
FROM preventive_maintenance_schedules AS schedule
WHERE schedule.baseline_date IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM preventive_maintenance_completions AS completion
      WHERE completion.schedule_id = schedule.id
        AND completion.completed_on = schedule.baseline_date
        AND completion.undone_at IS NULL
  );
