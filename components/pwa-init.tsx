"use client"

import { useEffect } from "react"
import { ServiceWorkerRegistration } from "./service-worker-registration"

export function PwaInit() {
  useEffect(() => {
    // Add any PWA initialization logic here
    if (typeof window !== "undefined") {
      console.log("PWA initialization")
    }
  }, [])

  return <ServiceWorkerRegistration />
}
