"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import supabaseAuthService from "@/services/supabase-auth-service"
import { type UserRole, ADMIN_LEVEL_ROLES } from "@/types/user"

// Define user roles and permissions
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
const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = supabaseAuthService.DEFAULT_PERMISSIONS

// Define user type
export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  permissions?: Permission
}

// Add users to the AuthContextType interface
export interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  isServer: boolean
  currentUser: User | null
  login: (userId: string, pinCode: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
  users: User[] // Add this line
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isServer, setIsServer] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("currentUser")
      if (storedUser) {
        const user = JSON.parse(storedUser)

        // Validate the user object before setting state
        if (user && typeof user === "object" && user.role) {
          setCurrentUser({
            id: user.id,
            username: user.username || user.id,
            name: user.name || "User",
            role: user.role,
            permissions: user.permissions || DEFAULT_PERMISSIONS[user.role],
          })
          setIsAuthenticated(true)
          setIsAdmin(ADMIN_LEVEL_ROLES.includes(user.role))
          setIsServer(user.role === "server")
        } else {
          console.error("Invalid user object in localStorage:", user)
          localStorage.removeItem("currentUser")
        }
      }
    } catch (error) {
      console.error("Error parsing stored user:", error)
      localStorage.removeItem("currentUser")
    }
  }, [])

  // Fetch users when the component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersList = await supabaseAuthService.getUsers()
        setUsers(
          usersList.map((user) => ({
            id: user.id,
            username: user.username || user.email || user.id,
            name: user.name,
            role: user.role as UserRole,
            permissions: user.permissions || DEFAULT_PERMISSIONS[user.role as UserRole],
          })),
        )
      } catch (err) {
        console.error("Error in fetchUsers:", err)
        // Set default admin user as fallback
        setUsers([
          {
            id: "admin",
            username: "admin",
            name: "Administrator",
            role: "admin",
            permissions: DEFAULT_PERMISSIONS.admin,
          },
        ])
      }
    }

    fetchUsers()
  }, [])

  // Login function
  const login = async (userId: string, pinCode: string): Promise<boolean> => {
    console.log("Login attempt:", { userId })

    try {
      // Use the supabaseAuthService for authentication
      const user = await supabaseAuthService.authenticate(userId, pinCode)

      if (user) {
        // Ensure admin role for administrator name
        if (user.name?.toLowerCase() === "administrator") {
          user.role = "admin"
        }

        // Ensure permissions are set
        const userWithPermissions = {
          ...user,
          permissions: user.permissions || DEFAULT_PERMISSIONS[user.role],
        }

        setCurrentUser(userWithPermissions)
        setIsAuthenticated(true)
        setIsAdmin(ADMIN_LEVEL_ROLES.includes(user.role))
        setIsServer(user.role === "server")

        // Store user in localStorage
        localStorage.setItem("currentUser", JSON.stringify(userWithPermissions))

        console.log("Login successful:", userWithPermissions)
        return true
      }
    } catch (error) {
      console.error("Authentication error:", error)
    }

    console.log("Login failed")
    return false
  }

  // Logout function
  const logout = () => {
    // Clear user state
    setCurrentUser(null)
    setIsAuthenticated(false)
    setIsAdmin(false)
    setIsServer(false)

    // Remove from localStorage
    localStorage.removeItem("currentUser")

    // Call the service logout method to sign out from Supabase Auth
    supabaseAuthService.logout()
  }

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !currentUser) return false

    // Admin level roles always have all permissions
    if (ADMIN_LEVEL_ROLES.includes(currentUser.role)) {
      return true
    }

    // Check user's specific permissions if available
    if (currentUser.permissions && permission in currentUser.permissions) {
      return currentUser.permissions[permission as keyof Permission]
    }

    // Fall back to default permissions for role
    return DEFAULT_PERMISSIONS[currentUser.role][permission as keyof Permission] || false
  }

  // Context value
  const value = {
    isAuthenticated,
    isAdmin,
    isServer,
    currentUser,
    login,
    logout,
    hasPermission,
    users,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
