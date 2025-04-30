"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import supabaseAuthService from "@/services/supabase-auth-service"
import type { User, Permission } from "@/services/user-service"

type AuthContextType = {
  currentUser: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isServer: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: keyof Permission) => boolean
  loading: boolean
}

// Default context value
const defaultContextValue: AuthContextType = {
  currentUser: null,
  isAuthenticated: false,
  isAdmin: false,
  isServer: false,
  login: async () => false,
  logout: () => {},
  hasPermission: () => false,
  loading: true,
}

const SupabaseAuthContext = createContext<AuthContextType>(defaultContextValue)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isServer, setIsServer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load auth state on mount
  useEffect(() => {
    // Only run in browser environment
    if (isClient) {
      const loadAuthState = async () => {
        try {
          setLoading(true)
          const user = await supabaseAuthService.getCurrentUser()

          if (user) {
            setCurrentUser(user)
            setIsAuthenticated(true)
            setIsAdmin(user.role === "admin")
            setIsServer(user.role === "server")
          }
        } catch (error) {
          console.error("Error loading auth state:", error)
        } finally {
          setLoading(false)
        }
      }

      loadAuthState()
    }
  }, [isClient])

  // Update the login function to broadcast login events
  const login = async (username: string, password: string) => {
    try {
      setLoading(true)
      const { success, user, error } = await supabaseAuthService.signInWithUsername(username, password)

      if (success && user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
        setIsAdmin(user.role === "admin")
        setIsServer(user.role === "server")

        // Broadcast login event to other clients
        setTimeout(() => {
          // Small delay to ensure connection is established
          const supabaseRealTimeService = require("@/services/supabase-real-time-service").default
          supabaseRealTimeService.broadcastUserLogin(user.id, user.username, user.role)
        }, 1000)

        return true
      } else {
        console.error("Login failed:", error)
      }
    } catch (error) {
      console.error("Error logging in:", error)
    } finally {
      setLoading(false)
    }
    return false
  }

  const logout = async () => {
    try {
      setLoading(true)
      await supabaseAuthService.signOut()
      setCurrentUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setIsServer(false)
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission: keyof Permission) => {
    if (!currentUser) return false

    // Admin always has all permissions
    if (currentUser.role === "admin") return true

    return currentUser.permissions[permission] || false
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isServer,
        login,
        logout,
        hasPermission,
        loading,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext)
}
