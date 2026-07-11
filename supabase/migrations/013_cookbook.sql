-- ============================================================
-- 013_cookbook.sql
-- Mijn Kookboek – recepten, ingrediënten, genormaliseerde producten
-- ============================================================

-- cookbook_products: genormaliseerde productnamen voor autocomplete
-- Zorgt ervoor dat "tomaat", "Tomaten" en "tomaten" hetzelfde product zijn.
CREATE TABLE cookbook_products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  name_normalized  TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cookbook_products_name_normalized_key UNIQUE (name_normalized)
);

-- recipes: hoofdtabel voor gerechten
CREATE TABLE recipes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  category     TEXT        NOT NULL
                           CHECK (category IN ('hapje', 'voorgerecht', 'hoofdgerecht', 'dessert')),
  preparation  TEXT        NOT NULL DEFAULT '',
  servings     INT         NOT NULL DEFAULT 4,
  prep_time    INT,                          -- bereidingstijd in minuten (nullable)
  image_url    TEXT,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  source       TEXT,                         -- bron / URL van recept
  notes        TEXT,
  is_favorite  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- recipe_ingredients: ingrediënten per gerecht
CREATE TABLE recipe_ingredients (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id            UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  cookbook_product_id  UUID        REFERENCES cookbook_products(id) ON DELETE SET NULL,
  name                 TEXT        NOT NULL,   -- weergavenaam ingrediënt
  quantity             NUMERIC,                -- hoeveelheid (nullable voor "naar smaak")
  unit                 TEXT,                   -- eenheid (g, kg, ml, l, el, kl, stuk, …)
  sort_order           INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_recipes_category      ON recipes(category);
CREATE INDEX idx_recipes_is_favorite   ON recipes(is_favorite) WHERE is_favorite IS TRUE;
CREATE INDEX idx_recipes_created_at    ON recipes(created_at DESC);
CREATE INDEX idx_recipes_title_fts     ON recipes
  USING GIN (to_tsvector('dutch', title));

CREATE INDEX idx_recipe_ingredients_recipe_id   ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_product_id  ON recipe_ingredients(cookbook_product_id)
  WHERE cookbook_product_id IS NOT NULL;

CREATE INDEX idx_cookbook_products_normalized ON cookbook_products(name_normalized);
CREATE INDEX idx_cookbook_products_name_trgm  ON cookbook_products
  USING GIN (name gin_trgm_ops);

-- ─── updated_at trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipes_updated_at();

-- ─── Row Level Security ──────────────────────────────────────
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.

ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookbook_products  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read recipes"   ON recipes FOR SELECT USING (true);
CREATE POLICY "Allow insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update recipes" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Allow delete recipes" ON recipes FOR DELETE USING (true);

CREATE POLICY "Allow read recipe_ingredients"   ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow insert recipe_ingredients" ON recipe_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update recipe_ingredients" ON recipe_ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow delete recipe_ingredients" ON recipe_ingredients FOR DELETE USING (true);

CREATE POLICY "Allow read cookbook_products"   ON cookbook_products FOR SELECT USING (true);
CREATE POLICY "Allow insert cookbook_products" ON cookbook_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update cookbook_products" ON cookbook_products FOR UPDATE USING (true);
CREATE POLICY "Allow delete cookbook_products" ON cookbook_products FOR DELETE USING (true);
