"use client"

import { useState, useEffect, useCallback } from "react"
import { TableDialog } from "@/components/table-dialog"
import { TableLogsDialog } from "@/components/table-logs-dialog"
import { DayReportDialog } from "@/components/day-report-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { ServerSelectionDialog } from "@/components/server-selection-dialog"
import { UserManagementDialog } from "@/components/user-management-dialog"
import { LoginDialog } from "@/components/auth/login-dialog"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useAuth } from "@/contexts/auth-context"
import { PullUpInsightsPanel } from "@/components/pull-up-insights-panel"
import { SessionFeedbackDialog } from "@/components/session-feedback-dialog"
import { MobileTableList } from "@/components/mobile/mobile-table-list"
import { SpaceBackgroundAnimation } from "@/components/space-background-animation"
import { Header } from "@/components/header"
import { TableGrid } from "@/components/table-grid"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TouchLogin } from "@/components/auth/touch-login"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useTableStore } from "@/utils/table-state-manager"
import { BigBangAnimation } from "@/components/animations/big-bang-animation"
import { ExplosionAnimation } from "@/components/animations/explosion-animation"

// Define interfaces for our data structures
export interface Table {
  id: number
  name: string
  isActive: boolean
  startTime: number | null
  remainingTime: number
  initialTime: number
  guestCount: number
  server: string | null
  groupId: string | null
  hasNotes: boolean
  noteId: string
  noteText: string
  updated_by_admin?: boolean
  updated_by?: string | null
  updatedAt: string
}

// Define server interface
export interface Server {
  id: string
  name: string
  enabled: boolean
}

// Define note template interface
export interface NoteTemplate {
  id: string
  text: string
}

// Define log entry interface
export interface LogEntry {
  id: string
  tableId: number
  tableName: string
  action: string
  timestamp: number
  details?: string
}

export interface Settings {
  dayStarted: boolean
  groupCounter: number
}

export interface SystemSettings {
  defaultSessionTime: number
  warningThreshold: number
  criticalThreshold: number
  showAnimations: boolean
  darkMode: boolean
  soundEnabled: boolean
  autoEndDay: boolean
  autoEndDayTime: string
  businessHours: {
    open: string
    close: string
  }
  dayStarted: boolean
  dayStartTime: number | null
}

export function BilliardsTimerDashboard() {
  // Default time in milliseconds (60 minutes)
  const DEFAULT_TIME = 60 * 60 * 1000

  // Initialize tables
  const initialTables: Table[] = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    name: `T${i + 1}`,
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
    updated_by_admin: false,
    updated_by: null,
    updatedAt: new Date().toISOString(),
  }))

  // State for tables, servers, logs, and settings
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [servers, setServers] = useState<Server[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [settings, setSettings] = useState<SystemSettings>({
    defaultSessionTime: 60 * 60 * 1000, // 1 hour in milliseconds
    warningThreshold: 15 * 60 * 1000, // 15 minutes in milliseconds
    criticalThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
    showAnimations: true,
    darkMode: true,
    soundEnabled: true,
    autoEndDay: false,
    autoEndDayTime: "23:00",
    businessHours: {
      open: "12:00",
      close: "02:00",
    },
    dayStarted: false,
    dayStartTime: null,
  })
  const { isAuthenticated, isAdmin, isServer, currentUser, logout, hasPermission } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showUserManagementDialog, setShowUserManagementDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [showTouchLogin, setShowTouchLogin] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showExitFullScreenConfirm, setShowExitFullScreenConfirm] = useState(false)
  const [loginAttemptFailed, setLoginAttemptFailed] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackTable, setFeedbackTable] = useState<Table | null>(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [showDayReportDialog, setShowDayReportDialog] = useState(false)
  const [isStartingDay, setIsStartingDay] = useState(false)

  // New state for animations
  const [showBigBangAnimation, setShowBigBangAnimation] = useState(false)
  const [showExplosionAnimation, setShowExplosionAnimation] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(true)

  // Add this state near the other state declarations
  const [showServerSelectionDialog, setShowServerSelectionDialog] = useState(false)

  // Login state
  const [loginUsername, setLoginUsername] = useState("admin")
  const [loginPassword, setLoginPassword] = useState("")

  // Get Supabase data
  const {
    tables: supabaseTables,
    logs: supabaseLogs,
    servers: serverUsers,
    noteTemplates,
    dayStarted: supabaseDayStarted,
    groupCounter: supabaseGroupCounter,
    loading,
    error,
    updateTable,
    updateTables,
    addLogEntry: addSupabaseLogEntry,
    updateSystemSettings,
    updateServers,
    updateNoteTemplates,
    syncData,
  } = useSupabaseData()

  // Add a new state to track view-only mode
  const [viewOnlyMode, setViewOnlyMode] = useState(false)

  // Sync tables from Supabase
  useEffect(() => {
    if (supabaseTables && supabaseTables.length > 0) {
      console.log("Syncing tables from Supabase:", supabaseTables)
      setTables(supabaseTables)
    }
  }, [supabaseTables])

  // When tables are loaded from Supabase, update the store
  useEffect(() => {
    if (tables) {
      tables.forEach((table) => {
        useTableStore.getState().refreshTable(table.id, table)
      })
    }
  }, [tables])

  // Sync logs from Supabase
  useEffect(() => {
    if (supabaseLogs && supabaseLogs.length > 0) {
      setLogs(supabaseLogs)
    }
  }, [supabaseLogs])

  // Sync servers from Supabase
  useEffect(() => {
    if (serverUsers && serverUsers.length > 0) {
      // Ensure no duplicate servers by checking IDs
      const uniqueServers = serverUsers.reduce((acc, server) => {
        if (!acc.some((s) => s.id === server.id)) {
          acc.push(server)
        }
        return acc
      }, [] as Server[])

      console.log("Setting unique servers:", uniqueServers.length)
      setServers(uniqueServers)
    }
  }, [serverUsers])

  // Show notification helper
  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Track viewport height for responsive layout
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener("resize", updateViewportHeight)

    return () => window.removeEventListener("resize", updateViewportHeight)
  }, [])

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      // Broadcast the current time to all components
      window.dispatchEvent(
        new CustomEvent("global-time-tick", {
          detail: {
            timestamp: now.getTime(),
          },
        }),
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Add this after the other useEffect blocks
  // Update remaining time for active tables

  // Add an event listener to handle table updates
  useEffect(() => {
    const handleTableUpdate = (event: CustomEvent) => {
      const { table } = event.detail
      setTables((ts) => ts.map((t) => (t.id === table.id ? table : t)))
    }

    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullscreenElement ||
        (document as any).msFullscreenElement
      )

      setIsFullScreen(isCurrentlyFullScreen)

      // If exiting fullscreen without using our button, reset the state
      if (!isCurrentlyFullScreen) {
        setShowExitFullScreenConfirm(false)
      }
    }

    window.addEventListener("table-updated", handleTableUpdate as EventListener)
    document.addEventListener("fullscreenchange", handleFullScreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange)
    document.addEventListener("mozfullscreenchange", handleFullScreenChange)
    document.addEventListener("MSFullscreenChange", handleFullScreenChange)

    return () => {
      window.removeEventListener("table-updated", handleTableUpdate as EventListener)
      document.removeEventListener("fullscreenchange", handleFullScreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullScreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullScreenChange)
    }
  }, [])

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      const element = document.documentElement
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        ;(element as any).mozRequestFullScreen()
      } else if ((element as any).webkitRequestFullscreen) {
        ;(element as any).webkitRequestFullscreen()
      } else if ((element as any).msRequestFullscreen) {
        ;(element as any).msRequestFullscreen()
      }
    } else {
      setShowExitFullScreenConfirm(true)
    }
  }

  // Exit fullscreen after confirmation
  const confirmExitFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      ;(document as any).mozCancelFullScreen()
    } else if ((document as any).webkitExitFullscreen) {
      ;(document as any).webkitExitFullscreen()
    } else if ((document as any).msExitFullscreen) {
      ;(document as any).msExitFullscreen()
    }
    setShowExitFullScreenConfirm(false)
  }

  // Format time as HH:MM AM/PM
  const formatCurrentTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Format date as Month Day, Year
  const formatCurrentDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Add log entry
  const addLogEntry = async (tableId: number, action: string, details = "") => {
    const table = tables.find((t) => t.id === tableId)
    if (!table && tableId !== 0) return

    await addSupabaseLogEntry(tableId, tableId === 0 ? "System" : table?.name || "Unknown", action, details)
  }

  // Open table dialog
  const openTableDialog = (table: Table) => {
    // Check if day has been started
    if (!supabaseDayStarted) {
      showNotification("Please start the day before managing tables", "error")
      return
    }

    if (!isAuthenticated && !viewOnlyMode) {
      // Instead of showing login dialog, show notification to use Admin button
      if (loginAttemptFailed) {
        showNotification("Please log in using the Admin button", "error")
      } else {
        setLoginUsername("admin")
        setLoginPassword("")
        setShowTouchLogin(true)
      }
      return
    }

    // If in view-only mode, show a limited view of the table
    if (viewOnlyMode) {
      // We'll still show the dialog but all action buttons will be disabled
      setSelectedTable(table)
      return
    }

    // If server, check if they can interact with this table
    if (isServer) {
      // If table is already assigned to a different server, don't allow interaction
      if (table.server && table.server !== currentUser?.id) {
        showNotification("This table is assigned to another server", "error")
        return
      }
    }

    setSelectedTable(table)
  }

  // Close table dialog
  const closeTableDialog = () => {
    setSelectedTable(null)
  }

  // Start table session
  const startTableSession = async (tableId: number) => {
    if (!isAuthenticated || !hasPermission("canStartSession")) {
      showNotification("Please log in using the Admin button", "error")
      setLoginAttemptFailed(true)
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) {
      console.error(`Table with ID ${tableId} not found`)
      return
    }

    // Double-check validation
    if (table.guestCount <= 0) {
      showNotification("Please add at least one guest before starting the session", "error")
      return
    }

    if (!table.server) {
      showNotification("Please assign a server before starting the session", "error")
      return
    }

    const startTime = Date.now()

    // If table is in a group, start all tables in the group
    if (table.groupId) {
      const groupTables = tables.filter((t) => t.groupId === table.groupId)

      const updatedTables = tables.map((t) => {
        if (t.groupId === table.groupId) {
          const updatedTable = {
            ...t,
            isActive: true,
            startTime: startTime,
            remainingTime: t.initialTime, // Reset remaining time to initial time
            updatedAt: new Date().toISOString(),
          }

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: t.id,
                table: updatedTable,
              },
            }),
          )

          return updatedTable
        }
        return t
      })

      // Update local state immediately
      setTables(updatedTables)

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTables(updatedTables)
      }, 100)

      await addLogEntry(
        tableId,
        "Group Session Started",
        `Group: ${table.groupId}, Tables: ${groupTables.map((t) => t.name).join(", ")}`,
      )
      showNotification(`Started group session for ${table.groupId}`, "success")
    } else {
      // Start individual table
      const updatedTable = {
        ...table,
        isActive: true,
        startTime: startTime,
        remainingTime: table.initialTime, // Reset remaining time to initial time
        updatedAt: new Date().toISOString(),
      }

      // Update local state immediately
      setTables(tables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("table-updated", {
          detail: {
            tableId: tableId,
            table: updatedTable,
          },
        }),
      )

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTable(updatedTable)
      }, 100)

      await addLogEntry(tableId, "Session Started", `Initial time: ${formatMinutes(table.initialTime / 60000)} minutes`)
      showNotification(`Started session for ${table.name}`, "success")
    }

    closeTableDialog()
  }

  // End table session with confirmation
  const confirmEndSession = (tableId: number) => {
    if (!isAuthenticated || !hasPermission("canEndSession")) {
      showNotification("Please log in using the Admin button", "error")
      setLoginAttemptFailed(true)
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    // Set the feedback table and show the feedback dialog
    setFeedbackTable(table)
    setShowFeedbackDialog(true)
  }

  // Handle session feedback and end session
  const handleSessionFeedback = async (tableId: number, rating: "good" | "bad", comment: string) => {
    // Log the feedback
    const feedbackDetails = `Rating: ${rating}${comment ? `, Comment: ${comment}` : ""}`
    await addLogEntry(tableId, "Session Feedback", feedbackDetails)

    // End the session
    await endTableSession(tableId)

    // Reset feedback state
    setFeedbackTable(null)
    setShowFeedbackDialog(false)
  }

  // End table session
  const endTableSession = async (tableId: number) => {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const DEFAULT_TIME = 60 * 60 * 1000 // 60 minutes in milliseconds

    // If table is in a group, end all tables in the group
    if (table.groupId) {
      const groupTables = tables.filter((t) => t.groupId === table.groupId)
      const groupId = table.groupId

      await addLogEntry(
        tableId,
        "Group Session Ended",
        `Group: ${groupId}, Tables: ${groupTables.map((t) => t.name).join(", ")}`,
      )

      // First update the state to end the session but DO NOT preserve notes
      const updatedTables = tables.map((t) => {
        if (t.groupId === groupId) {
          const updatedTable = {
            ...t,
            isActive: false,
            startTime: null,
            remainingTime: DEFAULT_TIME,
            initialTime: DEFAULT_TIME,
            groupId: null, // Ungroup tables when session ends
            server: null, // Clear server assignment (explicitly null)
            guestCount: 0, // Reset guest count
            // Clear notes
            hasNotes: false,
            noteId: "",
            noteText: "",
            updatedAt: new Date().toISOString(),
          }

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: t.id,
                table: updatedTable,
              },
            }),
          )

          // Also dispatch a specific session-ended event
          window.dispatchEvent(
            new CustomEvent("session-ended", {
              detail: {
                tableId: t.id,
              },
            }),
          )

          return updatedTable
        }
        return t
      })

      // Update local state immediately
      setTables(updatedTables)

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTables(updatedTables)
      }, 100)

      showNotification(`Ended group session for ${groupId}`, "info")
    } else {
      // End individual table
      const elapsedTime = table.initialTime - table.remainingTime
      await addLogEntry(
        tableId,
        "Session Ended",
        `Duration: ${formatMinutes(Math.abs(elapsedTime) / 60000)} minutes, Players: ${table.guestCount}`,
      )

      const updatedTable = {
        ...table,
        isActive: false,
        startTime: null,
        remainingTime: DEFAULT_TIME,
        initialTime: DEFAULT_TIME,
        guestCount: 0,
        server: null, // This is already correct, but ensuring it's explicitly null
        // Clear notes
        hasNotes: false,
        noteId: "",
        noteText: "",
        updatedAt: new Date().toISOString(),
      }

      // Update local state immediately
      setTables(tables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("table-updated", {
          detail: {
            tableId: tableId,
            table: updatedTable,
          },
        }),
      )

      // Also dispatch a specific session-ended event
      window.dispatchEvent(
        new CustomEvent("session-ended", {
          detail: {
            tableId: tableId,
          },
        }),
      )

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTable(updatedTable)
      }, 100)

      showNotification(`Ended session for ${table.name}`, "info")
    }

    // Close dialogs after state updates
    closeTableDialog()
    setShowConfirmDialog(false)
  }

  // Format minutes helper
  const formatMinutes = (minutes: number) => {
    return Math.round(minutes)
  }

  // Update the addTime function to ensure proper time calculation
  const handleAddTime = useCallback(
    async (tableId: number, minutes: number) => {
      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      // Calculate new remaining time
      const additionalMs = minutes * 60 * 1000
      const newRemainingTime = table.remainingTime + additionalMs

      // Update the table
      const updatedTable = {
        ...table,
        remainingTime: newRemainingTime,
        initialTime: table.initialTime + additionalMs, // Also update initial time
      }

      // Update the table in the database
      await updateTable(updatedTable)

      // Add log entry
      await addLogEntry(tableId, table.name, "Add Time", `Added ${minutes} minutes`)
    },
    [tables, updateTable],
  )

  // Update the subtractTime function to ensure proper time calculation
  const handleSubtractTime = useCallback(
    async (tableId: number, minutes: number) => {
      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      // Calculate new remaining time (don't go below zero)
      const subtractMs = minutes * 60 * 1000
      const newRemainingTime = Math.max(0, table.remainingTime - subtractMs)

      // Update the table
      const updatedTable = {
        ...table,
        remainingTime: newRemainingTime,
        initialTime: Math.max(0, table.initialTime - subtractMs), // Also update initial time, don't go below zero
      }

      // Update the table in the database
      await updateTable(updatedTable)

      // Add log entry
      await addLogEntry(tableId, table.name, "Subtract Time", `Subtracted ${minutes} minutes`)
    },
    [tables, updateTable],
  )

  // Add time to table
  const addTime = async (tableId: number, minutes: number) => {
    if (!isAuthenticated || !hasPermission("canAddTime")) {
      showNotification("Please log in using the Admin button", "error")
      setLoginAttemptFailed(true)
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const additionalTime = minutes * 60 * 1000

    // If table is in a group, add time to all tables in the group
    if (table.groupId) {
      await addLogEntry(tableId, "Group Time Added", `${minutes} minutes added to group ${table.groupId}`)

      const updatedTables = tables.map((t) => {
        if (t.groupId === table.groupId) {
          const newInitialTime = t.initialTime + additionalTime
          const newRemainingTime =
            t.isActive && t.startTime ? Math.max(0, newInitialTime - (Date.now() - t.startTime)) : newInitialTime

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: t.id,
                table: {
                  ...t,
                  initialTime: newInitialTime,
                  remainingTime: newRemainingTime,
                },
              },
            }),
          )

          return {
            ...t,
            initialTime: newInitialTime,
            remainingTime: newRemainingTime,
            updatedAt: new Date().toISOString(),
          }
        }
        return t
      })

      // Update local state immediately
      setTables(updatedTables)

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTables(updatedTables)
      }, 100)

      showNotification(`Added ${minutes} minutes to ${table.groupId}`, "success")
    } else {
      // Add time to individual table
      const newInitialTime = table.initialTime + additionalTime
      const newRemainingTime =
        table.isActive && table.startTime
          ? Math.max(0, newInitialTime - (Date.now() - table.startTime))
          : newInitialTime

      // Update local state immediately
      const updatedTable = {
        ...table,
        initialTime: newInitialTime,
        remainingTime: newRemainingTime,
        updatedAt: new Date().toISOString(),
      }

      // Update tables state
      setTables(tables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("table-updated", {
          detail: {
            tableId: tableId,
            table: updatedTable,
          },
        }),
      )

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTable(updatedTable)
      }, 100)

      await addLogEntry(tableId, "Time Added", `${minutes} minutes added`)
      showNotification(`Added ${minutes} minutes to ${table.name}`, "success")
    }
  }

  // Subtract time from table
  const subtractTime = async (tableId: number, minutes: number) => {
    if (!isAuthenticated || !hasPermission("canSubtractTime")) {
      showNotification("Please log in using the Admin button", "error")
      setLoginAttemptFailed(true)
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const subtractedTime = minutes * 60 * 1000

    // If table is in a group, subtract time from all tables in the group
    if (table.groupId) {
      await addLogEntry(tableId, "Group Time Subtracted", `${minutes} minutes subtracted from group ${table.groupId}`)

      const updatedTables = tables.map((t) => {
        if (t.groupId === table.groupId) {
          const newInitialTime = Math.max(0, t.initialTime - subtractedTime)
          const newRemainingTime =
            t.isActive && t.startTime ? Math.max(0, newInitialTime - (Date.now() - t.startTime)) : newInitialTime

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: t.id,
                table: {
                  ...t,
                  initialTime: newInitialTime,
                  remainingTime: newRemainingTime,
                },
              },
            }),
          )

          return {
            ...t,
            initialTime: newInitialTime,
            remainingTime: newRemainingTime,
            updatedAt: new Date().toISOString(),
          }
        }
        return t
      })

      // Update local state immediately
      setTables(updatedTables)

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTables(updatedTables)
      }, 100)

      showNotification(`Subtracted ${minutes} minutes from ${table.groupId}`, "info")
    } else {
      // Subtract time from individual table
      const newInitialTime = Math.max(0, table.initialTime - subtractedTime)
      const newRemainingTime =
        table.isActive && table.startTime
          ? Math.max(0, newInitialTime - (Date.now() - table.startTime))
          : newInitialTime

      // Update local state immediately
      const updatedTable = {
        ...table,
        initialTime: newInitialTime,
        remainingTime: newRemainingTime,
        updatedAt: new Date().toISOString(),
      }

      // Update tables state
      setTables(tables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("table-updated", {
          detail: {
            tableId: tableId,
            table: updatedTable,
          },
        }),
      )

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateTable(updatedTable)
      }, 100)

      await addLogEntry(tableId, "Time Subtracted", `${minutes} minutes subtracted`)
      showNotification(`Subtracted ${minutes} minutes from ${table.name}`, "info")
    }
  }

  // Update guest count with throttling
  const updateGuestCount = useCallback(
    async (tableId: number, count: number) => {
      // Special case for resetting to 0 - bypass all checks
      if (count === 0) {
        console.log(`Resetting guest count to 0 for table ${tableId}`)

        const table = tables.find((t) => t.id === tableId)
        if (!table) return

        const updatedTable = {
          ...table,
          guestCount: 0,
          updatedAt: new Date().toISOString(),
        }

        // Update local state immediately
        setTables((prevTables) => prevTables.map((t) => (t.id === tableId ? updatedTable : t)))

        // Debounce the Supabase update
        setTimeout(() => {
          updateTable(updatedTable)
        }, 300)
        return
      }

      // Normal case - apply all checks
      if (!isAuthenticated || !hasPermission("canUpdateGuests")) {
        showNotification("Please log in using the Admin button", "error")
        setLoginAttemptFailed(true)
        return
      }

      // Check if day has been started
      if (!supabaseDayStarted) {
        showNotification("Please start the day before updating guest count", "error")
        return
      }

      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      const newCount = Math.max(0, Math.min(16, count)) // Limit between 0 and 16

      // Only log if this is an actual change, not a reset
      if (newCount !== table.guestCount && newCount > 0) {
        await addLogEntry(tableId, "Players Updated", `Changed from ${table.guestCount} to ${newCount}`)
      }

      const updatedTable = {
        ...table,
        guestCount: newCount,
        updatedAt: new Date().toISOString(),
      }

      // Update local state immediately
      setTables((prevTables) => prevTables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Debounce the Supabase update
      setTimeout(() => {
        updateTable(updatedTable)
      }, 300)
    },
    [tables, isAuthenticated, hasPermission, supabaseDayStarted, updateTable, setLoginAttemptFailed],
  )

  // Assign server to table with throttling
  const assignServer = useCallback(
    async (tableId: number, serverId: string | null) => {
      if (!isAuthenticated) {
        showNotification("Please log in using the Admin button", "error")
        setLoginAttemptFailed(true)
        return
      }

      // If not admin and trying to assign to someone else, prevent it
      if (!isAdmin && !hasPermission("canAssignServer") && serverId !== currentUser?.id) {
        showNotification("You can only assign tables to yourself", "error")
        return
      }

      // Ensure serverId is null if it's an empty string
      if (serverId === "") {
        serverId = null
      }

      // Find the table to update
      const tableToUpdate = tables.find((t) => t.id === tableId)
      if (!tableToUpdate) {
        console.error(`Table with ID ${tableId} not found in tables array:`, tables)
        showNotification(`Error: Table ${tableId} not found`, "error")
        return
      }

      // Create a new table object with the updated server
      const updatedTable = {
        ...tableToUpdate,
        server: serverId,
        updatedAt: new Date().toISOString(),
      }

      // Update local state immediately to prevent stale data
      setTables((prevTables) => prevTables.map((t) => (t.id === tableId ? updatedTable : t)))

      // Debounce the Supabase update
      setTimeout(() => {
        updateTable(updatedTable)
      }, 300)

      // Log the change
      const serverName = serverId ? serverUsers.find((s) => s.id === serverId)?.name || "Unknown" : "Unassigned"
      await addLogEntry(tableId, "Server Assigned", `Server: ${serverName}`)

      // Show notification
      showNotification(`Assigned ${serverName} to table ${tableId}`, "success")

      // If we have a selected table, update it directly to ensure UI consistency
      if (selectedTable && selectedTable.id === tableId) {
        setSelectedTable(updatedTable)
      }
    },
    [
      tables,
      isAuthenticated,
      isAdmin,
      hasPermission,
      currentUser,
      updateTable,
      serverUsers,
      selectedTable,
      setLoginAttemptFailed,
    ],
  )

  // Group tables
  const groupTables = async (tableIds: number[]) => {
    if (!isAuthenticated || !hasPermission("canGroupTables")) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    if (tableIds.length < 2) return

    // Auto-generate group name
    const groupName = `Group ${supabaseGroupCounter}`
    const newGroupCounter = supabaseGroupCounter + 1

    // Update system settings with new group counter
    await updateSystemSettings(supabaseDayStarted, newGroupCounter)

    await addLogEntry(
      tableIds[0],
      "Tables Grouped",
      `Group: ${groupName}, Tables: ${tableIds.map((id) => `T${id}`).join(", ")}`,
    )

    // Find if any table in the group is active
    const activeTables = tables.filter((t) => tableIds.includes(t.id) && t.isActive)
    let groupStartTime = null
    let groupInitialTime = DEFAULT_TIME
    let groupRemainingTime = DEFAULT_TIME
    let groupIsActive = false

    if (activeTables.length > 0) {
      // Use the first active table as reference
      const referenceTable = activeTables[0]
      groupStartTime = referenceTable.startTime
      groupInitialTime = referenceTable.initialTime
      groupRemainingTime = referenceTable.remainingTime
      groupIsActive = true
    }

    const updatedTables = tables.map((table) => {
      if (tableIds.includes(table.id)) {
        // If we have an active table in the group, sync all tables to that one
        if (activeTables.length > 0) {
          return {
            ...table,
            groupId: groupName,
            isActive: groupIsActive,
            startTime: groupStartTime,
            initialTime: groupInitialTime,
            remainingTime: groupRemainingTime,
            updatedAt: new Date().toISOString(),
          }
        } else {
          // Otherwise just set the group ID
          return {
            ...table,
            groupId: groupName,
            updatedAt: new Date().toISOString(),
          }
        }
      }
      return table
    })

    await updateTables(updatedTables)
    showNotification(`Created ${groupName} with ${tableIds.length} tables`, "success")
  }

  // Ungroup table
  const ungroupTable = async (tableId: number) => {
    if (!isAuthenticated || !hasPermission("canUngroupTable")) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table || !table.groupId) return

    await addLogEntry(tableId, "Table Ungrouped", `Removed from group ${table.groupId}`)

    const updatedTable = {
      ...table,
      groupId: null,
      updatedAt: new Date().toISOString(),
    }

    await updateTable(updatedTable)
    showNotification(`Removed ${table.name} from ${table.groupId}`, "info")
  }

  // Move table data
  const moveTable = async (sourceId: number, targetId: number) => {
    if (!isAuthenticated || !hasPermission("canMoveTable")) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    const sourceTable = tables.find((t) => t.id === sourceId)
    const targetTable = tables.find((t) => t.id === targetId)

    if (!sourceTable || !targetTable) return

    await addLogEntry(sourceId, "Table Moved", `From: ${sourceTable.name} to ${targetTable.name}`)

    // Copy data from source to target
    const updatedTargetTable = {
      ...targetTable,
      isActive: sourceTable.isActive,
      startTime: sourceTable.startTime,
      remainingTime: sourceTable.remainingTime,
      initialTime: sourceTable.initialTime,
      guestCount: sourceTable.guestCount,
      server: sourceTable.server,
      groupId: sourceTable.groupId,
      hasNotes: sourceTable.hasNotes,
      noteId: sourceTable.noteId,
      noteText: sourceTable.noteText,
      updatedAt: new Date().toISOString(),
    }

    // Reset source table
    const updatedSourceTable = {
      ...sourceTable,
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
      updatedAt: new Date().toISOString(),
    }

    // Update both tables
    await updateTable(updatedTargetTable)
    await updateTable(updatedSourceTable)

    showNotification(`Moved data from ${sourceTable.name} to ${targetTable.name}`, "success")
  }

  // Update table notes with improved reset handling
  const updateTableNotes = async (tableId: number, noteId: string, noteText: string) => {
    // Special case for clearing notes - bypass all checks
    if (!noteId && !noteText) {
      console.log(`Clearing notes for table ${tableId}`)

      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      const updatedTable = {
        ...table,
        noteId: "",
        noteText: "",
        hasNotes: false,
        updatedAt: new Date().toISOString(),
      }

      await updateTable(updatedTable)
      return
    }

    // Normal case - apply all checks
    if (!isAuthenticated || !hasPermission("canUpdateNotes")) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    // Check if day has been started
    if (!supabaseDayStarted) {
      showNotification("Please start the day before updating notes", "error")
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const hasNotes = noteId.trim().length > 0

    // Only log if this is an actual change, not a reset
    if (hasNotes && noteText) {
      await addLogEntry(
        tableId,
        "Notes Updated",
        `Added note: ${noteText.substring(0, 30)}${noteText.length > 30 ? "..." : ""}`,
      )
    } else if (table.hasNotes && !hasNotes) {
      await addLogEntry(tableId, "Notes Removed", "Note cleared")
    }

    const updatedTable = {
      ...table,
      noteId,
      noteText,
      hasNotes,
      updatedAt: new Date().toISOString(),
    }

    await updateTable(updatedTable)
    showNotification(noteId ? "Note updated" : "Note removed", "info")
  }

  // Get server name by ID
  const getServerName = (serverId: string | null) => {
    if (!serverId) return "Unassigned"
    const server = serverUsers.find((s) => s.id === serverId)
    return server ? server.name : "Unknown"
  }

  // Modified start day function to show animation
  const startDay = () => {
    if (!isAdmin) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    // Show server selection dialog first
    setShowServerSelectionDialog(true)
  }

  // Add a new function to handle the actual day start after server selection
  const handleServerSelectionComplete = () => {
    setShowServerSelectionDialog(false)

    console.log("Starting Big Bang animation")

    // Reset all animation-related state
    setAnimationComplete(false)
    setShowDayReportDialog(false)
    setIsStartingDay(true)

    // Show the animation with a slight delay to ensure state is updated
    setTimeout(() => {
      setShowBigBangAnimation(true)
    }, 50)
  }

  // Complete start day after animation
  const completeBigBangAnimation = () => {
    console.log("Dashboard: Animation completed callback triggered")

    // First hide the animation
    setShowBigBangAnimation(false)

    // Immediately set animation complete to allow other interactions
    setAnimationComplete(true)

    // Show the day report dialog immediately
    console.log("Dashboard: Showing day report dialog")
    setShowDayReportDialog(true)
  }

  // Modified end day function to show confirmation dialog
  const endDay = () => {
    if (!isAdmin) {
      showNotification("Please log in using the Admin button", "error")
      return
    }

    // Show confirmation dialog
    setConfirmMessage("Are you sure you want to end the day? All active sessions will be ended.")
    setConfirmAction(() => () => {
      // This function will be called if the user confirms
      console.log("Starting Explosion animation")

      // Reset all animation-related state
      setAnimationComplete(false)
      setShowDayReportDialog(false)
      setIsStartingDay(false)

      // Show the animation with a slight delay to ensure state is updated
      setTimeout(() => {
        setShowExplosionAnimation(true)
      }, 50)
    })
    setShowConfirmDialog(true)
  }

  // Complete end day after animation
  const completeExplosionAnimation = () => {
    console.log("Explosion animation completed")

    // First hide the animation
    setShowExplosionAnimation(false)

    // Immediately set animation complete to allow other interactions
    setAnimationComplete(true)

    // Show the day report dialog immediately
    console.log("Showing end day report dialog")
    setShowDayReportDialog(true)
  }

  // Complete start day after report
  const completeStartDay = async () => {
    // Reset all tables to default status
    const resetTables = initialTables.map((table) => ({
      ...table,
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
      updated_by_admin: false,
      updated_by: null,
      updatedAt: new Date().toISOString(),
    }))

    // Update tables in Supabase
    await updateTables(resetTables)
    await updateSystemSettings(true, 1)

    // Also update the local state
    setTables(resetTables)

    // Notify table store about the reset
    resetTables.forEach((table) => {
      useTableStore.getState().refreshTable(table.id, table)
    })

    await addLogEntry(0, "Day Started", `Started at ${formatCurrentTime(new Date())}`)
    showNotification("Day started successfully", "success")
  }

  // Complete end day after report
  const completeEndDay = async () => {
    // Check for active tables
    const activeTables = tables.filter((t) => t.isActive)
    if (activeTables.length > 0) {
      for (const table of activeTables) {
        await addLogEntry(table.id, "Session Force Ended", `Table was active at day end`)
      }
    }

    // Reset all tables to default status
    const resetTables = initialTables.map((table) => ({
      ...table,
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
      updated_by_admin: false,
      updated_by: null,
      updatedAt: new Date().toISOString(),
    }))

    // Update tables in Supabase
    await updateTables(resetTables)
    await updateSystemSettings(false, 1)

    // Also update the local state
    setTables(resetTables)

    // Notify table store about the reset
    resetTables.forEach((table) => {
      useTableStore.getState().refreshTable(table.id, table)
    })

    await addLogEntry(0, "Day Ended", `Ended at ${formatCurrentTime(new Date())}`)
    showNotification("Day ended successfully", "info")
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    showNotification("Logged out successfully", "info")
  }

  // Calculate dynamic heights for layout components
  const headerHeight = 60 // Approximate height of header
  const footerHeight = 60 // Approximate height of footer
  const topButtonsHeight = 40 // Approximate height of top buttons
  const availableHeight = viewportHeight - headerHeight - footerHeight - topButtonsHeight

  // Calculate table grid height (70% of available space)
  const tableGridHeight = Math.floor(availableHeight * 0.7)

  // Calculate AI insights height (remaining space)
  const aiInsightsHeight = availableHeight - tableGridHeight

  const onClose = () => {
    setShowDayReportDialog(false)
    if (isStartingDay) {
      completeStartDay()
    } else {
      completeEndDay()
    }
  }

  // Handle viewer login
  const handleViewerLogin = () => {
    // Instead of showing the login dialog, just enter view-only mode
    setViewOnlyMode(true)
    showNotification("Entered view-only mode. You can view data but cannot make changes.", "info")
  }

  // Add a function to exit view-only mode
  const exitViewOnlyMode = () => {
    setViewOnlyMode(false)
    showNotification("Exited view-only mode", "info")
  }

  // Handle admin login
  const handleAdminLogin = () => {
    setLoginUsername("admin")
    setLoginPassword("")
    setShowTouchLogin(true)
  }

  return (
    <TooltipProvider>
      <div
        className="container mx-auto p-2 min-h-screen max-h-screen flex flex-col space-theme font-mono cursor-spaceship overflow-hidden"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Replace the 3D Space Background with our new animation */}
        <SpaceBackgroundAnimation intensity={1.5} />

        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg animate-in fade-in slide-in-from-top-5 duration-300 ${
              notification.type === "success"
                ? "bg-green-600 text-white"
                : notification.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Header with logo and buttons */}
        <Header
          currentTime={currentTime}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          dayStarted={supabaseDayStarted}
          hasPermission={hasPermission}
          onStartDay={startDay}
          onEndDay={endDay}
          onShowSettings={() => setShowSettingsDialog(true)}
          onLogout={handleLogout}
          onAdminLogin={handleAdminLogin}
          onViewerLogin={handleViewerLogin}
          onSync={syncData}
          onToggleFullScreen={toggleFullScreen}
          tables={tables}
          logs={logs}
          servers={serverUsers}
          animationComplete={animationComplete}
        />

        {/* Main content area with full height */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Table Grid with full height */}
          <div className={isMobile ? "overflow-y-auto flex-1" : "overflow-hidden h-full"}>
            {isMobile ? (
              <MobileTableList tables={tables} servers={serverUsers} logs={logs} onTableClick={openTableDialog} />
            ) : (
              <TableGrid tables={tables} servers={serverUsers} logs={logs} onTableClick={openTableDialog} />
            )}
          </div>
        </div>

        {selectedTable && (
          <TableDialog
            table={selectedTable}
            servers={serverUsers}
            onClose={closeTableDialog}
            onStartSession={startTableSession}
            onEndSession={confirmEndSession}
            onAddTime={addTime}
            onSubtractTime={subtractTime}
            onUpdateGuestCount={updateGuestCount}
            onAssignServer={assignServer}
            onGroupTables={groupTables}
            onUngroupTable={ungroupTable}
            onMoveTable={moveTable}
            onUpdateNotes={updateTableNotes}
            getServerName={getServerName}
            allTables={tables}
            noteTemplates={noteTemplates}
            currentUser={currentUser}
            hasPermission={hasPermission}
            logs={logs}
            viewOnlyMode={viewOnlyMode}
          />
        )}
        {feedbackTable && (
          <SessionFeedbackDialog
            open={showFeedbackDialog}
            onClose={() => setShowFeedbackDialog(false)}
            table={feedbackTable}
            onSubmitFeedback={handleSessionFeedback}
          />
        )}
        <ConfirmDialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmAction || (() => {})}
          message={confirmMessage}
        />
        <ConfirmDialog
          open={showExitFullScreenConfirm}
          onClose={() => setShowExitFullScreenConfirm(false)}
          onConfirm={confirmExitFullScreen}
          message="Are you sure you want to exit full screen mode?"
        />

        {/* Day Report Dialog */}
        <DayReportDialog
          open={showDayReportDialog}
          onClose={onClose}
          tables={tables}
          logs={logs}
          servers={serverUsers}
          isStarting={isStartingDay}
        />

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          servers={serverUsers}
          onUpdateServers={updateServers}
          noteTemplates={noteTemplates}
          onUpdateNoteTemplates={updateNoteTemplates}
          onShowUserManagement={() => setShowUserManagementDialog(true)}
          onShowLogs={() => setShowLogsDialog(true)}
          onLogout={handleLogout}
          showAdminControls={isAuthenticated && supabaseDayStarted}
        />

        <TableLogsDialog open={showLogsDialog} onClose={() => setShowLogsDialog(false)} logs={logs} />
        <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
        <UserManagementDialog open={showUserManagementDialog} onClose={() => setShowUserManagementDialog(false)} />

        {/* Big Bang Animation */}
        {showBigBangAnimation && <BigBangAnimation onComplete={completeBigBangAnimation} />}

        {/* Explosion Animation */}
        {showExplosionAnimation && <ExplosionAnimation onComplete={completeExplosionAnimation} />}

        {/* Server Selection Dialog */}
        <ServerSelectionDialog
          open={showServerSelectionDialog}
          onClose={() => setShowServerSelectionDialog(false)}
          servers={serverUsers}
          onUpdateServers={(updatedServers) => {
            updateServers(updatedServers)
            handleServerSelectionComplete()
          }}
        />

        <TouchLogin
          open={showTouchLogin}
          onClose={() => setShowTouchLogin(false)}
          defaultUsername={loginUsername}
          defaultPassword={loginPassword}
        />

        {/* Pull-up AI Insights Panel */}
        {isAuthenticated && supabaseDayStarted && !isMobile && (
          <PullUpInsightsPanel tables={tables} logs={logs} servers={serverUsers} />
        )}
      </div>
    </TooltipProvider>
  )
}
