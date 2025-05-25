"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect, useCallback, useReducer, useRef, useMemo } from "react"
import { debounce } from "lodash"
import { TableDialog } from "@/components/tables/table-dialog"
import { TableLogsDialog } from "@/components/tables/table-logs-dialog"
import { DayReportDialog } from "@/components/dialogs/day-report-dialog"
import { SettingsDialog } from "@/components/dialogs/settings-dialog"
import { UserManagementDialog } from "@/components/admin/user-management-dialog"
import { LoginDialog } from "@/components/auth/login-dialog"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useAuth } from "@/contexts/auth-context"
import { PullUpInsightsPanel } from "@/components/system/pull-up-insights-panel"
import { SessionFeedbackDialog } from "@/components/dialogs/session-feedback-dialog"
import { Header } from "@/components/layout/header"
import { TableGrid } from "@/components/tables/table-grid"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import { TouchLogin } from "@/components/auth/touch-login"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useTableStore } from "@/utils/table-state-manager"
import { BigBangAnimation } from "@/components/animations/big-bang-animation"
import { ExplosionAnimation } from "@/components/animations/explosion-animation"
import { EnhancedMobileTableList } from "@/components/mobile/enhanced-mobile-table-list"
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav"
import { OfflineDetector } from "@/components/mobile/offline-detector" // Corrected path if needed
import { OrientationAwareContainer } from "@/components/mobile/orientation-aware-container"
import { useMobile } from "@/hooks/use-mobile"
import { IOSTouchFix } from "@/components/ios-touch-fix"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { TableSessionLogs } from "@/components/mobile/table-session-logs"
import { FunctionsDashboard } from "@/components/system/functions-dashboard"
import { THRESHOLDS, BUSINESS_HOURS, DEFAULT_SESSION_TIME, TABLE_COUNT } from "@/constants"
import { useTableActions } from "@/hooks/use-table-actions"
import type { User as AuthUser } from "@/types/user" // Using the User type from types/user for currentUser

// Interfaces (can be moved to a types file if not already)
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
  sessionStartTime?: number | null // Added this for consistency if used by logs in dialog
}

export interface Server {
  id: string
  name: string
  enabled: boolean
}

export interface NoteTemplate {
  id: string
  text: string
}

export interface LogEntry {
  id: string
  tableId: number
  tableName: string
  action: string
  timestamp: number
  details?: string
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
  businessHours: { open: string; close: string }
  dayStarted: boolean
  dayStartTime: number | null
}

interface DashboardState {
  tables: Table[]
  servers: Server[]
  noteTemplates: NoteTemplate[]
  logs: LogEntry[]
  settings: SystemSettings
  selectedTable: Table | null
  showLoginDialog: boolean
  showUserManagementDialog: boolean
  showSettingsDialog: boolean
  showLogsDialog: boolean
  showConfirmDialog: boolean
  confirmMessage: string
  confirmAction: (() => void) | null
  notification: { message: string; type: "success" | "error" | "info" } | null
  showTouchLogin: boolean
  isFullScreen: boolean
  showExitFullScreenConfirm: boolean
  loginAttemptFailed: boolean
  showFeedbackDialog: boolean
  feedbackTable: Table | null
  showDayReportDialog: boolean
  isStartingDay: boolean
  showBigBangAnimation: boolean
  showExplosionAnimation: boolean
  animationComplete: boolean
  activeTab: "tables" | "logs" | "settings" | "servers" | "functions"
  highContrastMode: boolean
  largeTextMode: boolean
  soundEffectsEnabled: boolean
  hideSystemElements: boolean
  showFunctionsDashboard: boolean
  loginUsername: string
  loginPassword: string
  viewOnlyMode: boolean
}

type DashboardAction =
  | { type: "SET_STATE"; payload: Partial<DashboardState> }
  | { type: "SET_TABLES"; payload: Table[] }
  | { type: "UPDATE_TABLE"; payload: Partial<Table> & { id: number } }
  | { type: "SET_NOTIFICATION"; message: string; notificationType: "success" | "error" | "info" }
  | { type: "CLEAR_NOTIFICATION" }

const initialTables: Table[] = Array.from({ length: TABLE_COUNT }, (_, i) => ({
  id: i + 1,
  name: `T${i + 1}`,
  isActive: false,
  startTime: null,
  remainingTime: DEFAULT_SESSION_TIME,
  initialTime: DEFAULT_SESSION_TIME,
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

const initialState: DashboardState = {
  tables: initialTables,
  servers: [],
  noteTemplates: [],
  logs: [],
  settings: {
    defaultSessionTime: DEFAULT_SESSION_TIME,
    warningThreshold: THRESHOLDS.WARNING,
    criticalThreshold: THRESHOLDS.CRITICAL,
    showAnimations: true,
    darkMode: true,
    soundEnabled: true,
    autoEndDay: false,
    autoEndDayTime: BUSINESS_HOURS.CLOSE,
    businessHours: { open: BUSINESS_HOURS.OPEN, close: BUSINESS_HOURS.CLOSE },
    dayStarted: false,
    dayStartTime: null,
  },
  selectedTable: null,
  showLoginDialog: false,
  showUserManagementDialog: false,
  showSettingsDialog: false,
  showLogsDialog: false,
  showConfirmDialog: false,
  confirmMessage: "",
  confirmAction: null,
  notification: null,
  showTouchLogin: false,
  isFullScreen: false,
  showExitFullScreenConfirm: false,
  loginAttemptFailed: false,
  showFeedbackDialog: false,
  feedbackTable: null,
  showDayReportDialog: false,
  isStartingDay: false,
  showBigBangAnimation: false,
  showExplosionAnimation: false,
  animationComplete: true,
  activeTab: "tables",
  highContrastMode: false,
  largeTextMode: false,
  soundEffectsEnabled: true,
  hideSystemElements: false,
  showFunctionsDashboard: false,
  loginUsername: "admin",
  loginPassword: "",
  viewOnlyMode: false,
}

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload }
    case "SET_TABLES":
      return { ...state, tables: action.payload }
    case "UPDATE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload } : t)),
      }
    case "SET_NOTIFICATION":
      return {
        ...state,
        notification: { message: action.message, type: action.notificationType },
      }
    case "CLEAR_NOTIFICATION":
      return { ...state, notification: null }
    default:
      return state
  }
}

// Add this after the dashboardReducer definition
function useGlobalTimer() {
  const timerRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(Date.now())
  const pendingTablesRef = useRef<Set<number>>(new Set())

  const startTimer = useCallback(() => {
    if (timerRef.current) return // Already running

    const tick = () => {
      const now = Date.now()
      const elapsed = now - lastTickRef.current

      // Only dispatch if enough time has passed (at least 500ms)
      if (elapsed >= 500) {
        window.dispatchEvent(new CustomEvent("global-time-tick", { detail: { timestamp: now } }))
        lastTickRef.current = now

        // Process any pending table updates
        if (pendingTablesRef.current.size > 0) {
          const tableIds = Array.from(pendingTablesRef.current)
          pendingTablesRef.current.clear()

          // Dispatch batch update
          window.dispatchEvent(
            new CustomEvent("tables-need-update", {
              detail: { tableIds, timestamp: now },
            }),
          )
        }
      }

      timerRef.current = requestAnimationFrame(tick)
    }

    timerRef.current = requestAnimationFrame(tick)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const queueTableForUpdate = useCallback((tableId: number) => {
    pendingTablesRef.current.add(tableId)
  }, [])

  // Start the timer when the component mounts
  useEffect(() => {
    startTimer()
    return stopTimer
  }, [startTimer, stopTimer])

  return { queueTableForUpdate }
}

export function BilliardsTimerDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  const {
    tables,
    servers,
    noteTemplates: stateNoteTemplates,
    logs,
    settings,
    selectedTable,
    showLoginDialog,
    showUserManagementDialog,
    showSettingsDialog,
    showLogsDialog,
    showConfirmDialog,
    confirmMessage,
    confirmAction,
    notification,
    showTouchLogin,
    isFullScreen,
    showExitFullScreenConfirm,
    loginAttemptFailed,
    showFeedbackDialog,
    feedbackTable,
    showDayReportDialog,
    isStartingDay,
    showBigBangAnimation,
    showExplosionAnimation,
    animationComplete,
    activeTab,
    highContrastMode,
    largeTextMode,
    soundEffectsEnabled,
    hideSystemElements,
    showFunctionsDashboard,
    loginUsername,
    loginPassword,
    viewOnlyMode,
  } = state

  const { isAuthenticated, isAdmin, isServer, currentUser, logout, hasPermission: authHasPermission } = useAuth()
  const isMobile = useMobile()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800)
  const [headerHeight, setHeaderHeight] = useState(60)
  const headerRef = useRef<HTMLDivElement>(null)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const criticalSoundRef = useRef<HTMLAudioElement | null>(null)
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    if (typeof window !== "undefined") {
      criticalSoundRef.current = new Audio("/sounds/critical.mp3")
      notificationSoundRef.current = new Audio("/sounds/notification.mp3")
      successSoundRef.current = new Audio("/sounds/success.mp3")

      // Set volume
      if (criticalSoundRef.current) criticalSoundRef.current.volume = 0.3
      if (notificationSoundRef.current) notificationSoundRef.current.volume = 0.2
      if (successSoundRef.current) successSoundRef.current.volume = 0.2
    }

    return () => {
      // Clean up audio elements
      if (criticalSoundRef.current) {
        criticalSoundRef.current.pause()
        criticalSoundRef.current = null
      }
      if (notificationSoundRef.current) {
        notificationSoundRef.current.pause()
        notificationSoundRef.current = null
      }
      if (successSoundRef.current) {
        successSoundRef.current.pause()
        successSoundRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    dispatch({ type: "SET_STATE", payload: { hideSystemElements: isMobile } })
  }, [isMobile])

  const {
    tables: supabaseTables,
    logs: supabaseLogs,
    servers: supabaseServerUsers,
    noteTemplates: supabaseNoteTemplates,
    dayStarted: supabaseDayStarted,
    groupCounter: supabaseGroupCounter,
    loading: supabaseLoading,
    error: supabaseError,
    updateTable: updateSupabaseTable,
    updateTables: updateSupabaseTables,
    addLogEntry: addSupabaseLogEntry,
    updateSystemSettings: updateSupabaseSystemSettings,
    updateServers: updateSupabaseServers,
    updateNoteTemplates: updateSupabaseNoteTemplates,
    syncData,
  } = useSupabaseData()

  const formatCurrentTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const formatCurrentDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const formatMinutes = (minutes: number) => Math.round(minutes)

  const queueTableUpdate = useCallback(
    (table: Table) => {
      updateSupabaseTable(table)
    },
    [updateSupabaseTable],
  )

  // Add this inside the BilliardsTimerDashboard component, after the state declarations
  const { queueTableForUpdate } = useGlobalTimer()

  // Replace the existing useEffect for timer with this empty one since we're using the global timer
  // Find this useEffect and replace it:
  useEffect(() => {
    // This is now handled by the global timer
  }, [])

  // Optimize the debouncedUpdateTables function
  // Replace the existing declaration with this optimized version
  const debouncedUpdateTables = useMemo(() => {
    // Create a map to store the latest updates for each table
    const latestUpdates = new Map<number, Table>()

    // Create a function to flush updates to the database
    const flushUpdates = () => {
      if (latestUpdates.size === 0) return

      const tablesToUpdate = Array.from(latestUpdates.values())
      latestUpdates.clear()

      if (tablesToUpdate.length > 0) {
        updateSupabaseTables(tablesToUpdate)
      }
    }

    // Create the debounced function
    const debouncedFn = debounce(flushUpdates, 500)

    // Return a function that stores updates and triggers the debounced flush
    return (tablesToUpdate: Table[]) => {
      // Store only the latest update for each table
      tablesToUpdate.forEach((table) => {
        latestUpdates.set(table.id, table)
      })

      // Trigger the debounced flush
      debouncedFn()
    }
  }, [updateSupabaseTables])

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
      dispatch({ type: "SET_NOTIFICATION", message, notificationType: type })
      notificationTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "CLEAR_NOTIFICATION" })
        notificationTimeoutRef.current = null
      }, 3000)

      if (soundEffectsEnabled) {
        try {
          // Play appropriate sound based on notification type
          if (type === "success" && successSoundRef.current) {
            successSoundRef.current.currentTime = 0
            successSoundRef.current.play().catch((e) => console.warn("Could not play sound:", e))
          } else if (type === "error" && criticalSoundRef.current) {
            criticalSoundRef.current.currentTime = 0
            criticalSoundRef.current.play().catch((e) => console.warn("Could not play sound:", e))
          } else if (type === "info" && notificationSoundRef.current) {
            notificationSoundRef.current.currentTime = 0
            notificationSoundRef.current.play().catch((e) => console.warn("Could not play sound:", e))
          }
        } catch (error) {
          console.error("Failed to play notification sound:", error)
        }
      }
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(type === "error" ? [100, 50, 100] : 50)
      }
    },
    [soundEffectsEnabled, isMobile],
  )

  const closeTableDialog = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { selectedTable: null } })
  }, [])

  const { startTableSession, endTableSession } = useTableActions({
    tables,
    dispatch,
    debouncedUpdateTable: queueTableUpdate,
    debouncedUpdateTables,
    addLogEntry: addSupabaseLogEntry, // This should be the one from useSupabaseData
    showNotification,
    formatMinutes,
  })

  // Optimize the handleStartSessionForDialog function
  // Replace the existing implementation with this optimized version
  const handleStartSessionForDialog = useCallback(
    (tableId: number, currentGuestCount: number, currentServerId: string | null) => {
      // Queue this table for immediate update
      queueTableForUpdate(tableId)

      // Call the startTableSession function
      startTableSession(tableId, currentGuestCount, currentServerId, closeTableDialog)
    },
    [startTableSession, closeTableDialog, queueTableForUpdate],
  )

  const hasPermission = useCallback((permission: string) => authHasPermission(permission), [authHasPermission])

  const withPermission = useCallback(
    (permission: string, callback: () => void) => {
      if (!isAuthenticated || !hasPermission(permission)) {
        dispatch({ type: "SET_STATE", payload: { loginAttemptFailed: true } })
        showNotification("Admin login required for this action.", "error")
        return
      }
      callback()
    },
    [isAuthenticated, hasPermission, showNotification],
  )

  useEffect(() => {
    if (supabaseTables) {
      dispatch({ type: "SET_TABLES", payload: supabaseTables })
      supabaseTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any)) // Cast to any if TableData is different
    }
  }, [supabaseTables])

  useEffect(() => {
    if (supabaseLogs) {
      dispatch({ type: "SET_STATE", payload: { logs: supabaseLogs } })
    }
  }, [supabaseLogs])

  useEffect(() => {
    if (supabaseServerUsers) {
      const uniqueServers = supabaseServerUsers.reduce((acc, server) => {
        if (!acc.some((s) => s.id === server.id)) acc.push(server)
        return acc
      }, [] as Server[])
      dispatch({ type: "SET_STATE", payload: { servers: uniqueServers } })
    }
  }, [supabaseServerUsers])

  useEffect(() => {
    if (supabaseNoteTemplates) {
      dispatch({ type: "SET_STATE", payload: { noteTemplates: supabaseNoteTemplates } })
    }
  }, [supabaseNoteTemplates])

  useEffect(() => {
    if (supabaseDayStarted !== undefined && supabaseDayStarted !== settings.dayStarted) {
      dispatch({ type: "SET_STATE", payload: { settings: { ...settings, dayStarted: supabaseDayStarted } } })
    }
  }, [supabaseDayStarted, settings])

  useEffect(() => {
    const updateLayoutHeights = () => {
      setViewportHeight(window.innerHeight)
      setHeaderHeight(headerRef.current?.offsetHeight || 60)
    }
    updateLayoutHeights()
    window.addEventListener("resize", updateLayoutHeights)
    return () => window.removeEventListener("resize", updateLayoutHeights)
  }, [])

  useEffect(() => {
    const timerInterval = setInterval(() => {
      // Renamed to avoid conflict
      const now = new Date()
      setCurrentTime(now)
      window.dispatchEvent(new CustomEvent("global-time-tick", { detail: { timestamp: now.getTime() } }))
    }, 1000)
    return () => clearInterval(timerInterval)
  }, [])

  useEffect(() => {
    const handleTableUpdatedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableId: number; table: Table }>
      const { tableId, table: updatedTableData } = customEvent.detail
      dispatch({ type: "UPDATE_TABLE", payload: { id: tableId, ...updatedTableData } })
    }

    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullscreenElement ||
        (document as any).msFullscreenElement
      )
      dispatch({
        type: "SET_STATE",
        payload: { isFullScreen: isCurrentlyFullScreen, showExitFullScreenConfirm: false },
      })
    }

    window.addEventListener("table-updated", handleTableUpdatedEvent)
    window.addEventListener("fullscreenchange", handleFullScreenChange)
    window.addEventListener("webkitfullscreenchange", handleFullScreenChange)
    window.addEventListener("mozfullscreenchange", handleFullScreenChange)
    window.addEventListener("MSFullscreenChange", handleFullScreenChange)

    return () => {
      window.removeEventListener("table-updated", handleTableUpdatedEvent)
      window.removeEventListener("fullscreenchange", handleFullScreenChange)
      window.removeEventListener("webkitfullscreenchange", handleFullScreenChange)
      window.removeEventListener("mozfullscreenchange", handleFullScreenChange)
      window.removeEventListener("MSFullscreenChange", handleFullScreenChange)
    }
  }, [])

  const toggleFullScreen = useCallback(() => {
    if (isFullScreen) {
      dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: true } })
      return
    }
    const element = document.documentElement
    const requestFullscreen = () =>
      element.requestFullscreen?.() ||
      (element as any).mozRequestFullScreen?.() ||
      (element as any).webkitRequestFullscreen?.() ||
      (element as any).msRequestFullscreen?.() ||
      Promise.reject("Fullscreen API not supported")
    requestFullscreen().catch((error) => {
      console.error("Fullscreen request failed:", error)
      showNotification("Fullscreen mode failed to activate", "error")
    })
  }, [isFullScreen, showNotification])

  const confirmExitFullScreen = useCallback(() => {
    const exitFullscreen = () =>
      document.exitFullscreen?.() ||
      (document as any).mozCancelFullScreen?.() ||
      (document as any).webkitExitFullscreen?.() ||
      (document as any).msExitFullscreen?.() ||
      Promise.reject("Exit Fullscreen API not supported")
    exitFullscreen()
      .catch((error) => console.error("Exit fullscreen failed:", error))
      .finally(() => dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: false } }))
  }, [])

  const addLogEntry = useCallback(
    // This is the dashboard's own addLogEntry
    async (tableId: number, action: string, details = "") => {
      const table = tables.find((t) => t.id === tableId)
      const tableName = tableId === 0 ? "System" : table?.name || `Table ${tableId}`
      await addSupabaseLogEntry(tableId, tableName, action, details) // Call the one from useSupabaseData
    },
    [tables, addSupabaseLogEntry], // Dependency on addSupabaseLogEntry from useSupabaseData
  )

  const openTableDialog = useCallback((tableToOpen: Table) => {
    dispatch({ type: "SET_STATE", payload: { selectedTable: tableToOpen } })
  }, [])

  const confirmEndSession = useCallback(
    (tableId: number) => {
      withPermission("canEndSession", () => {
        const tableToEnd = tables.find((t) => t.id === tableId)
        if (!tableToEnd) return
        dispatch({
          type: "SET_STATE",
          payload: { feedbackTable: tableToEnd, showFeedbackDialog: true },
        })
      })
    },
    [tables, withPermission],
  )

  const handleSessionFeedback = useCallback(
    async (tableId: number, rating: "good" | "bad", comment: string) => {
      try {
        const tableForFeedback = tables.find((t) => t.id === tableId)
        if (!tableForFeedback) {
          showNotification("Table not found for feedback", "error")
          return
        }
        const feedbackDetails = `Rating: ${rating}${comment ? `, Comment: ${comment}` : ""}`
        await addLogEntry(tableId, "Session Feedback", feedbackDetails)
        await endTableSession(tableId, closeTableDialog)
        dispatch({ type: "SET_STATE", payload: { feedbackTable: null, showFeedbackDialog: false } })
      } catch (error) {
        console.error("Failed to handle session feedback:", error)
        showNotification("Failed to submit feedback", "error")
      }
    },
    [tables, addLogEntry, endTableSession, showNotification, closeTableDialog],
  )

  const addTime = useCallback(
    async (tableId: number, minutes = 15) => {
      withPermission("canAddTime", async () => {
        try {
          const table = tables.find((t) => t.id === tableId)
          if (!table) {
            showNotification("Table not found", "error")
            return
          }

          const additionalTime = minutes * 60 * 1000
          const updatedAt = new Date().toISOString()

          if (table.groupId) {
            await addLogEntry(tableId, "Group Time Added", `${minutes} minutes added to group ${table.groupId}`)
            const updatedGroupTables = tables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = t.initialTime + additionalTime
                const newRemainingTime = t.remainingTime + additionalTime
                return {
                  ...t,
                  initialTime: newInitialTime,
                  remainingTime: newRemainingTime,
                  updatedAt,
                }
              }
              return t
            })
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables })
            debouncedUpdateTables(updatedGroupTables.filter((t) => t.groupId === table.groupId))
            showNotification(`Added ${minutes} minutes to ${table.groupId}`, "success")
          } else {
            const newInitialTime = table.initialTime + additionalTime
            const newRemainingTime = table.remainingTime + additionalTime
            const updatedTable = {
              ...table,
              initialTime: newInitialTime,
              remainingTime: newRemainingTime,
              updatedAt,
            }
            dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
            queueTableUpdate(updatedTable)
            await addLogEntry(tableId, "Time Added", `${minutes} minutes added`)
            showNotification(`Added ${minutes} minutes to ${table.name}`, "success")
          }
        } catch (error) {
          console.error("Failed to add time:", error)
          showNotification("Failed to add time", "error")
        }
      })
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch],
  )

  const subtractTime = useCallback(
    async (tableId: number, minutes: number) => {
      withPermission("canSubtractTime", async () => {
        try {
          const table = tables.find((t) => t.id === tableId)
          if (!table) {
            showNotification("Table not found", "error")
            return
          }

          const subtractedTime = minutes * 60 * 1000
          const updatedAt = new Date().toISOString()

          if (table.groupId) {
            await addLogEntry(
              tableId,
              "Group Time Subtracted",
              `${minutes} minutes subtracted from group ${table.groupId}`,
            )
            const updatedGroupTables = tables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = Math.max(0, t.initialTime - subtractedTime)
                const currentElapsedTime =
                  t.isActive && t.startTime ? Date.now() - t.startTime : t.initialTime - t.remainingTime
                const newRemainingTime = newInitialTime - currentElapsedTime
                return {
                  ...t,
                  initialTime: newInitialTime,
                  remainingTime: newRemainingTime,
                  updatedAt,
                }
              }
              return t
            })
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables })
            debouncedUpdateTables(updatedGroupTables.filter((t) => t.groupId === table.groupId))
            showNotification(`Subtracted ${minutes} minutes from ${table.groupId}`, "info")
          } else {
            const newInitialTime = Math.max(0, table.initialTime - subtractedTime)
            const currentElapsedTime =
              table.isActive && table.startTime ? Date.now() - table.startTime : table.initialTime - table.remainingTime
            const newRemainingTime = newInitialTime - currentElapsedTime
            const updatedTable = {
              ...table,
              initialTime: newInitialTime,
              remainingTime: newRemainingTime,
              updatedAt,
            }
            dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
            queueTableUpdate(updatedTable)
            await addLogEntry(tableId, "Time Subtracted", `${minutes} minutes subtracted`)
            showNotification(`Subtracted ${minutes} minutes from ${table.name}`, "info")
          }
        } catch (error) {
          console.error("Failed to subtract time:", error)
          showNotification("Failed to subtract time", "error")
        }
      })
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch],
  )

  const updateGuestCount = useCallback(
    async (tableId: number, count: number) => {
      withPermission("canUpdateGuests", async () => {
        try {
          if (!settings.dayStarted) {
            showNotification("Please start the day before updating guest count", "error")
            return
          }
          const table = tables.find((t) => t.id === tableId)
          if (!table) {
            showNotification("Table not found", "error")
            return
          }
          const newCount = Math.max(0, Math.min(16, count))
          if (newCount !== table.guestCount) {
            await addLogEntry(tableId, "Players Updated", `Changed from ${table.guestCount} to ${newCount}`)
          }
          const updatedTable = { ...table, guestCount: newCount, updatedAt: new Date().toISOString() }
          dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
          queueTableUpdate(updatedTable)
        } catch (error) {
          console.error("Failed to update guest count:", error)
          showNotification("Failed to update guest count", "error")
        }
      })
    },
    [tables, settings.dayStarted, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch],
  )

  const assignServer = useCallback(
    async (tableId: number, serverId: string | null) => {
      if (!isAuthenticated) {
        showNotification("Please log in to assign servers.", "error")
        // dispatch({ type: "SET_STATE", payload: { loginAttemptFailed: true } }); // Consider if needed
        return
      }
      // Permission check: admin, specific permission, or server assigning to themselves.
      if (!isAdmin && !hasPermission("canAssignServer") && !(isServer && currentUser?.id === serverId)) {
        // Allow server to assign to themselves IF the table is unassigned or already assigned to them
        const currentTable = tables.find((t) => t.id === tableId)
        if (
          !(
            isServer &&
            currentUser?.id === serverId &&
            (!currentTable?.server || currentTable?.server === currentUser?.id)
          )
        ) {
          showNotification("You do not have permission to assign this server.", "error")
          return
        }
      }
      try {
        const table = tables.find((t) => t.id === tableId)
        if (!table) {
          showNotification(`Error: Table ${tableId} not found`, "error")
          return
        }
        const updatedTable = { ...table, server: serverId || null, updatedAt: new Date().toISOString() }
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
        if (selectedTable?.id === tableId) {
          dispatch({ type: "SET_STATE", payload: { selectedTable: updatedTable } })
        }
        queueTableUpdate(updatedTable)
        const serverName = serverId ? servers.find((s) => s.id === serverId)?.name || "Unknown" : "Unassigned"
        await addLogEntry(tableId, "Server Assigned", `Server: ${serverName}`)
        showNotification(`Assigned ${serverName} to table ${tableId}`, "success")
      } catch (error) {
        console.error("Failed to assign server:", error)
        showNotification("Failed to assign server", "error")
      }
    },
    [
      tables,
      servers,
      isAuthenticated,
      isAdmin,
      isServer,
      currentUser,
      hasPermission,
      selectedTable,
      addLogEntry,
      showNotification,
      queueTableUpdate,
      dispatch,
    ],
  )

  // Optimize the groupTables function
  // Replace the existing implementation with this optimized version
  const groupTables = useCallback(
    async (tableIds: number[]) => {
      withPermission("canGroupTables", async () => {
        try {
          if (tableIds.length < 2) {
            showNotification("Select at least two tables to group", "error")
            return
          }
          const currentGroupCounter = supabaseGroupCounter || 0
          const groupName = `Group ${currentGroupCounter + 1}`

          await updateSupabaseSystemSettings(settings.dayStarted, currentGroupCounter + 1)

          const tableNamesForLog = tableIds.map((id) => tables.find((t) => t.id === id)?.name || `T${id}`).join(", ")
          await addLogEntry(tableIds[0], "Tables Grouped", `Group: ${groupName}, Tables: ${tableNamesForLog}`)

          const activeContainedTables = tables.filter((t) => tableIds.includes(t.id) && t.isActive)
          const referenceTableForTiming =
            activeContainedTables.length > 0 ? activeContainedTables[0] : tables.find((t) => t.id === tableIds[0])

          const groupProps =
            referenceTableForTiming && referenceTableForTiming.isActive
              ? {
                  isActive: true,
                  startTime: referenceTableForTiming.startTime,
                  initialTime: referenceTableForTiming.initialTime,
                  remainingTime: referenceTableForTiming.remainingTime,
                }
              : {
                  isActive: false,
                  startTime: null,
                  initialTime: DEFAULT_SESSION_TIME,
                  remainingTime: DEFAULT_SESSION_TIME,
                }

          // Create a batch update instead of updating the entire tables array
          const updatedTables = tableIds
            .map((id) => {
              const table = tables.find((t) => t.id === id)
              if (!table) return null

              return {
                ...table,
                groupId: groupName,
                ...groupProps,
                updatedAt: new Date().toISOString(),
              }
            })
            .filter(Boolean) as Table[]

          // Update only the affected tables in the state
          dispatch({
            type: "SET_TABLES",
            payload: tables.map((table) =>
              tableIds.includes(table.id) ? updatedTables.find((t) => t.id === table.id) || table : table,
            ),
          })

          // Use the optimized batch update
          debouncedUpdateTables(updatedTables)

          showNotification(`Created ${groupName} with ${tableIds.length} tables`, "success")
        } catch (error) {
          console.error("Failed to group tables:", error)
          showNotification("Failed to group tables", "error")
        }
      })
    },
    [
      tables,
      withPermission,
      supabaseGroupCounter,
      settings.dayStarted,
      addLogEntry,
      showNotification,
      updateSupabaseSystemSettings,
      debouncedUpdateTables,
      dispatch,
    ],
  )

  const ungroupTable = useCallback(
    async (tableId: number) => {
      withPermission("canUngroupTable", async () => {
        try {
          const tableToUngroup = tables.find((t) => t.id === tableId)
          if (!tableToUngroup || !tableToUngroup.groupId) {
            showNotification(`Table ${tableToUngroup?.name || tableId} is not part of a group.`, "error")
            return
          }

          const groupIdentifier = tableToUngroup.groupId
          await addLogEntry(
            tableId,
            "Table Ungrouped",
            `Table ${tableToUngroup.name} removed from group ${groupIdentifier}`,
          )

          const updatedTable = {
            ...tableToUngroup,
            groupId: null,
            updatedAt: new Date().toISOString(),
          }

          dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
          queueTableUpdate(updatedTable)

          showNotification(`Table ${updatedTable.name} removed from group ${groupIdentifier}.`, "info")
        } catch (error) {
          console.error("Failed to ungroup table:", error)
          showNotification("Failed to ungroup table", "error")
        }
      })
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch],
  )

  const ungroupSelectedTablesInDashboard = useCallback(
    async (tableIdsToUngroup: number[]) => {
      withPermission("canUngroupTable", async () => {
        try {
          if (tableIdsToUngroup.length === 0) {
            showNotification("No tables selected to ungroup.", "info")
            return
          }

          const firstTableInSelection = tables.find((t) => t.id === tableIdsToUngroup[0])
          const groupIdentifier = firstTableInSelection?.groupId

          await addLogEntry(
            tableIdsToUngroup[0],
            "Tables Ungrouped",
            `Tables: ${tableIdsToUngroup.map((id) => tables.find((t) => t.id === id)?.name || `T${id}`).join(", ")} from group ${groupIdentifier || "Unknown"}`,
          )

          const tablesToUpdateForSupabase: Table[] = []
          const updatedTablesArray = tables.map((table) => {
            if (tableIdsToUngroup.includes(table.id)) {
              const ungroupedTable = {
                ...table,
                groupId: null,
                updatedAt: new Date().toISOString(),
              }
              tablesToUpdateForSupabase.push(ungroupedTable)
              return ungroupedTable
            }
            return table
          })

          dispatch({ type: "SET_TABLES", payload: updatedTablesArray })
          if (tablesToUpdateForSupabase.length > 0) {
            debouncedUpdateTables(tablesToUpdateForSupabase)
          }
          showNotification(`Ungrouped ${tableIdsToUngroup.length} table(s).`, "info")
        } catch (error) {
          console.error("Failed to ungroup tables:", error)
          showNotification("Failed to ungroup tables", "error")
        }
      })
    },
    [tables, withPermission, addLogEntry, showNotification, debouncedUpdateTables, dispatch],
  )

  const moveTable = useCallback(
    async (sourceId: number, targetId: number) => {
      withPermission("canMoveTable", async () => {
        try {
          const sourceTable = tables.find((t) => t.id === sourceId)
          const targetTable = tables.find((t) => t.id === targetId)
          if (!sourceTable || !targetTable) {
            showNotification("Source or target table not found", "error")
            return
          }
          await addLogEntry(sourceId, "Table Moved", `From: ${sourceTable.name} to ${targetTable.name}`)
          const timestamp = new Date().toISOString()
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
            updatedAt: timestamp,
          }
          const resetSourceTable = {
            ...sourceTable,
            isActive: false,
            startTime: null,
            remainingTime: DEFAULT_SESSION_TIME,
            initialTime: DEFAULT_SESSION_TIME,
            guestCount: 0,
            server: null,
            groupId: null,
            hasNotes: false,
            noteId: "",
            noteText: "",
            updatedAt: timestamp,
          }
          const newTables = tables.map((t) =>
            t.id === sourceId ? resetSourceTable : t.id === targetId ? updatedTargetTable : t,
          )
          dispatch({ type: "SET_TABLES", payload: newTables })
          queueTableUpdate(updatedTargetTable)
          queueTableUpdate(resetSourceTable)
          showNotification(`Moved data from ${sourceTable.name} to ${targetTable.name}`, "success")
        } catch (error) {
          console.error("Failed to move table:", error)
          showNotification("Failed to move table", "error")
        }
      })
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch],
  )

  const updateTableNotes = useCallback(
    async (tableId: number, noteId: string, noteText: string) => {
      try {
        const table = tables.find((t) => t.id === tableId)
        if (!table) {
          showNotification("Table not found", "error")
          return
        }

        const hasNotesNow = noteId.trim().length > 0 || noteText.trim().length > 0
        if (hasNotesNow && (!table.hasNotes || table.noteId !== noteId || table.noteText !== noteText)) {
          await addLogEntry(
            tableId,
            "Notes Updated",
            `Note: ${noteText.substring(0, 30)}${noteText.length > 30 ? "..." : ""}`,
          )
        } else if (table.hasNotes && !hasNotesNow) {
          await addLogEntry(tableId, "Notes Removed", "Note cleared")
        }

        const updatedTable = {
          ...table,
          noteId,
          noteText,
          hasNotes: hasNotesNow,
          updatedAt: new Date().toISOString(),
        }
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
        queueTableUpdate(updatedTable)
        if (hasNotesNow) showNotification("Note updated", "info")
        else if (table.hasNotes && !hasNotesNow) showNotification("Note removed", "info")
      } catch (error) {
        console.error("Failed to update notes:", error)
        showNotification("Failed to update notes", "error")
      }
    },
    [tables, addLogEntry, showNotification, queueTableUpdate, dispatch],
  )

  const getServerName = useCallback(
    (serverId: string | null) => {
      if (!serverId) return "Unassigned"
      const server = servers.find((s) => s.id === serverId)
      return server ? server.name : "Unknown"
    },
    [servers],
  )

  const startDay = useCallback(() => {
    if (!isAdmin) {
      showNotification("Admin login required to start the day.", "error")
      return
    }
    dispatch({
      type: "SET_STATE",
      payload: {
        animationComplete: false,
        showDayReportDialog: false,
        isStartingDay: true,
        showBigBangAnimation: true,
      },
    })
  }, [isAdmin, showNotification])

  const completeBigBangAnimation = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { showBigBangAnimation: false, animationComplete: true, showDayReportDialog: true },
    })
  }, [])

  const endDay = useCallback(() => {
    if (!isAdmin) {
      showNotification("Admin login required to end the day.", "error")
      return
    }
    dispatch({
      type: "SET_STATE",
      payload: {
        showConfirmDialog: true,
        confirmMessage: "Are you sure you want to end the day? All active sessions will be ended.",
        confirmAction: () =>
          dispatch({
            type: "SET_STATE",
            payload: {
              animationComplete: false,
              showDayReportDialog: false,
              isStartingDay: false,
              showExplosionAnimation: true,
            },
          }),
      },
    })
  }, [isAdmin, showNotification])

  const completeExplosionAnimation = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { showExplosionAnimation: false, animationComplete: true, showDayReportDialog: true },
    })
  }, [])

  const completeStartDay = useCallback(async () => {
    try {
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }))
      await updateSupabaseTables(resetTables)
      await updateSupabaseSystemSettings(true, 1)
      dispatch({ type: "SET_TABLES", payload: resetTables })
      resetTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any)) // Cast if TableData is different
      await addLogEntry(0, "Day Started", `Started at ${formatCurrentTime(new Date())}`)
      showNotification("Day started successfully", "success")
      dispatch({
        type: "SET_STATE",
        payload: { settings: { ...settings, dayStarted: true, dayStartTime: Date.now() }, isStartingDay: false },
      })
    } catch (error) {
      console.error("Failed to start day:", error)
      showNotification("Failed to start day", "error")
      dispatch({ type: "SET_STATE", payload: { isStartingDay: false } })
    }
  }, [settings, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]) // Added dispatch

  const completeEndDay = useCallback(async () => {
    try {
      const activeTables = tables.filter((t) => t.isActive)
      if (activeTables.length > 0) {
        for (const table of activeTables) {
          await addLogEntry(table.id, "Session Force Ended", `Table ${table.name} was active at day end`)
        }
      }
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }))
      await updateSupabaseTables(resetTables)
      await updateSupabaseSystemSettings(false, 1)
      dispatch({ type: "SET_TABLES", payload: resetTables })
      resetTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any)) // Cast if TableData is different
      await addLogEntry(0, "Day Ended", `Ended at ${formatCurrentTime(new Date())}`)
      showNotification("Day ended successfully", "info")
      dispatch({ type: "SET_STATE", payload: { settings: { ...settings, dayStarted: false, dayStartTime: null } } })
    } catch (error) {
      console.error("Failed to end day:", error)
      showNotification("Failed to end day", "error")
    }
  }, [tables, settings, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]) // Added dispatch

  const handleLogout = useCallback(() => {
    logout()
    showNotification("Logged out successfully", "info")
    dispatch({ type: "SET_STATE", payload: { viewOnlyMode: false } })
  }, [logout, showNotification])

  const handleTabChange = useCallback((tab: string) => {
    dispatch({ type: "SET_STATE", payload: { activeTab: tab as DashboardState["activeTab"] } })
  }, [])

  const handleAddSession = useCallback(() => {
    const availableTable = tables.find((t) => !t.isActive)
    if (availableTable) {
      dispatch({ type: "SET_STATE", payload: { selectedTable: availableTable } })
    } else {
      showNotification("No available tables found", "error")
    }
  }, [tables, showNotification])

  const handleRefreshData = useCallback(async () => {
    try {
      await syncData()
      showNotification("Data refreshed successfully", "success")
    } catch (error) {
      console.error("Error refreshing data:", error)
      showNotification("Failed to refresh data", "error")
    }
  }, [syncData, showNotification])

  const handleAdminLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { loginUsername: "admin", loginPassword: "", showTouchLogin: true } })
  }, [])

  const handleViewerLogin = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { loginUsername: "", loginPassword: "", showTouchLogin: true, viewOnlyMode: true },
    })
  }, [])

  const exitViewOnlyMode = useCallback(() => {
    showNotification("Please log in with appropriate credentials to exit view-only mode.", "info")
    dispatch({ type: "SET_STATE", payload: { showLoginDialog: true } })
  }, [showNotification])

  const applyHighContrastMode = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_STATE", payload: { highContrastMode: enabled } })
    document.documentElement.classList.toggle("high-contrast-mode", enabled)
  }, [])

  const applyLargeTextMode = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_STATE", payload: { largeTextMode: enabled } })
    document.documentElement.classList.toggle("large-text-mode", enabled)
  }, [])

  const applySoundEffects = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_STATE", payload: { soundEffectsEnabled: enabled } })
  }, [])

  const handleLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showLoginDialog: true } })
  }, [])

  const handleShowFunctions = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: true } })
  }, [])

  const memoizedTables = tables
  const memoizedServers = servers
  const memoizedLogs = logs
  const memoizedNoteTemplates = stateNoteTemplates

  const onDialogCloseForDayReport = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showDayReportDialog: false } })
    if (isStartingDay && !settings.dayStarted) {
      completeStartDay()
    } else if (!isStartingDay && settings.dayStarted) {
      completeEndDay()
    }
    dispatch({ type: "SET_STATE", payload: { isStartingDay: false } })
  }, [isStartingDay, settings.dayStarted, completeStartDay, completeEndDay])

  if (supabaseLoading && tables.length === 0 && !initialTables.length) {
    // Adjusted initialTables check
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
        <div className="text-white text-xl animate-pulse">Loading Billiard Universe...</div>
      </div>
    )
  }

  if (supabaseError && !tables.length) {
    // Show error only if no tables are loaded (graceful degradation)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 text-white p-4">
        <h2 className="text-2xl text-red-500 mb-4">Connection Error</h2>
        <p className="text-center mb-2">Could not connect to the live data stream.</p>
        <p className="text-center text-sm text-gray-400 mb-6">
          Please check your internet connection. Data displayed might be outdated.
        </p>
        <Button onClick={handleRefreshData} className="bg-blue-600 hover:bg-blue-700">
          Attempt Reconnect
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={`container mx-auto p-2 min-h-screen max-h-screen flex flex-col space-theme font-mono cursor-spaceship overflow-hidden ${
          highContrastMode ? "high-contrast-text" : ""
        } ${largeTextMode ? "large-text" : ""}`}
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <IOSTouchFix />
        <OfflineDetector />
        {notification && (
          <div
            role="alert"
            className={`fixed top-4 right-4 z-[100] p-4 rounded-md shadow-lg animate-in fade-in slide-in-from-top-5 duration-300 ${
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
        {!isMobile && (
          <Header
            ref={headerRef}
            currentTime={currentTime}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            dayStarted={settings.dayStarted}
            hasPermission={hasPermission}
            onStartDay={startDay}
            onEndDay={endDay}
            onShowSettings={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: true } })}
            onLogout={handleLogout}
            onLogin={handleLogin}
            onSync={handleRefreshData}
            onToggleFullScreen={toggleFullScreen}
            onShowFunctions={handleShowFunctions}
            tables={memoizedTables}
            logs={memoizedLogs}
            servers={memoizedServers}
            animationComplete={animationComplete}
            // @ts-ignore - viewOnlyMode might not be in HeaderProps yet
            viewOnlyMode={viewOnlyMode}
            onExitViewOnly={exitViewOnlyMode}
            onAdminLogin={handleAdminLogin}
            onViewerLogin={handleViewerLogin}
          />
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={isMobile ? "overflow-y-auto flex-1 pb-16" : "overflow-hidden h-full"}>
            <OrientationAwareContainer>
              {isMobile && (
                <div className="flex flex-col h-screen">
                  <MobileHeader
                    currentTime={currentTime}
                    breadcrumbs={[
                      { label: "Space Billiards" },
                      {
                        label:
                          activeTab === "tables"
                            ? "Tables"
                            : activeTab === "logs"
                              ? "Session Logs"
                              : activeTab === "functions"
                                ? "Functions"
                                : "Settings",
                      },
                    ]}
                  />
                  <main className="flex-1 overflow-hidden">
                    {activeTab === "tables" && (
                      <div className="h-full overflow-y-auto pb-16">
                        <EnhancedMobileTableList
                          tables={memoizedTables}
                          servers={memoizedServers}
                          logs={memoizedLogs}
                          onTableClick={openTableDialog}
                          // Removed direct action props, actions are via dialog
                        />
                      </div>
                    )}
                    {activeTab === "logs" && (
                      <div className="h-full overflow-y-auto pb-16 p-2">
                        <TableSessionLogs logs={memoizedLogs} />
                      </div>
                    )}
                    {activeTab === "functions" && (
                      <div className="w-full p-4 h-full overflow-y-auto pb-16">
                        <FunctionsDashboard
                          open={true}
                          onClose={() => {
                            handleTabChange("tables")
                          }}
                        />
                      </div>
                    )}
                  </main>
                  <MobileBottomNav
                    onTabChange={handleTabChange}
                    onAddSession={handleAddSession}
                    activeTab={activeTab}
                    dayStarted={settings.dayStarted}
                    isAdmin={isAdmin}
                    onStartDay={startDay}
                    onEndDay={endDay}
                    onShowSettings={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: true } })}
                    onLogout={handleLogout}
                    onLogin={handleAdminLogin}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              )}
              {!isMobile && (
                <TableGrid
                  tables={memoizedTables}
                  servers={memoizedServers}
                  logs={memoizedLogs}
                  onTableClick={openTableDialog}
                />
              )}
            </OrientationAwareContainer>
          </div>
        </div>

        {selectedTable && (
          <TableDialog
            table={selectedTable}
            servers={memoizedServers}
            allTables={memoizedTables}
            noteTemplates={memoizedNoteTemplates}
            logs={memoizedLogs}
            onClose={closeTableDialog}
            onStartSession={handleStartSessionForDialog} // MODIFIED: Pass the new handler
            onEndSession={confirmEndSession}
            onAddTime={addTime}
            onSubtractTime={subtractTime}
            onUpdateGuestCount={updateGuestCount}
            onAssignServer={assignServer}
            onGroupTables={groupTables}
            onUngroupTable={ungroupTable}
            onUngroupSelectedTables={ungroupSelectedTablesInDashboard}
            onMoveTable={moveTable}
            onUpdateNotes={updateTableNotes}
            getServerName={getServerName}
            currentUser={currentUser as AuthUser | null} // Cast to imported User type
            hasPermission={hasPermission}
            viewOnlyMode={viewOnlyMode}
          />
        )}

        {feedbackTable && (
          <SessionFeedbackDialog
            open={showFeedbackDialog}
            onClose={() => dispatch({ type: "SET_STATE", payload: { showFeedbackDialog: false, feedbackTable: null } })}
            table={feedbackTable}
            onSubmitFeedback={handleSessionFeedback}
          />
        )}
        <ConfirmDialog
          open={showConfirmDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showConfirmDialog: false, confirmAction: null } })}
          onConfirm={() => {
            if (confirmAction) confirmAction()
            dispatch({ type: "SET_STATE", payload: { showConfirmDialog: false, confirmAction: null } })
          }}
          message={confirmMessage}
        />
        <ConfirmDialog
          open={showExitFullScreenConfirm}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: false } })}
          onConfirm={confirmExitFullScreen}
          message="Are you sure you want to exit full screen mode?"
        />
        <DayReportDialog
          open={showDayReportDialog}
          onClose={onDialogCloseForDayReport}
          tables={memoizedTables}
          logs={memoizedLogs}
          servers={memoizedServers}
          isStarting={isStartingDay}
          // @ts-ignore - dayStartTime might be number | null, ensure DayReportDialog handles this
          dayStartTime={settings.dayStartTime}
        />
        <SettingsDialog
          open={showSettingsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false } })}
          servers={memoizedServers}
          onUpdateServers={updateSupabaseServers}
          noteTemplates={memoizedNoteTemplates}
          onUpdateNoteTemplates={updateSupabaseNoteTemplates}
          onShowUserManagement={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showUserManagementDialog: true } })
          }}
          onShowLogs={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showLogsDialog: true } })
          }}
          onLogout={handleLogout}
          showAdminControls={isAuthenticated && settings.dayStarted}
          currentSettings={settings}
          onUpdateSettings={(updatedSettings) =>
            updateSupabaseSystemSettings(updatedSettings.dayStarted, updatedSettings.groupCounter || 1)
          } // Pass correct args
          onApplyHighContrast={applyHighContrastMode}
          onApplyLargeText={applyLargeTextMode}
          onApplySoundEffects={applySoundEffects}
          highContrastMode={highContrastMode}
          largeTextMode={largeTextMode}
          soundEffectsEnabled={soundEffectsEnabled}
        />
        <TableLogsDialog
          open={showLogsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showLogsDialog: false } })}
          logs={memoizedLogs}
        />
        <LoginDialog
          open={showLoginDialog}
          onClose={() =>
            dispatch({ type: "SET_STATE", payload: { showLoginDialog: false, loginAttemptFailed: false } })
          }
          // @ts-ignore - prop might not exist
          loginAttemptFailed={loginAttemptFailed}
          onLoginSuccess={() => {
            // onLoginSuccess is not a prop of LoginDialog
            dispatch({
              type: "SET_STATE",
              payload: { showLoginDialog: false, loginAttemptFailed: false, viewOnlyMode: false },
            })
            showNotification("Login successful!", "success")
          }}
          // @ts-ignore
          onSetViewOnly={() => dispatch({ type: "SET_STATE", payload: { viewOnlyMode: true, showLoginDialog: false } })}
        />
        <UserManagementDialog
          open={showUserManagementDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showUserManagementDialog: false } })}
        />
        {settings.showAnimations &&
          typeof window !== "undefined" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches && (
            <>
              {showBigBangAnimation && <BigBangAnimation onComplete={completeBigBangAnimation} />}
              {showExplosionAnimation && <ExplosionAnimation onComplete={completeExplosionAnimation} />}
            </>
          )}
        <TouchLogin
          isOpen={showTouchLogin} // Changed prop name to match component
          onClose={() => dispatch({ type: "SET_STATE", payload: { showTouchLogin: false } })}
          // defaultUsername={loginUsername} // TouchLogin doesn't take these
          // defaultPassword={loginPassword}
          onLogin={(user) => {
            // onLogin in TouchLogin returns the user object
            dispatch({ type: "SET_STATE", payload: { showTouchLogin: false, viewOnlyMode: user.role === "viewer" } })
            showNotification(`Logged in as ${user.name || "user"}!`, "success")
          }}
        />
        {isAuthenticated && settings.dayStarted && !isMobile && (
          <PullUpInsightsPanel tables={memoizedTables} logs={memoizedLogs} servers={memoizedServers} />
        )}
        <FunctionsDashboard
          open={showFunctionsDashboard}
          onClose={() =>
            dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: false, activeTab: "tables" } })
          } // Reset active tab
        />
      </div>
    </TooltipProvider>
  )
}
