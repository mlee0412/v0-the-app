-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_start_session BOOLEAN NOT NULL DEFAULT false,
  can_end_session BOOLEAN NOT NULL DEFAULT false,
  can_add_time BOOLEAN NOT NULL DEFAULT false,
  can_subtract_time BOOLEAN NOT NULL DEFAULT false,
  can_update_guests BOOLEAN NOT NULL DEFAULT false,
  can_assign_server BOOLEAN NOT NULL DEFAULT false,
  can_group_tables BOOLEAN NOT NULL DEFAULT false,
  can_ungroup_table BOOLEAN NOT NULL DEFAULT false,
  can_move_table BOOLEAN NOT NULL DEFAULT false,
  can_update_notes BOOLEAN NOT NULL DEFAULT false,
  can_view_logs BOOLEAN NOT NULL DEFAULT false,
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
