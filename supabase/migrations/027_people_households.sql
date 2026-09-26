-- ============================================================
-- 027_people_households.sql
-- Huishoudens met één gedeeld adres; een persoon zit in hoogstens
-- één huishouden (los van de groepen).
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

CREATE TABLE people_households (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  street       TEXT,
  house_number TEXT,
  postal_code  TEXT,
  city         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE people
  ADD COLUMN household_id UUID REFERENCES people_households(id) ON DELETE SET NULL;

CREATE INDEX idx_people_household ON people(household_id) WHERE household_id IS NOT NULL;

ALTER TABLE people_households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on people_households" ON people_households FOR ALL USING (true) WITH CHECK (true);
