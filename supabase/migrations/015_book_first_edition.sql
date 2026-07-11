-- Add first_edition column to books table
ALTER TABLE books ADD COLUMN first_edition BOOLEAN NOT NULL DEFAULT FALSE;
