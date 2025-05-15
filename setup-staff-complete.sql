-- Complete setup script for staff tables and RLS
-- This script creates all necessary tables, functions, and RLS policies

-- 1. Create staff_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create staff_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  native_language TEXT DEFAULT 'English',
  pin_code TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES staff_roles(role_name) ON UPDATE CASCADE,
  auth_id UUID UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create staff_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  canStartSession BOOLEAN DEFAULT false,
  canEndSession BOOLEAN DEFAULT false,
  canAddTime BOOLEAN DEFAULT false,
  canSubtractTime BOOLEAN DEFAULT false,
  canUpdateGuests BOOLEAN DEFAULT false,
  canAssignServer BOOLEAN DEFAULT false,
  canGroupTables BOOLEAN DEFAULT false,
  canUngroupTable BOOLEAN DEFAULT false,
  canMoveTable BOOLEAN DEFAULT false,
  canUpdateNotes BOOLEAN DEFAULT false,
  canViewLogs BOOLEAN DEFAULT false,
  canManageUsers BOOLEAN DEFAULT false,
  canManageSettings BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id)
);

-- 4. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_staff_roles_updated_at ON staff_roles;
CREATE TRIGGER set_staff_roles_updated_at
BEFORE UPDATE ON staff_roles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS set_staff_members_updated_at ON staff_members;
CREATE TRIGGER set_staff_members_updated_at
BEFORE UPDATE ON staff_members
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS set_staff_permissions_updated_at ON staff_permissions;
CREATE TRIGGER set_staff_permissions_updated_at
BEFORE UPDATE ON staff_permissions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 5. Create function to initialize staff permissions
CREATE OR REPLACE FUNCTION initialize_staff_permissions(staff_member_id UUID)
RETURNS VOID AS $$
DECLARE
  _role TEXT;
BEGIN
  -- Get the role of the staff member
  SELECT role INTO _role FROM staff_members WHERE id = staff_member_id;
  
  -- Insert default permissions based on role
  INSERT INTO staff_permissions (
    staff_id,
    canStartSession,
    canEndSession,
    canAddTime,
    canSubtractTime,
    canUpdateGuests,
    canAssignServer,
    canGroupTables,
    canUngroupTable,
    canMoveTable,
    canUpdateNotes,
    canViewLogs,
    canManageUsers,
    canManageSettings
  )
  VALUES (
    staff_member_id,
    -- Admin level roles
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE
      -- Server role
      CASE WHEN _role = 'server' THEN true ELSE false END
    END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE
      CASE WHEN _role = 'server' THEN true ELSE false END
    END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE
      CASE WHEN _role = 'server' THEN true ELSE false END
    END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE
      CASE WHEN _role = 'server' THEN true ELSE false END
    END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE
      CASE WHEN _role = 'server' THEN true ELSE false END
    END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END,
    CASE WHEN _role IN ('admin', 'manager', 'controller') THEN true ELSE false END
  )
  ON CONFLICT (staff_id) DO UPDATE SET
    canStartSession = EXCLUDED.canStartSession,
    canEndSession = EXCLUDED.canEndSession,
    canAddTime = EXCLUDED.canAddTime,
    canSubtractTime = EXCLUDED.canSubtractTime,
    canUpdateGuests = EXCLUDED.canUpdateGuests,
    canAssignServer = EXCLUDED.canAssignServer,
    canGroupTables = EXCLUDED.canGroupTables,
    canUngroupTable = EXCLUDED.canUngroupTable,
    canMoveTable = EXCLUDED.canMoveTable,
    canUpdateNotes = EXCLUDED.canUpdateNotes,
    canViewLogs = EXCLUDED.canViewLogs,
    canManageUsers = EXCLUDED.canManageUsers,
    canManageSettings = EXCLUDED.canManageSettings,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to automatically initialize permissions for new staff members
CREATE OR REPLACE FUNCTION auto_initialize_staff_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_staff_permissions(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_permissions_init_trigger ON staff_members;
CREATE TRIGGER staff_permissions_init_trigger
AFTER INSERT ON staff_members
FOR EACH ROW
EXECUTE FUNCTION auto_initialize_staff_permissions();

-- 7. Insert default roles if they don't exist
INSERT INTO staff_roles (role_name, description)
VALUES 
  ('admin', 'Full access to all features'),
  ('manager', 'Can manage all aspects of the system'),
  ('controller', 'Can control all tables and sessions'),
  ('server', 'Can manage assigned tables'),
  ('bartender', 'Bar staff with limited access'),
  ('barback', 'Bar support staff'),
  ('kitchen', 'Kitchen staff'),
  ('security', 'Security staff'),
  ('karaoke_main', 'Main karaoke staff'),
  ('karaoke_staff', 'Karaoke support staff'),
  ('viewer', 'View-only access')
ON CONFLICT (role_name) DO NOTHING;

-- 8. Enable RLS on all staff tables
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- 9. Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "staff_members_select_policy" ON staff_members;
DROP POLICY IF EXISTS "staff_members_insert_policy" ON staff_members;
DROP POLICY IF EXISTS "staff_members_update_policy" ON staff_members;
DROP POLICY IF EXISTS "staff_members_delete_policy" ON staff_members;

DROP POLICY IF EXISTS "staff_permissions_select_policy" ON staff_permissions;
DROP POLICY IF EXISTS "staff_permissions_insert_policy" ON staff_permissions;
DROP POLICY IF EXISTS "staff_permissions_update_policy" ON staff_permissions;
DROP POLICY IF EXISTS "staff_permissions_delete_policy" ON staff_permissions;

DROP POLICY IF EXISTS "staff_roles_select_policy" ON staff_roles;
DROP POLICY IF EXISTS "staff_roles_insert_policy" ON staff_roles;
DROP POLICY IF EXISTS "staff_roles_update_policy" ON staff_roles;
DROP POLICY IF EXISTS "staff_roles_delete_policy" ON staff_roles;

-- 10. Create helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Service role is always considered admin
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if the authenticated user has an admin role
  RETURN EXISTS (
    SELECT 1 
    FROM staff_members 
    WHERE auth_id = auth.uid() 
    AND role IN ('admin', 'manager', 'controller')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create policies for staff_roles table
-- Anyone can view roles
CREATE POLICY "staff_roles_select_policy" 
ON staff_roles 
FOR SELECT 
USING (true);

-- Only service role can modify roles
CREATE POLICY "staff_roles_insert_policy" 
ON staff_roles 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_roles_update_policy" 
ON staff_roles 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "staff_roles_delete_policy" 
ON staff_roles 
FOR DELETE 
USING (auth.role() = 'service_role');

-- 12. Create policies for staff_members table
-- Anyone can view staff members (needed for login)
CREATE POLICY "staff_members_select_policy" 
ON staff_members 
FOR SELECT 
USING (true);

-- Only service role can modify staff members
CREATE POLICY "staff_members_insert_policy" 
ON staff_members 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_members_update_policy" 
ON staff_members 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "staff_members_delete_policy" 
ON staff_members 
FOR DELETE 
USING (auth.role() = 'service_role');

-- 13. Create policies for staff_permissions table
-- Only authenticated users can view permissions
CREATE POLICY "staff_permissions_select_policy" 
ON staff_permissions 
FOR SELECT 
USING (
  auth.role() IN ('authenticated', 'service_role') OR
  EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.id = staff_permissions.staff_id
    AND staff_members.auth_id = auth.uid()
  )
);

-- Only service role can modify permissions
CREATE POLICY "staff_permissions_insert_policy" 
ON staff_permissions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "staff_permissions_update_policy" 
ON staff_permissions 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "staff_permissions_delete_policy" 
ON staff_permissions 
FOR DELETE 
USING (auth.role() = 'service_role');

-- 14. Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON staff_roles TO authenticated, anon;
GRANT SELECT ON staff_members TO authenticated, anon;
GRANT SELECT ON staff_permissions TO authenticated;
