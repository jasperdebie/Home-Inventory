-- Enforce unique barcodes across all products
-- NULL values are allowed (multiple products may have no barcode)

-- Drop the old non-unique index first
DROP INDEX IF EXISTS idx_products_barcode;

-- Add a unique constraint (implicitly creates a unique index)
-- PostgreSQL treats NULLs as distinct, so multiple NULL barcodes are permitted
ALTER TABLE products ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);
