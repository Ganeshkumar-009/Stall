-- Run this script in your Supabase SQL Editor.
-- It adds all the missing columns for Razorpay tracking and sequential order numbers.

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS razorpay_order_id text,
ADD COLUMN IF NOT EXISTS order_number SERIAL;
