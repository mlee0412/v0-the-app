"use client"

import { useState, useEffect } from "react"
import type React from "react"

import { useRef } from "react"
import { UserIcon, MessageSquareIcon, ClockIcon, ServerIcon, TimerIcon } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { PopupSessionLog } from "@/components/popup-session-log"
import type { LogEntry } from "@/components/billiards-timer-dashboard"
import { formatTime } from "@/utils/time-utils"
import type { Table } from "@/types/table"

// Define the Server type
interface Server {
  id: string
  name: string
  enabled?: boolean
}

interface TableCardProps {
  table: Table
  onClick?: () => void
  className?: string
  servers: Server[]
  logs: LogEntry[]
}

export function ThreeDTableCard({ table, onClick, className = "", servers, logs }: TableCardProps) {
  // State for popup session log
  const [showSessionLog, setShowSessionLog] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const [currentTime, setCurrentTime] = useState<string>("")
  const [elapsedTime, setElapsedTime] = useState<string>("")

  // State for 3D effect
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

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

  // Determine if table is in overtime
  const isOvertime = table.isActive && table.remainingTime < 0

  // Determine if table is in warning state with new thresholds
  const isWarningYellow =
    table.isActive && table.remainingTime <= 15 * 60 * 1000 && table.remainingTime > 10 * 60 * 1000
  const isWarningOrange = table.isActive && table.remainingTime <= 10 * 60 * 1000 && table.remainingTime >= 0

  // Calculate intensity for orange warning (0-1 scale, 1 being most intense)
  const orangeIntensity = isWarningOrange ? 1 - table.remainingTime / (10 * 60 * 1000) : 0

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
        boxShadow: `0 0 15px ${color}, inset 0 0 8px ${color}`,
        animation: "borderPulse 2s infinite alternate",
        borderWidth: "4px",
        borderStyle: "double", // Double border for grouped tables
      }
    }

    if (isOvertime) {
      return {
        borderColor: "#FF0000",
        boxShadow: "0 0 20px #FF0000, inset 0 0 10px rgba(255, 0, 0, 0.8)",
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
        boxShadow: `0 0 15px ${color}, inset 0 0 8px ${color}`,
        animation: "borderPulse 1.2s infinite alternate",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    if (isWarningYellow) {
      return {
        borderColor: "#FFFF00",
        boxShadow: "0 0 15px #FFFF00, inset 0 0 8px rgba(255, 255, 0, 0.5)",
        animation: "borderPulse 1.5s infinite alternate",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    if (table.isActive) {
      return {
        borderColor: "#00FF00",
        boxShadow: "0 0 12px #00FF00, inset 0 0 6px rgba(0, 255, 0, 0.5)",
        animation: "none",
        borderWidth: "3px",
        borderStyle: "solid",
      }
    }

    return {
      borderColor: "#00FFFF",
      boxShadow: "0 0 10px #00FFFF",
      animation: "none",
      borderWidth: "3px",
      borderStyle: "solid",
    }
  }

  // Get background styles based on table status
  const getBackgroundStyles = () => {
    if (!table.isActive) {
      return {
        background: "linear-gradient(135deg, rgba(0, 20, 40, 0.8), rgba(0, 10, 30, 0.9))",
        animation: "none",
      }
    }

    if (isOvertime) {
      return {
        background: "linear-gradient(135deg, rgba(80, 0, 0, 0.8), rgba(50, 0, 0, 0.9))",
        animation: "pulseRed 1s infinite alternate",
      }
    }

    if (isWarningOrange) {
      // Interpolate between yellow and red based on intensity
      const r = Math.floor(80 + orangeIntensity * 20)
      const g = Math.floor(40 + (1 - orangeIntensity) * 40)
      const b = Math.floor(0)

      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.8), rgba(${r - 20}, ${g - 10}, ${b}, 0.9))`,
        animation: "pulseOrange 1.2s infinite alternate",
      }
    }

    if (isWarningYellow) {
      return {
        background: "linear-gradient(135deg, rgba(60, 60, 0, 0.8), rgba(40, 40, 0, 0.9))",
        animation: "pulseYellow 1.5s infinite alternate",
      }
    }

    return {
      background: "linear-gradient(135deg, rgba(0, 40, 20, 0.8), rgba(0, 30, 15, 0.9))",
      animation: "pulseGreen 3s infinite alternate",
    }
  }

  // Format time as MM:SS (minutes:seconds)

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
      onClick && onClick()
    }
  }

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!table.isActive) return

    const touch = e.touches[0]
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

  // Handle touch end
  const handleTouchEnd = () => {
    // Clear timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    // If not a long press, trigger normal click
    if (!isLongPressRef.current && !showSessionLog) {
      onClick && onClick()
    }
  }

  // Handle mouse move for 3D effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate rotation based on mouse position relative to center
    const rotateY = ((e.clientX - centerX) / rect.width) * 10
    const rotateX = ((centerY - e.clientY) / rect.height) * 10

    setRotation({ x: rotateX, y: rotateY, z: 0 })
  }

  // Handle mouse enter/leave for 3D effect
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0, z: 0 })

    // Also clear any long press
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    // Hide session log
    setShowSessionLog(false)
  }

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

  // Add effect to update elapsed time
  const [elapsedTimeState, setElapsedTimeState] = useState(calculateElapsedTime())

  useEffect(() => {
    if (!table.isActive) return

    const timer = setInterval(() => {
      setElapsedTimeState(calculateElapsedTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [table.isActive, table.startTime])

  useEffect(() => {
    // Update current time
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours() % 12 || 12
      const minutes = now.getMinutes().toString().padStart(2, "0")
      const ampm = now.getHours() >= 12 ? "PM" : "AM"
      setCurrentTime(`${hours}:${minutes} ${ampm}`)

      // Calculate elapsed time if table is active
      if (table.isActive && table.startTime) {
        const elapsed = Math.floor((now.getTime() - new Date(table.startTime).getTime()) / 60000)
        const hours = Math.floor(elapsed / 60)
        const minutes = elapsed % 60
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, "0")}`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [table.isActive, table.startTime])

  const borderColor = table.isActive ? "border-green-500" : "border-cyan-500"
  const glowColor = table.isActive ? "shadow-green-500/50" : "shadow-cyan-500/50"

  return (
    <>
      <div
        ref={cardRef}
        className={`relative cursor-pointer rounded-lg border-2 bg-black/80 p-4 shadow-lg transition-all hover:scale-105 ${className} rounded-lg overflow-hidden transition-all duration-200 cursor-crosshair hover:scale-[1.02] h-[130px] relative`}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
            : "perspective(1000px) rotateX(0) rotateY(0) rotateZ(0)",
          transformStyle: "preserve-3d",
          transition: isHovered ? "none" : "transform 0.5s ease-out",
        }}
      >
        {/* Group indicator triangle in corner */}
        {table.groupId && (
          <div
            className="absolute top-0 right-0 w-0 h-0 z-20"
            style={{
              borderTop: `24px solid ${getGroupColor()}`,
              borderLeft: "24px solid transparent",
              filter: "drop-shadow(0 0 5px ${getGroupColor()})",
              transform: "translateZ(10px)",
            }}
          />
        )}

        {/* Border container with glow effect */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            border: `${borderStyles.borderWidth} ${borderStyles.borderStyle} ${borderStyles.borderColor}`,
            boxShadow: borderStyles.boxShadow,
            animation: borderStyles.animation,
            transform: "translateZ(5px)",
          }}
        />

        <div
          className="p-2 h-full flex flex-col relative overflow-hidden rounded-lg"
          style={{
            background: backgroundStyles.background,
            animation: backgroundStyles.animation,
            margin: "2px", // Create space between content and border
            transform: "translateZ(2px)",
          }}
        >
          {/* Holographic overlay effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
              opacity: 0.4,
              transform: "translateZ(3px)",
            }}
          />

          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-[1px] bg-cyan-400"
                style={{
                  top: `${i * 20 + ((Date.now() / 50) % 20)}%`,
                  transform: "translateZ(4px)",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full" style={{ transform: "translateZ(10px)" }}>
            {/* Header with table name and status */}
            <div className="flex justify-between items-center">
              {/* Enhanced table name with better visibility */}
              <div
                className="bg-black/50 px-2 py-0.5 rounded-md"
                style={{
                  border: "1px solid rgba(0, 255, 255, 0.3)",
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                }}
              >
                <span
                  className="text-base font-bold"
                  style={{
                    color: "#FFFFFF",
                    textShadow: "0 0 10px rgba(0, 255, 255, 1), 0 0 5px rgba(0, 255, 255, 0.8)",
                  }}
                >
                  {table.name}
                </span>
              </div>

              <div
                className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                  table.isActive ? (isOvertime ? "bg-[#FF0000]/30" : "bg-[#00FF00]/30") : "bg-gray-700"
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
            <div className="flex justify-center items-center my-1">
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
                {formatTime(table.remainingTime)}
              </div>
            </div>

            {/* Middle section with guest count and server info */}
            <div className="flex items-center justify-center gap-4">
              {/* Guest count - always visible with enhanced styling */}
              <div
                className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md"
                style={{
                  border: "1px solid rgba(255, 0, 255, 0.3)",
                  boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
                }}
              >
                <UserIcon className="h-4 w-4 text-[#FF00FF]" />
                <span
                  className="font-bold text-sm"
                  style={{
                    color: "#FFFFFF",
                    textShadow: "0 0 8px rgba(255, 0, 255, 1), 0 0 5px rgba(255, 0, 255, 0.8)",
                    opacity: table.isActive ? 1 : 0.6,
                  }}
                >
                  {table.isActive ? table.guestCount : "0"}
                </span>
              </div>

              {/* Server information */}
              {table.isActive && table.server && (
                <div
                  className="flex items-center gap-1 text-xs bg-black/50 px-2 py-1 rounded-md"
                  style={{
                    border: "1px solid rgba(0, 255, 0, 0.3)",
                    boxShadow: "0 0 10px rgba(0, 255, 0, 0.3)",
                  }}
                >
                  <ServerIcon className="h-4 w-4 text-[#00FF00]" />
                  <span
                    className="font-bold"
                    style={{
                      color: "#FFFFFF",
                      textShadow: "0 0 8px rgba(0, 255, 0, 1), 0 0 5px rgba(0, 255, 0, 0.8)",
                    }}
                  >
                    {servers.find((s) => s.id === table.server)?.name || "Unknown"}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom section with elapsed time and start time - FIXED to prevent cutoff */}
            <div className="mt-auto">
              {table.isActive && (
                <div className="flex items-center justify-center gap-2 text-[10px]">
                  {/* Elapsed time */}
                  <div
                    className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-md"
                    style={{
                      border: "1px solid rgba(0, 255, 255, 0.3)",
                      boxShadow: "0 0 8px rgba(0, 255, 255, 0.3)",
                    }}
                  >
                    <TimerIcon className="h-2.5 w-2.5 text-[#00FFFF]" />
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px rgba(0, 255, 255, 1)",
                      }}
                    >
                      {formatElapsedTime(elapsedTimeState)}
                    </span>
                  </div>

                  {/* Start time */}
                  <div
                    className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-md"
                    style={{
                      border: "1px solid rgba(0, 255, 255, 0.3)",
                      boxShadow: "0 0 8px rgba(0, 255, 255, 0.3)",
                    }}
                  >
                    <ClockIcon className="h-2.5 w-2.5 text-[#00FFFF]" />
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px rgba(0, 255, 255, 1)",
                      }}
                    >
                      {formatStartTime(table.startTime)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes information - placed at the bottom */}
              {table.isActive && table.hasNotes && (
                <div
                  className="flex items-center gap-1 mt-1 bg-black/50 px-2 py-0.5 rounded-md mx-auto text-[10px]"
                  style={{
                    border: "1px solid rgba(255, 255, 0, 0.3)",
                    boxShadow: "0 0 8px rgba(255, 255, 0, 0.3)",
                  }}
                >
                  <MessageSquareIcon className="h-2.5 w-2.5 text-[#FFFF00]" />
                  <span
                    className="truncate max-w-[100px]"
                    style={{
                      color: "#FFFFFF",
                      textShadow: "0 0 5px rgba(255, 255, 0, 1)",
                    }}
                  >
                    {table.noteText}
                  </span>
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
