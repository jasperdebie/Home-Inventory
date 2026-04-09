-- Add optional expiry date to products
ALTER TABLE products ADD COLUMN expires_at DATE;

-- Index for efficient "expiring soon" queries
CREATE INDEX idx_products_expires_at ON products (expires_at) WHERE expires_at IS NOT NULL AND is_archived = FALSE;
