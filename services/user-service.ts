import type { UserRole } from "@/types/user"
import { createClient } from "@supabase/supabase-js"

export interface Permission {
  canStartSession: boolean
  canQuickStart: boolean
  canEndSession: boolean
  canAddTime: boolean
  canSubtractTime: boolean
  canUpdateGuests: boolean
  canAssignServer: boolean
  canGroupTables: boolean
  canUngroupTable: boolean
  canMoveTable: boolean
  canUpdateNotes: boolean
  canViewLogs: boolean
  canManageUsers: boolean
  canManageSettings: boolean
}

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  permissions: Permission
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  // Admin level roles - full access
  admin: {
    canStartSession: true,
    canQuickStart: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: true,
    canUpdateGuests: true,
    canAssignServer: true,
    canGroupTables: true,
    canUngroupTable: true,
    canMoveTable: true,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  controller: {
    canStartSession: true,
    canQuickStart: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: true,
    canUpdateGuests: true,
    canAssignServer: true,
    canGroupTables: true,
    canUngroupTable: true,
    canMoveTable: true,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  manager: {
    canStartSession: true,
    canQuickStart: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: true,
    canUpdateGuests: true,
    canAssignServer: true,
    canGroupTables: true,
    canUngroupTable: true,
    canMoveTable: true,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  // Staff level roles - operational access
  server: {
    canStartSession: true,
    canQuickStart: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false, // Servers can only manage their own tables
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  bartender: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  barback: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  kitchen: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  security: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  karaoke_main: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  karaoke_staff: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  // View only role
  viewer: {
    canStartSession: false,
    canQuickStart: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
}

// Default admin user
const DEFAULT_ADMIN: User = {
  id: "admin",
  username: "admin",
  password: "2162", // Changed from admin123 to 2162
  role: "admin",
  name: "Administrator",
  permissions: DEFAULT_PERMISSIONS.admin,
}

// Default users
const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN,
  {
    id: "server1",
    username: "server1",
    password: "server123",
    role: "server",
    name: "Server 1",
    permissions: DEFAULT_PERMISSIONS.server,
  },
  {
    id: "server2",
    username: "server2",
    password: "server123",
    role: "server",
    name: "Server 2",
    permissions: DEFAULT_PERMISSIONS.server,
  },
  {
    id: "viewer",
    username: "viewer",
    password: "viewer123",
    role: "viewer",
    name: "Viewer",
    permissions: DEFAULT_PERMISSIONS.viewer,
  },
]

class UserService {
  private initialized = false
  private isBrowser = typeof window !== "undefined"
  private supabaseUrl: string
  private supabaseKey: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    this.initialize()
  }

  private async initialize() {
    if (!this.isBrowser) return
    this.initialized = true
  }

  async createUser(userData: any) {
    try {
      const response = await fetch("/api/staff/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create user")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Error in createUser:", error)
      throw error
    }
  }

  async getUsers() {
    try {
      const response = await fetch("/api/staff/members")

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error("Error in getUsers:", error)
      throw error
    }
  }

  async updateUser(userId: string, userData: any) {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseKey)

      const { data, error } = await supabase.from("staff_members").update(userData).eq("id", userId).select()

      if (error) throw error
      return data?.[0]
    } catch (error: any) {
      console.error("Error in updateUser:", error)
      throw error
    }
  }

  async deleteUser(userId: string) {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseKey)

      const { error } = await supabase.from("staff_members").delete().eq("id", userId)

      if (error) throw error
      return true
    } catch (error: any) {
      console.error("Error in deleteUser:", error)
      throw error
    }
  }

  async getRoles() {
    try {
      const response = await fetch("/api/staff/roles")

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error("Error in getRoles:", error)
      throw error
    }
  }
}

// Export a single instance
export const userService = new UserService()
export default userService
