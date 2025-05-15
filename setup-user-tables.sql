-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    native_language TEXT DEFAULT 'English',
    pin_code TEXT NOT NULL,
    role_id UUID REFERENCES public.roles(id),
    auth_id UUID UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to initialize user permissions based on role
CREATE OR REPLACE FUNCTION initialize_user_permissions_rpc(user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the user's role
    SELECT r.role_name INTO user_role
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = user_id;
    
    -- Insert default permissions based on role
    INSERT INTO public.user_permissions (
        user_id,
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
        user_id,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager', 'server') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager', 'server') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager', 'server') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager', 'server') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager', 'server') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller', 'manager') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller') THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN user_role IN ('admin', 'controller') THEN TRUE
            ELSE FALSE
        END
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
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
$$ LANGUAGE plpgsql;

-- Insert default roles if they don't exist
INSERT INTO public.roles (role_name, description)
VALUES 
    ('Admin', 'Full system access'),
    ('Controller', 'Administrative access'),
    ('Manager', 'Management access'),
    ('Server', 'Server access'),
    ('Bartender', 'Bartender access'),
    ('Barback', 'Barback access'),
    ('Kitchen', 'Kitchen access'),
    ('Security', 'Security access'),
    ('Karaoke Main', 'Karaoke main operator'),
    ('Karaoke Staff', 'Karaoke staff'),
    ('Viewer', 'View-only access')
ON CONFLICT (role_name) DO NOTHING;
