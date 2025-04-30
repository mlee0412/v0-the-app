-- Create billiard_tables table
CREATE TABLE IF NOT EXISTS billiard_tables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  start_time BIGINT,
  remaining_time BIGINT NOT NULL,
  initial_time BIGINT NOT NULL,
  guest_count INTEGER DEFAULT 0,
  server_id UUID REFERENCES servers(id),
  group_id TEXT,
  has_notes BOOLEAN DEFAULT FALSE,
  note_id TEXT,
  note_text TEXT,
  updated_by_admin BOOLEAN DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_logs table
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY,
  table_id INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS note_templates (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY,
  day_started BOOLEAN DEFAULT FALSE,
  group_counter INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (id, day_started, group_counter)
VALUES (1, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security policies
ALTER TABLE billiard_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON billiard_tables
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow full access to authenticated users" ON session_logs
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow full access to authenticated users" ON servers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow full access to authenticated users" ON note_templates
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow full access to authenticated users" ON system_settings
  FOR ALL TO authenticated USING (true);

-- Create policies for anonymous users (for development)
CREATE POLICY "Allow read access to anonymous users" ON billiard_tables
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON billiard_tables
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON billiard_tables
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON session_logs
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON session_logs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow read access to anonymous users" ON servers
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON servers
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON servers
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON note_templates
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON note_templates
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON note_templates
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON system_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON system_settings
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON system_settings
  FOR UPDATE TO anon USING (true);
