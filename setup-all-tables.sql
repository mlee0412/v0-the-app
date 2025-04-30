-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time BIGINT,
  remaining_time BIGINT NOT NULL,
  initial_time BIGINT NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 0,
  server TEXT,
  group_id TEXT,
  has_notes BOOLEAN NOT NULL DEFAULT false,
  note_id TEXT,
  note_text TEXT,
  updated_by_admin BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  table_id INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  details TEXT
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS note_templates (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  day_started BOOLEAN NOT NULL DEFAULT false,
  group_counter INTEGER NOT NULL DEFAULT 1
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL
);

-- Create functions to create tables
CREATE OR REPLACE FUNCTION create_tables_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    start_time BIGINT,
    remaining_time BIGINT NOT NULL,
    initial_time BIGINT NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 0,
    server TEXT,
    group_id TEXT,
    has_notes BOOLEAN NOT NULL DEFAULT false,
    note_id TEXT,
    note_text TEXT,
    updated_by_admin BOOLEAN NOT NULL DEFAULT false,
    updated_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_logs_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    table_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    details TEXT
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_servers_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_note_templates_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS note_templates (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    day_started BOOLEAN NOT NULL DEFAULT false,
    group_counter INTEGER NOT NULL DEFAULT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_users_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL
  );
END;
$$;

-- Enable row level security on all tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Tables are viewable by authenticated users"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tables can be inserted by authenticated users"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Tables can be updated by authenticated users"
  ON tables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tables can be deleted by authenticated users"
  ON tables FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Logs are viewable by authenticated users"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Logs can be inserted by authenticated users"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Logs can be updated by authenticated users"
  ON logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Logs can be deleted by authenticated users"
  ON logs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Servers are viewable by authenticated users"
  ON servers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Servers can be inserted by authenticated users"
  ON servers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Servers can be updated by authenticated users"
  ON servers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Servers can be deleted by authenticated users"
  ON servers FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Note templates are viewable by authenticated users"
  ON note_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Note templates can be inserted by authenticated users"
  ON note_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Note templates can be updated by authenticated users"
  ON note_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Note templates can be deleted by authenticated users"
  ON note_templates FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Settings are viewable by authenticated users"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Settings can be inserted by authenticated users"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Settings can be updated by authenticated users"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Settings can be deleted by authenticated users"
  ON settings FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can be inserted by authenticated users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can be updated by authenticated users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can be deleted by authenticated users"
  ON users FOR DELETE
  TO authenticated
  USING (true);
