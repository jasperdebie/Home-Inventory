-- Add extra time fields to recipes table
-- extra_time: vrij tekstveld voor extra tijd (bv. "4 uur", "een nacht")
-- extra_time_label: waarvoor die extra tijd dient (bv. "opstijven", "marineren")
ALTER TABLE recipes ADD COLUMN extra_time       TEXT;
ALTER TABLE recipes ADD COLUMN extra_time_label TEXT;
