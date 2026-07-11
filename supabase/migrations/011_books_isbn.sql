-- Add optional ISBN field to books
ALTER TABLE books
ADD COLUMN isbn TEXT;

-- Index ISBN for faster lookup/filtering
CREATE INDEX idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL;
