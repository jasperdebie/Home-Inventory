-- Product Groups: group similar products for combined stock counting
-- e.g., Lidl shampoo + Aldi shampoo = 1 group "Shampoo"

-- Create product_groups table
CREATE TABLE product_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_stock NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add group_id FK to products
ALTER TABLE products ADD COLUMN group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL;

-- Index for faster group lookups
CREATE INDEX idx_products_group ON products(group_id) WHERE group_id IS NOT NULL;

-- RLS (same open policy as other tables)
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on product_groups"
  ON product_groups FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE product_groups;
