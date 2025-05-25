"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { SupabaseAuthProvider } from "@/contexts/supabase-auth-context"
import { BilliardsTimerDashboard } from "@/components/system/billiards-timer-dashboard"
import { PWAInit } from "@/components/pwa-init"
import { IOSViewportFix } from "@/components/ios-viewport-fix"
import { IOSTouchOptimizations } from "@/components/ios-touch-optimizations"
import { DirectTouchHandler } from "@/components/direct-touch-handler"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // Ensure we're only rendering client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SupabaseAuthProvider>
        <AuthProvider>
          <IOSViewportFix />
          <IOSTouchOptimizations />
          <DirectTouchHandler />
          <PWAInit />
          <BilliardsTimerDashboard />
        </AuthProvider>
      </SupabaseAuthProvider>
    </ThemeProvider>
  )
}
