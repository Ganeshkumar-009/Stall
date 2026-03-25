-- Run this in your Supabase SQL Editor to clear ALL orders and reset the counter!
-- ⚠️ WARNING: This will permanently delete all order history.

TRUNCATE TABLE orders RESTART IDENTITY;

-- If the above fails due to a foreign key, use:
-- DELETE FROM orders;
-- ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;
