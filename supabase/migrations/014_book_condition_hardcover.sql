-- Add condition and hardcover columns to books table
ALTER TABLE books ADD COLUMN condition TEXT;
ALTER TABLE books ADD COLUMN hardcover BOOLEAN NOT NULL DEFAULT FALSE;
