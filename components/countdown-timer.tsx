"use client"

import { useEffect, useRef } from "react"

interface CountdownTimerProps {
  remainingTime: number
  isActive: boolean
  isWarning: boolean
  isOvertime?: boolean
  className?: string
}

export function CountdownTimer({
  remainingTime,
  isActive,
  isWarning,
  isOvertime = false,
  className = "",
}: CountdownTimerProps) {
  const timerRef = useRef<HTMLDivElement>(null)

  // Format time as MM:SS (minutes:seconds)
  const formatTime = (ms: number) => {
    const isNegative = ms < 0
    const absoluteMs = Math.abs(ms)
    const totalSeconds = Math.floor(absoluteMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${isNegative ? "-" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Add particle effects for warning and overtime states
  useEffect(() => {
    const timer = timerRef.current
    if (!timer) return

    // Clear any existing particles
    const existingCanvas = timer.querySelector("canvas")
    if (existingCanvas) {
      timer.removeChild(existingCanvas)
    }

    // Only add particles for warning or overtime
    if (!isWarning && !isOvertime) return

    // Create canvas for particles
    const canvas = document.createElement("canvas")
    canvas.className = "absolute inset-0 pointer-events-none"
    canvas.width = timer.offsetWidth
    canvas.height = timer.offsetHeight
    timer.appendChild(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create particles
    const particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      color: string
    }> = []

    const particleColor = isOvertime ? "#FF0000" : "#FFFF00"
    const particleCount = isOvertime ? 40 : 25

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.7 + 0.3,
        color: particleColor,
      })
    }

    // Animation loop
    let animationFrame: number
    const animate = () => {
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle with glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color.replace("1)", `${particle.opacity})`)
        ctx.shadowBlur = 5
        ctx.shadowColor = particle.color
        ctx.fill()
        ctx.shadowBlur = 0
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame)
      if (timer.contains(canvas)) {
        timer.removeChild(canvas)
      }
    }
  }, [isWarning, isOvertime])

  return (
    <div
      ref={timerRef}
      className={`flex flex-col items-center font-mono relative ${className} transition-all duration-300`}
    >
      <div
        className={`text-base font-bold relative z-10 transition-all duration-300
        ${
          isOvertime
            ? "text-[#FF0000] animate-[pulse_0.5s_ease-in-out_infinite]"
            : isWarning
              ? "text-[#FFFF00] animate-[pulse_0.8s_ease-in-out_infinite]"
              : "text-[#00FFFF]"
        }`}
        style={{
          textShadow: isOvertime
            ? "0 0 12px rgba(255, 0, 0, 0.9), 0 0 20px rgba(255, 0, 0, 0.6)"
            : isWarning
              ? "0 0 10px rgba(255, 255, 0, 0.9), 0 0 16px rgba(255, 255, 0, 0.6)"
              : "0 0 8px rgba(0, 255, 255, 0.7)",
        }}
      >
        {formatTime(remainingTime)}
      </div>
      <p className="text-xs text-gray-400 relative z-10">
        {!isActive ? "Time Allotted" : isOvertime ? "OVERTIME!" : "Time Remaining"}
      </p>
    </div>
  )
}
