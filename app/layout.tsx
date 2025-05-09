import type React from "react"
import { Inter } from "next/font/google"
import Styles from "./styles"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Space Billiard Timer",
  description: "Cosmic billiard table management system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Styles />
        {children}
      </body>
    </html>
  )
}


import './globals.css'