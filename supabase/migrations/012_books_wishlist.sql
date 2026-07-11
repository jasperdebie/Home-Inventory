-- Add wishlist column to books table
ALTER TABLE books ADD COLUMN wishlist BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering wishlist books
CREATE INDEX idx_books_wishlist ON books(wishlist) WHERE wishlist IS TRUE;
