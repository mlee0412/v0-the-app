"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import TouchLoginDialog from "./touch-login-dialog"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export default function AuthGuard({ children, requiredRoles = [] }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/reset-password"]

  useEffect(() => {
    // Don't show login for public routes
    if (publicRoutes.includes(pathname)) {
      return
    }

    // If not loading and not authenticated, show login
    if (!isLoading && !isAuthenticated) {
      setShowLogin(true)
    } else {
      setShowLogin(false)
    }

    // Check role-based access
    if (!isLoading && isAuthenticated && requiredRoles.length > 0) {
      const userRole = user?.role || "staff"

      if (!requiredRoles.includes(userRole)) {
        // Redirect to home if user doesn't have required role
        router.push("/")
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router, requiredRoles])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login dialog if not authenticated and not on a public route
  if (showLogin && !publicRoutes.includes(pathname)) {
    return <TouchLoginDialog />
  }

  // Render children if authenticated or on a public route
  return <>{children}</>
}
