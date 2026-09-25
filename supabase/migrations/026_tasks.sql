-- ============================================================
-- 026_tasks.sql
-- Module "Taken": terugkerende taken met vast schema of interval,
-- plus historiek (afgevinkt / overgeslagen).
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

CREATE TABLE tasks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'household'
                CHECK (category IN ('household', 'maintenance', 'appointment', 'admin', 'other')),
  notes         TEXT,
  schedule_type TEXT        NOT NULL CHECK (schedule_type IN ('fixed', 'interval')),
  every_n       INT         NOT NULL DEFAULT 1 CHECK (every_n >= 1),
  unit          TEXT        NOT NULL CHECK (unit IN ('day', 'week', 'month', 'year')),
  weekdays      SMALLINT[],
  month_day     SMALLINT    CHECK (month_day BETWEEN 1 AND 31),
  start_date    DATE        NOT NULL,
  next_due      DATE        NOT NULL,
  archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('done', 'skipped')),
  event_date DATE        NOT NULL,
  due_date   DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_next_due     ON tasks(next_due) WHERE archived = FALSE;
CREATE INDEX idx_task_events_task   ON task_events(task_id, created_at DESC);

ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on tasks"       ON tasks       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_events" ON task_events FOR ALL USING (true) WITH CHECK (true);
