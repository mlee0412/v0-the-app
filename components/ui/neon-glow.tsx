"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface NeonGlowProps {
  children: ReactNode
  color: "cyan" | "magenta" | "yellow" | "green" | "red"
  intensity?: "low" | "medium" | "high"
  pulse?: boolean
  className?: string
}

export function NeonGlow({ children, color, intensity = "medium", pulse = false, className }: NeonGlowProps) {
  // Define color values
  const colorMap = {
    cyan: {
      base: "#00FFFF",
      glow: "rgba(0, 255, 255, 0.8)",
      shadow: "0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.5)",
    },
    magenta: {
      base: "#FF00FF",
      glow: "rgba(255, 0, 255, 0.8)",
      shadow: "0 0 10px rgba(255, 0, 255, 0.8), 0 0 20px rgba(255, 0, 255, 0.5)",
    },
    yellow: {
      base: "#FFFF00",
      glow: "rgba(255, 255, 0, 0.8)",
      shadow: "0 0 10px rgba(255, 255, 0, 0.8), 0 0 20px rgba(255, 255, 0, 0.5)",
    },
    green: {
      base: "#00FF00",
      glow: "rgba(0, 255, 0, 0.8)",
      shadow: "0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.5)",
    },
    red: {
      base: "#FF0000",
      glow: "rgba(255, 0, 0, 0.8)",
      shadow: "0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.5)",
    },
  }

  // Adjust intensity
  const intensityFactor = {
    low: 0.5,
    medium: 1,
    high: 1.5,
  }

  const selectedColor = colorMap[color]
  const shadowIntensity = intensityFactor[intensity]
  const textShadow = selectedColor.shadow
    .replace("0.8", `${0.8 * shadowIntensity}`)
    .replace("0.5", `${0.5 * shadowIntensity}`)

  return (
    <div
      className={cn("relative inline-block", pulse && "animate-pulse", className)}
      style={{
        color: selectedColor.base,
        textShadow,
      }}
    >
      {children}
    </div>
  )
}
