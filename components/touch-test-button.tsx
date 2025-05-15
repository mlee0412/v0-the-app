"use client"

import { useState, useEffect } from "react"

export function TouchTestButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    // Only show on iOS devices
    setIsVisible(isIOS)
  }, [])

  const handleTouchTest = () => {
    alert("Touch is working correctly!")
  }

  if (!isVisible) return null

  return (
    <button
      onClick={handleTouchTest}
      className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md z-50"
    >
      Touch Test
    </button>
  )
}
