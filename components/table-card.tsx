"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
import { UserIcon, MessageSquareIcon, ClockIcon, ServerIcon, TimerIcon } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { PopupSessionLog } from "@/components/popup-session-log"
import type { Table } from "@/components/billiards-timer-dashboard"
import type { LogEntry } from "@/components/billiards-timer-dashboard"
import { throttle } from "@/utils/timer-sync-utils"
import { useTableStore, addTableUpdateListener } from "@/utils/table-state-manager"

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
  onUpdateTable?: (tableId: number, updates: Partial<Table>) => void
}

// Create a memoized component for better performance
export const TableCard = memo(function TableCard({ table, servers, logs, onClick, onUpdateTable }: TableCardProps) {
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
  const touchStartTime = useRef(0)

  // New state for warning animation toggle
  const [warningAnimationEnabled, setWarningAnimationEnabled] = useState(true)

  // Local table state to avoid re-renders from parent
  const [localTable, setLocalTable] = useState<Table>(table)

  // Use refs to track previous values to prevent unnecessary updates
  const prevTableRef = useRef<Table>(table)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const particleAnimationRef = useRef<number | null>(null)

  // Calculate remaining time - memoized
  const calculateRemainingTime = useCallback(() => {
    if (!localTable.isActive) return localTable.initialTime
    if (!localTable.startTime) return localTable.remainingTime

    const elapsed = Date.now() - localTable.startTime
    // Remove Math.max to allow negative values for overtime
    return localTable.initialTime - elapsed
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, localTable.remainingTime])

  // Table status calculations - memoized
  const tableStatus = useMemo(() => {
    const isOvertime = localTable.isActive && calculateRemainingTime() < 0
    const isWarningYellow =
      localTable.isActive && calculateRemainingTime() <= 15 * 60 * 1000 && calculateRemainingTime() > 10 * 60 * 1000
    const isWarningOrange =
      localTable.isActive && calculateRemainingTime() <= 10 * 60 * 1000 && calculateRemainingTime() >= 0
    const orangeIntensity = isWarningOrange ? 1 - calculateRemainingTime() / (10 * 60 * 1000) : 0

    return { isOvertime, isWarningYellow, isWarningOrange, orangeIntensity }
  }, [localTable.isActive, calculateRemainingTime])

  // Get group color for indicators - memoized
  const getGroupColor = useCallback(() => {
    if (!localTable.groupId) return ""

    // Extract group number if it follows the pattern "Group X"
    const groupMatch = localTable.groupId.match(/Group (\d+)/)
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
    const groupHash = localTable.groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = groupHash % 360
    return `hsl(${hue}, 100%, 50%)`
  }, [localTable.groupId])

  // Get border styles and animation based on group status - memoized
  const getBorderStyles = useMemo(() => {
    return () => {
      const { isOvertime, isWarningYellow, isWarningOrange, orangeIntensity } = tableStatus

      if (localTable.groupId) {
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

      if (localTable.isActive) {
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
  }, [tableStatus, localTable.groupId, warningAnimationEnabled, getGroupColor])

  // Get background styles based on table status - memoized
  const getBackgroundStyles = useMemo(() => {
    return () => {
      const { isOvertime, isWarningYellow, isWarningOrange, orangeIntensity } = tableStatus

      if (!localTable.isActive) {
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
  }, [tableStatus, localTable.isActive, warningAnimationEnabled])

  // Throttled update function to reduce Supabase calls
  // Timer updates are real-time, other updates are periodic (1 min)
  const throttledUpdateTable = useRef(
    throttle(
      (tableId: number, updates: Partial<Table>, isTimerUpdate = false) => {
        if (onUpdateTable) {
          onUpdateTable(tableId, updates)
        }
      },
      false ? 100 : 60000,
    ), // Real-time for timer, 1 min for other updates
  ).current

  // Update local table when props change, but only if there's a meaningful change
  useEffect(() => {
    // Only update if there's a meaningful change to avoid unnecessary re-renders
    if (JSON.stringify(table) !== JSON.stringify(prevTableRef.current)) {
      setLocalTable(table)
      prevTableRef.current = table
    }
  }, [table])

  // Listen for updates from the dialog
  useEffect(() => {
    // Subscribe to table updates
    const unsubscribe = addTableUpdateListener((updatedTableId, updates) => {
      if (updatedTableId === table.id) {
        // Update local state
        setLocalTable((prev) => {
          const newTable = { ...prev, ...updates }
          // Only update if there's a meaningful change
          if (JSON.stringify(newTable) !== JSON.stringify(prev)) {
            prevTableRef.current = newTable
            return newTable
          }
          return prev
        })
      }
    })

    // Initialize the store with this table's data
    useTableStore.getState().refreshTable(table.id, table)

    return () => {
      unsubscribe()
      // Commit any pending changes when unmounting
      useTableStore.getState().commitUpdatesToSupabase(table.id)
    }
  }, [table])

  // Periodically commit changes to Supabase
  useEffect(() => {
    // Timer updates are real-time, other updates are periodic
    const timerInterval = setInterval(() => {
      // Only commit timer-related changes
      const pendingUpdates = useTableStore.getState().pendingUpdates[table.id] || {}
      if (pendingUpdates.remainingTime !== undefined || pendingUpdates.initialTime !== undefined) {
        useTableStore.getState().commitUpdatesToSupabase(table.id)
      }
    }, 1000) // Every second for timer updates

    // Less frequent updates for non-timer data
    const dataInterval = setInterval(() => {
      useTableStore.getState().commitUpdatesToSupabase(table.id)
    }, 60000) // Every minute for other updates

    return () => {
      clearInterval(timerInterval)
      clearInterval(dataInterval)
    }
  }, [table.id])

  // Listen for local table updates from dialog
  useEffect(() => {
    const handleLocalTableUpdate = (event: CustomEvent) => {
      const { tableId, field, value } = event.detail

      if (tableId === table.id) {
        // Use requestAnimationFrame to ensure updates happen outside render cycle
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          // Update local state immediately for responsive UI
          setLocalTable((prevTable) => {
            const newTable = { ...prevTable }

            if (field === "time") {
              newTable.remainingTime = value.remainingTime
              newTable.initialTime = value.initialTime

              // Schedule the event dispatch outside of this state update
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent("table-time-update", {
                    detail: {
                      tableId: tableId,
                      remainingTime: value.remainingTime,
                      initialTime: value.initialTime,
                      source: "card",
                    },
                  }),
                )
              }, 0)
            } else if (field === "guestCount") {
              newTable.guestCount = value
            } else if (field === "server") {
              newTable.server = value
            } else if (field === "notes") {
              newTable.noteId = value.noteId
              newTable.noteText = value.noteText
              newTable.hasNotes = value.hasNotes
            }

            // Only update if there's a meaningful change
            if (JSON.stringify(newTable) !== JSON.stringify(prevTable)) {
              prevTableRef.current = newTable
              return newTable
            }
            return prevTable
          })

          // Throttle the actual database update
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current)
          }

          updateTimeoutRef.current = setTimeout(() => {
            if (field === "time") {
              throttledUpdateTable(
                tableId,
                {
                  remainingTime: value.remainingTime,
                  initialTime: value.initialTime,
                },
                true,
              )
            } else if (field === "guestCount") {
              throttledUpdateTable(tableId, { guestCount: value })
            } else if (field === "server") {
              throttledUpdateTable(tableId, { server: value })
            } else if (field === "notes") {
              throttledUpdateTable(tableId, {
                noteId: value.noteId,
                noteText: value.noteText,
                hasNotes: value.hasNotes,
              })
            }
          }, 300)
        })
      }
    }

    window.addEventListener("local-table-update", handleLocalTableUpdate as EventListener)

    return () => {
      window.removeEventListener("local-table-update", handleLocalTableUpdate as EventListener)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [table.id, throttledUpdateTable])

  // Listen for table-time-update events (new unified event)
  useEffect(() => {
    const handleTableTimeUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.tableId === localTable.id) {
        // Use requestAnimationFrame to ensure updates happen outside render cycle
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          // Update local state
          setRemainingTime(event.detail.remainingTime)
          setDisplayedRemainingTime(event.detail.remainingTime)

          // Update local table state
          setLocalTable((prev) => {
            const newTable = {
              ...prev,
              remainingTime: event.detail.remainingTime,
              initialTime: event.detail.initialTime,
            }

            // Only update if there's a meaningful change
            if (JSON.stringify(newTable) !== JSON.stringify(prev)) {
              prevTableRef.current = newTable
              return newTable
            }
            return prev
          })

          // Force recalculation of table status
          const { isOvertime, isWarningYellow, isWarningOrange, orangeIntensity } = {
            isOvertime: localTable.isActive && event.detail.remainingTime < 0,
            isWarningYellow:
              localTable.isActive &&
              event.detail.remainingTime <= 15 * 60 * 1000 &&
              event.detail.remainingTime > 10 * 60 * 1000,
            isWarningOrange:
              localTable.isActive && event.detail.remainingTime <= 10 * 60 * 1000 && event.detail.remainingTime >= 0,
            orangeIntensity:
              localTable.isActive && event.detail.remainingTime <= 10 * 60 * 1000 && event.detail.remainingTime >= 0
                ? 1 - event.detail.remainingTime / (10 * 60 * 1000)
                : 0,
          }

          // Force update of border and background styles
          const borderStyles = getBorderStyles()
          const backgroundStyles = getBackgroundStyles()

          // Apply styles directly to elements if needed
          if (cardRef.current) {
            const borderElement = cardRef.current.querySelector(".border-container")
            if (borderElement) {
              Object.assign(borderElement.style, {
                borderColor: borderStyles.borderColor,
                boxShadow: borderStyles.boxShadow,
                animation: borderStyles.animation,
                borderWidth: borderStyles.borderWidth,
                borderStyle: borderStyles.borderStyle,
              })
            }

            const backgroundElement = cardRef.current.querySelector(".background-container")
            if (backgroundElement) {
              Object.assign(backgroundElement.style, {
                background: backgroundStyles.background,
                animation: backgroundStyles.animation,
              })
            }
          }

          // Dispatch event for real-time updates if this event didn't come from this component
          if (event.detail.source !== "card") {
            // Throttle the actual database update
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current)
            }

            updateTimeoutRef.current = setTimeout(() => {
              throttledUpdateTable(
                localTable.id,
                {
                  remainingTime: event.detail.remainingTime,
                  initialTime: event.detail.initialTime,
                },
                true,
              )
            }, 300)
          }
        })
      }
    }

    window.addEventListener("table-time-update", handleTableTimeUpdate as EventListener)

    return () => {
      window.removeEventListener("table-time-update", handleTableTimeUpdate as EventListener)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [localTable.id, localTable.isActive, throttledUpdateTable, getBorderStyles, getBackgroundStyles])

  // Listen for table-updated events
  useEffect(() => {
    const handleTableUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.tableId === localTable.id && event.detail.table) {
        // Use requestAnimationFrame to ensure updates happen outside render cycle
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const updatedTable = event.detail.table

          // Immediately update the local state with the new table data
          setLocalTable(updatedTable)

          // Update remaining time and elapsed time
          if (updatedTable.remainingTime !== localTable.remainingTime) {
            setRemainingTime(updatedTable.remainingTime)
            setDisplayedRemainingTime(updatedTable.remainingTime)
          }

          // Update elapsed time if start time changed
          if (updatedTable.startTime !== localTable.startTime) {
            setElapsedTime(updatedTable.startTime ? Date.now() - updatedTable.startTime : 0)
          }

          // Force a broadcast of the time update to ensure all components stay in sync
          if (updatedTable.isActive) {
            window.dispatchEvent(
              new CustomEvent("table-time-update", {
                detail: {
                  tableId: updatedTable.id,
                  remainingTime: updatedTable.remainingTime,
                  initialTime: updatedTable.initialTime,
                  source: "table-updated-event",
                },
              }),
            )
          }

          // Update previous table reference
          prevTableRef.current = updatedTable
        })
      }
    }

    window.addEventListener("table-updated", handleTableUpdate as EventListener)

    return () => {
      window.removeEventListener("table-updated", handleTableUpdate as EventListener)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [localTable.id, localTable.remainingTime, localTable.startTime, localTable.isActive])

  // Add this effect to properly handle session end events
  useEffect(() => {
    const handleSessionEnd = (event: CustomEvent) => {
      if (event.detail?.tableId === localTable.id) {
        // Reset all local state to default values
        const DEFAULT_TIME = 60 * 60 * 1000 // 60 minutes

        setLocalTable((prev) => {
          const newTable = {
            ...prev,
            isActive: false,
            startTime: null,
            remainingTime: DEFAULT_TIME,
            initialTime: DEFAULT_TIME,
            guestCount: 0,
            server: null,
            groupId: null,
            hasNotes: false,
            noteId: "",
            noteText: "",
          }

          prevTableRef.current = newTable
          return newTable
        })

        setRemainingTime(DEFAULT_TIME)
        setDisplayedRemainingTime(DEFAULT_TIME)
        setElapsedTime(0)
      }
    }

    window.addEventListener("session-ended", handleSessionEnd as EventListener)
    return () => window.removeEventListener("session-ended", handleSessionEnd as EventListener)
  }, [localTable.id])

  // Add the particle animation useEffect hook here, after tableStatus is defined
  useEffect(() => {
    if (!particlesRef.current) return

    const canvas = particlesRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      if (!canvas || !cardRef.current) return

      const rect = cardRef.current.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)
    }

    // Initialize particles
    const particles: Array<{
      x: number
      y: number
      size: number
      color: string
      speed: number
      opacity: number
      direction: { x: number; y: number }
    }> = []

    const initParticles = () => {
      particles.length = 0

      // Number of particles based on table status
      let particleCount = 15 // Default

      if (localTable.isActive) {
        if (tableStatus.isOvertime) {
          particleCount = 30 // More particles for overtime
        } else if (tableStatus.isWarningOrange || tableStatus.isWarningYellow) {
          particleCount = 25 // More particles for warning states
        } else {
          particleCount = 20 // Standard active
        }
      }

      // Create particles
      for (let i = 0; i < particleCount; i++) {
        let color

        // Color based on table status
        if (localTable.isActive) {
          if (tableStatus.isOvertime) {
            color = "#FF3300"
          } else if (tableStatus.isWarningOrange) {
            color = "#FF8800"
          } else if (tableStatus.isWarningYellow) {
            color = "#FFFF00"
          } else {
            color = "#00FF88"
          }
        } else {
          color = "#00FFFF"
        }

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          color,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.5 + 0.2,
          direction: {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5,
          },
        })
      }
    }

    // Animation function
    const animate = () => {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.direction.x
        particle.y += particle.direction.y

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color.replace("1)", `${particle.opacity})`)
        ctx.shadowBlur = 5
        ctx.shadowColor = particle.color
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Continue animation
      particleAnimationRef.current = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    initParticles()

    // Start animation
    particleAnimationRef.current = requestAnimationFrame(animate)

    // Handle resize
    window.addEventListener("resize", resizeCanvas)

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
    }
  }, [localTable.isActive, tableStatus])

  // Format start time - memoized to prevent recalculation
  const formatStartTime = useMemo(() => {
    return (timestamp: number | null) => {
      if (!timestamp) return "Not started"

      const date = new Date(timestamp)
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
  }, [])

  // Calculate elapsed time - memoized
  const calculateElapsedTime = useCallback(() => {
    if (!localTable.isActive || !localTable.startTime) return 0
    return Date.now() - localTable.startTime
  }, [localTable.isActive, localTable.startTime])

  // Format elapsed time as HH:MM:SS - memoized
  const formatElapsedTime = useMemo(() => {
    return (ms: number) => {
      // Handle invalid or zero milliseconds
      if (!ms || ms <= 0) return "00:00"

      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      } else {
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      }
    }
  }, [])

  // Format remaining time as MM:SS - memoized
  const formatRemainingTime = useMemo(() => {
    return (ms: number) => {
      const totalSeconds = Math.floor(Math.abs(ms) / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  }, [])

  // Add a more frequent timer update for active tables
  useEffect(() => {
    if (!localTable.isActive || !localTable.startTime) return

    // Update timer display every 100ms for smoother countdown
    const timerInterval = setInterval(() => {
      const newRemainingTime = calculateRemainingTime()
      setRemainingTime(newRemainingTime)
      setDisplayedRemainingTime(newRemainingTime)

      // Broadcast the update to ensure all components stay in sync
      window.dispatchEvent(
        new CustomEvent("table-time-update", {
          detail: {
            tableId: localTable.id,
            remainingTime: newRemainingTime,
            initialTime: localTable.initialTime,
            source: "timer-tick",
          },
        }),
      )
    }, 100)

    return () => clearInterval(timerInterval)
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, localTable.id, calculateRemainingTime])

  // Format time for display in table card - memoized
  const formatTime = useMemo(() => {
    return (ms: number) => {
      // For inactive tables, always show exactly 60:00 regardless of stored time
      if (!localTable.isActive) {
        // Use initialTime instead of hardcoded 60:00 to reflect user adjustments
        const initialMinutes = Math.floor(localTable.initialTime / 60000)
        const initialSeconds = Math.floor((localTable.initialTime % 60000) / 1000)
        return `${initialMinutes.toString().padStart(2, "0")}:${initialSeconds.toString().padStart(2, "0")}`
      }

      // For active tables, show remaining time
      const remainingTime = calculateRemainingTime()
      const isNegative = remainingTime < 0
      const absoluteTime = Math.abs(remainingTime)
      const minutes = Math.floor(absoluteTime / 60000)
      const seconds = Math.floor((absoluteTime % 60000) / 1000)
      const sign = isNegative ? "-" : ""
      return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  }, [localTable.isActive, localTable.initialTime, calculateRemainingTime])

  // State for time tracking
  const [elapsedTime, setElapsedTime] = useState(calculateElapsedTime())
  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime())
  const [displayedRemainingTime, setDisplayedRemainingTime] = useState(calculateRemainingTime())

  // Add a timer update interval effect to make sure elapsed time updates regularly
  useEffect(() => {
    // Only run the timer if the table is active
    if (!localTable.isActive || !localTable.startTime) return

    // Update elapsed and remaining time every second
    const timer = setInterval(() => {
      if (localTable.startTime) {
        // Calculate current elapsed time
        const currentElapsedTime = Date.now() - localTable.startTime
        setElapsedTime(currentElapsedTime)

        // Also update remaining time to keep in sync
        const newRemainingTime = calculateRemainingTime()
        setRemainingTime(newRemainingTime)
        setDisplayedRemainingTime(newRemainingTime)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [localTable.isActive, localTable.startTime, calculateRemainingTime])

  // Update initial elapsed time when component mounts or table changes
  useEffect(() => {
    if (localTable.isActive && localTable.startTime) {
      const currentElapsedTime = Date.now() - localTable.startTime
      setElapsedTime(currentElapsedTime)
    } else {
      setElapsedTime(0)
    }
  }, [localTable.isActive, localTable.startTime])

  // Use a simple click handler instead of the complicated touch handlers
  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent default behavior to avoid any browser interference
      e.preventDefault()
      e.stopPropagation()

      // On iOS, we need to make sure the click isn't swallowed
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

      if (isIOS) {
        // Call onClick directly with a slight delay
        setTimeout(() => {
          onClick()
        }, 50) // Increased delay for better touch discrimination
      } else {
        // For non-iOS, just call onClick directly with a small delay
        setTimeout(() => {
          onClick()
        }, 10)
      }
    },
    [onClick],
  )

  const borderStyles = useMemo(() => getBorderStyles(), [getBorderStyles])
  const backgroundStyles = useMemo(() => getBackgroundStyles(), [getBackgroundStyles])

  const getTimerTextColor = useCallback(() => {
    if (tableStatus.isOvertime) {
      return "#FF4500" // Red-orange for overtime
    } else if (tableStatus.isWarningOrange) {
      return "#FF8C00" // Dark orange for warning
    } else if (tableStatus.isWarningYellow) {
      return "#FFFF00" // Yellow for warning
    } else if (localTable.isActive) {
      return "#ADFF2F" // Green-yellow for active
    } else {
      return "#FFFFFF" // White for inactive
    }
  }, [tableStatus, localTable.isActive])

  const getTimerTextShadow = useCallback(() => {
    if (tableStatus.isOvertime) {
      return "0 0 15px rgba(255, 69, 0, 0.8)" // Red-orange glow
    } else if (tableStatus.isWarningOrange) {
      return "0 0 12px rgba(255, 140, 0, 0.8)" // Dark orange glow
    } else if (tableStatus.isWarningYellow) {
      return "0 0 10px rgba(255, 255, 0, 0.8)" // Yellow glow
    } else if (localTable.isActive) {
      return "0 0 8px rgba(173, 255, 47, 0.8)" // Green-yellow glow
    } else {
      return "0 0 5px rgba(255, 255, 255, 0.5)" // Soft white glow
    }
  }, [tableStatus, localTable.isActive])

  // Replace the existing click handlers with this simpler version
  return (
    <>
      <div
        ref={cardRef}
        className="rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02] h-[130px] relative table-card ios-touch-fix"
        onClick={handleClick}
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
        {localTable.groupId && (
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
              {localTable.groupId}
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
          className="absolute inset-0 rounded-lg z-10 border-container"
          style={{
            border: `${borderStyles.borderWidth} ${borderStyles.borderStyle} ${borderStyles.borderColor}`,
            boxShadow: borderStyles.boxShadow,
            animation: borderStyles.animation,
            transform: "translateZ(5px)",
          }}
        />

        <div
          className="p-2 h-full flex flex-col relative overflow-hidden rounded-lg z-10 background-container"
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
                {localTable.name}
              </span>

              <div
                className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                  localTable.isActive ? (tableStatus.isOvertime ? "bg-[#FF0000]/40" : "bg-[#00FF00]/40") : "bg-gray-700"
                }`}
              >
                {localTable.isActive ? (
                  tableStatus.isOvertime ? (
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
                  border: tableStatus.isOvertime
                    ? "1px solid rgba(255, 0, 0, 0.5)"
                    : tableStatus.isWarningOrange
                      ? "1px solid rgba(255, 165, 0, 0,0,0.5)"
                      : tableStatus.isWarningOrange
                        ? "1px solid rgba(255, 165, 0, 0.5)"
                        : tableStatus.isWarningYellow
                          ? "1px solid rgba(255, 255, 0, 0.5)"
                          : localTable.isActive
                            ? "1px solid rgba(0, 255, 0, 0.5)"
                            : "1px solid rgba(0, 255, 255, 0.5)",
                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                }}
              >
                {formatTime(displayedRemainingTime)}
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
                    {localTable.isActive ? localTable.guestCount : "0"}
                  </span>
                </div>

                {/* Server information */}
                {localTable.isActive && localTable.server && (
                  <div className="flex items-center gap-1">
                    <ServerIcon className="h-4 w-4 text-[#00FF00]" />
                    <span
                      className="font-bold text-sm"
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 8px rgba(0, 255, 0, 1)",
                      }}
                    >
                      {servers.find((s) => s.id === localTable.server)?.name || "Unknown"}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes information - always visible when present, positioned before time info */}
              {localTable.isActive && localTable.hasNotes && (
                <div className="flex items-center gap-1 w-full">
                  <MessageSquareIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#FFFF00]" />
                  <span
                    className="truncate text-xs w-full"
                    style={{
                      color: "#FFFFFF",
                      textShadow: "0 0 5px rgba(255, 255, 0, 1)",
                    }}
                  >
                    {localTable.noteText}
                  </span>
                </div>
              )}

              {/* Start time and elapsed time in one row */}
              {localTable.isActive && (
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
                      {formatStartTime(localTable.startTime)}
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
          tableId={localTable.id}
          sessionStartTime={localTable.startTime}
          position={popupPosition}
          onClose={() => setShowSessionLog(false)}
        />
      )}
    </>
  )
})
