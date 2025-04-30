"use client"

/**
 * @deprecated This context has been replaced by SupabaseAuthContext
 * Please use contexts/supabase-auth-context.tsx instead
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"

// Define user roles and permissions
export type UserRole = "admin" | "server" | "viewer"

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

const permissions: Record<UserRole, Permission> = {
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
  server: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false, // Can only assign themselves
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
}

// Define user type
export interface User {
  id: string
  username: string
  role: UserRole
  name?: string
}

// Define context type
interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  isServer: boolean
  currentUser: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: keyof Permission) => boolean
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

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setCurrentUser(user)
        setIsAuthenticated(true)
        setIsAdmin(user.role === "admin")
        setIsServer(user.role === "server")
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("currentUser")
      }
    }
  }, [])

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    console.log("Login attempt:", { username, password })

    // Hardcoded admin credentials for testing
    if (username === "admin" && password === "2162") {
      const adminUser: User = {
        id: "admin-" + uuidv4().substring(0, 8),
        username: "admin",
        role: "admin",
        name: "Administrator",
      }

      setCurrentUser(adminUser)
      setIsAuthenticated(true)
      setIsAdmin(true)
      setIsServer(false)

      // Store user in localStorage
      localStorage.setItem("currentUser", JSON.stringify(adminUser))

      // Broadcast admin presence
      window.dispatchEvent(
        new CustomEvent("supabase-admin-presence", {
          detail: { present: true },
        }),
      )

      console.log("Admin login successful")
      return true
    }

    // Try to authenticate with Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient()

        // First try to sign in with email/password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: `${username}@example.com`, // Use a dummy email format
          password: password,
        })

        if (!authError && authData?.user) {
          // Get user data from users table
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .single()

          if (!userError && userData) {
            const user: User = {
              id: userData.id || authData.user.id,
              username: userData.username,
              role: userData.role as UserRole,
              name: userData.name,
            }

            setCurrentUser(user)
            setIsAuthenticated(true)
            setIsAdmin(user.role === "admin")
            setIsServer(user.role === "server")

            // Store user in localStorage
            localStorage.setItem("currentUser", JSON.stringify(user))

            // Broadcast admin presence if admin
            if (user.role === "admin") {
              window.dispatchEvent(
                new CustomEvent("supabase-admin-presence", {
                  detail: { present: true },
                }),
              )
            }

            console.log("Supabase login successful:", user)
            return true
          }
        }

        // If authentication fails, check if we should create a server user
        if (username.toLowerCase() !== "admin") {
          // Check if the server exists in the servers table
          const { data: serverData, error: serverError } = await supabase
            .from("servers")
            .select("*")
            .eq("name", username)
            .single()

          if (!serverError && serverData) {
            // Create a server user
            const serverUser: User = {
              id: serverData.id,
              username: serverData.name,
              role: "server",
              name: serverData.name,
            }

            setCurrentUser(serverUser)
            setIsAuthenticated(true)
            setIsAdmin(false)
            setIsServer(true)

            // Store user in localStorage
            localStorage.setItem("currentUser", JSON.stringify(serverUser))

            console.log("Server login successful:", serverUser)
            return true
          }
        }
      } catch (error) {
        console.error("Supabase authentication error:", error)
      }
    }

    // Fallback to hardcoded server users for testing
    if (username.toLowerCase() !== "admin") {
      // Create a server user with a generated ID
      const serverUser: User = {
        id: "server-" + uuidv4().substring(0, 8),
        username: username,
        role: "server",
        name: username,
      }

      setCurrentUser(serverUser)
      setIsAuthenticated(true)
      setIsAdmin(false)
      setIsServer(true)

      // Store user in localStorage
      localStorage.setItem("currentUser", JSON.stringify(serverUser))

      console.log("Fallback server login successful:", serverUser)
      return true
    }

    console.log("Login failed")
    return false
  }

  // Logout function
  const logout = () => {
    // If admin, broadcast admin absence
    if (currentUser?.role === "admin") {
      window.dispatchEvent(
        new CustomEvent("supabase-admin-presence", {
          detail: { present: false },
        }),
      )
    }

    // Clear user state
    setCurrentUser(null)
    setIsAuthenticated(false)
    setIsAdmin(false)
    setIsServer(false)

    // Remove from localStorage
    localStorage.removeItem("currentUser")

    // Sign out from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient()
        supabase.auth.signOut()
      } catch (error) {
        console.error("Error signing out from Supabase:", error)
      }
    }
  }

  // Check if user has a specific permission
  const hasPermission = (permission: keyof Permission): boolean => {
    if (!isAuthenticated || !currentUser) return false
    return permissions[currentUser.role][permission]
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
