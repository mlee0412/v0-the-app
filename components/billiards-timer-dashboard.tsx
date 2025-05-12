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
// Remove SpaceBackgroundAnimation import since it's now in client-layout
import { Header } from "@/components/header"
import { TableGrid } from "@/components/table-grid"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useTableStore } from "@/utils/table-state-manager"
import { BigBangAnimation } from "@/components/animations/big-bang-animation"
import { ExplosionAnimation } from "@/components/animations/explosion-animation"
import { EnhancedMobileTableList } from "@/components/mobile/enhanced-mobile-table-list"
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav"
import { OfflineDetector } from "@/components/mobile/offline-detector"
import { OrientationAwareContainer } from "@/components/mobile/orientation-aware-container"
// Fix the import to use the correct export name
import { useMobile } from "@/hooks/use-mobile"
import { IOSTouchFix } from "@/components/ios-touch-fix"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { TableSessionLogs } from "@/components/mobile/table-session-logs"
// Update the import for TouchLoginDialog
import { TouchLoginDialog } from "@/components/auth/touch-login-dialog"
import { AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
  // Access the auth context
  const auth = useAuth()

  // Debug: Check authentication state on component mount
  useEffect(() => {
    // Debug: Check authentication state on component mount
    const checkAuth = async () => {
      try {
        const isAuth = await auth.isAuthenticated
        const user = await auth.currentUser
        console.log("Auth state on dashboard load:", {
          isAuthenticated: isAuth,
          currentUser: user,
          localStorageUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
        })
      } catch (error) {
        console.error("Error checking auth state:", error)
      }
    }

    checkAuth()
  }, [auth])
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
    autoEndDayTime: "06:00",
    businessHours: {
      open: "14:300",
      close: "06:00",
    },
    dayStarted: false,
    dayStartTime: null,
  })
  const { isAuthenticated, isAdmin, isServer, currentUser, logout, hasPermission } = useAuth()
  // Use the correct hook name
  const isMobile = useMobile()
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

  // Mobile-specific state
  const [activeTab, setActiveTab] = useState<"tables" | "logs" | "settings" | "servers" | "functions">("tables")
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [largeTextMode, setLargeTextMode] = useState(false)
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true)
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false)
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false)

  // Add state to hide system elements on mobile
  const [hideSystemElements, setHideSystemElements] = useState(isMobile)

  // Add this state near the other state declarations
  const [showServerSelectionDialog, setShowServerSelectionDialog] = useState(false)

  // Login state
  const [loginUsername, setLoginUsername] = useState("admin")
  const [loginPassword, setLoginPassword] = useState("")

  // Permission warning dialog
  const [showPermissionWarning, setShowPermissionWarning] = useState(false)
  const [permissionWarningMessage, setPermissionWarningMessage] = useState("")
  const [permissionWarningTitle, setPermissionWarningTitle] = useState("Permission Denied")

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
    updateTables: updateSupabaseTables,
    addLogEntry: addSupabaseLogEntry,
    updateSystemSettings,
    updateServers,
    updateNoteTemplates,
    syncData,
  } = useSupabaseData()

  // Add a new state to track view-only mode
  const [viewOnlyMode, setViewOnlyMode] = useState(false)

  // Update hideSystemElements when isMobile changes
  useEffect(() => {
    setHideSystemElements(isMobile)
  }, [isMobile])

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

    // Play sound notification if enabled
    if (soundEffectsEnabled && type !== "info") {
      try {
        // Use a simple beep sound instead of loading external files
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        if (context) {
          const oscillator = context.createOscillator()
          const gainNode = context.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(context.destination)

          // Set the sound type based on notification type
          oscillator.type = type === "success" ? "sine" : "square"
          oscillator.frequency.value = type === "success" ? 880 : 220 // A5 for success, A3 for error

          gainNode.gain.value = 0.1 // Lower volume

          oscillator.start()
          setTimeout(
            () => {
              oscillator.stop()
            },
            type === "success" ? 200 : 400,
          )
        }
      } catch (error) {
        console.error("Failed to play notification sound:", error)
        // Silently fail - no sound is better than a broken app
      }
    }

    // Provide haptic feedback on mobile
    if (isMobile && navigator.vibrate) {
      if (type === "error") {
        navigator.vibrate([100, 50, 100])
      } else if (type === "success") {
        navigator.vibrate(50)
      }
    }

    setTimeout(() => setNotification(null), 3000)
  }

  // Show permission warning dialog
  const showPermissionWarningDialog = (message: string, title = "Permission Denied") => {
    setPermissionWarningMessage(message)
    setPermissionWarningTitle(title)
    setShowPermissionWarning(true)
    // Don't close the table dialog or modify any other state
  }

  // Check permission and show warning if not allowed
  const checkPermission = (permission: string, actionName: string): boolean => {
    if (!isAuthenticated) {
      showPermissionWarningDialog(
        "You need to log in to perform this action. Please log in using the Admin button.",
        "Login Required",
      )
      return false
    }

    if (!hasPermission(permission)) {
      const userRole = currentUser?.role || "user"
      showPermissionWarningDialog(
        `Your role (${userRole}) does not have permission to ${actionName}. Please contact an administrator if you need this access.`,
      )
      return false
    }

    return true
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

  // Add a new effect to periodically sync all active table timers
  useEffect(() => {
    if (!supabaseDayStarted) return

    // Sync all active table timers every second
    const syncInterval = setInterval(() => {
      const activeTables = tables.filter((t) => t.isActive && t.startTime)

      activeTables.forEach((table) => {
        // Calculate current remaining time
        const now = Date.now()
        const elapsed = now - (table.startTime || now)
        const currentRemainingTime = table.initialTime - elapsed

        // Broadcast update to ensure all components stay in sync
        window.dispatchEvent(
          new CustomEvent("table-time-update", {
            detail: {
              tableId: table.id,
              remainingTime: currentRemainingTime,
              initialTime: table.initialTime,
              source: "dashboard-sync",
            },
          }),
        )
      })
    }, 1000)

    return () => clearInterval(syncInterval)
  }, [tables, supabaseDayStarted])

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

  // Open table dialog - simplified to always open the dialog first
  const openTableDialog = (table: Table) => {
    // Always set the selected table immediately to show the dialog
    setSelectedTable(table)

    // Show login prompt if needed, but don't block the dialog
    if (!isAuthenticated && !viewOnlyMode) {
      showNotification("Login required for some actions", "info")
    }
  }

  // Close table dialog
  const closeTableDialog = () => {
    setSelectedTable(null)
  }

  // Start table session
  const startTableSession = async (tableId: number) => {
    // Check permission with specific message
    if (!checkPermission("canStartSession", "start a table session")) {
      // Don't close the dialog or modify any other state
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) {
      console.error(`Table with ID ${tableId} not found`)
      return
    }

    // Double-check validation
    if (table.guestCount <= 0) {
      showPermissionWarningDialog("Please add at least one guest before starting the session", "Missing Information")
      return
    }

    if (!table.server) {
      showPermissionWarningDialog("Please assign a server before starting the session", "Missing Information")
      return
    }

    const startTime = Date.now()
    const updatedAt = new Date().toISOString()

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
            updatedAt: updatedAt,
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
        updateSupabaseTables(updatedTables)
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
        updatedAt: updatedAt,
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
    // Check permission with specific message
    if (!checkPermission("canEndSession", "end a table session")) {
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
    const updatedAt = new Date().toISOString()

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
            updatedAt: updatedAt,
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
        updateSupabaseTables(updatedTables)
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
        updatedAt: updatedAt,
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
      // Check permission with specific message
      if (!checkPermission("canAddTime", "add time to a table")) {
        return
      }

      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      // Calculate new remaining time
      const additionalMs = minutes * 60 * 1000
      const newRemainingTime = table.remainingTime + additionalMs
      const updatedAt = new Date().toISOString()

      // Update the table
      const updatedTable = {
        ...table,
        remainingTime: newRemainingTime,
        initialTime: table.initialTime + additionalMs, // Also update initial time
        updatedAt: updatedAt,
      }

      // Update the table in the database
      await updateTable(updatedTable)

      // Add log entry
      await addLogEntry(tableId, "Add Time", `Added ${minutes} minutes`)
    },
    [tables, updateTable],
  )

  // Update the subtractTime function to ensure proper time calculation
  const handleSubtractTime = useCallback(
    async (tableId: number, minutes: number) => {
      // Check permission with specific message
      if (!checkPermission("canSubtractTime", "subtract time from a table")) {
        return
      }

      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      // Calculate new remaining time (don't go below zero)
      const subtractMs = minutes * 60 * 1000
      const newRemainingTime = Math.max(0, table.remainingTime - subtractMs)
      const updatedAt = new Date().toISOString()

      // Update the table
      const updatedTable = {
        ...table,
        remainingTime: newRemainingTime,
        initialTime: Math.max(0, table.initialTime - subtractMs), // Also update initial time, don't go below zero
        updatedAt: updatedAt,
      }

      // Update the table in the database
      await updateTable(updatedTable)

      // Add log entry
      await addLogEntry(tableId, "Subtract Time", `Subtracted ${minutes} minutes`)
    },
    [tables, updateTable],
  )

  // Add time to table
  const addTime = async (tableId: number, minutes = 15) => {
    // Check permission with specific message
    if (!checkPermission("canAddTime", "add time to a table")) {
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const additionalTime = minutes * 60 * 1000
    const updatedAt = new Date().toISOString()

    // If table is in a group, add time to all tables in the group
    if (table.groupId) {
      await addLogEntry(tableId, "Group Time Added", `${minutes} minutes added to group ${table.groupId}`)

      const updatedTables = tables.map((t) => {
        if (t.groupId === table.groupId) {
          const newInitialTime = t.initialTime + additionalTime
          const newRemainingTime =
            t.isActive && t.startTime ? Math.max(0, newInitialTime - (Date.now() - t.startTime)) : newInitialTime

          const updatedTable = {
            ...t,
            initialTime: newInitialTime,
            remainingTime: newRemainingTime,
            updatedAt: updatedAt,
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

          // Also dispatch a specific time update event
          window.dispatchEvent(
            new CustomEvent("table-time-update", {
              detail: {
                tableId: t.id,
                remainingTime: newRemainingTime,
                initialTime: newInitialTime,
                source: "add-time",
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
        updateSupabaseTables(updatedTables)
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
        updatedAt: updatedAt,
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

      // Also dispatch a specific time update event
      window.dispatchEvent(
        new CustomEvent("table-time-update", {
          detail: {
            tableId: tableId,
            remainingTime: newRemainingTime,
            initialTime: newInitialTime,
            source: "add-time",
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
    // Check permission with specific message
    if (!checkPermission("canSubtractTime", "subtract time from a table")) {
      return
    }

    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const subtractedTime = minutes * 60 * 1000
    const updatedAt = new Date().toISOString()

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
            updatedAt: updatedAt,
          }
        }
        return t
      })

      // Update local state immediately
      setTables(updatedTables)

      // Update Supabase with a slight delay to avoid race conditions
      setTimeout(() => {
        updateSupabaseTables(updatedTables)
      }, 100)

      showNotification(`Subtracted ${minutes} minutes from ${table.groupId}`, "info")
    } else {
      // Subtract time from individual table
      const newInitialTime = Math.max(0, table.initialTime - subtractedTime)
      const newRemainingTime =
        table.isActive && table.startTime
          ? Math.max(0, newInitialTime - (Date.now() - table.startTime))
          : newInitialTime

      // Update local state
      const updatedTable = {
        ...table,
        initialTime: newInitialTime,
        remainingTime: newRemainingTime,
        updatedAt: updatedAt,
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
      // Check permission with specific message
      if (!checkPermission("canUpdateGuests", "update the guest count")) {
        return
      }

      // Check if day has been started
      if (!supabaseDayStarted) {
        showPermissionWarningDialog("Please start the day before updating guest count", "Day Not Started")
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
      // Check permission with specific message
      if (!checkPermission("canAssignServer", "assign a server to a table")) {
        // Don't close the dialog or modify any other state
        return
      }

      // If not admin and trying to assign to someone else, prevent it
      if (!isAdmin && !hasPermission("canAssignServer") && serverId !== currentUser?.id) {
        showPermissionWarningDialog(
          "You can only assign tables to yourself. To assign to another server, you need additional permissions.",
          "Restricted Action",
        )
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
    // Check permission with specific message
    if (!checkPermission("canGroupTables", "group tables together")) {
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
          const updatedTable = {
            ...table,
            groupId: groupName,
            isActive: groupIsActive,
            startTime: groupStartTime,
            initialTime: groupInitialTime,
            remainingTime: groupRemainingTime,
            updatedAt: new Date().toISOString(),
          }

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: table.id,
                table: updatedTable,
              },
            }),
          )

          // Also dispatch a specific time update event if active
          if (groupIsActive) {
            window.dispatchEvent(
              new CustomEvent("table-time-update", {
                detail: {
                  tableId: table.id,
                  remainingTime: groupRemainingTime,
                  initialTime: groupInitialTime,
                  source: "group-tables",
                },
              }),
            )
          }

          return updatedTable
        } else {
          // Otherwise just set the group ID
          const updatedTable = {
            ...table,
            groupId: groupName,
            updatedAt: new Date().toISOString(),
          }

          // Dispatch event for real-time updates
          window.dispatchEvent(
            new CustomEvent("table-updated", {
              detail: {
                tableId: table.id,
                table: updatedTable,
              },
            }),
          )

          return updatedTable
        }
      }
      return table
    })

    // Update local state
    setTables(updatedTables)

    // Update Supabase
    await updateSupabaseTables(updatedTables)
    showNotification(`Created ${groupName} with ${tableIds.length} tables`, "success")
  }

  // Ungroup table
  const ungroupTable = async (tableId: number) => {
    // Check permission with specific message
    if (!checkPermission("canUngroupTable", "remove a table from a group")) {
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
    // Check permission with specific message
    if (!checkPermission("canMoveTable", "move table data")) {
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

    // Update both tables in local state
    setTables(
      tables.map((t) => {
        if (t.id === sourceId) return updatedSourceTable
        if (t.id === targetId) return updatedTargetTable
        return t
      }),
    )

    // Dispatch events for real-time updates
    window.dispatchEvent(
      new CustomEvent("table-updated", {
        detail: {
          tableId: targetId,
          table: updatedTargetTable,
        },
      }),
    )

    window.dispatchEvent(
      new CustomEvent("table-updated", {
        detail: {
          tableId: sourceId,
          table: updatedSourceTable,
        },
      }),
    )

    // Also dispatch specific time update events
    if (updatedTargetTable.isActive) {
      window.dispatchEvent(
        new CustomEvent("table-time-update", {
          detail: {
            tableId: targetId,
            remainingTime: updatedTargetTable.remainingTime,
            initialTime: updatedTargetTable.initialTime,
            source: "move-table",
          },
        }),
      )
    }

    // Update both tables in Supabase
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
    // Check permission with specific message
    if (!checkPermission("canUpdateNotes", "update table notes")) {
      return
    }

    // Check if day has been started
    if (!supabaseDayStarted) {
      showPermissionWarningDialog("Please start the day before updating notes", "Day Not Started")
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
      showPermissionWarningDialog(
        "Only administrators can start the day. Please log in with an admin account to perform this action.",
        "Admin Access Required",
      )
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
      showPermissionWarningDialog(
        "Only administrators can end the day. Please log in with an admin account to perform this action.",
        "Admin Access Required",
      )
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
    await updateSupabaseTables(resetTables)
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
    await updateSupabaseTables(resetTables)
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

  // Handle tab change in mobile view
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)

    // If switching to settings tab, show settings dialog
    if (tab === "settings") {
      setShowSettingsDialog(true)
      // Reset back to tables tab after showing dialog
      setActiveTab("tables")
    }

    // If switching to logs tab, show logs dialog
    if (tab === "logs") {
      setShowLogsDialog(true)
      // Reset back to tables tab after showing dialog
      setActiveTab("tables")
    }

    // If switching to servers tab, show server selection dialog
    if (tab === "servers") {
      setShowServerSelectionDialog(true)
      // Reset back to tables tab after showing dialog
      setActiveTab("tables")
    }
  }

  // Handle quick add session
  const handleQuickAddSession = () => {
    // Find the first available inactive table
    const availableTable = tables.find((t) => !t.isActive)

    if (availableTable) {
      setSelectedTable(availableTable)
    } else {
      showNotification("No available tables found", "error")
    }
  }

  // Handle refresh data
  const handleRefreshData = async () => {
    try {
      await syncData()
      showNotification("Data refreshed successfully", "success")
    } catch (error) {
      console.error("Error refreshing data:", error)
      showNotification("Failed to refresh data", "error")
    }
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
    // Show the TouchLogin dialog with empty username to allow selection
    setLoginUsername("")
    setLoginPassword("")
    setShowTouchLogin(true)
  }

  // Handle admin login
  const handleAdminLogin = () => {
    setLoginUsername("admin")
    setLoginPassword("")
    setShowTouchLogin(true)
  }

  // Add a function to exit view-only mode
  const exitViewOnlyMode = () => {
    setViewOnlyMode(false)
    showNotification("Exited view-only mode", "info")
  }

  // Apply accessibility settings
  const applyHighContrastMode = (enabled: boolean) => {
    setHighContrastMode(enabled)
    // Apply high contrast mode to the document
    if (enabled) {
      document.documentElement.classList.add("high-contrast-mode")
    } else {
      document.documentElement.classList.remove("high-contrast-mode")
    }
  }

  const applyLargeTextMode = (enabled: boolean) => {
    setLargeTextMode(enabled)
    // Apply large text mode to the document
    if (enabled) {
      document.documentElement.classList.add("large-text-mode")
    } else {
      document.documentElement.classList.remove("large-text-mode")
    }
  }

  const applySoundEffects = (enabled: boolean) => {
    setSoundEffectsEnabled(enabled)
  }

  // New single login handler
  const handleLogin = () => {
    setShowLoginDialog(true)
  }

  // Rename and update the props passed to the Header component
  const handleStartDay = startDay
  const handleEndDay = endDay
  const handleShowSettings = () => setShowSettingsDialog(true)
  const handleSync = syncData
  const handleToggleFullScreen = toggleFullScreen

  // Mobile view
  const handleTableClick = (table: Table) => {
    setSelectedTable(table)
  }

  const handleAddSession = () => {
    const availableTable = tables.find((t) => !t.isActive)
    if (availableTable) {
      setSelectedTable(availableTable)
    } else {
      showNotification("No available tables found", "error")
    }
  }

  const handleEndSession = (tableId: number) => {
    confirmEndSession(tableId)
  }

  return (
    <TooltipProvider>
      <div
        className={`container mx-auto p-2 min-h-screen max-h-screen flex flex-col space-theme font-mono cursor-spaceship overflow-hidden ${
          highContrastMode ? "high-contrast-text" : ""
        } ${largeTextMode ? "large-text" : ""}`}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Add the iOS touch fix component */}
        <IOSTouchFix />

        {/* Remove SpaceBackgroundAnimation since it's now in client-layout */}

        {/* Offline detector */}
        <OfflineDetector />

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

        {/* Only show the Header component on desktop */}
        {!isMobile && (
          <Header
            currentTime={currentTime}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            dayStarted={supabaseDayStarted}
            hasPermission={hasPermission}
            onStartDay={handleStartDay}
            onEndDay={handleEndDay}
            onShowSettings={handleShowSettings}
            onLogout={handleLogout}
            onLogin={handleLogin}
            onSync={handleSync}
            onToggleFullScreen={handleToggleFullScreen}
            tables={tables}
            logs={logs}
            servers={serverUsers}
            animationComplete={animationComplete}
          />
        )}

        {/* Main content area with full height */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Table Grid with full height */}
          <div className={isMobile ? "overflow-y-auto flex-1 pb-16" : "overflow-hidden h-full"}>
            <OrientationAwareContainer>
              {/* Mobile view */}
              {isMobile && (
                <div className="flex flex-col h-screen">
                  <MobileHeader currentTime={currentTime} />
                  <main className="flex-1 overflow-hidden">
                    {activeTab === "tables" && (
                      <div className="h-full overflow-y-auto pb-16">
                        <EnhancedMobileTableList
                          tables={tables}
                          servers={servers}
                          logs={logs}
                          onTableClick={handleTableClick}
                          onAddTime={addTime}
                          onEndSession={handleEndSession}
                          onRefresh={handleRefreshData}
                          noteTemplates={noteTemplates}
                          onStartSession={startTableSession}
                          onUpdateGuestCount={updateGuestCount}
                          onAssignServer={assignServer}
                          onGroupTables={groupTables}
                          onUngroupTable={ungroupTable}
                          onMoveTable={moveTable}
                          onUpdateNotes={updateTableNotes}
                          getServerName={getServerName}
                          viewOnlyMode={viewOnlyMode}
                        />
                      </div>
                    )}

                    {activeTab === "logs" && (
                      <div className="h-full overflow-y-auto pb-16 p-2">
                        <TableSessionLogs logs={logs} />
                      </div>
                    )}
                    {activeTab === "functions" && (
                      <div className="w-full p-4">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">Functions</h2>
                        <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/30 shadow-lg">
                          <p className="text-center text-cyan-300">
                            Functions panel coming soon. This area will contain additional features and utilities.
                          </p>
                        </div>
                      </div>
                    )}
                  </main>

                  <MobileBottomNav
                    onTabChange={handleTabChange}
                    onAddSession={handleAddSession}
                    activeTab={activeTab}
                    dayStarted={supabaseDayStarted}
                    isAdmin={isAdmin}
                    onStartDay={handleStartDay}
                    onEndDay={handleEndDay}
                    onShowSettings={handleShowSettings}
                    onLogout={handleLogout}
                    onLogin={handleLogin}
                  />
                </div>
              )}
              {!isMobile && (
                <TableGrid tables={tables} servers={serverUsers} logs={logs} onTableClick={openTableDialog} />
              )}
            </OrientationAwareContainer>
          </div>
        </div>

        {/* Permission Warning Dialog */}
        <Dialog open={showPermissionWarning} onOpenChange={setShowPermissionWarning}>
          <DialogContent className="bg-gray-900 border-red-500 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-400">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {permissionWarningTitle}
              </DialogTitle>
              <DialogDescription className="text-gray-300">{permissionWarningMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setShowPermissionWarning(false)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Understood
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rest of the components remain the same */}
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

        {showTouchLogin && <TouchLoginDialog onClose={() => setShowTouchLogin(false)} />}
        {/* Pull-up AI Insights Panel */}
        {isAuthenticated && supabaseDayStarted && !isMobile && (
          <PullUpInsightsPanel tables={tables} logs={logs} servers={serverUsers} />
        )}
      </div>
    </TooltipProvider>
  )
}
