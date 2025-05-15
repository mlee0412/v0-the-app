-- Create staff_roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  native_language TEXT DEFAULT 'English',
  pin_code TEXT NOT NULL,
  role TEXT NOT NULL,
  auth_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_role FOREIGN KEY (role) REFERENCES staff_roles(role_name) ON DELETE RESTRICT
);

-- Create staff_permissions table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL UNIQUE,
  can_start_session BOOLEAN DEFAULT FALSE,
  can_end_session BOOLEAN DEFAULT FALSE,
  can_add_time BOOLEAN DEFAULT FALSE,
  can_subtract_time BOOLEAN DEFAULT FALSE,
  can_update_guests BOOLEAN DEFAULT FALSE,
  can_assign_server BOOLEAN DEFAULT FALSE,
  can_group_tables BOOLEAN DEFAULT FALSE,
  can_ungroup_table BOOLEAN DEFAULT FALSE,
  can_move_table BOOLEAN DEFAULT FALSE,
  can_update_notes BOOLEAN DEFAULT FALSE,
  can_view_logs BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_staff_member FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE
);

-- Insert default roles if they don't exist
INSERT INTO staff_roles (role_name, description)
VALUES 
  ('admin', 'Full access to all features'),
  ('manager', 'Can manage tables, users, and view reports'),
  ('controller', 'Can manage tables and view reports'),
  ('server', 'Can manage assigned tables'),
  ('viewer', 'Can only view table status')
ON CONFLICT (role_name) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_staff_members_updated_at ON staff_members;
CREATE TRIGGER update_staff_members_updated_at
BEFORE UPDATE ON staff_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_permissions_updated_at ON staff_permissions;
CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON staff_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_roles_updated_at ON staff_roles;
CREATE TRIGGER update_staff_roles_updated_at
BEFORE UPDATE ON staff_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
