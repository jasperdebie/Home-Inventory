-- Genres lookup table (optional - for standardization and autocomplete)
CREATE TABLE book_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default genres from the specification
INSERT INTO book_genres (name, is_default) VALUES
  ('Biografie', true),
  ('Fantasy', true),
  ('Humor', true),
  ('Kinderboeken', true),
  ('Klassiek', true),
  ('Non-fictie', true),
  ('Poëzie', true),
  ('Roman', true),
  ('Thriller', true),
  ('Young Adult', true)
ON CONFLICT (name) DO NOTHING;

-- Index for genre lookups
CREATE INDEX idx_book_genres_name ON book_genres(name);

-- Index for getting default genres
CREATE INDEX idx_book_genres_default ON book_genres(is_default) WHERE is_default IS TRUE;

-- Enable RLS
ALTER TABLE book_genres ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for anon key)
CREATE POLICY "Allow read access to all genres" ON book_genres
  FOR SELECT USING (true);

CREATE POLICY "Allow insert genres" ON book_genres
  FOR INSERT WITH CHECK (true);
