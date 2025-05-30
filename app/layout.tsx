import "./globals.css";

import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SupabaseInitializer } from "@/components/system/supabase-initializer";
import ClientLayout from "./client-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Space Billiards Timer",
  description: "Galactic-inspired billiards table management system",
  manifest: "/manifest.json",
  themeColor: "#000033",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Billiards",
  },
  icons: [
    // This will now use your existing logo for the Apple touch icon.
    // Browsers/iOS will scale it. Ideally, an exact 180x180 (or other Apple sizes) would be best.
    { rel: "apple-touch-icon", url: "/images/space-billiard-logo.png" },
    { rel: "icon", url: "/images/space-billiard-logo.png" }, // General fallback icon
  ],
  generator: "v0.dev",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000033",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Most PWA and mobile meta tags are handled by the Next.js 'metadata' and 'viewport' exports.
          The <link rel="manifest" href="/manifest.json" /> will be automatically added by Next.js.
          The apple-touch-icon is defined in the metadata above.
        */}
      </head>
      <body className={`${inter.className} overflow-hidden bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SupabaseInitializer>
            <ClientLayout>{children}</ClientLayout>
          </SupabaseInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
