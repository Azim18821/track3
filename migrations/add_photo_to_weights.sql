-- Add notes and photo_url columns to the weights table
ALTER TABLE weights ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE weights ADD COLUMN IF NOT EXISTS photo_url TEXT;