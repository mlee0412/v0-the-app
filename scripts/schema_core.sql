-- File: schema_core.sql
-- Purpose: Defines/updates core tables for the Space Billiards application.

-- Ensure uuid-ossp extension is enabled (if not already by other scripts)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create servers table (referenced by billiard_tables)
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.servers IS 'Stores information about servers/staff who can be assigned to tables.';

-- Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.note_templates IS 'Stores predefined note templates for tables.';

-- Create billiard_tables table
CREATE TABLE IF NOT EXISTS public.billiard_tables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMPTZ,
  remaining_time BIGINT DEFAULT 3600000, -- Stores remaining session time in milliseconds
  initial_time BIGINT DEFAULT 3600000,   -- Stores initial session time in milliseconds
  guest_count INTEGER DEFAULT 0,
  server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL,
  group_id TEXT,
  has_notes BOOLEAN DEFAULT FALSE,
  note_id UUID REFERENCES public.note_templates(id) ON DELETE SET NULL,
  note_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.billiard_tables IS 'Represents the billiard tables and their current session status.';

-- Create session_logs table
CREATE TABLE IF NOT EXISTS public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT NOW(),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.session_logs IS 'Logs all significant actions related to table sessions.';

-- Create or update system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY, -- Changed to INTEGER to match existing setup
  day_started BOOLEAN DEFAULT FALSE,
  group_counter INTEGER DEFAULT 1,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.system_settings IS 'Stores global system settings for the application.';

-- Add new columns to system_settings if they don't exist
-- These ALTER TABLE commands will only add columns if they are missing.
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS day_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS default_session_time BIGINT DEFAULT 3600000,
  ADD COLUMN IF NOT EXISTS warning_threshold BIGINT DEFAULT 900000,
  ADD COLUMN IF NOT EXISTS critical_threshold BIGINT DEFAULT 300000;

-- Ensure last_updated column exists and has a default if it was missing
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();


-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables that have an 'updated_at' column
DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public' AND table_name IN ('servers', 'note_templates', 'billiard_tables', 'system_settings')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON public.%I;', t_name);
    EXECUTE format('CREATE TRIGGER set_timestamp
                    BEFORE UPDATE ON public.%I
                    FOR EACH ROW
                    EXECUTE FUNCTION public.trigger_set_timestamp();', t_name);
  END LOOP;
END;
$$;

-- Insert or Update default system settings row using id = 1
INSERT INTO public.system_settings (id, day_started, group_counter, default_session_time, warning_threshold, critical_threshold, day_start_time, last_updated)
VALUES (1, FALSE, 1, 3600000, 900000, 300000, NULL, NOW())
ON CONFLICT (id) DO UPDATE SET
  day_started = COALESCE(public.system_settings.day_started, EXCLUDED.day_started),
  group_counter = COALESCE(public.system_settings.group_counter, EXCLUDED.group_counter),
  default_session_time = COALESCE(public.system_settings.default_session_time, EXCLUDED.default_session_time),
  warning_threshold = COALESCE(public.system_settings.warning_threshold, EXCLUDED.warning_threshold),
  critical_threshold = COALESCE(public.system_settings.critical_threshold, EXCLUDED.critical_threshold),
  day_start_time = COALESCE(public.system_settings.day_start_time, EXCLUDED.day_start_time),
  last_updated = NOW();


-- RLS Policies for Core Tables (Ensure RLS is enabled on tables in Supabase UI)
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billiard_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow all access to service_role on servers" ON public.servers;
DROP POLICY IF EXISTS "Allow read access to authenticated users on servers" ON public.servers;
DROP POLICY IF EXISTS "Allow all access to service_role on note_templates" ON public.note_templates;
DROP POLICY IF EXISTS "Allow read access to authenticated users on note_templates" ON public.note_templates;
DROP POLICY IF EXISTS "Allow all access to service_role on billiard_tables" ON public.billiard_tables;
DROP POLICY IF EXISTS "Allow read access to authenticated users on billiard_tables" ON public.billiard_tables;
DROP POLICY IF EXISTS "Allow insert for authenticated users on billiard_tables" ON public.billiard_tables;
DROP POLICY IF EXISTS "Allow update for authenticated users on billiard_tables" ON public.billiard_tables;
DROP POLICY IF EXISTS "Allow delete for authenticated users on billiard_tables" ON public.billiard_tables;
DROP POLICY IF EXISTS "Allow all access to service_role on session_logs" ON public.session_logs;
DROP POLICY IF EXISTS "Allow read access to authenticated users on session_logs" ON public.session_logs;
DROP POLICY IF EXISTS "Allow insert for authenticated users on session_logs" ON public.session_logs;
DROP POLICY IF EXISTS "Allow all access to service_role on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow read access to authenticated users on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users (admin only in app logic) on system_settings" ON public.system_settings;


CREATE POLICY "Allow all access to service_role on servers" ON public.servers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access to authenticated users on servers" ON public.servers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to service_role on note_templates" ON public.note_templates FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access to authenticated users on note_templates" ON public.note_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to service_role on billiard_tables" ON public.billiard_tables FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access to authenticated users on billiard_tables" ON public.billiard_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users on billiard_tables" ON public.billiard_tables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users on billiard_tables" ON public.billiard_tables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated users on billiard_tables" ON public.billiard_tables FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow all access to service_role on session_logs" ON public.session_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access to authenticated users on session_logs" ON public.session_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users on session_logs" ON public.session_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all access to service_role on system_settings" ON public.system_settings FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access to authenticated users on system_settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated users (admin only in app logic) on system_settings" ON public.system_settings FOR UPDATE TO authenticated USING (true);


GRANT SELECT ON public.servers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.servers TO service_role;

GRANT SELECT ON public.note_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.note_templates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billiard_tables TO authenticated;
GRANT SELECT, INSERT ON public.session_logs TO authenticated;
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;
