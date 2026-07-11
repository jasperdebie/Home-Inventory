-- ============================================================
-- 017_recipe_equipment.sql
-- Mijn Kookboek – benodigdheden (materiaal/gereedschap) per recept
-- Bv. een mixer, keukenmachine, spuitzak, …
-- ============================================================

-- cookbook_equipment: genormaliseerde namen van benodigdheden voor autocomplete
-- Zorgt ervoor dat "mixer" en "Mixer" hetzelfde item zijn.
CREATE TABLE cookbook_equipment (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  name_normalized  TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cookbook_equipment_name_normalized_key UNIQUE (name_normalized)
);

-- recipe_equipment: benodigdheden per gerecht
CREATE TABLE recipe_equipment (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id              UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  cookbook_equipment_id  UUID        REFERENCES cookbook_equipment(id) ON DELETE SET NULL,
  name                   TEXT        NOT NULL,   -- weergavenaam benodigdheid
  quantity               NUMERIC,                -- aantal (nullable, bv. "2 kommen")
  sort_order             INT         NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_recipe_equipment_recipe_id     ON recipe_equipment(recipe_id);
CREATE INDEX idx_recipe_equipment_equipment_id  ON recipe_equipment(cookbook_equipment_id)
  WHERE cookbook_equipment_id IS NOT NULL;

CREATE INDEX idx_cookbook_equipment_normalized ON cookbook_equipment(name_normalized);
CREATE INDEX idx_cookbook_equipment_name_trgm  ON cookbook_equipment
  USING GIN (name gin_trgm_ops);

-- ─── Row Level Security ──────────────────────────────────────
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.

ALTER TABLE recipe_equipment   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookbook_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read recipe_equipment"   ON recipe_equipment FOR SELECT USING (true);
CREATE POLICY "Allow insert recipe_equipment" ON recipe_equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update recipe_equipment" ON recipe_equipment FOR UPDATE USING (true);
CREATE POLICY "Allow delete recipe_equipment" ON recipe_equipment FOR DELETE USING (true);

CREATE POLICY "Allow read cookbook_equipment"   ON cookbook_equipment FOR SELECT USING (true);
CREATE POLICY "Allow insert cookbook_equipment" ON cookbook_equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update cookbook_equipment" ON cookbook_equipment FOR UPDATE USING (true);
CREATE POLICY "Allow delete cookbook_equipment" ON cookbook_equipment FOR DELETE USING (true);
