import { getSupabaseClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"
import { type UserRole, ADMIN_LEVEL_ROLES } from "@/types/user"

// Define user roles and default permissions
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
  // Admin level roles - full access
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
    canManageUsers: true,
    canManageSettings: true,
  },
  // Staff level roles - operational access
  server: {
    canStartSession: true,
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
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  karaoke_main: {
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
  karaoke_staff: {
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
  // View only role
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
}

// Define user interface
export interface User {
  id: string
  email: string
  username?: string
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
  private supabase = getSupabaseClient()
  private currentUser: any = null
  private userPermissions: any = null

  constructor() {
    // Initialize current user from local storage if available
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("currentUser")
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser)
        } catch (e) {
          console.error("Error parsing stored user:", e)
          localStorage.removeItem("currentUser")
        }
      }
    }
  }

  // Authenticate a user with user ID and PIN code
  async authenticate(userId: string, pinCode: string) {
    try {
      // Use the API endpoint for authentication
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, pinCode }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Authentication error:", errorData)
        return null
      }

      const data = await response.json()

      if (data.success && data.user) {
        // Store the user in memory and localStorage
        this.currentUser = data.user
        if (typeof window !== "undefined") {
          localStorage.setItem("currentUser", JSON.stringify(data.user))
        }

        return data.user
      }

      return null
    } catch (error) {
      console.error("Authentication error:", error)
      return null
    }
  }

  // Get all users - use a fetch API call to bypass RLS issues
  async getUsers() {
    try {
      // Use fetch to call our API endpoint instead of direct Supabase query
      const response = await fetch("/api/staff/members")
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()

      // Format users from the API response
      const formattedUsers = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email || "",
        username: user.email || user.first_name.toLowerCase().replace(/\s+/g, ""),
        name: user.first_name,
        display_name: user.display_name || user.first_name,
        role: user.role?.toLowerCase() || "viewer",
        pin_code: user.pin_code,
        permissions: DEFAULT_PERMISSIONS[user.role?.toLowerCase() || "viewer"],
        created_at: user.created_at,
        updated_at: user.updated_at,
        auth_id: user.auth_id,
      }))

      // Ensure Administrator is always available
      if (!formattedUsers.some((u) => u.email === "admin@example.com" || u.username === "admin")) {
        formattedUsers.push({
          id: "admin-" + uuidv4().substring(0, 8),
          email: "admin@example.com",
          username: "admin",
          name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        })
      }

      return formattedUsers
    } catch (error) {
      console.error("Error fetching users:", error)

      // Return default admin user as fallback
      return [
        {
          id: "admin-" + uuidv4().substring(0, 8),
          email: "admin@example.com",
          username: "admin",
          name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        },
      ]
    }
  }

  // The rest of the methods remain the same...
  // Add a new user
  async addUser(userData: any) {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch("/api/staff/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Broadcast user update
      this.broadcastUserUpdate()

      return data
    } catch (error) {
      console.error("Error adding user:", error)
      throw error
    }
  }

  // Update an existing user
  async updateUser(userId: string, userData: any) {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch(`/api/staff/members/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Broadcast user update
      this.broadcastUserUpdate()

      return data
    } catch (error) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  // Delete a user
  async deleteUser(userId: string) {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch(`/api/staff/members/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      return true
    } catch (error) {
      console.error("Error deleting user:", error)
      throw error
    }
  }

  // Get user permissions
  async getUserPermissions(userId: string) {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch(`/api/staff/permissions/${userId}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error getting user permissions:", error)
      return null
    }
  }

  // Update user permissions
  async updateUserPermissions(userId: string, permissions: any) {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch(`/api/staff/permissions/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissions),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating permissions:", error)
      throw error
    }
  }

  // Get all roles
  async getRoles() {
    try {
      // Use API endpoint to bypass RLS
      const response = await fetch("/api/staff/roles")

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching roles:", error)
      throw error
    }
  }

  // Check if a user has a specific permission
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return false

      // Admin level roles always have all permissions
      if (ADMIN_LEVEL_ROLES.includes(user.role as UserRole)) {
        return true
      }

      // Check user's specific permissions
      if (user.permissions && permission in user.permissions) {
        return user.permissions[permission as keyof typeof user.permissions]
      }

      // Fall back to default permissions for role
      return DEFAULT_PERMISSIONS[user.role as UserRole][permission as keyof Permission] || false
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
      return ADMIN_LEVEL_ROLES.includes(user?.role as UserRole)
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

      // Also sign out from Supabase Auth
      await this.supabase.auth.signOut()
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
      // Try to subscribe to staff_members table
      subscription = supabase
        .channel("staff-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "staff_members" }, () => {
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
