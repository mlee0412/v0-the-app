"use client"

import { useEffect } from "react"
import { registerServiceWorker, checkInstallability } from "@/lib/pwa/register-sw"

// Export with the name PWAInit to match existing imports
export function PWAInit() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Check if app can be installed
    checkInstallability()
  }, [])

  return null
}

// Also export as PwaInit for consistency
export { PWAInit as PwaInit }
