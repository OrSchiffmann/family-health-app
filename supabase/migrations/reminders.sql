-- ============================================================
-- Daily reminder settings on families
-- Run ONCE in Supabase SQL Editor
-- ============================================================

ALTER TABLE families ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false;
ALTER TABLE families ADD COLUMN IF NOT EXISTS reminder_time time DEFAULT '18:00';
