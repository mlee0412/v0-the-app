"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { UserIcon, MessageSquareIcon, ClockIcon, ServerIcon, TimerIcon } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { PopupSessionLog } from "@/components/popup-session-log"
import type { Table } from "@/components/billiards-timer-dashboard"
import type { LogEntry } from "@/components/billiards-timer-dashboard"

// Define the Server type
interface Server {
  id: string
  name: string
}

interface TableCardProps {
  table: Table
  servers: Server[]
  logs: LogEntry[]
  onClick: () => void
}

export function TableCard({ table, servers, logs, onClick }: TableCardProps) {
  // State for popup session log
  const [showSessionLog, setShowSessionLog] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLCanvasElement>(null)
  const groupIndicatorRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  // Track touch start position to detect scrolling
  const touchStartRef = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  // New state for warning animation toggle
  const [warningAnimationEnabled, setWarningAnimationEnabled] = useState(true)

  // Format start time
  const formatStartTime = (timestamp: number | null) => {
    if (!timestamp) return "Not started"

    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Calculate elapsed time
  const calculateElapsedTime = () => {
    if (!table.isActive || !table.startTime) return 0
    return Date.now() - table.startTime
  }

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }
  }

  // Calculate remaining time
  const calculateRemainingTime = () => {
    if (!table.isActive) return table.initialTime
    if (!table.startTime) return table.remainingTime

    const elapsed = Date.now() - table.startTime
    return table.initialTime - elapsed
  }

  // Format remaining time as MM:SS
  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Determine if table is in overtime
  const isOvertime = table.isActive && calculateRemainingTime() < 0

  // Determine if table is in warning state with new thresholds
  const isWarningYellow =
    table.isActive && calculateRemainingTime() <= 15 * 60 * 1000 && calculateRemainingTime() > 10 * 60 * 1000
  const isWarningOrange = table.isActive && calculateRemainingTime() <= 10 * 60 * 1000 && calculateRemainingTime() >= 0

  // Calculate intensity for orange warning (0-1 scale, 1 being most intense)
  const orangeIntensity = isWarningOrange ? 1 - calculateRemainingTime() / (10 * 60 * 1000) : 0

  // Get group color for indicators - using predefined colors for distinct groups
  const getGroupColor = () => {
    if (!table.groupId) return ""

    // Extract group number if it follows the pattern "Group X"
    const groupMatch = table.groupId.match(/Group (\d+)/)
    if (groupMatch) {
      const groupNumber = Number.parseInt(groupMatch[1], 10)

      // Predefined distinct colors for different groups
      const groupColors = [
        "#FF0000", // Red
        "#00FF00", // Green
        "#0000FF", // Blue
        "#FFFF00", // Yellow
        "#FF00FF", // Magenta
        "#00FFFF", // Cyan
        "#FFA500", // Orange
        "#800080", // Purple
        "#008000", // Dark Green
        "#FFC0CB", // Pink
      ]

      // Use modulo to cycle through colors if there are more groups than colors
      return groupColors[(groupNumber - 1) % groupColors.length]
    }

    // Fallback to hash-based color if group name doesn't match pattern
    const groupHash = table.groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = groupHash % 360
    return `hsl(${hue}, 100%, 50%)`
  }

  // Get border color and animation based on group status
  const getBorderStyles = () => {
    if (table.groupId) {
      const color = getGroupColor()
      return {
        borderColor: color,
        boxShadow: `0 0 25px ${color}, inset 0 0 15px ${color}`,
        animation: "borderPulse 2s infinite alternate",
        borderWidth: "4px",
        borderStyle: "double", // Double border for grouped tables
      }
    }

    if (isOvertime) {
      return {
        borderColor: "#FF0000",
        boxShadow: "0 0 30px #FF0000, inset 0 0 20px rgba(255, 0, 0, 0.8)",
        animation: "borderPulse 0.8s infinite alternate",
        borderWidth: "4px",
        borderStyle: "solid",
      }
    }

    if (isWarningOrange) {
      // Interpolate between yellow and red based on intensity
      const r = Math.floor(255)
      const g = Math.floor(165 - orangeIntensity * 165)
      const b = Math.floor(0)
      const color = `rgb(${r}, ${g}, ${b})`

      return {
        borderColor: color,
        boxShadow: `0 0 25px ${color}, inset 0 0 15px ${color}`,
        animation: warningAnimationEnabled ? "borderPulse 1.2s infinite alternate" : "none",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    if (isWarningYellow) {
      return {
        borderColor: "#FFFF00",
        boxShadow: "0 0 25px #FFFF00, inset 0 0 15px rgba(255, 255, 0, 0.8)",
        animation: warningAnimationEnabled ? "borderPulse 1.5s infinite alternate" : "none",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    if (table.isActive) {
      return {
        borderColor: "#00FF00",
        boxShadow: "0 0 20px #00FF00, inset 0 0 10px rgba(0, 255, 0, 0.8)",
        animation: "none",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    return {
      borderColor: "#00FFFF",
      boxShadow: "0 0 20px #00FFFF, inset 0 0 10px rgba(0, 255, 255, 0.7)",
      animation: "none",
      borderWidth: "3px",
      borderStyle: "solid",
    }
  }

  // Get background styles based on table status
  const getBackgroundStyles = () => {
    if (!table.isActive) {
      return {
        background: "linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 10, 30, 0.98))",
        animation: "none",
        backdropFilter: "blur(10px)",
      }
    }

    if (isOvertime) {
      return {
        background: "linear-gradient(135deg, rgba(100, 0, 0, 0.95), rgba(60, 0, 0, 0.98))",
        animation: "pulseRed 1s infinite alternate",
        backdropFilter: "blur(10px)",
      }
    }

    if (isWarningOrange) {
      // Interpolate between yellow and red based on intensity
      const r = Math.floor(80 + orangeIntensity * 20)
      const g = Math.floor(40 + (1 - orangeIntensity) * 40)
      const b = Math.floor(0)

      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.95), rgba(${r - 20}, ${g - 10}, ${b}, 0.98))`,
        animation: warningAnimationEnabled ? "pulseOrange 1.2s infinite alternate" : "none",
        backdropFilter: "blur(10px)",
      }
    }

    if (isWarningYellow) {
      return {
        background: "linear-gradient(135deg, rgba(80, 80, 0, 0.95), rgba(50, 50, 0, 0.98))",
        animation: warningAnimationEnabled ? "pulseYellow 1.5s infinite alternate" : "none",
        backdropFilter: "blur(10px)",
      }
    }

    return {
      background: "linear-gradient(135deg, rgba(0, 60, 30, 0.95), rgba(0, 40, 20, 0.98))",
      animation: "pulseGreen 3s infinite alternate",
      backdropFilter: "blur(10px)",
    }
  }

  // Format time for display in table card
  const formatTime = (ms: number) => {
    // For inactive tables, show the initial time in minutes
    if (!table.isActive) {
      const initialMinutes = Math.floor(ms / 60000)
      return `${initialMinutes}:00`
    }

    // For active tables, show remaining time
    const remainingTime = calculateRemainingTime()
    const minutes = Math.floor(Math.abs(remainingTime) / 60000)
    const seconds = Math.floor((Math.abs(remainingTime) % 60000) / 1000)
    const sign = remainingTime < 0 ? "-" : ""
    return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Handle mouse down for long press detection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!table.isActive) return

    // Set position for popup
    setPopupPosition({ x: e.clientX, y: e.clientY })

    // Clear any existing timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    isLongPressRef.current = false

    // Set timeout for long press detection (500ms)
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setShowSessionLog(true)
    }, 500)
  }

  // Handle mouse up
  const handleMouseUp = () => {
    // Clear timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    // If not a long press, trigger normal click
    if (!isLongPressRef.current && !showSessionLog) {
      onClick()
    }
  }

  // Improved touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!table.isActive) return

    const touch = e.touches[0]

    // Record the starting position
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    hasMoved.current = false

    setPopupPosition({ x: touch.clientX, y: touch.clientY })

    // Clear any existing timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    isLongPressRef.current = false

    // Set timeout for long press detection (500ms)
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setShowSessionLog(true)
    }, 500)
  }

  // Handle touch move to detect scrolling
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!table.isActive) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    // If moved more than 10px in any direction, consider it a scroll
    if (deltaX > 10 || deltaY > 10) {
      hasMoved.current = true

      // Clear long press timeout if we're scrolling
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = null
      }
    }
  }

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    // Only trigger click if:
    // 1. It wasn't a long press
    // 2. We're not showing the session log
    // 3. The user didn't move (scroll) significantly
    if (!isLongPressRef.current && !showSessionLog && !hasMoved.current) {
      // Prevent default to avoid any double-tap zoom issues
      e.preventDefault()
      onClick()
    }
  }

  // Handle mouse move for 3D effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Calculate rotation (limited to +/- 5 degrees)
    const rotateY = (mouseX / (rect.width / 2)) * 5
    const rotateX = -(mouseY / (rect.height / 2)) * 5

    setRotation({ x: rotateX, y: rotateY })
  }

  // Handle mouse enter/leave for 3D effect
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  // FIXED: Toggle warning animation with completely isolated event handling
  const toggleWarningAnimation = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the table dialog
    e.preventDefault() // Additional prevention

    // Create a completely isolated event handler that won't bubble
    const event = e.nativeEvent
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation()
    }

    setWarningAnimationEnabled(!warningAnimationEnabled)
  }

  // Particle animation effect
  useEffect(() => {
    const canvas = particlesRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const updateCanvasSize = () => {
      if (!cardRef.current || !canvas) return
      const rect = cardRef.current.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Create particles
    const particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number
    }> = []

    // Determine particle color based on table status
    let particleColor = "#00FFFF"
    if (table.isActive) {
      if (isOvertime) {
        particleColor = "#FF0000"
      } else if (isWarningOrange) {
        // Interpolate between yellow and red based on intensity
        const r = Math.floor(255)
        const g = Math.floor(165 - orangeIntensity * 165)
        const b = Math.floor(0)
        particleColor = `rgb(${r}, ${g}, ${b})`
      } else if (isWarningYellow) {
        particleColor = "#FFFF00"
      } else {
        particleColor = "#00FF00"
      }
    }

    // If table is in a group, use group color for some particles
    if (table.groupId) {
      particleColor = getGroupColor()
    }

    // Create initial particles
    const particleCount = table.isActive ? 50 : 30
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: particleColor,
        opacity: Math.random() * 0.7 + 0.4,
      })
    }

    // Animation loop
    let animationFrame: number
    const animate = () => {
      if (!ctx || !canvas) return

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
        ctx.shadowBlur = 10
        ctx.shadowColor = particle.color
        ctx.fill()
        ctx.shadowBlur = 0
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", updateCanvasSize)
      cancelAnimationFrame(animationFrame)
    }
  }, [table.isActive, isWarningYellow, isWarningOrange, isOvertime, table.groupId, orangeIntensity])

  // Enhanced group indicator animation
  useEffect(() => {
    if (!table.groupId || !groupIndicatorRef.current) return

    const groupColor = getGroupColor()
    const indicator = groupIndicatorRef.current

    // Create animated border effect
    const animateBorder = () => {
      let phase = 0
      let direction = 1

      const animate = () => {
        phase += 0.05 * direction

        if (phase > 1) {
          phase = 1
          direction = -1
        } else if (phase < 0) {
          phase = 0
          direction = 1
        }

        const intensity = 0.5 + phase * 0.5
        indicator.style.boxShadow = `0 0 ${10 + phase * 20}px ${groupColor}, inset 0 0 ${5 + phase * 15}px ${groupColor}`
        indicator.style.opacity = (0.7 + phase * 0.3).toString()

        requestAnimationFrame(animate)
      }

      animate()
    }

    animateBorder()
  }, [table.groupId])

  // Add effect to update elapsed time
  const [elapsedTime, setElapsedTime] = useState(calculateElapsedTime())
  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime())

  useEffect(() => {
    if (!table.isActive) return

    const timer = setInterval(() => {
      setElapsedTime(calculateElapsedTime())
      setRemainingTime(calculateRemainingTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [table.isActive, table.startTime])

  // Add an event listener to handle table updates
  useEffect(() => {
    const handleTableUpdate = (event: CustomEvent) => {
      // Check if event.detail exists and has the expected structure
      if (event.detail && event.detail.tableId === table.id && event.detail.table) {
        // Use the table from the event detail instead of 'updatedTable'
        const updatedTable = event.detail.table
        setRemainingTime(updatedTable.remainingTime)
      }
    }

    // Add event listener
    window.addEventListener("table-updated", handleTableUpdate as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("table-updated", handleTableUpdate as EventListener)
    }
  }, [table.id])

  const borderStyles = getBorderStyles()
  const backgroundStyles = getBackgroundStyles()

  // Get text color based on status for better visibility
  const getTimerTextColor = () => {
    if (isOvertime) return "#FFFFFF"
    if (isWarningOrange) return "#FFFFFF"
    if (isWarningYellow) return "#FFFFFF"
    if (table.isActive) return "#FFFFFF"
    return "#00FFFF"
  }

  // Get text shadow based on status for better visibility
  const getTimerTextShadow = () => {
    if (isOvertime) {
      return "0 0 10px rgba(255, 0, 0, 1), 0 0 20px rgba(255, 0, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (isWarningOrange) {
      return "0 0 10px rgba(255, 165, 0, 1), 0 0 20px rgba(255, 165, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (isWarningYellow) {
      return "0 0 10px rgba(255, 255, 0, 1), 0 0 20px rgba(255, 255, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (table.isActive) {
      return "0 0 10px rgba(0, 255, 0, 1), 0 0 20px rgba(0, 255, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    return "0 0 10px rgba(0, 255, 255, 1), 0 0 20px rgba(0, 255, 255, 0.8)"
  }

  return (
    <>
      <div
        ref={cardRef}
        className="rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02] h-[130px] relative table-card"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            : "perspective(1000px) rotateX(0) rotateY(0)",
          transformStyle: "preserve-3d",
          transition: isHovered ? "none" : "transform 0.5s ease-out",
          // Add stronger shadow to make card pop out
          boxShadow: "0 15px 40px rgba(0, 0, 0, 0.9)",
        }}
      >
        {/* Semi-transparent backdrop to make card stand out from background */}
        <div
          className="absolute inset-0 rounded-lg z-0"
          style={{
            background: "rgba(0, 0, 30, 0.8)",
            backdropFilter: "blur(15px)",
          }}
        />

        {/* Group indicator with enhanced visuals */}
        {table.groupId && (
          <>
            {/* Corner triangle indicator */}
            <div
              className="absolute top-0 right-0 w-0 h-0 z-20"
              style={{
                borderTop: `35px solid ${getGroupColor()}`,
                borderLeft: "35px solid transparent",
                filter: `drop-shadow(0 0 10px ${getGroupColor()})`,
                transform: "translateZ(10px)",
              }}
            />

            {/* Group label */}
            <div
              className="absolute top-1 right-6 z-20 px-1.5 py-0.5 rounded-sm text-[8px] font-bold"
              style={{
                backgroundColor: `${getGroupColor()}40`,
                color: getGroupColor(),
                textShadow: `0 0 8px ${getGroupColor()}`,
                transform: "translateZ(10px)",
                animation: "pulse 1.5s infinite alternate",
              }}
            >
              {table.groupId}
            </div>

            {/* Animated group border */}
            <div
              ref={groupIndicatorRef}
              className="absolute inset-0 rounded-lg pointer-events-none z-10"
              style={{
                border: `4px solid ${getGroupColor()}`,
                boxShadow: `0 0 25px ${getGroupColor()}, inset 0 0 15px ${getGroupColor()}`,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* Border container with glow effect */}
        <div
          className="absolute inset-0 rounded-lg z-10"
          style={{
            border: `${borderStyles.borderWidth} ${borderStyles.borderStyle} ${borderStyles.borderColor}`,
            boxShadow: borderStyles.boxShadow,
            animation: borderStyles.animation,
            transform: "translateZ(5px)",
          }}
        />

        <div
          className="p-2 h-full flex flex-col relative overflow-hidden rounded-lg z-10"
          style={{
            background: backgroundStyles.background,
            animation: backgroundStyles.animation,
            margin: "2px", // Create space between content and border
            transform: "translateZ(2px)",
          }}
        >
          {/* Particle canvas for background animation */}
          <canvas ref={particlesRef} className="absolute inset-0 pointer-events-none z-0" />

          {/* Holographic overlay effect */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0))",
              opacity: 0.6,
              transform: "translateZ(3px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header with table name and status */}
            <div className="flex justify-between items-center mb-1">
              <span
                className="text-base font-bold"
                style={{
                  color: "#FFFFFF",
                  textShadow: "0 0 10px rgba(0, 255, 255, 1), 0 0 5px rgba(0, 255, 255, 0.8)",
                }}
              >
                {table.name}
              </span>

              <div
                className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                  table.isActive ? (isOvertime ? "bg-[#FF0000]/40" : "bg-[#00FF00]/40") : "bg-gray-700"
                }`}
              >
                {table.isActive ? (
                  isOvertime ? (
                    <NeonGlow color="red" pulse intensity="high">
                      <span>OVERTIME</span>
                    </NeonGlow>
                  ) : (
                    <NeonGlow color="green">
                      <span>Active</span>
                    </NeonGlow>
                  )
                ) : (
                  <span className="text-gray-300">Inactive</span>
                )}
              </div>
            </div>

            {/* Timer display - centered and prominent with enhanced visibility */}
            <div className="flex justify-center items-center mb-1">
              <div
                className="text-xl font-bold py-1 px-3 rounded-md"
                style={{
                  color: getTimerTextColor(),
                  textShadow: getTimerTextShadow(),
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  border: isOvertime
                    ? "1px solid rgba(255, 0, 0, 0.5)"
                    : isWarningOrange
                      ? "1px solid rgba(255, 165, 0, 0.5)"
                      : isWarningYellow
                        ? "1px solid rgba(255, 255, 0, 0.5)"
                        : table.isActive
                          ? "1px solid rgba(0, 255, 0, 0.5)"
                          : "1px solid rgba(0, 255, 255, 0.5)",
                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                }}
              >
                {formatRemainingTime(remainingTime)}
              </div>
            </div>

            {/* Info section - redesigned to match the reference image */}
            <div className="flex flex-col gap-1 mt-auto">
              {/* Guest count and server info in one row */}
              <div className="flex justify-between items-center">
                {/* Guest count */}
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4 text-[#FF00FF]" />
                  <span
                    className="font-bold text-sm"
                    style={{
                      color: "#FFFFFF",
                      textShadow: "0 0 8px rgba(255, 0, 255, 1)",
                    }}
                  >
                    {table.isActive ? table.guestCount : "0"}
                  </span>
                </div>

                {/* Server information */}
                {table.isActive && table.server && (
                  <div className="flex items-center gap-1">
                    <ServerIcon className="h-4 w-4 text-[#00FF00]" />
                    <span
                      className="font-bold text-sm"
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 8px rgba(0, 255, 0, 1)",
                      }}
                    >
                      {servers.find((s) => s.id === table.server)?.name || "Unknown"}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes information - always visible when present, positioned before time info */}
              {table.isActive && table.hasNotes && (
                <div className="flex items-center gap-1 w-full">
                  <MessageSquareIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#FFFF00]" />
                  <span
                    className="truncate text-xs w-full"
                    style={{
                      color: "#FFFFFF",
                      textShadow: "0 0 5px rgba(255, 255, 0, 1)",
                    }}
                  >
                    {table.noteText}
                  </span>
                </div>
              )}

              {/* Start time and elapsed time in one row */}
              {table.isActive && (
                <div className="flex justify-between items-center">
                  {/* Start time */}
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5 text-[#00FFFF]" />
                    <span
                      className="text-xs"
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px rgba(0, 255, 255, 1)",
                      }}
                    >
                      {formatStartTime(table.startTime)}
                    </span>
                  </div>

                  {/* Elapsed time */}
                  <div className="flex items-center gap-1">
                    <TimerIcon className="h-3.5 w-3.5 text-[#00FFFF]" />
                    <span
                      className="text-xs"
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px rgba(0, 255, 255, 1)",
                      }}
                    >
                      {formatElapsedTime(elapsedTime)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Popup Session Log */}
      {showSessionLog && (
        <PopupSessionLog
          logs={logs}
          tableId={table.id}
          sessionStartTime={table.startTime}
          position={popupPosition}
          onClose={() => setShowSessionLog(false)}
        />
      )}
    </>
  )
}
