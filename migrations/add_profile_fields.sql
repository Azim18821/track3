-- Add the new profile columns to the users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp,
ADD COLUMN IF NOT EXISTS "gender" text,
ADD COLUMN IF NOT EXISTS "height" real,
ADD COLUMN IF NOT EXISTS "weight" real,
ADD COLUMN IF NOT EXISTS "weight_unit" text DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS "height_unit" text DEFAULT 'cm';