"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { SupabaseInitializer } from "@/components/supabase-initializer"
import "./globals.css"
import "./mobile.css"
import "./animations.css"
import "./space-animations.css"
import "./logo-effects.css"
import "./cursor.css"
import "./touch-improvements.css"

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Space Billiards Tables</title>
        <meta name="description" content="Galactic-inspired billiards table management system" />
      </head>
      <body className="min-h-screen bg-black text-white font-mono cursor-spaceship">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SupabaseInitializer>{isClient ? <BilliardsTimerDashboard /> : <div>Loading...</div>}</SupabaseInitializer>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
