"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { BilliardsTimerDashboard } from "@/components/system/billiards-timer-dashboard"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { SpaceBackgroundAnimation } from "@/components/animations/space-background-animation"
import { IOSViewportFix } from "@/components/ios-viewport-fix"
import { IOSTouchFix } from "@/components/ios-touch-fix"
import { TouchInteractionManager } from "@/components/mobile/touch-interaction-manager"
import { PWAInit } from "@/components/pwa-init"
import { OfflineDetector } from "@/components/mobile/offline-detector"
import { Spinner } from "@/components/ui/spinner"
import { useAnimation } from "@/contexts/animation-context"

export default function ClientLayout({
  children,
}: Readonly<{
  children?: React.ReactNode
}>) {
  const [isClient, setIsClient] = useState(false)
  const { backgroundEnabled } = useAnimation()
  const [showAnimation, setShowAnimation] = useState(backgroundEnabled)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const isOldIpad = /iPad/.test(navigator.userAgent) && /OS 1[3-4]_/.test(navigator.userAgent)

    const updatePreference = () => {
      setShowAnimation(backgroundEnabled && !mediaQuery.matches && !isOldIpad)
    }

    updatePreference()
    mediaQuery.addEventListener("change", updatePreference)
    return () => mediaQuery.removeEventListener("change", updatePreference)
  }, [backgroundEnabled])

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setVh()
    window.addEventListener("resize", setVh)
    window.addEventListener("orientationchange", setVh)

    return () => {
      window.removeEventListener("resize", setVh)
      window.removeEventListener("orientationchange", setVh)
    }
  }, [])

  return (
    <>
      {/* PWAInit is essential and should run early */}
      <PWAInit />

      {/* iOS specific fixes also good to have early */}
      <IOSViewportFix />
      <IOSTouchFix />
      {/* Consolidated touch handler */}
      <TouchInteractionManager />

      <AuthProvider>
        <OfflineDetector />
        {isClient ? (
          children || <BilliardsTimerDashboard />
        ) : (
          <div className="flex items-center justify-center h-screen">
            <Spinner className="h-8 w-8 text-cyan-500" />
          </div>
        )}
      </AuthProvider>

      {/* Background animation rendered after the main content structure */}
      {isClient && showAnimation && <SpaceBackgroundAnimation intensity={1.5} />}

      <Toaster />
    </>
  )
}
