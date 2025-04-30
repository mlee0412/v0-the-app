import type React from "react"
import { SupabaseInitializer } from "@/components/supabase-initializer"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import "./cursor.css"
import "./animations.css"
import "./space-animations.css"
import "./mobile.css"
import "./pull-up-panel.css"
import "./logo-effects.css"
import "./touch-improvements.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <SupabaseInitializer>{children}</SupabaseInitializer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
