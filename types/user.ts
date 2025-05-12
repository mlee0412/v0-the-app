export interface User {
  id: string
  username: string
  name: string
  role: string
  role_id?: string | null
  created_at: string
  updated_at: string
  pin_code?: string | null
  email?: string | null
  roleData?: any
  original_role?: string | null
}

export interface Permissions {
  user_id?: string
  can_start_session: boolean
  can_end_session: boolean
  can_add_time: boolean
  can_subtract_time: boolean
  can_update_guests: boolean
  can_assign_server: boolean
  can_group_tables: boolean
  can_ungroup_table: boolean
  can_move_table: boolean
  can_update_notes: boolean
  can_view_logs: boolean
  can_manage_users: boolean
  can_manage_settings: boolean
  created_at?: string
  updated_at?: string
}
