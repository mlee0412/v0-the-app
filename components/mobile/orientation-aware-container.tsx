"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { RotateCcw } from "lucide-react"

interface OrientationAwareContainerProps {
  children: React.ReactNode
  landscapeContent?: React.ReactNode
  forceOrientation?: "portrait" | "landscape" | null
}

export function OrientationAwareContainer({
  children,
  landscapeContent,
  forceOrientation = null,
}: OrientationAwareContainerProps) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [showRotatePrompt, setShowRotatePrompt] = useState(false)

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? "portrait" : "landscape"
      setOrientation(newOrientation)

      // Show rotate prompt if we have a forced orientation that doesn't match
      if (forceOrientation && forceOrientation !== newOrientation) {
        setShowRotatePrompt(true)
      } else {
        setShowRotatePrompt(false)
      }
    }

    handleOrientationChange() // Initial check
    window.addEventListener("resize", handleOrientationChange)

    return () => {
      window.removeEventListener("resize", handleOrientationChange)
    }
  }, [forceOrientation])

  // If we have a forced orientation and it doesn't match, show rotate prompt
  if (showRotatePrompt) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4 z-50">
        <RotateCcw size={48} className="text-[#00FFFF] mb-4 animate-spin-slow" />
        <h2 className="text-[#00FFFF] text-xl mb-2 text-center">Please rotate your device</h2>
        <p className="text-white text-center mb-4">This view works best in {forceOrientation} mode</p>
      </div>
    )
  }

  // If we have landscape content and we're in landscape mode, show it
  if (landscapeContent && orientation === "landscape") {
    return <>{landscapeContent}</>
  }

  // Otherwise show normal content
  return <>{children}</>
}
