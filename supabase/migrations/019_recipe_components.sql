-- ============================================================
-- 019_recipe_components.sql
-- Mijn Kookboek – subrecepten
-- Een recept kan verwijzen naar andere, reeds bestaande recepten
-- als "subrecept". Bv. éclairs verwijzen naar soezen,
-- banketbakkersroom en ganache.
-- ============================================================

CREATE TABLE recipe_components (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id        UUID        NOT NULL,   -- ouder-recept
  child_recipe_id  UUID        NOT NULL,   -- gekoppeld (sub)recept
  label            TEXT,                   -- optioneel label, bv. "Voor de vulling"
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_recipe_components_parent
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_components_child
    FOREIGN KEY (child_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT recipe_components_no_self CHECK (recipe_id <> child_recipe_id),
  CONSTRAINT recipe_components_unique UNIQUE (recipe_id, child_recipe_id)
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_recipe_components_recipe_id ON recipe_components(recipe_id);
CREATE INDEX idx_recipe_components_child_id  ON recipe_components(child_recipe_id);

-- ─── Row Level Security ──────────────────────────────────────
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.

ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read recipe_components"   ON recipe_components FOR SELECT USING (true);
CREATE POLICY "Allow insert recipe_components" ON recipe_components FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update recipe_components" ON recipe_components FOR UPDATE USING (true);
CREATE POLICY "Allow delete recipe_components" ON recipe_components FOR DELETE USING (true);
