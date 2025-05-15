-- This script sets up proper Row Level Security (RLS) for staff tables
-- Run this script to ensure proper security for staff data

-- First, enable RLS on all staff tables
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
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

-- Create a helper function to check if a user is an admin
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

-- Create a helper function to check if a user is viewing their own record
CREATE OR REPLACE FUNCTION auth.is_own_record(staff_record_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM staff_members 
    WHERE id = staff_record_id 
    AND auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for staff_roles table
-- Anyone can view roles
CREATE POLICY "staff_roles_select_policy" 
ON staff_roles 
FOR SELECT 
USING (true);

-- Only admins can modify roles
CREATE POLICY "staff_roles_insert_policy" 
ON staff_roles 
FOR INSERT 
WITH CHECK (auth.is_admin());

CREATE POLICY "staff_roles_update_policy" 
ON staff_roles 
FOR UPDATE 
USING (auth.is_admin());

CREATE POLICY "staff_roles_delete_policy" 
ON staff_roles 
FOR DELETE 
USING (auth.is_admin());

-- Create policies for staff_members table
-- Users can view their own record, admins can view all
CREATE POLICY "staff_members_select_policy" 
ON staff_members 
FOR SELECT 
USING (
  auth.is_admin() OR 
  auth_id = auth.uid() OR
  auth.role() = 'anon' -- Allow anon access for login
);

-- Only admins can create staff members
CREATE POLICY "staff_members_insert_policy" 
ON staff_members 
FOR INSERT 
WITH CHECK (auth.is_admin());

-- Users can update their own record, admins can update any
CREATE POLICY "staff_members_update_policy" 
ON staff_members 
FOR UPDATE 
USING (
  auth.is_admin() OR 
  auth_id = auth.uid()
);

-- Only admins can delete staff members
CREATE POLICY "staff_members_delete_policy" 
ON staff_members 
FOR DELETE 
USING (auth.is_admin());

-- Create policies for staff_permissions table
-- Users can view their own permissions, admins can view all
CREATE POLICY "staff_permissions_select_policy" 
ON staff_permissions 
FOR SELECT 
USING (
  auth.is_admin() OR 
  auth.is_own_record(staff_id)
);

-- Only admins can create permissions
CREATE POLICY "staff_permissions_insert_policy" 
ON staff_permissions 
FOR INSERT 
WITH CHECK (auth.is_admin());

-- Only admins can update permissions
CREATE POLICY "staff_permissions_update_policy" 
ON staff_permissions 
FOR UPDATE 
USING (auth.is_admin());

-- Only admins can delete permissions
CREATE POLICY "staff_permissions_delete_policy" 
ON staff_permissions 
FOR DELETE 
USING (auth.is_admin());

-- Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON staff_roles TO authenticated, anon;
GRANT SELECT ON staff_members TO authenticated, anon;
GRANT SELECT ON staff_permissions TO authenticated;

-- Grant additional permissions to authenticated users
GRANT UPDATE ON staff_members TO authenticated;
