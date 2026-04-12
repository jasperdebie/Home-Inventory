-- Add extra_needed column to products and product_groups
-- Allows users to add items to the shopping list without changing min_stock

ALTER TABLE products ADD COLUMN extra_needed numeric DEFAULT 0 NOT NULL;
ALTER TABLE product_groups ADD COLUMN extra_needed numeric DEFAULT 0 NOT NULL;
