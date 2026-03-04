-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  barcode TEXT,
  min_stock NUMERIC NOT NULL DEFAULT 1,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock changes audit log
CREATE TABLE stock_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change NUMERIC NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('add', 'consume', 'adjust', 'initial')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for barcode lookups
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Index for stock changes by product
CREATE INDEX idx_stock_changes_product ON stock_changes(product_id, created_at DESC);

-- Index for shopping list query (low stock, non-archived)
CREATE INDEX idx_products_low_stock ON products(current_stock, min_stock) WHERE NOT is_archived;

-- Trigger: update current_stock on stock_changes insert
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock + NEW.quantity_change,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON stock_changes
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- Trigger: update updated_at on products
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for anon key - PIN auth is handled at app level)
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_changes" ON stock_changes FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_changes;

-- Seed data: default categories
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Dairy', '🥛', 1),
  ('Meat & Fish', '🥩', 2),
  ('Fruits & Vegetables', '🥬', 3),
  ('Bread & Bakery', '🍞', 4),
  ('Drinks', '🥤', 5),
  ('Snacks', '🍪', 6),
  ('Canned & Jarred', '🥫', 7),
  ('Frozen', '🧊', 8),
  ('Cleaning', '🧹', 9),
  ('Personal Care', '🧴', 10),
  ('Other', '📦', 99);
