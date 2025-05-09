"use client"

import { useEffect } from "react"
import { registerServiceWorker, checkInstallability } from "@/lib/pwa/register-sw"

export function PWAInit() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Check if app can be installed
    checkInstallability()
  }, [])

  return null
}
