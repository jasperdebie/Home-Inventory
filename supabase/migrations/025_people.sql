-- ============================================================
-- 025_people.sql
-- Module "Personen & Herinneringen"
-- Bijhouden per persoon: meenemen / vragen / events, verjaardagen,
-- cadeau-ideeën, groepen (families) en (afgeleide) historiek.
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

-- ─── Groepen / families ─────────────────────────────────────
CREATE TABLE people_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Personen ───────────────────────────────────────────────
CREATE TABLE people (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  group_id          UUID        REFERENCES people_groups(id) ON DELETE SET NULL,
  birthday          DATE,
  birthday_has_year BOOLEAN     NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Herinneringen per persoon ──────────────────────────────
CREATE TABLE people_reminders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('bring', 'ask', 'event')),
  text            TEXT        NOT NULL,
  due_date        DATE,
  recurs_annually BOOLEAN     NOT NULL DEFAULT FALSE,
  done            BOOLEAN     NOT NULL DEFAULT FALSE,
  done_at         TIMESTAMPTZ,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cadeau-ideeën per persoon ──────────────────────────────
CREATE TABLE people_gift_ideas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  given      BOOLEAN     NOT NULL DEFAULT FALSE,
  given_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX idx_people_group             ON people(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_people_birthday          ON people(birthday);
CREATE INDEX idx_people_reminders_person  ON people_reminders(person_id);
CREATE INDEX idx_people_reminders_due     ON people_reminders(due_date);
CREATE INDEX idx_people_gift_ideas_person ON people_gift_ideas(person_id);

-- ─── Row Level Security (open, zoals de rest van het project) ─
ALTER TABLE people_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE people            ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_reminders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_gift_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on people_groups"     ON people_groups     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people"            ON people            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people_reminders"  ON people_reminders  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people_gift_ideas" ON people_gift_ideas FOR ALL USING (true) WITH CHECK (true);
