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
import { PWAInit } from "@/components/pwa-init"
import { OfflineDetector } from "@/components/offline-detector"
import { RemoveTouchTest } from "@/components/remove-touch-test"
import "./globals.css"
import "./mobile.css"
import "./animations.css"
import "./space-animations.css"
import "./logo-effects.css"
import "./cursor.css"
import "./touch-improvements.css"
import "./pwa.css"
import "@/app/ios-touch-fixes.css"
import "@/app/mobile-fixes.css"
import "@/app/remove-touch-test.css"

export default function ClientRootLayout({
  children,
}: Readonly<{
  children?: React.ReactNode
}>) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Fix for iOS viewport height
    const setVh = () => {
      try {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty("--vh", `${vh}px`)
      } catch (err) {
        console.log("Error setting viewport height:", err)
      }
    }

    try {
      setVh()
      window.addEventListener("resize", setVh)
      window.addEventListener("orientationchange", setVh)
    } catch (err) {
      console.log("Error setting up viewport listeners:", err)
    }

    return () => {
      try {
        window.removeEventListener("resize", setVh)
        window.removeEventListener("orientationchange", setVh)
      } catch (err) {
        console.log("Error removing viewport listeners:", err)
      }
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {/* Initialize PWA functionality */}
      <PWAInit />

      {/* Offline detector */}
      <OfflineDetector />

      {/* Remove Touch Test button */}
      <RemoveTouchTest />

      {/* Render the background animation outside of the auth provider */}
      <SpaceBackgroundAnimation intensity={1.5} />
      <IOSViewportFix />
      <DirectTouchHandler />
      <AuthProvider>{isClient ? <BilliardsTimerDashboard /> : <div>Loading...</div>}</AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}
