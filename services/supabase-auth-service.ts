import { createClient } from "@supabase/supabase-js"
import type { UserRole } from "@/services/user-service"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

// Define permissions directly in this file to avoid import issues
export const DEFAULT_PERMISSIONS = {
  admin: {
    canViewTables: true,
    canEditTables: true,
    canStartDay: true,
    canEndDay: true,
    canViewLogs: true,
    canManageServers: true,
    canManageUsers: true,
    canAccessSettings: true,
    canExportData: true,
  },
  server: {
    canViewTables: true,
    canEditTables: true,
    canStartDay: false,
    canEndDay: false,
    canViewLogs: true,
    canManageServers: false,
    canManageUsers: false,
    canAccessSettings: false,
    canExportData: false,
  },
  viewer: {
    canViewTables: true,
    canEditTables: false,
    canStartDay: false,
    canEndDay: false,
    canViewLogs: false,
    canManageServers: false,
    canManageUsers: false,
    canAccessSettings: false,
    canExportData: false,
  },
}

// Define User type directly in this file
export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  permissions: {
    canViewTables: boolean
    canEditTables: boolean
    canStartDay: boolean
    canEndDay: boolean
    canViewLogs: boolean
    canManageServers: boolean
    canManageUsers: boolean
    canAccessSettings: boolean
    canExportData: boolean
  }
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

class SupabaseAuthService {
  private initialized = false
  private isBrowser = typeof window !== "undefined"

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (!this.isBrowser) return

    try {
      // Check if users exist in local storage first
      const storedUsers = localStorage.getItem("users")
      if (!storedUsers) {
        // No users exist, create default users in local storage
        localStorage.setItem("users", JSON.stringify(DEFAULT_USERS))
      }

      this.initialized = true
    } catch (error) {
      console.error("Error initializing auth service:", error)
    }
  }

  async getUsers(): Promise<User[]> {
    if (!this.isBrowser) return DEFAULT_USERS

    try {
      // Try to get from Supabase first
      const { data, error } = await supabase.from("users").select("*")

      if (error || !data || data.length === 0) {
        // Fall back to localStorage
        const storedUsers = localStorage.getItem("users")
        if (storedUsers) {
          return JSON.parse(storedUsers)
        }
        return DEFAULT_USERS
      }

      return data
    } catch (error) {
      console.error("Error getting users:", error)

      // Fall back to localStorage
      try {
        const storedUsers = localStorage.getItem("users")
        if (storedUsers) {
          return JSON.parse(storedUsers)
        }
      } catch (e) {
        console.error("Error reading from localStorage:", e)
      }

      return DEFAULT_USERS
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    if (!this.isBrowser) {
      // Return default admin for testing
      if (userId === "admin") return DEFAULT_ADMIN
      return null
    }

    try {
      // Try to get from Supabase first
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) {
        // Fall back to localStorage
        const users = await this.getUsers()
        return users.find((u) => u.id === userId) || null
      }

      return data
    } catch (error) {
      console.error("Error getting user by ID:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        return users.find((u) => u.id === userId) || null
      } catch (e) {
        console.error("Error reading from localStorage:", e)
      }

      return null
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.isBrowser) {
      // Return default admin for testing
      if (username === "admin") return DEFAULT_ADMIN
      return null
    }

    try {
      // Try to get from Supabase first
      const { data, error } = await supabase.from("users").select("*").eq("username", username).single()

      if (error) {
        // Fall back to localStorage
        const users = await this.getUsers()
        return users.find((u) => u.username === username) || null
      }

      return data
    } catch (error) {
      console.error("Error getting user by username:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        return users.find((u) => u.username === username) || null
      } catch (e) {
        console.error("Error reading from localStorage:", e)
      }

      return null
    }
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    if (!this.isBrowser) {
      // Return default users filtered by role for testing
      return DEFAULT_USERS.filter((u) => u.role === role)
    }

    try {
      // Try to get from Supabase first
      const { data, error } = await supabase.from("users").select("*").eq("role", role)

      if (error || !data || data.length === 0) {
        // Fall back to localStorage
        const users = await this.getUsers()
        return users.filter((u) => u.role === role)
      }

      return data
    } catch (error) {
      console.error("Error getting users by role:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        return users.filter((u) => u.role === role)
      } catch (e) {
        console.error("Error reading from localStorage:", e)
      }

      return []
    }
  }

  async addUser(user: User): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Try to add to Supabase first
      const { error } = await supabase.from("users").insert(user)

      if (error) {
        // Fall back to localStorage
        const users = await this.getUsers()
        users.push(user)
        localStorage.setItem("users", JSON.stringify(users))
      }

      // Broadcast user update
      this.broadcastUserUpdate()
    } catch (error) {
      console.error("Error adding user:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        users.push(user)
        localStorage.setItem("users", JSON.stringify(users))
        this.broadcastUserUpdate()
      } catch (e) {
        console.error("Error writing to localStorage:", e)
      }
    }
  }

  async updateUser(user: User): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Try to update in Supabase first
      const { error } = await supabase.from("users").update(user).eq("id", user.id)

      if (error) {
        // Fall back to localStorage
        const users = await this.getUsers()
        const index = users.findIndex((u) => u.id === user.id)
        if (index !== -1) {
          users[index] = user
          localStorage.setItem("users", JSON.stringify(users))
        }
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      // If this is the current user, update the current user
      const currentUser = await this.getCurrentUser()
      if (currentUser && currentUser.id === user.id) {
        await this.setCurrentUser(user.id)
      }
    } catch (error) {
      console.error("Error updating user:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        const index = users.findIndex((u) => u.id === user.id)
        if (index !== -1) {
          users[index] = user
          localStorage.setItem("users", JSON.stringify(users))
          this.broadcastUserUpdate()

          // If this is the current user, update the current user
          const currentUser = await this.getCurrentUser()
          if (currentUser && currentUser.id === user.id) {
            await this.setCurrentUser(user.id)
          }
        }
      } catch (e) {
        console.error("Error writing to localStorage:", e)
      }
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Try to delete from Supabase first
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) {
        // Fall back to localStorage
        const users = await this.getUsers()
        const filteredUsers = users.filter((u) => u.id !== userId)
        localStorage.setItem("users", JSON.stringify(filteredUsers))
      }

      // Broadcast user update
      this.broadcastUserUpdate()

      // If this is the current user, log out
      const currentUser = await this.getCurrentUser()
      if (currentUser && currentUser.id === userId) {
        await this.logout()
      }
    } catch (error) {
      console.error("Error deleting user:", error)

      // Fall back to localStorage
      try {
        const users = await this.getUsers()
        const filteredUsers = users.filter((u) => u.id !== userId)
        localStorage.setItem("users", JSON.stringify(filteredUsers))
        this.broadcastUserUpdate()

        // If this is the current user, log out
        const currentUser = await this.getCurrentUser()
        if (currentUser && currentUser.id === userId) {
          await this.logout()
        }
      } catch (e) {
        console.error("Error writing to localStorage:", e)
      }
    }
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    if (!this.isBrowser) {
      // For testing in non-browser environments
      if (username === "admin" && password === "2162") {
        return DEFAULT_ADMIN
      }
      return null
    }

    // Special case for admin with hardcoded credentials
    if (username === "admin" && password === "2162") {
      await this.setCurrentUser("admin")
      this.broadcastUserLogin("admin", "admin", "admin")
      return DEFAULT_ADMIN
    }

    try {
      const user = await this.getUserByUsername(username)
      if (user && user.password === password) {
        // Store current user
        await this.setCurrentUser(user.id)
        this.broadcastUserLogin(user.id, user.username, user.role)
        return user
      }
      return null
    } catch (error) {
      console.error("Error authenticating user:", error)
      return null
    }
  }

  async setCurrentUser(userId: string): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Store in localStorage
      localStorage.setItem("currentUser", JSON.stringify(await this.getUserById(userId)))
      localStorage.setItem("currentUserId", userId)
    } catch (error) {
      console.error("Error setting current user:", error)
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.isBrowser) return null

    try {
      // Try to get from localStorage first
      const userJson = localStorage.getItem("currentUser")
      if (userJson) {
        return JSON.parse(userJson)
      }

      // If not in localStorage, try to get by ID
      const userId = localStorage.getItem("currentUserId")
      if (!userId) return null

      // Special case for admin
      if (userId === "admin") {
        // Check if admin exists in users
        const adminUser = await this.getUserById("admin")
        if (adminUser) return adminUser

        // Return default admin if not found
        return DEFAULT_ADMIN
      }

      return await this.getUserById(userId)
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }

  async logout(): Promise<void> {
    if (!this.isBrowser) return

    try {
      localStorage.removeItem("currentUser")
      localStorage.removeItem("currentUserId")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.getCurrentUser())
  }

  async hasRole(role: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.role === role
  }

  async isAdmin(): Promise<boolean> {
    return this.hasRole("admin")
  }

  async isServer(): Promise<boolean> {
    return this.hasRole("server")
  }

  async hasPermission(permission: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    if (!user) return false
    return user.permissions[permission as keyof typeof user.permissions] || false
  }

  // Subscribe to user changes
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    // Set up Supabase real-time subscription if available
    let subscription: { unsubscribe: () => void } | null = null

    try {
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

  // Helper method to broadcast user login
  broadcastUserLogin(userId: string, username: string, role: string) {
    if (!this.isBrowser) return
    const deviceId = Math.random().toString(36).substring(2, 15)
    window.dispatchEvent(
      new CustomEvent("supabase-user-login", {
        detail: { user_id: userId, username, role, device_id: deviceId },
      }),
    )
  }
}

const supabaseAuthService = new SupabaseAuthService()
export default supabaseAuthService
