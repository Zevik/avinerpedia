-- Database Cleanup and Setup for Clean Import
-- Run these commands in Supabase SQL Editor

-- Step 1: Backup count (optional - just for reference)
SELECT COUNT(*) as current_count FROM content_items;

-- Step 2: Clear all existing records
TRUNCATE TABLE content_items RESTART IDENTITY CASCADE;

-- Step 3: Add UNIQUE constraint on title to prevent future duplicates
ALTER TABLE content_items 
ADD CONSTRAINT unique_content_title UNIQUE (title);

-- Step 4: Verify the table is empty
SELECT COUNT(*) as count_after_truncate FROM content_items;

-- Step 5: Check constraint was added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'content_items'::regclass;
