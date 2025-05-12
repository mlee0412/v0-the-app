import { getSupabaseClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

// Define user roles and default permissions
export type UserRole =
  | "admin"
  | "server"
  | "viewer"
  | "controller"
  | "manager"
  | "bartender"
  | "barback"
  | "kitchen"
  | "security"
  | "karaoke_main"
  | "karaoke_staff"
  | "staff"

interface Permission {
  canStartSession: boolean
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

// Define default permissions for each role
const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    canStartSession: true,
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
    canManageUsers: false,
    canManageSettings: false,
  },
  server: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  bartender: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: false,
    canManageSettings: false,
  },
  barback: {
    canStartSession: false,
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
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: true,
    canManageUsers: false,
    canManageSettings: false,
  },
  karaoke_main: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: false,
    canManageSettings: false,
  },
  karaoke_staff: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  viewer: {
    canStartSession: false,
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
  staff: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
}

// Define user interface
export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  pin_code?: string
  permissions?: Permission
  created_at?: string
  updated_at?: string
}

class SupabaseAuthService {
  DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS
  private isBrowser = typeof window !== "undefined"

  // Authenticate a user with username and PIN code
  async authenticate(nameOrUsername: string, pinCode: string) {
    try {
      const supabase = getSupabaseClient()

      // Special case for Administrator with hardcoded PIN
      if (
        (nameOrUsername.toLowerCase() === "administrator" || nameOrUsername.toLowerCase() === "admin") &&
        pinCode === "2162"
      ) {
        const adminUser = {
          id: "admin-" + uuidv4().substring(0, 8),
          username: "admin",
          name: "Administrator",
          role: "admin" as UserRole,
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        }
        return adminUser
      }

      // Try to find user in the users table
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .or(`username.eq.${nameOrUsername},name.eq.${nameOrUsername}`)
        .limit(1)

      if (error) {
        console.error("Error authenticating from users table:", error)
        return null
      }

      // If user found in users table
      if (user && user.length > 0) {
        const foundUser = user[0]

        // Check PIN code - STRICT COMPARISON
        if (foundUser.pin_code === pinCode) {
          // Get permissions if they exist
          const { data: permissions } = await supabase
            .from("user_permissions")
            .select("*")
            .eq("user_id", foundUser.id)
            .limit(1)

          return {
            id: foundUser.id,
            username: foundUser.username || foundUser.name.toLowerCase().replace(/\s+/g, ""),
            name: foundUser.name,
            role: foundUser.role,
            pin_code: foundUser.pin_code,
            permissions: permissions && permissions.length > 0 ? permissions[0] : DEFAULT_PERMISSIONS[foundUser.role],
            created_at: foundUser.created_at,
            updated_at: foundUser.updated_at,
          }
        } else {
          console.log("PIN code mismatch for user:", foundUser.username)
          return null // PIN code doesn't match
        }
      }

      return null // User not found
    } catch (error) {
      console.error("Authentication error:", error)
      return null
    }
  }

  // Get all users
  async getUsers() {
    try {
      const supabase = getSupabaseClient()

      // Get users from the users table
      const { data: users, error } = await supabase.from("users").select("*")

      if (error) {
        console.error("Error fetching users:", error)
        // Return default admin user as fallback
        return [
          {
            id: "admin-" + uuidv4().substring(0, 8),
            username: "admin",
            name: "Administrator",
            role: "admin" as UserRole,
            pin_code: "2162",
            permissions: DEFAULT_PERMISSIONS.admin,
          },
        ]
      }

      // Map users to the expected format
      const allUsers = users.map((user) => ({
        id: user.id,
        username: user.username || user.name.toLowerCase().replace(/\s+/g, ""),
        name: user.name,
        role: user.role,
        pin_code: user.pin_code,
        permissions: DEFAULT_PERMISSIONS[user.role],
        created_at: user.created_at,
        updated_at: user.updated_at,
      }))

      // Ensure Administrator is always available
      if (!allUsers.some((u) => u.username === "admin" || u.name.toLowerCase() === "administrator")) {
        allUsers.push({
          id: "admin-" + uuidv4().substring(0, 8),
          username: "admin",
          name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        })
      }

      return allUsers
    } catch (error) {
      console.error("Error fetching users:", error)

      // Return default admin user as fallback
      return [
        {
          id: "admin-" + uuidv4().substring(0, 8),
          username: "admin",
          name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        },
      ]
    }
  }

  // Add a new user
  async addUser(userData: any) {
    try {
      const supabase = getSupabaseClient()

      // Add user to the users table
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            username: userData.username,
            name: userData.name,
            pin_code: userData.pin_code,
            role: userData.role,
          },
        ])
        .select()

      if (error) {
        console.error("Error adding user:", error)
        throw error
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      return data?.[0]
    } catch (error) {
      console.error("Error adding user:", error)
      throw error
    }
  }

  // Update an existing user
  async updateUser(userId: string, userData: any) {
    try {
      const supabase = getSupabaseClient()

      // Update user in the users table
      const { data, error } = await supabase
        .from("users")
        .update({
          username: userData.username,
          name: userData.name,
          pin_code: userData.pin_code,
          role: userData.role,
        })
        .eq("id", userId)
        .select()

      if (error) {
        console.error("Error updating user:", error)
        throw error
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      return data?.[0]
    } catch (error) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  // Delete a user
  async deleteUser(userId: string) {
    try {
      const supabase = getSupabaseClient()

      // Delete from the users table
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) {
        console.error("Error deleting user:", error)
        throw error
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      return true
    } catch (error) {
      console.error("Error deleting user:", error)
      throw error
    }
  }

  // Check if a user has a specific permission
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return false

      // Admin always has all permissions
      if (user.role === "admin" || user.name?.toLowerCase() === "administrator") {
        return true
      }

      // Check user's specific permissions
      if (user.permissions && permission in user.permissions) {
        return user.permissions[permission as keyof Permission]
      }

      // Fall back to default permissions for role
      return DEFAULT_PERMISSIONS[user.role][permission as keyof Permission] || false
    } catch (error) {
      console.error("Error checking permission:", error)
      return false
    }
  }

  // Check if current user is authenticated
  async isAuthenticated() {
    try {
      const user = localStorage.getItem("currentUser")
      return !!user
    } catch (error) {
      console.error("Error checking authentication:", error)
      return false
    }
  }

  // Get the current user
  async getCurrentUser() {
    try {
      const userJson = localStorage.getItem("currentUser")
      if (!userJson) return null

      const user = JSON.parse(userJson)
      return user
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }

  // Check if current user is admin
  async isAdmin() {
    try {
      const user = await this.getCurrentUser()
      return user?.role === "admin" || user?.name?.toLowerCase() === "administrator"
    } catch (error) {
      console.error("Error checking admin status:", error)
      return false
    }
  }

  // Check if current user is server
  async isServer() {
    try {
      const user = await this.getCurrentUser()
      return user?.role === "server"
    } catch (error) {
      console.error("Error checking server status:", error)
      return false
    }
  }

  // Logout
  async logout() {
    try {
      localStorage.removeItem("currentUser")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  // Subscribe to user changes
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    if (!this.isBrowser) {
      return () => {} // No-op for server-side
    }

    // Set up Supabase real-time subscription if available
    let subscription: { unsubscribe: () => void } | null = null
    const supabase = getSupabaseClient()

    try {
      // Try to subscribe to users table
      subscription = supabase
        .channel("users-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
          this.getUsers().then(callback)
        })
        .subscribe()
    } catch (error) {
      console.error("Error setting up Supabase subscription:", error)
    }

    // Also listen for custom user update events
    const handleUserUpdate = () => {
      this.getUsers().then(callback)
    }

    window.addEventListener("supabase-user-update", handleUserUpdate)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      window.removeEventListener("supabase-user-update", handleUserUpdate)
    }
  }

  // Helper method to broadcast user updates
  broadcastUserUpdate() {
    if (!this.isBrowser) return
    window.dispatchEvent(new CustomEvent("supabase-user-update"))
  }
}

const supabaseAuthService = new SupabaseAuthService()
export default supabaseAuthService
