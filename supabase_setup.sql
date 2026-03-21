CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  category text DEFAULT 'Other',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone text,
  items jsonb,
  total_amount integer,
  payment_method text,
  payment_status text,
  order_status text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_sessions (
  email text PRIMARY KEY,
  otp text,
  created_at timestamp with time zone DEFAULT now()
);

-- Note: Ensure Row Level Security (RLS) is disabled or properly configured in Supabase settings so your API can insert rows publicly.
