-- Run this in your Supabase SQL Editor:
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS inactivity_threshold_minutes INTEGER NOT NULL DEFAULT 4320;

-- Optional: Drop the old column if you want to clean up (Wait until deployment forms are tested)
-- ALTER TABLE settings DROP COLUMN inactivity_threshold_days;
