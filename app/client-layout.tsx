"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { AuthProvider } from "@/contexts/auth-context"
import AuthGuard from "@/components/auth/auth-guard"
import { ThemeProvider } from "@/components/theme-provider"
import { SupabaseInitializer } from "@/components/supabase-initializer"
import { Toaster } from "@/components/ui/toaster"
import { PwaInit } from "@/components/pwa-init"
import { IosTouchFix } from "@/components/ios-touch-fix-wrapper"
import { IosViewportFix } from "@/components/ios-viewport-fix"
import { OfflineDetector } from "@/components/offline-detector"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"

// Define route access rules
const routeAccessRules: Record<string, string[]> = {
  "/admin": ["admin"],
  "/admin/users": ["admin", "manager"],
  "/settings": ["admin", "manager"],
  "/reports": ["admin", "manager"],
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Determine required roles for current route
  const getRequiredRoles = (): string[] => {
    // Check for exact route match
    if (routeAccessRules[pathname]) {
      return routeAccessRules[pathname]
    }

    // Check for parent route match (for nested routes)
    for (const route in routeAccessRules) {
      if (pathname.startsWith(route)) {
        return routeAccessRules[route]
      }
    }

    // No specific roles required
    return []
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <SupabaseInitializer>
          <AuthGuard requiredRoles={getRequiredRoles()}>
            <PwaInit />
            <IosTouchFix />
            <IosViewportFix />
            <OfflineDetector />
            <ServiceWorkerRegistration />
            {children}
            <Toaster />
          </AuthGuard>
        </SupabaseInitializer>
      </AuthProvider>
    </ThemeProvider>
  )
}
