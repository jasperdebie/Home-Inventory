-- ============================================================
-- 021_recipe_star_health_rating.sql
-- Mijn Kookboek – gerecht beoordelen met sterren + gezondheid
-- star_rating:   hoeveel sterretjes geef ik dit gerecht? (1-5, NULL = geen)
-- health_rating: hoe gezond is dit recept? (1-5 broccoli's, NULL = geen)
-- ============================================================

ALTER TABLE recipes ADD COLUMN star_rating SMALLINT
  CHECK (star_rating >= 1 AND star_rating <= 5);

ALTER TABLE recipes ADD COLUMN health_rating SMALLINT
  CHECK (health_rating >= 1 AND health_rating <= 5);
