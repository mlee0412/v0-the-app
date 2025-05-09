"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { SpaceBackgroundAnimation } from "@/components/space-background-animation"
import { IOSViewportFix } from "@/components/ios-viewport-fix"
import { DirectTouchHandler } from "@/components/direct-touch-handler"
import "./globals.css"
import "./mobile.css"
import "./animations.css"
import "./space-animations.css"
import "./logo-effects.css"
import "./cursor.css"
import "./touch-improvements.css"
import "@/app/ios-touch-fixes.css"

export default function ClientRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const element = document.documentElement
      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.log("Fullscreen request failed:", err)
        })
      }
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {/* Render the background animation outside of the auth provider */}
      <SpaceBackgroundAnimation intensity={1.5} />
      <IOSViewportFix />
      <DirectTouchHandler />
      <AuthProvider>{isClient ? <BilliardsTimerDashboard /> : <div>Loading...</div>}</AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}
