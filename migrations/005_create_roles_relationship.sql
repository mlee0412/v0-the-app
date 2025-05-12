-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Make sure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator - Full system access'),
  ('controller', 'Controller - Full system access'),
  ('manager', 'Manager - Manage operations and staff'),
  ('server', 'Server - Handle table service'),
  ('bartender', 'Bartender - Handle bar operations'),
  ('barback', 'Barback - Support bar operations'),
  ('kitchen', 'Kitchen - Handle food preparation'),
  ('security', 'Security - Handle venue security'),
  ('karaoke_main', 'Karaoke Main - Manage karaoke operations'),
  ('karaoke_staff', 'Karaoke Staff - Support karaoke operations'),
  ('viewer', 'Viewer - View-only access')
ON CONFLICT (name) DO NOTHING;

-- Add role_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id UUID;
  END IF;
END $$;

-- Update existing users to have the correct role_id based on their role name
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role = r.name AND u.role_id IS NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_id_fkey'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id);
  END IF;
END $$;

-- Create a function to update role_id when role is updated
CREATE OR REPLACE FUNCTION update_role_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.role_id := (SELECT id FROM roles WHERE name = NEW.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update role_id when role is updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_id_trigger'
  ) THEN
    CREATE TRIGGER update_role_id_trigger
    BEFORE INSERT OR UPDATE OF role ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_role_id();
  END IF;
END $$;
