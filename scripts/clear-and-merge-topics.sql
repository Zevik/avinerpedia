
-- 1. CLEANUP FOR "מאמרים" (Articles)
-- Sub-category cleanup
DELETE FROM categories 
WHERE type = 'sub' 
AND parent_id = (SELECT id FROM categories WHERE name = 'מאמרים' AND type = 'main' LIMIT 1);

-- Content cleanup
UPDATE content_items 
SET sub_category = NULL, sub_category_id = NULL 
WHERE main_category = 'מאמרים' OR main_category_id = (SELECT id FROM categories WHERE name = 'מאמרים' AND type = 'main' LIMIT 1);


-- 2. CLEANUP FOR "שו\"ת הלכה" (Q&A)
-- Sub-category cleanup
DELETE FROM categories 
WHERE type = 'sub' 
AND parent_id = (SELECT id FROM categories WHERE name = 'שו"ת הלכה' AND type = 'main' LIMIT 1);

-- Content cleanup
UPDATE content_items 
SET sub_category = NULL, sub_category_id = NULL 
WHERE main_category = 'שו"ת הלכה' OR main_category_id = (SELECT id FROM categories WHERE name = 'שו"ת הלכה' AND type = 'main' LIMIT 1);


-- 3. MERGE FOR "סרטונים" (Videos)
-- Merge all "אקטואליה" sub-categories into ID 25
UPDATE content_items 
SET sub_category = 'אקטואליה', sub_category_id = 25
WHERE (main_category = 'סרטונים' OR main_category_id = 4)
AND sub_category LIKE '%אקטואליה%';

-- Delete the redundant sub-categories
DELETE FROM categories 
WHERE type = 'sub' 
AND parent_id = 4 
AND name LIKE '%אקטואליה%' 
AND name != 'אקטואליה';
