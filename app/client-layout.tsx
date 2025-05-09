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
import "@/app/touch-test-fix.css"

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
    if (typeof window !== "undefined") {
      const element = document.documentElement
      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.log("Fullscreen request failed:", err)
        })
      }
    }
  }, [])

  useEffect(() => {
    // Fix for iOS viewport height
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setVh()
    window.addEventListener("resize", setVh)
    window.addEventListener("orientationchange", setVh)

    // Remove any touch test buttons that might be added by iOS
    const removeTouchTestButtons = () => {
      if (typeof document !== "undefined") {
        // Find buttons by text content
        document.querySelectorAll("button").forEach((button) => {
          if (button.textContent?.includes("Touch Test")) {
            button.style.display = "none"
            if (button.parentElement) {
              button.parentElement.removeChild(button)
            }
          }
        })

        // Find by class or id that might contain "touch" and "test"
        const possibleSelectors = [
          ".touch-test",
          "#touch-test",
          '[data-testid="touch-test"]',
          '[aria-label="Touch Test"]',
          ".mobile-bottom-nav-item:last-child", // Target the last nav item if it's the touch test
        ]

        possibleSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => {
            if (el instanceof HTMLElement && el.textContent?.includes("Touch Test")) {
              el.style.display = "none"
              if (el.parentElement) {
                el.parentElement.removeChild(el)
              }
            }
          })
        })
      }
    }

    // Run on mount and periodically
    removeTouchTestButtons()
    const interval = setInterval(removeTouchTestButtons, 1000)

    return () => {
      window.removeEventListener("resize", setVh)
      window.removeEventListener("orientationchange", setVh)
      clearInterval(interval)
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {/* Initialize PWA functionality */}
      <PWAInit />

      {/* Offline detector */}
      <OfflineDetector />

      {/* Render the background animation outside of the auth provider */}
      <SpaceBackgroundAnimation intensity={1.5} />
      <IOSViewportFix />
      <DirectTouchHandler />
      <AuthProvider>{isClient ? <BilliardsTimerDashboard /> : <div>Loading...</div>}</AuthProvider>
      <Toaster />
    </ThemeProvider>
  )
}
