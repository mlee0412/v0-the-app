-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL
);

-- Create function to create users table
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

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "Users can be inserted by authenticated users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update
CREATE POLICY "Users can be updated by authenticated users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete
CREATE POLICY "Users can be deleted by authenticated users"
  ON users FOR DELETE
  TO authenticated
  USING (true);
