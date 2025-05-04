"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"
import "./mobile.css"
import "./animations.css"
import "./space-animations.css"
import "./logo-effects.css"
import "./cursor.css"
import "./touch-improvements.css"
import "@/app/ios-touch-fixes.css"
import { DirectTouchHandler } from "@/components/direct-touch-handler"

export default function ClientRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <DirectTouchHandler />
      <AuthProvider>{isClient ? <BilliardsTimerDashboard /> : <div>Loading...</div>}</AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}
