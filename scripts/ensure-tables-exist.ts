import { getSupabaseClient } from "@/lib/supabase/client"

const createTablesSQL = `
-- Create servers table first (since it's referenced by billiard_tables)
CREATE TABLE IF NOT EXISTS servers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name TEXT NOT NULL,
 enabled BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billiard_tables table
CREATE TABLE IF NOT EXISTS billiard_tables (
 id INTEGER PRIMARY KEY,
 name TEXT NOT NULL,
 is_active BOOLEAN DEFAULT FALSE,
 start_time BIGINT,
 remaining_time BIGINT NOT NULL,
 initial_time BIGINT NOT NULL,
 guest_count INTEGER DEFAULT 0,
 server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
 group_id TEXT,
 has_notes BOOLEAN DEFAULT FALSE,
 note_id UUID,
 note_text TEXT,
 updated_by_admin BOOLEAN DEFAULT FALSE,
 updated_by UUID,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_logs table
CREATE TABLE IF NOT EXISTS session_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 table_id INTEGER NOT NULL,
 table_name TEXT NOT NULL,
 action TEXT NOT NULL,
 timestamp BIGINT NOT NULL,
 details TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS note_templates (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 text TEXT NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
 id TEXT PRIMARY KEY,
 day_started BOOLEAN DEFAULT FALSE,
 group_counter INTEGER DEFAULT 1,
 last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`

const setupRLSSQL = `
-- Set up Row Level Security policies
ALTER TABLE billiard_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON billiard_tables;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON session_logs;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON servers;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON note_templates;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON system_settings;

DROP POLICY IF EXISTS "Allow read access to anonymous users" ON billiard_tables;
DROP POLICY IF EXISTS "Allow write access to anonymous users" ON billiard_tables;
DROP POLICY IF EXISTS "Allow update access to anonymous users" ON billiard_tables;
DROP POLICY IF EXISTS "Allow delete access to anonymous users" ON billiard_tables;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON session_logs;
DROP POLICY IF EXISTS "Allow write access to anonymous users" ON session_logs;
DROP POLICY IF EXISTS "Allow delete access to anonymous users" ON session_logs;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON servers;
DROP POLICY IF EXISTS "Allow write access to anonymous users" ON servers;
DROP POLICY IF EXISTS "Allow update access to anonymous users" ON servers;
DROP POLICY IF EXISTS "Allow delete access to anonymous users" ON servers;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON note_templates;
DROP POLICY IF EXISTS "Allow write access to anonymous users" ON note_templates;
DROP POLICY IF EXISTS "Allow update access to anonymous users" ON note_templates;
DROP POLICY IF EXISTS "Allow delete access to anonymous users" ON note_templates;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON system_settings;
DROP POLICY IF EXISTS "Allow write access to anonymous users" ON system_settings;
DROP POLICY IF EXISTS "Allow update access to anonymous users" ON system_settings;

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

CREATE POLICY "Allow delete access to anonymous users" ON billiard_tables
 FOR DELETE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON session_logs
 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON session_logs
 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow delete access to anonymous users" ON session_logs
 FOR DELETE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON servers
 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON servers
 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON servers
 FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow delete access to anonymous users" ON servers
 FOR DELETE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON note_templates
 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON note_templates
 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON note_templates
 FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow delete access to anonymous users" ON note_templates
 FOR DELETE TO anon USING (true);

CREATE POLICY "Allow read access to anonymous users" ON system_settings
 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow write access to anonymous users" ON system_settings
 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access to anonymous users" ON system_settings
 FOR UPDATE TO anon USING (true);
`

const insertDefaultDataSQL = `
-- Insert default system settings
INSERT INTO system_settings (id, day_started, group_counter)
VALUES ('system_settings', FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert default servers
INSERT INTO servers (id, name, enabled)
VALUES 
  ('server-1', 'Mike', true),
  ('server-2', 'Ji', true),
  ('server-3', 'Gun', true),
  ('server-4', 'Alex', true),
  ('server-5', 'Lucy', true),
  ('server-6', 'Tanya', true),
  ('server-7', 'Ian', true),
  ('server-8', 'Rolando', true),
  ('server-9', 'Alexa', true),
  ('server-10', 'Diego', true),
  ('server-11', 'BB', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default note templates
INSERT INTO note_templates (id, text)
VALUES 
  ('1', 'VIP guest'),
  ('2', 'Pay at front'),
  ('3', 'Prepaid'),
  ('4', 'Underage'),
  ('5', 'Reservation')
ON CONFLICT (id) DO NOTHING;

-- Insert default billiard tables
INSERT INTO billiard_tables (id, name, is_active, remaining_time, initial_time, guest_count)
SELECT 
  t.id, 
  'T' || t.id, 
  false, 
  3600000, 
  3600000, 
  0
FROM generate_series(1, 11) AS t(id)
ON CONFLICT (id) DO NOTHING;
`

async function ensureTablesExist() {
  console.log("🔍 Checking and creating database tables...")

  try {
    const supabase = getSupabaseClient()

    // Check if tables exist
    console.log("Checking if tables exist...")
    const { data: tablesData, error: tablesError } = await supabase.from("billiard_tables").select("count").limit(1)

    if (tablesError && tablesError.code === "PGRST116") {
      console.log("Tables don't exist. Creating tables...")

      // Execute create tables SQL
      const { error: createError } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

      if (createError) {
        console.error("Error creating tables:", createError)

        // Try direct SQL query if RPC fails
        console.log("Trying direct SQL query...")
        const { error: directError } = await supabase.sql(createTablesSQL)

        if (directError) {
          console.error("Error with direct SQL:", directError)
          throw new Error("Failed to create tables")
        }
      }

      console.log("Tables created successfully")

      // Set up RLS policies
      console.log("Setting up RLS policies...")
      const { error: rlsError } = await supabase.rpc("exec_sql", { sql: setupRLSSQL })

      if (rlsError) {
        console.error("Error setting up RLS:", rlsError)

        // Try direct SQL query if RPC fails
        console.log("Trying direct SQL query for RLS...")
        const { error: directRlsError } = await supabase.sql(setupRLSSQL)

        if (directRlsError) {
          console.error("Error with direct RLS SQL:", directRlsError)
          // Continue anyway as tables are created
        }
      }

      // Insert default data
      console.log("Inserting default data...")
      const { error: dataError } = await supabase.rpc("exec_sql", { sql: insertDefaultDataSQL })

      if (dataError) {
        console.error("Error inserting default data:", dataError)

        // Try direct SQL query if RPC fails
        console.log("Trying direct SQL query for default data...")
        const { error: directDataError } = await supabase.sql(insertDefaultDataSQL)

        if (directDataError) {
          console.error("Error with direct data SQL:", directDataError)
          // Continue anyway as tables are created
        }
      }

      console.log("✅ Database setup complete!")
    } else if (tablesError) {
      console.error("Error checking tables:", tablesError)
      throw new Error(`Failed to check if tables exist: ${tablesError.message}`)
    } else {
      console.log("✅ Tables already exist!")
    }

    // Verify tables
    const tables = ["billiard_tables", "servers", "session_logs", "note_templates", "system_settings"]
    let allTablesExist = true

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("count").limit(1)

      if (error) {
        console.error(`Table "${table}" check failed:`, error)
        allTablesExist = false
      } else {
        console.log(`Table "${table}" exists`)
      }
    }

    if (allTablesExist) {
      console.log("✅ All required tables exist and are accessible")
    } else {
      console.error("❌ Some tables are missing or inaccessible")
    }
  } catch (error) {
    console.error("Fatal error during table setup:", error)
  }
}

// Run the function
ensureTablesExist()
