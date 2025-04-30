-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  start_time BIGINT,
  remaining_time BIGINT NOT NULL,
  initial_time BIGINT NOT NULL,
  guest_count INTEGER DEFAULT 0,
  server TEXT,
  group_id TEXT,
  has_notes BOOLEAN DEFAULT FALSE,
  note_id TEXT,
  note_text TEXT,
  updated_by_admin BOOLEAN DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  enabled BOOLEAN DEFAULT TRUE
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS note_templates (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  day_started BOOLEAN DEFAULT FALSE,
  group_counter INTEGER DEFAULT 1
);

-- Create stored procedures for table creation
CREATE OR REPLACE FUNCTION create_tables_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    start_time BIGINT,
    remaining_time BIGINT NOT NULL,
    initial_time BIGINT NOT NULL,
    guest_count INTEGER DEFAULT 0,
    server TEXT,
    group_id TEXT,
    has_notes BOOLEAN DEFAULT FALSE,
    note_id TEXT,
    note_text TEXT,
    updated_by_admin BOOLEAN DEFAULT FALSE,
    updated_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_logs_table()
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_servers_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_note_templates_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS note_templates (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    day_started BOOLEAN DEFAULT FALSE,
    group_counter INTEGER DEFAULT 1
  );
END;
$$ LANGUAGE plpgsql;
