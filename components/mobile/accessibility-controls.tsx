"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye, Volume2, VolumeX, ZoomIn } from "lucide-react"

interface AccessibilityControlsProps {
  onToggleHighContrast: (enabled: boolean) => void
  onToggleLargeText: (enabled: boolean) => void
  onToggleSound: (enabled: boolean) => void
}

export function AccessibilityControls({
  onToggleHighContrast,
  onToggleLargeText,
  onToggleSound,
}: AccessibilityControlsProps) {
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // Load preferences from localStorage
  useEffect(() => {
    const savedHighContrast = localStorage.getItem("accessibility-high-contrast") === "true"
    const savedLargeText = localStorage.getItem("accessibility-large-text") === "true"
    const savedSound = localStorage.getItem("accessibility-sound") !== "false" // Default to true

    setHighContrast(savedHighContrast)
    setLargeText(savedLargeText)
    setSoundEnabled(savedSound)

    // Apply saved settings
    onToggleHighContrast(savedHighContrast)
    onToggleLargeText(savedLargeText)
    onToggleSound(savedSound)
  }, [onToggleHighContrast, onToggleLargeText, onToggleSound])

  // Toggle high contrast
  const toggleHighContrast = () => {
    const newValue = !highContrast
    setHighContrast(newValue)
    localStorage.setItem("accessibility-high-contrast", String(newValue))
    onToggleHighContrast(newValue)

    // Provide haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  // Toggle large text
  const toggleLargeText = () => {
    const newValue = !largeText
    setLargeText(newValue)
    localStorage.setItem("accessibility-large-text", String(newValue))
    onToggleLargeText(newValue)

    // Provide haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem("accessibility-sound", String(newValue))
    onToggleSound(newValue)

    // Provide haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-[70px] left-4 z-40 rounded-full bg-black/50 border-[#00FFFF] touch-feedback"
        onClick={() => setIsOpen(true)}
      >
        <Eye size={20} className="text-[#00FFFF]" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-[#000033] border border-[#00FFFF] rounded-lg p-4 w-[90%] max-w-[300px]">
        <h3 className="text-[#00FFFF] text-lg mb-4 text-center">Accessibility Options</h3>

        <div className="space-y-4">
          <Button
            variant={highContrast ? "default" : "outline"}
            className={`w-full justify-start ${
              highContrast ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"
            } touch-feedback`}
            onClick={toggleHighContrast}
          >
            <Eye className="mr-2" size={18} />
            High Contrast Mode
          </Button>

          <Button
            variant={largeText ? "default" : "outline"}
            className={`w-full justify-start ${
              largeText ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"
            } touch-feedback`}
            onClick={toggleLargeText}
          >
            <ZoomIn className="mr-2" size={18} />
            Large Text Mode
          </Button>

          <Button
            variant={soundEnabled ? "default" : "outline"}
            className={`w-full justify-start ${
              soundEnabled ? "bg-[#00FFFF] text-black" : "border-[#00FFFF] text-[#00FFFF]"
            } touch-feedback`}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 className="mr-2" size={18} /> : <VolumeX className="mr-2" size={18} />}
            Sound Effects
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full mt-4 border-gray-500 text-gray-300 touch-feedback"
          onClick={() => setIsOpen(false)}
        >
          Close
        </Button>
      </div>
    </div>
  )
}
