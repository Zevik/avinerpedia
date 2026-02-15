
-- 1. Check total counts
SELECT count(*) as total_categories FROM categories;
SELECT count(*) as total_main_categories FROM categories WHERE type = 'main';
SELECT count(*) as total_sub_categories FROM categories WHERE type = 'sub';

-- 2. List all main categories to see if they match expectations
SELECT id, name, type FROM categories WHERE type = 'main' ORDER BY name;

-- 3. Check for categories that exist in content_items but NOT in categories table (orphans? logic gap?)
-- This helps verify if the user is seeing something from content_items that ISN'T in categories
SELECT DISTINCT main_category 
FROM content_items 
WHERE main_category NOT IN (SELECT name FROM categories WHERE type = 'main');

-- 4. Check for 'weird' main categories in the categories table
-- (Any that are not in the standard list)
SELECT * FROM categories 
WHERE type = 'main' 
AND name NOT IN ('סרטונים', 'מאמרים', 'שו"ת הלכה', 'סדרות');

-- 5. Check if there are duplicate names in categories table
SELECT name, type, count(*) 
FROM categories 
GROUP BY name, type 
HAVING count(*) > 1;
