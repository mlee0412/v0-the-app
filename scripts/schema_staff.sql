-- File: schema_staff.sql
-- Purpose: Defines staff-related tables (roles, members, permissions),
-- helper functions, and RLS policies.

-- Drop functions if they exist to allow recreation with potentially new signatures/parameter names
DROP FUNCTION IF EXISTS public.initialize_staff_permissions(uuid);
DROP FUNCTION IF EXISTS public.auto_initialize_staff_permissions();
DROP FUNCTION IF EXISTS auth.is_admin(); -- If defined elsewhere and might conflict
DROP FUNCTION IF EXISTS auth.is_app_admin(); -- Specifically the one this script creates
DROP FUNCTION IF EXISTS auth.is_own_record(uuid); -- If defined elsewhere and might conflict
-- The trigger_set_timestamp function is generic, CREATE OR REPLACE should handle it.

-- Drop existing tables if they exist (optional, use with caution in dev)
-- You've chosen to keep these commented, which is fine.
-- DROP TABLE IF EXISTS public.staff_permissions CASCADE;
-- DROP TABLE IF EXISTS public.staff_members CASCADE;
-- DROP TABLE IF EXISTS public.staff_roles CASCADE;

-- Ensure uuid-ossp extension is enabled (if not already by schema_core.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create staff_roles table
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.staff_roles IS 'Defines the different roles staff members can have.';

-- (Rest of the table creation for staff_members, staff_permissions as before...)
-- ... (Content from previous version of schema_staff.sql for table creations) ...
-- 2. Create staff_members table
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  native_language TEXT DEFAULT 'English',
  pin_code TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES public.staff_roles(role_name) ON UPDATE CASCADE ON DELETE RESTRICT,
  auth_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.staff_members IS 'Stores information about staff members/users of the application.';
COMMENT ON COLUMN public.staff_members.auth_id IS 'Corresponds to the id in Supabase auth.users table.';
COMMENT ON COLUMN public.staff_members.pin_code IS 'PIN code used for application login.';

-- 3. Create staff_permissions table
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.staff_members(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.staff_permissions IS 'Defines specific permissions for each staff member, often based on their role.';

-- 4. Create updated_at trigger function (if not already created by schema_core.sql)
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to staff tables
DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN VALUES ('staff_roles'), ('staff_members'), ('staff_permissions')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON public.%I;', t_name);
    EXECUTE format('CREATE TRIGGER set_timestamp
                    BEFORE UPDATE ON public.%I
                    FOR EACH ROW
                    EXECUTE FUNCTION public.trigger_set_timestamp();', t_name);
  END LOOP;
END;
$$;

-- 5. Create function to initialize staff permissions based on their role
CREATE OR REPLACE FUNCTION public.initialize_staff_permissions(p_staff_id UUID) -- Using p_staff_id
RETURNS VOID AS $$
DECLARE
  v_role_name TEXT;
  v_can_start_session BOOLEAN;
  v_can_end_session BOOLEAN;
  v_can_add_time BOOLEAN;
  v_can_subtract_time BOOLEAN;
  v_can_update_guests BOOLEAN;
  v_can_assign_server BOOLEAN;
  v_can_group_tables BOOLEAN;
  v_can_ungroup_table BOOLEAN;
  v_can_move_table BOOLEAN;
  v_can_update_notes BOOLEAN;
  v_can_view_logs BOOLEAN;
  v_can_manage_users BOOLEAN;
  v_can_manage_settings BOOLEAN;
BEGIN
  SELECT role INTO v_role_name FROM public.staff_members WHERE id = p_staff_id;

  v_can_start_session := v_role_name IN ('admin', 'manager', 'controller', 'server');
  v_can_end_session := v_role_name IN ('admin', 'manager', 'controller', 'server');
  v_can_add_time := v_role_name IN ('admin', 'manager', 'controller', 'server');
  v_can_subtract_time := v_role_name IN ('admin', 'manager', 'controller');
  v_can_update_guests := v_role_name IN ('admin', 'manager', 'controller', 'server');
  v_can_assign_server := v_role_name IN ('admin', 'manager', 'controller');
  v_can_group_tables := v_role_name IN ('admin', 'manager', 'controller');
  v_can_ungroup_table := v_role_name IN ('admin', 'manager', 'controller');
  v_can_move_table := v_role_name IN ('admin', 'manager', 'controller');
  v_can_update_notes := v_role_name IN ('admin', 'manager', 'controller', 'server');
  v_can_view_logs := v_role_name IN ('admin', 'manager', 'controller');
  v_can_manage_users := v_role_name IN ('admin', 'manager', 'controller');
  v_can_manage_settings := v_role_name IN ('admin', 'manager', 'controller');

  INSERT INTO public.staff_permissions (
    staff_id, can_start_session, can_end_session, can_add_time, can_subtract_time,
    can_update_guests, can_assign_server, can_group_tables, can_ungroup_table,
    can_move_table, can_update_notes, can_view_logs, can_manage_users, can_manage_settings
  )
  VALUES (
    p_staff_id, v_can_start_session, v_can_end_session, v_can_add_time, v_can_subtract_time,
    v_can_update_guests, v_can_assign_server, v_can_group_tables, v_can_ungroup_table,
    v_can_move_table, v_can_update_notes, v_can_view_logs, v_can_manage_users, v_can_manage_settings
  )
  ON CONFLICT (staff_id) DO UPDATE SET
    can_start_session = EXCLUDED.can_start_session,
    can_end_session = EXCLUDED.can_end_session,
    can_add_time = EXCLUDED.can_add_time,
    can_subtract_time = EXCLUDED.can_subtract_time,
    can_update_guests = EXCLUDED.can_update_guests,
    can_assign_server = EXCLUDED.can_assign_server,
    can_group_tables = EXCLUDED.can_group_tables,
    can_ungroup_table = EXCLUDED.can_ungroup_table,
    can_move_table = EXCLUDED.can_move_table,
    can_update_notes = EXCLUDED.can_update_notes,
    can_view_logs = EXCLUDED.can_view_logs,
    can_manage_users = EXCLUDED.can_manage_users,
    can_manage_settings = EXCLUDED.can_manage_settings,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to automatically initialize permissions for new staff members
CREATE OR REPLACE FUNCTION public.auto_initialize_staff_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.initialize_staff_permissions(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_permissions_init_trigger ON public.staff_members;
CREATE TRIGGER staff_permissions_init_trigger
AFTER INSERT ON public.staff_members
FOR EACH ROW
EXECUTE FUNCTION public.auto_initialize_staff_permissions();

-- (Rest of the script: default roles insertion, RLS setup, grants... as in the previous version)
-- ... (Content from previous version of schema_staff.sql for default roles, RLS, grants) ...
-- 7. Insert default roles if they don't exist
INSERT INTO public.staff_roles (role_name, description)
VALUES
  ('admin', 'Full system access and configuration'),
  ('manager', 'Manages operations, staff, and reporting'),
  ('controller', 'Manages tables, sessions, and core operations'),
  ('server', 'Manages assigned tables and guest interactions'),
  ('bartender', 'Bar operations'),
  ('barback', 'Bar support'),
  ('kitchen', 'Kitchen operations'),
  ('security', 'Security and access control'),
  ('karaoke_main', 'Karaoke main operator'),
  ('karaoke_staff', 'Karaoke support staff'),
  ('viewer', 'View-only access to system status')
ON CONFLICT (role_name) DO NOTHING;

-- 8. RLS Setup for Staff Tables

-- Enable RLS on all staff tables
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (idempotency)
DROP POLICY IF EXISTS "Allow all access to service_role on staff_roles" ON public.staff_roles;
DROP POLICY IF EXISTS "Allow read access for authenticated users on staff_roles" ON public.staff_roles;
DROP POLICY IF EXISTS "Allow all access to service_role on staff_members" ON public.staff_members;
DROP POLICY IF EXISTS "Allow read access for authenticated users on staff_members" ON public.staff_members;
DROP POLICY IF EXISTS "Allow users to update their own basic info" ON public.staff_members;
DROP POLICY IF EXISTS "Allow admins to update any staff_member" ON public.staff_members;
DROP POLICY IF EXISTS "Allow all access to service_role on staff_permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Allow users to read their own permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Allow admins to manage all permissions" ON public.staff_permissions;

-- Helper function to check if the current user is an admin (manager, controller, admin)
CREATE OR REPLACE FUNCTION auth.is_app_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_role BOOLEAN;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.auth_id = auth.uid() AND sm.role IN ('admin', 'manager', 'controller')
  ) INTO is_admin_role;
  RETURN is_admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Policies for 'staff_roles' table
CREATE POLICY "Allow all access to service_role on staff_roles" ON public.staff_roles FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access for authenticated users on staff_roles" ON public.staff_roles FOR SELECT TO authenticated USING (true);

-- Policies for 'staff_members' table
CREATE POLICY "Allow all access to service_role on staff_members" ON public.staff_members FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read access for authenticated users on staff_members" ON public.staff_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update their own basic info" ON public.staff_members
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid() AND role = (SELECT role FROM public.staff_members WHERE id = staff_members.id));
CREATE POLICY "Allow admins to update any staff_member" ON public.staff_members FOR UPDATE TO authenticated USING (auth.is_app_admin());

-- Policies for 'staff_permissions' table
CREATE POLICY "Allow all access to service_role on staff_permissions" ON public.staff_permissions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow users to read their own permissions" ON public.staff_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.auth_id = auth.uid()));
CREATE POLICY "Allow admins to manage all permissions" ON public.staff_permissions FOR ALL TO authenticated USING (auth.is_app_admin());


GRANT SELECT ON public.staff_roles TO authenticated;
GRANT SELECT ON public.staff_members TO authenticated;
GRANT SELECT ON public.staff_permissions TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.staff_roles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.staff_members TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.staff_permissions TO service_role;
