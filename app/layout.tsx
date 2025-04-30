import type React from "react"
import type { Metadata } from "next"
import ClientRootLayout from "./client-layout"
import "./pull-up-panel.css"

export const metadata: Metadata = {
  title: "Space Billiards Tables",
  description: "Galactic-inspired billiards table management system",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientRootLayout>{children}</ClientRootLayout>
}
