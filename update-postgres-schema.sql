-- Add authentication columns to users table in PostgreSQL
-- Run this on your Railway PostgreSQL database

ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;
