import "./globals.css"
import "./cursor.css"
import "./animations.css"
import "./logo-effects.css"
import "./space-animations.css"
import "./mobile.css"
import "./pull-up-panel.css"
import "./ios-touch-fixes.css"
import "./mobile-optimizations.css"
import "./dialog-fixes.css"
import "./mobile-fixes.css"
import "./bottom-nav.css"
import "./pwa.css"
import "./ipad.css"

import type { Metadata, Viewport } from "next"
import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SupabaseInitializer } from "@/components/supabase-initializer"
import ClientLayout from "./client-layout" // Import using default import syntax

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Billiards Timer",
  description: "Track billiards table usage and time",
  manifest: "/manifest.json",
  themeColor: "#000033",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Billiards",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  formatDetection: {
    telephone: false,
  },
  icons: [
    { rel: "apple-touch-icon", url: "/icons/icon-192x192.png" },
    { rel: "icon", url: "/icons/icon-192x192.png" },
  ],
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Space Billiards" />
        <meta name="application-name" content="Space Billiards" />
        <meta name="msapplication-TileColor" content="#000033" />
        <meta name="msapplication-navbutton-color" content="#000033" />
        <meta name="theme-color" content="#000033" />

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/images/apple-icon-180.png" />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-1668-2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-1536-2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-1242-2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-828-1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-1242-2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-750-1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-640-1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />

        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} overflow-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SupabaseInitializer>
            <ClientLayout>{children}</ClientLayout>
          </SupabaseInitializer>
        </ThemeProvider>
      </body>
    </html>
  )
}
