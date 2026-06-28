-- Books table for personal library management
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  bought BOOLEAN NOT NULL DEFAULT FALSE,
  lent BOOLEAN NOT NULL DEFAULT FALSE,
  lent_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for search queries (title, author)
CREATE INDEX idx_books_title_author ON books 
  USING GIN((to_tsvector('dutch', title || ' ' || author)));

-- Index for filtering by genre
CREATE INDEX idx_books_genre ON books(genre) WHERE genre IS NOT NULL;

-- Index for filtering by read status
CREATE INDEX idx_books_read ON books(read);

-- Index for filtering by lent status
CREATE INDEX idx_books_lent ON books(lent) WHERE lent IS TRUE;

-- Index for recent books (sorting by creation date)
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- Trigger: update updated_at on books
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_books_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION update_books_updated_at();

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for anon key - PIN auth is handled at app level)
CREATE POLICY "Allow read access to all books" ON books
  FOR SELECT USING (true);

CREATE POLICY "Allow insert books" ON books
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update books" ON books
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete books" ON books
  FOR DELETE USING (true);
