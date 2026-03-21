-- Migration: Add category column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';

-- Update existing items to 'Other' if they don't have a category
UPDATE menu_items SET category = 'Other' WHERE category IS NULL;
