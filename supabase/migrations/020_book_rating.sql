-- ============================================================
-- 020_book_rating.sql
-- Boekenbibliotheek – beoordeling met sterren (1 tot 5)
-- rating: hoeveel sterren geef ik dit boek? (1-5, NULL = geen beoordeling)
-- ============================================================

ALTER TABLE books ADD COLUMN rating SMALLINT
  CHECK (rating >= 1 AND rating <= 5);
