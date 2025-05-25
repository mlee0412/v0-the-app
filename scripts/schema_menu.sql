-- File: schema_menu.sql
-- Purpose: Defines tables related to menu items, combos, and sales data.

-- Drop existing tables if they exist (optional, use with caution in dev)
-- DROP TABLE IF EXISTS public.sales_data CASCADE;
-- DROP TABLE IF EXISTS public.combos CASCADE;
-- DROP TABLE IF EXISTS public.menu_items CASCADE;

-- Ensure uuid-ossp extension is enabled (if not already by other scripts)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  popularity INTEGER DEFAULT 5 CHECK (popularity >= 1 AND popularity <= 10), -- Scale 1-10
  pairings TEXT[], -- Array of item names or IDs that pair well
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.menu_items IS 'Stores individual menu items like food and drinks.';
COMMENT ON COLUMN public.menu_items.popularity IS 'Popularity score from 1 (low) to 10 (high).';
COMMENT ON COLUMN public.menu_items.pairings IS 'Suggestions for items that pair well.';

-- Create combos table
-- This table structure is based on the fields used in services/menu-data-service.ts
CREATE TABLE IF NOT EXISTS public.combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_weekday NUMERIC(10,2) NOT NULL,
  price_weekend NUMERIC(10,2) NOT NULL,
  billiard_time_minutes INTEGER DEFAULT 0,
  max_guests INTEGER DEFAULT 0, -- Max guests this combo is typically for
  additional_guest_fee NUMERIC(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  includes_billiard_time BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.combos IS 'Stores combo deals and packages.';
COMMENT ON COLUMN public.combos.billiard_time_minutes IS 'Billiard time included in the combo, in minutes.';

-- Create sales_data table
CREATE TABLE IF NOT EXISTS public.sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL, -- Could reference menu_items.id or combos.id, or just be the name
  item_type TEXT NOT NULL DEFAULT 'menu_item', -- 'menu_item' or 'combo'
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  revenue NUMERIC(10,2) NOT NULL,
  time_of_day TEXT, -- e.g., 'morning', 'afternoon', 'evening'
  day_of_week TEXT, -- e.g., 'Monday', 'Tuesday'
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL, -- Optional: link sale to staff
);

COMMENT ON TABLE public.sales_data IS 'Records sales data for menu items and combos.';
COMMENT ON COLUMN public.sales_data.item_id IS 'Identifier of the sold item (can be name or UUID).';
COMMENT ON COLUMN public.sales_data.item_type IS 'Type of item sold, e.g., ''menu_item'' or ''combo''.';


-- Apply the 'updated_at' trigger function (assuming it's created in schema_core.sql or schema_staff.sql)
-- If trigger_set_timestamp() is not globally available, redefine it here.
-- CREATE OR REPLACE FUNCTION public.trigger_set_timestamp() ... (as in previous scripts)

DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN VALUES ('menu_items'), ('combos') -- sales_data is append-only, no updated_at needed by default
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON public.%I;', t_name);
    EXECUTE format('CREATE TRIGGER set_timestamp
                    BEFORE UPDATE ON public.%I
                    FOR EACH ROW
                    EXECUTE FUNCTION public.trigger_set_timestamp();', t_name);
  END LOOP;
END;
$$;

-- RLS Policies for Menu Tables

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access to service_role on menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow read access for authenticated users on menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow all access to service_role on combos" ON public.combos;
DROP POLICY IF EXISTS "Allow read access for authenticated users on combos" ON public.combos;
DROP POLICY IF EXISTS "Allow all access to service_role on sales_data" ON public.sales_data;
DROP POLICY IF EXISTS "Allow read access for authenticated users on sales_data" ON public.sales_data;
DROP POLICY IF EXISTS "Allow insert for authenticated users on sales_data" ON public.sales_data;


-- Policies for 'menu_items'
CREATE POLICY "Allow all access to service_role on menu_items" ON public.menu_items FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access for authenticated users on menu_items" ON public.menu_items FOR SELECT TO authenticated USING (true);
-- Write access (INSERT, UPDATE, DELETE) for menu_items should be restricted to admin roles,
-- typically handled via application logic or specific RLS if admins use Supabase client directly.

-- Policies for 'combos'
CREATE POLICY "Allow all access to service_role on combos" ON public.combos FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access for authenticated users on combos" ON public.combos FOR SELECT TO authenticated USING (true);
-- Write access for combos similar to menu_items.

-- Policies for 'sales_data'
CREATE POLICY "Allow all access to service_role on sales_data" ON public.sales_data FOR ALL TO service_role USING (true);
-- Authenticated users (staff who might record sales) could be allowed to insert.
CREATE POLICY "Allow insert for authenticated users on sales_data" ON public.sales_data FOR INSERT TO authenticated WITH CHECK (true);
-- Reading sales data might be restricted to managers/admins. For now, allowing authenticated to read.
CREATE POLICY "Allow read access for authenticated users on sales_data" ON public.sales_data FOR SELECT TO authenticated USING (true);


-- Grant basic permissions
GRANT SELECT ON public.menu_items TO authenticated;
GRANT SELECT ON public.combos TO authenticated;
GRANT SELECT, INSERT ON public.sales_data TO authenticated;

-- Service role would typically handle CUD operations for menu_items and combos via API.
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.combos TO service_role;
GRANT UPDATE, DELETE ON public.sales_data TO service_role;
