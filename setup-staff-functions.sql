-- Function to initialize staff permissions
CREATE OR REPLACE FUNCTION initialize_staff_permissions(staff_member_id UUID)
RETURNS VOID AS $$
DECLARE
  role_name TEXT;
BEGIN
  -- Get the role of the staff member
  SELECT role INTO role_name FROM staff_members WHERE id = staff_member_id;
  
  -- Insert default permissions based on role
  INSERT INTO staff_permissions (
    staff_id,
    can_start_session,
    can_end_session,
    can_add_time,
    can_subtract_time,
    can_update_guests,
    can_assign_server,
    can_group_tables,
    can_ungroup_table,
    can_move_table,
    can_update_notes,
    can_view_logs,
    can_manage_users,
    can_manage_settings
  )
  VALUES (
    staff_member_id,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager', 'server') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager', 'server') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager', 'server') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager', 'server') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager', 'server') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN role_name IN ('admin', 'controller', 'manager') THEN TRUE
      ELSE FALSE
    END
  )
  ON CONFLICT (staff_id) 
  DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically initialize permissions when a new staff member is created
CREATE OR REPLACE FUNCTION trigger_initialize_staff_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_staff_permissions(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS initialize_staff_permissions_trigger ON staff_members;
CREATE TRIGGER initialize_staff_permissions_trigger
AFTER INSERT ON staff_members
FOR EACH ROW
EXECUTE FUNCTION trigger_initialize_staff_permissions();
