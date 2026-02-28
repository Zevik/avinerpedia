
-- Add is_active column to content_items
ALTER TABLE content_items ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing items that are empty to be inactive
-- Empty means no content_md and no video_id
UPDATE content_items 
SET is_active = false 
WHERE (content_md IS NULL OR content_md = '') 
  AND (video_id IS NULL OR video_id = '');

-- Index for performance
CREATE INDEX idx_content_items_is_active ON content_items(is_active);
