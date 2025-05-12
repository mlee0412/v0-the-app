-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed roles table with default roles
INSERT INTO roles (id, name, description) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator with full access'),
  ('00000000-0000-0000-0000-000000000002', 'manager', 'Manager with table and user management access'),
  ('00000000-0000-0000-0000-000000000003', 'staff', 'Staff with basic table management access')
ON CONFLICT (name) DO NOTHING;

-- Ensure users table exists with all required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  phone_number TEXT,
  native_language TEXT NOT NULL CHECK (native_language IN ('Spanish', 'Korean', 'English')),
  ai_tone TEXT NOT NULL,
  passcode_hash TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add columns to existing users table if it already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS native_language TEXT NOT NULL DEFAULT 'English';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_tone TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000003';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin policy - full access
CREATE POLICY IF NOT EXISTS users_admin_full ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Manager policy - can read all users, update non-admin users
CREATE POLICY IF NOT EXISTS users_manager_read ON users
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY IF NOT EXISTS users_manager_write ON users
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'manager' AND 
    (SELECT name FROM roles WHERE id = users.role_id) != 'admin'
  );

-- Self-access policy - users can read and update their own data
CREATE POLICY IF NOT EXISTS users_self_read_write ON users
  FOR SELECT, UPDATE USING (auth.uid() = auth_id);

-- Create function to hash passcodes
CREATE OR REPLACE FUNCTION hash_passcode(passcode TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(passcode, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passcodes
CREATE OR REPLACE FUNCTION verify_passcode(email TEXT, passcode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT passcode_hash INTO stored_hash FROM users WHERE users.email = verify_passcode.email;
  RETURN stored_hash IS NOT NULL AND stored_hash = crypt(passcode, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user creation/update after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, display_name, native_language, ai_tone, passcode_hash, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'native_language', 'English'),
    COALESCE(NEW.raw_user_meta_data->>'ai_tone', 'neutral'),
    COALESCE(NEW.raw_user_meta_data->>'passcode_hash', ''),
    (SELECT id FROM roles WHERE name = 'staff' LIMIT 1)
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    display_name = EXCLUDED.display_name,
    native_language = EXCLUDED.native_language,
    ai_tone = EXCLUDED.ai_tone,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
