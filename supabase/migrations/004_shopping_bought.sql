-- Add is_bought flag to products and product_groups
-- Tracks items marked as "bought" on shopping list but not yet added to inventory
ALTER TABLE products ADD COLUMN is_bought BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE product_groups ADD COLUMN is_bought BOOLEAN NOT NULL DEFAULT FALSE;
