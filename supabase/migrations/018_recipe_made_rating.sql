-- ============================================================
-- 018_recipe_made_rating.sql
-- Mijn Kookboek – recept al gemaakt + beoordeling
-- is_made: heb ik dit recept al eens gemaakt?
-- rating:  hoe vond ik het? (zeer_goed, goed, matig, minder, slecht)
-- ============================================================

ALTER TABLE recipes ADD COLUMN is_made BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN rating  TEXT
  CHECK (rating IN ('zeer_goed', 'goed', 'matig', 'minder', 'slecht'));
