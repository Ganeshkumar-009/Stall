-- Run this script in your Supabase SQL Editor to add the auto-incrementing tracking column.
-- It ensures that every order automatically gets a sequential integer identity!

ALTER TABLE orders ADD COLUMN order_number SERIAL;
