import "./globals.css" // This will now import all other necessary global CSS files

import type { Metadata, Viewport } from "next"
import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SupabaseInitializer } from "@/components/system/supabase-initializer" // Corrected import path
import ClientLayout from "./client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Billiards Timer",
  description: "Track billiards table usage and time",
  manifest: "/manifest.json",
  themeColor: "#000033", // Space theme color
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Billiards",
  },
  // Viewport settings are now primarily in viewport export
  icons: [
    { rel: "apple-touch-icon", url: "/images/apple-icon-180.png" }, // Updated path
    { rel: "icon", url: "/icons/icon-192x192.png" }, // Standard PWA icon
  ],
  generator: "v0.dev", // Keep this if it's important for v0.dev
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Important for edge-to-edge displays
  themeColor: "#000033", // Ensure theme-color is also in viewport
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Meta tags for PWA and mobile experience - consolidated */}
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
        {/* Removed theme-color from here as it's in metadata and viewport export */}

        {/* Apple touch icons and startup images - ensure these paths are correct */}
        <link rel="apple-touch-icon" href="/images/apple-icon-180.png" />
        {/* Add other apple-touch-startup-image links if they are still needed and paths are correct */}
        {/* Example:
        <link
          rel="apple-touch-startup-image"
          href="/images/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} overflow-hidden bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SupabaseInitializer>
            <ClientLayout>{children}</ClientLayout>
          </SupabaseInitializer>
        </ThemeProvider>
      </body>
    </html>
  )
}
