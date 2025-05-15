-- Enable Row Level Security on all tables
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for staff_roles
-- Everyone can read roles
CREATE POLICY staff_roles_select_policy ON staff_roles
  FOR SELECT USING (true);

-- Only service role can insert/update/delete roles
CREATE POLICY staff_roles_insert_policy ON staff_roles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY staff_roles_update_policy ON staff_roles
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY staff_roles_delete_policy ON staff_roles
  FOR DELETE USING (auth.role() = 'service_role');

-- Create policies for staff_members
-- Authenticated users can read their own record
CREATE POLICY staff_members_select_own_policy ON staff_members
  FOR SELECT USING (
    auth.uid() = auth_id
  );

-- Service role can read all records
CREATE POLICY staff_members_select_service_policy ON staff_members
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Only service role can insert/update/delete staff members
CREATE POLICY staff_members_insert_policy ON staff_members
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY staff_members_update_policy ON staff_members
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY staff_members_delete_policy ON staff_members
  FOR DELETE USING (auth.role() = 'service_role');

-- Create policies for staff_permissions
-- Authenticated users can read their own permissions
CREATE POLICY staff_permissions_select_own_policy ON staff_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = staff_permissions.staff_id
      AND staff_members.auth_id = auth.uid()
    )
  );

-- Service role can read all permissions
CREATE POLICY staff_permissions_select_service_policy ON staff_permissions
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Only service role can insert/update/delete permissions
CREATE POLICY staff_permissions_insert_policy ON staff_permissions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY staff_permissions_update_policy ON staff_permissions
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY staff_permissions_delete_policy ON staff_permissions
  FOR DELETE USING (auth.role() = 'service_role');
