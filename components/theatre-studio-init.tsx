"use client"

import { useEffect } from "react"

export function TheatreStudioInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Only import Theatre Studio in development
      import("@theatre/studio").then((studio) => {
        try {
          studio.default.initialize()
        } catch (e) {
          console.log("Theatre studio already initialized")
        }
      })
    }
  }, [])

  return null
}
