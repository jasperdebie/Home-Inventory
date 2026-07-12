-- Extend recipe categories with 'tussendoortje' and 'drankjes'
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_category_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_category_check
  CHECK (category IN ('hapje', 'voorgerecht', 'hoofdgerecht', 'tussendoortje', 'dessert', 'drankjes'));
