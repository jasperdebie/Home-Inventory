-- Add free-text storage advice (bewaaradvies) to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS storage TEXT;
