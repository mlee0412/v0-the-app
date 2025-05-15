export interface User {
  id: string
  name: string
  username: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

export interface Permissions {
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
}

export type UserRole =
  | "admin"
  | "manager"
  | "controller"
  | "server"
  | "bartender"
  | "barback"
  | "kitchen"
  | "security"
  | "karaoke_main"
  | "karaoke_staff"
  | "viewer"

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  controller: "Controller",
  manager: "Manager",
  server: "Server",
  bartender: "Bartender",
  barback: "Barback",
  kitchen: "Kitchen",
  security: "Security",
  karaoke_main: "Karaoke Main",
  karaoke_staff: "Karaoke Staff",
  viewer: "Viewer",
}

// Group roles by permission level for easier management
export const ADMIN_LEVEL_ROLES: UserRole[] = ["admin", "manager", "controller"]
export const STAFF_LEVEL_ROLES: UserRole[] = [
  "server",
  "bartender",
  "barback",
  "kitchen",
  "security",
  "karaoke_main",
  "karaoke_staff",
]
export const VIEW_ONLY_ROLES: UserRole[] = ["viewer"]
