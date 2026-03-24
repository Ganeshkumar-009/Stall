-- Run this script in your Supabase SQL Editor to add the sort_order column to the menu_items table.
-- It ensures that you can custom-order your menu items!

-- 1. Add the column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 2. Optional: Seed the sort_order with current row numbering to maintain current order initially
-- This will assign a unique number to each item based on its creation time.
WITH numbered_items AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
    FROM menu_items
)
UPDATE menu_items
SET sort_order = numbered_items.row_num
FROM numbered_items
WHERE menu_items.id = numbered_items.id;
