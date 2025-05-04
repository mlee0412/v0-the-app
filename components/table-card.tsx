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

  // New state for warning animation toggle
  const [warningAnimationEnabled, setWarningAnimationEnabled] = useState(true)

  // Local table state to avoid re-renders from parent
  const [localTable, setLocalTable] = useState<Table>(table)

  // Use refs to track previous values to prevent unnecessary updates
  const prevTableRef = useRef<Table>(table)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const particleAnimationRef = useRef<number | null>(null)

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
  }, [localTable.id, throttledUpdateTable])

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

          // Update remaining time if it's changed
          if (updatedTable.remainingTime !== localTable.remainingTime) {
            setRemainingTime(updatedTable.remainingTime)
          }

          // Update elapsed time if start time changed
          if (updatedTable.startTime !== localTable.startTime) {
            setElapsedTime(updatedTable.startTime ? Date.now() - updatedTable.startTime : 0)
          }

          // Update local table state
          setLocalTable((prev) => {
            // Only update if there's a meaningful change
            if (JSON.stringify(updatedTable) !== JSON.stringify(prev)) {
              prevTableRef.current = updatedTable
              return updatedTable
            }
            return prev
          })
        })
      }
    }

    window.addEventListener("table-updated", handleTableUpdate as EventListener)

    return () => {
      window.removeEventListener("table-updated", handleTableUpdate as EventListener)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [localTable.id, localTable.remainingTime, localTable.startTime])

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
  }, [])

  // Calculate remaining time - memoized
  const calculateRemainingTime = useCallback(() => {
    if (!localTable.isActive) return localTable.initialTime
    if (!localTable.startTime) return localTable.remainingTime

    const elapsed = Date.now() - localTable.startTime
    // Remove Math.max to allow negative values for overtime
    return localTable.initialTime - elapsed
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, localTable.remainingTime])

  // Format remaining time as MM:SS - memoized
  const formatRemainingTime = useMemo(() => {
    return (ms: number) => {
      const totalSeconds = Math.floor(Math.abs(ms) / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  }, [])

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

  // Format time for display in table card - memoized
  const formatTime = useMemo(() => {
    return (ms: number) => {
      // For inactive tables, always show exactly 60:00 regardless of stored time
      if (!localTable.isActive) {
        return "60:00"
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
  }, [localTable.isActive, calculateRemainingTime])

  // State for time tracking
  const [elapsedTime, setElapsedTime] = useState(calculateElapsedTime())
  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime())
  const [displayedRemainingTime, setDisplayedRemainingTime] = useState(calculateRemainingTime())

  // Handle mouse down for long press detection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!localTable.isActive) return

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
    },
    [localTable.isActive],
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Clear timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    // If not a long press, trigger normal click
    if (!isLongPressRef.current && !showSessionLog) {
      onClick()
    }
  }, [onClick, showSessionLog])

  // Improved touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!localTable.isActive) return

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
    },
    [localTable.isActive],
  )

  // Handle touch move to detect scrolling
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!localTable.isActive) return

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
    },
    [localTable.isActive],
  )

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [onClick, showSessionLog],
  )

  // Handle mouse move for 3D effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
  }, [])

  // Handle mouse enter/leave for 3D effect
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }, [])

  // Listen for global time tick instead of using our own interval
  useEffect(() => {
    const handleGlobalTimeTick = (event: CustomEvent) => {
      if (!localTable.isActive || !localTable.startTime) return

      const now = event.detail.timestamp
      const newElapsedTime = localTable.startTime ? now - localTable.startTime : 0
      const newRemainingTime = localTable.initialTime - newElapsedTime

      // Use requestAnimationFrame to ensure updates happen outside render cycle
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setElapsedTime(newElapsedTime)
        setRemainingTime(newRemainingTime)
        setDisplayedRemainingTime(newRemainingTime)
      })
    }

    window.addEventListener("global-time-tick", handleGlobalTimeTick as EventListener)

    // Initial calculation
    if (localTable.isActive && localTable.startTime) {
      const now = Date.now()
      setElapsedTime(now - localTable.startTime)
      setRemainingTime(localTable.initialTime - (now - localTable.startTime))
    }

    return () => {
      window.removeEventListener("global-time-tick", handleGlobalTimeTick as EventListener)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [localTable.isActive, localTable.startTime, localTable.initialTime])

  // Particle animation effect with optimizations
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

    // Use a more efficient resize observer instead of window resize event
    const resizeObserver = new ResizeObserver(updateCanvasSize)
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current)
    }

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
    const { isOvertime, isWarningYellow, isWarningOrange, orangeIntensity } = tableStatus
    let particleColor = "#00FFFF"

    if (localTable.isActive) {
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
    if (localTable.groupId) {
      particleColor = getGroupColor()
    }

    // Create initial particles - reduce count for better performance
    const particleCount = localTable.isActive ? 30 : 15
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

    // Animation loop with performance optimizations
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

      particleAnimationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
    }
  }, [localTable.isActive, localTable.groupId, tableStatus, getGroupColor])

  // Enhanced group indicator animation
  useEffect(() => {
    if (!localTable.groupId || !groupIndicatorRef.current) return

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
  }, [localTable.groupId, getGroupColor])

  const borderStyles = getBorderStyles()
  const backgroundStyles = getBackgroundStyles()

  // Get text color based on status for better visibility
  const getTimerTextColor = useCallback(() => {
    const { isOvertime, isWarningYellow, isWarningOrange } = tableStatus

    if (isOvertime) return "#FFFFFF"
    if (isWarningOrange) return "#FFFFFF"
    if (isWarningYellow) return "#FFFFFF"
    if (localTable.isActive) return "#FFFFFF"
    return "#00FFFF"
  }, [tableStatus, localTable.isActive])

  // Get text shadow based on status for better visibility
  const getTimerTextShadow = useCallback(() => {
    const { isOvertime, isWarningYellow, isWarningOrange } = tableStatus

    if (isOvertime) {
      return "0 0 10px rgba(255, 0, 0, 1), 0 0 20px rgba(255, 0, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (isWarningOrange) {
      return "0 0 10px rgba(255, 165, 0, 1), 0 0 20px rgba(255, 165, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (isWarningYellow) {
      return "0 0 10px rgba(255, 255, 0, 1), 0 0 20px rgba(255, 255, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    if (localTable.isActive) {
      return "0 0 10px rgba(0, 255, 0, 1), 0 0 20px rgba(0, 255, 0, 0.8), 0 0 5px rgba(255, 255, 255, 0.8)"
    }
    return "0 0 10px rgba(0, 255, 255, 1), 0 0 20px rgba(0, 255, 255, 0.8)"
  }, [tableStatus, localTable.isActive])

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
