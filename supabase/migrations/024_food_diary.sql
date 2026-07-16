-- ============================================================
-- 024_food_diary.sql
-- Eetdagboek (Eet-tracker) – dagelijkse logs, klachten, bibliotheek
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

-- ─── Gelogde items per eetmoment ────────────────────────────
CREATE TABLE food_diary_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date    DATE        NOT NULL,
  slot        TEXT        NOT NULL
                          CHECK (slot IN (
                            'breakfast', 'morning_snack', 'lunch',
                            'afternoon_snack', 'dinner', 'evening_snack'
                          )),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('food', 'drink')),
  comment     TEXT,
  ingredients TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Klachten per eetmoment ─────────────────────────────────
CREATE TABLE food_diary_complaints (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date    DATE        NOT NULL,
  slot        TEXT        NOT NULL
                          CHECK (slot IN (
                            'breakfast', 'morning_snack', 'lunch',
                            'afternoon_snack', 'dinner', 'evening_snack'
                          )),
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Persoonlijke bibliotheek (herbruikbare items) ──────────
CREATE TABLE food_diary_library (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  name_normalized TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type IN ('food', 'drink')),
  comment         TEXT,
  ingredients     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT food_diary_library_name_type_key UNIQUE (name_normalized, type)
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX idx_food_diary_items_date       ON food_diary_items(log_date);
CREATE INDEX idx_food_diary_items_date_slot  ON food_diary_items(log_date, slot);
CREATE INDEX idx_food_diary_complaints_date  ON food_diary_complaints(log_date);
CREATE INDEX idx_food_diary_library_name     ON food_diary_library(name_normalized);

-- ─── Row Level Security ─────────────────────────────────────
ALTER TABLE food_diary_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_diary_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_diary_library    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read food_diary_items"   ON food_diary_items FOR SELECT USING (true);
CREATE POLICY "Allow insert food_diary_items" ON food_diary_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update food_diary_items" ON food_diary_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete food_diary_items" ON food_diary_items FOR DELETE USING (true);

CREATE POLICY "Allow read food_diary_complaints"   ON food_diary_complaints FOR SELECT USING (true);
CREATE POLICY "Allow insert food_diary_complaints" ON food_diary_complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update food_diary_complaints" ON food_diary_complaints FOR UPDATE USING (true);
CREATE POLICY "Allow delete food_diary_complaints" ON food_diary_complaints FOR DELETE USING (true);

CREATE POLICY "Allow read food_diary_library"   ON food_diary_library FOR SELECT USING (true);
CREATE POLICY "Allow insert food_diary_library" ON food_diary_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update food_diary_library" ON food_diary_library FOR UPDATE USING (true);
CREATE POLICY "Allow delete food_diary_library" ON food_diary_library FOR DELETE USING (true);
