import type React from "react"
import "./globals.css"
import "./animations.css"
import "./cursor.css"
import "./space-animations.css"
import "./logo-effects.css"
import "./mobile.css"
import "./pull-up-panel.css"
import "./touch-improvements.css"
import "./mobile-optimizations.css"
import "@/app/ios-touch-fixes.css"
import "./mobile-fixes.css"
import "./dialog-fixes.css"

import type { Metadata, Viewport } from "next"
import { SupabaseInitializer } from "@/components/supabase-initializer"
import ClientRootLayout from "@/app/client-layout"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Add this for iOS devices
}

export const metadata: Metadata = {
  title: "Space Billiards Tables",
  description: "Galactic-inspired billiards table management system",
  themeColor: "#000033",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Billiards",
  },
  formatDetection: {
    telephone: false,
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SupabaseInitializer>
          <ClientRootLayout>{children}</ClientRootLayout>
        </SupabaseInitializer>
      </body>
    </html>
  )
}
