-- 1. CLEANUP: Drop existing constraints and table to start fresh
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_main_category_id_fkey;
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_sub_category_id_fkey;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. Create categories table (Explicitly INTEGER ID)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY, -- This creates an INTEGER column
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'sub')),
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type, parent_id)
);

-- 3. Add foreign keys to content_items (Ensure they are INTEGER)
-- We use DO block to be safe, but since we dropped constraints above, we can just add them.
-- First, ensure columns exist
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS main_category_id INTEGER,
ADD COLUMN IF NOT EXISTS sub_category_id INTEGER;

-- Now add constraints
ALTER TABLE content_items 
ADD CONSTRAINT content_items_main_category_id_fkey 
FOREIGN KEY (main_category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE content_items 
ADD CONSTRAINT content_items_sub_category_id_fkey 
FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 4. Populate Main Categories
INSERT INTO categories (name, type, display_order) VALUES 
  ('סדרות', 'main', 10),
  ('שו"ת הלכה', 'main', 20),
  ('מאמרים', 'main', 30),
  ('סרטונים', 'main', 40)
ON CONFLICT DO NOTHING;

-- 5. Migrate Main Categories Data
UPDATE content_items ci
SET main_category_id = c.id
FROM categories c
WHERE ci.main_category = c.name AND c.type = 'main';

-- 6. Populate Sub Categories from existing data
INSERT INTO categories (name, type, parent_id)
SELECT DISTINCT 
  sub_category, 
  'sub',
  (
    SELECT c.id 
    FROM categories c 
    JOIN content_items ci2 ON ci2.main_category_id = c.id
    WHERE ci2.sub_category = source.sub_category
    GROUP BY c.id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as parent_id
FROM content_items source
WHERE sub_category IS NOT NULL AND sub_category != ''
ON CONFLICT DO NOTHING;

-- 7. Migrate Sub Categories Data
UPDATE content_items ci
SET sub_category_id = c.id
FROM categories c
WHERE ci.sub_category = c.name AND c.type = 'sub';

-- 8. Create Indexes
CREATE INDEX IF NOT EXISTS idx_content_items_main_cat_id ON content_items(main_category_id);
CREATE INDEX IF NOT EXISTS idx_content_items_sub_cat_id ON content_items(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
