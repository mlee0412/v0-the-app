"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"

// Utility logger that only outputs in development
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}
import type { Table, Server, NoteTemplate, LogEntry } from "@/components/billiards-timer-dashboard"
import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient, isSupabaseConfigured, checkSupabaseConnection } from "@/lib/supabase/client"
import deepEqual from "fast-deep-equal"
import type { RealtimeSubscription } from "@supabase/supabase-js"
import { debounce } from "@/utils/timer-sync-utils"

// Default time in milliseconds (60 minutes)
const DEFAULT_TIME = 60 * 60 * 1000

// Default note templates
const defaultNoteTemplates: NoteTemplate[] = [
  { id: uuidv4(), text: "VIP guest" },
  { id: uuidv4(), text: "Pay at front" },
  { id: uuidv4(), text: "Prepaid" },
  { id: uuidv4(), text: "Underage" },
  { id: uuidv4(), text: "Reservation" },
]

// Default server list with proper UUIDs
const defaultServers: Server[] = [
  { id: uuidv4(), name: "Mike", enabled: true },
  { id: uuidv4(), name: "Ji", enabled: true },
  { id: uuidv4(), name: "Gun", enabled: true },
  { id: uuidv4(), name: "Alex", enabled: true },
  { id: uuidv4(), name: "Lucy", enabled: true },
  { id: uuidv4(), name: "Tanya", enabled: true },
  { id: uuidv4(), name: "Ian", enabled: true },
  { id: uuidv4(), name: "Rolando", enabled: true },
  { id: uuidv4(), name: "Alexa", enabled: true },
  { id: uuidv4(), name: "Diego", enabled: true },
  { id: uuidv4(), name: "BB", enabled: true },
]

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
  statusIndicators: [],
  updated_by_admin: false,
  updated_by: null,
  updatedAt: new Date().toISOString(),
}))

// Convert table to Supabase format (snake_case)
function convertTableToSupabase(table: Table) {
  return {
    id: table.id,
    name: table.name,
    is_active: table.isActive,
    start_time: table.startTime,
    remaining_time: table.remainingTime,
    initial_time: table.initialTime,
    guest_count: table.guestCount,
    // Fix: Ensure server_id is null when server is null, undefined, or empty string
    server_id: table.server && table.server.trim() !== "" ? table.server : null,
    group_id: table.groupId && table.groupId.trim() !== "" ? table.groupId : null,
    has_notes: table.hasNotes,
    note_id: table.noteId && table.noteId.trim() !== "" ? table.noteId : null,
    note_text: table.noteText || "",
    status_indicators: table.statusIndicators || [],
    updated_by_admin: table.updated_by_admin,
    updated_by: table.updated_by && table.updated_by.trim() !== "" ? table.updated_by : null,
    updated_at: table.updatedAt,
  }
}

// Convert log to Supabase format (snake_case)
function convertLogToSupabase(log: LogEntry) {
  return {
    id: log.id || uuidv4(),
    table_id: log.tableId,
    table_name: log.tableName,
    action: log.action,
    timestamp: log.timestamp,
    details: log.details || "",
  }
}

// Table names configuration
const TABLE_NAMES = {
  TABLES: "billiard_tables",
  LOGS: "session_logs",
  SETTINGS: "system_settings",
  SERVERS: "servers",
  TEMPLATES: "note_templates",
}

export function useSupabaseData() {
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [servers, setServers] = useState<Server[]>(defaultServers)
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>(defaultNoteTemplates)
  const [dayStarted, setDayStarted] = useState(false)
  const [groupCounter, setGroupCounter] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [adminPresent, setAdminPresent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [useLocalStorage, setUseLocalStorage] = useState(!isSupabaseConfigured())
  const [offlineMode, setOfflineMode] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)

  // Use refs to track previous values to prevent unnecessary updates
  const prevTablesRef = useRef<Table[]>(initialTables)
  const prevLogsRef = useRef<LogEntry[]>([])
  const prevServersRef = useRef<Server[]>(defaultServers)
  const prevTemplatesRef = useRef<NoteTemplate[]>(defaultNoteTemplates)
  const lastTimerSyncRef = useRef<number>(Date.now())
  const TIMER_SYNC_INTERVAL = 15000
  const pendingUpdatesRef = useRef<Map<number, Partial<Table>>>(new Map())
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionsRef = useRef<(() => void)[]>([])
  const lastConnectionAttempt = useRef<number>(0)
  const CONNECTION_RETRY_DELAY = 5000 // 5 seconds between connection attempts
  const reconnectBackoffRef = useRef<number>(1000) // Start with 1 second, will increase exponentially

  // Debounced localStorage writer
  const localStorageWriterRef = useRef<{ setItem: (k: string, v: string) => void; flush: () => void }>()

  if (!localStorageWriterRef.current) {
    const queue = new Map<string, string>()
    const flush = () => {
      queue.forEach((value, key) => {
        try {
          localStorage.setItem(key, value)
        } catch (err) {
          console.error("Error writing to localStorage:", err)
        }
      })
      queue.clear()
    }

    const debouncedFlush = debounce(flush, 100)

    localStorageWriterRef.current = {
      setItem: (key: string, value: string) => {
        queue.set(key, value)
        debouncedFlush()
      },
      flush,
    }
  }

  // Check if current user is admin
  useEffect(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      setIsAdmin(currentUser?.role === "admin")
    } catch (err) {
      console.error("Error checking admin status:", err)
      setIsAdmin(false)
    }
  }, [])

  // Test Supabase connection with improved error handling and backoff
  const testConnection = useCallback(async () => {
    const now = Date.now()

    // Throttle connection attempts
    if (now - lastConnectionAttempt.current < CONNECTION_RETRY_DELAY) {
      return offlineMode ? false : !useLocalStorage
    }

    lastConnectionAttempt.current = now

    if (useLocalStorage || !isSupabaseConfigured()) {
      debugLog("Using localStorage mode (Supabase not configured)")
      setOfflineMode(true)
      setUseLocalStorage(true)
      setConnectionTested(true)
      return false
    }

    try {
      const { connected } = await checkSupabaseConnection()

      debugLog("Supabase connection test:", connected ? "Connected" : "Failed")

      if (connected) {
        setOfflineMode(false)
        setUseLocalStorage(false)
        reconnectBackoffRef.current = 1000 // Reset backoff on successful connection
        window.dispatchEvent(new CustomEvent("supabase-connected"))
      } else {
        // Only switch to offline mode if we're not already in it
        if (!offlineMode) {
          setOfflineMode(true)
          setUseLocalStorage(true)
          window.dispatchEvent(new CustomEvent("supabase-disconnected"))
        }
      }

      setConnectionTested(true)
      return connected
    } catch (err) {
      console.error("Error testing Supabase connection:", err)

      // Only switch to offline mode if we're not already in it
      if (!offlineMode) {
        setOfflineMode(true)
        setUseLocalStorage(true)
        window.dispatchEvent(new CustomEvent("supabase-disconnected"))
      }

      setConnectionTested(true)
      return false
    }
  }, [useLocalStorage, offlineMode])

  // Function to load all data with improved error handling
  const loadAllData = useCallback(async () => {
    try {
      debugLog("Loading all data...")
      setLoading(true)

      // Test connection if not tested yet
      if (!connectionTested) {
        await testConnection()
      }

      // Load data from localStorage if Supabase is not available
      if (useLocalStorage) {
        loadFromLocalStorage()
        return
      }

      // Try to load from Supabase
      try {
        const supabase = getSupabaseClient()

        // Use Promise.allSettled to handle partial failures
        const [tablesResult, logsResult, settingsResult, serversResult, templatesResult] = await Promise.allSettled([
          // Load tables - SELECTIVE COLUMNS
          supabase
            .from(TABLE_NAMES.TABLES)
            .select(
              "id, name, is_active, start_time, remaining_time, initial_time, guest_count, server_id, group_id, has_notes, note_id, note_text, status_indicators, updated_by_admin, updated_by, updated_at",
            ),

          // Load logs
          supabase
            .from(TABLE_NAMES.LOGS)
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(100), // Limit to 100 most recent logs for performance

          // Load settings
          supabase
            .from(TABLE_NAMES.SETTINGS)
            .select("*")
            .eq("id", 1)
            .single(),

          // Load servers
          supabase
            .from(TABLE_NAMES.SERVERS)
            .select("*"),

          // Load templates
          supabase
            .from(TABLE_NAMES.TEMPLATES)
            .select("*"),
        ])

        // Process tables data
        if (tablesResult.status === "fulfilled" && !tablesResult.value.error && tablesResult.value.data?.length > 0) {
          // Convert from snake_case to camelCase
          const convertedTables = tablesResult.value.data.map((table: any) => ({
            id: table.id,
            name: table.name,
            isActive: table.is_active,
            startTime: table.start_time,
            remainingTime: table.remaining_time,
            initialTime: table.initial_time,
            guestCount: table.guest_count,
            server: table.server_id, // Changed from server_id to server
            groupId: table.group_id,
            hasNotes: table.has_notes,
            noteId: table.note_id || "",
            noteText: table.note_text || "",
            statusIndicators: table.status_indicators || [],
            updated_by_admin: table.updated_by_admin || false,
            updated_by: table.updated_by || null,
            updatedAt: table.updated_at || new Date().toISOString(),
          }))

          // Only update if there are actual changes
          if (!deepEqual(convertedTables, prevTablesRef.current)) {
            setTables(convertedTables)
            prevTablesRef.current = convertedTables
            // Save to localStorage as backup
            localStorage.setItem("tables", JSON.stringify(convertedTables))
          }
        } else {
          console.warn(
            "Failed to load tables from Supabase, using localStorage",
            tablesResult.status === "rejected" ? tablesResult.reason : tablesResult.value.error,
          )
          loadTablesFromLocalStorage()
        }

        // Process logs data
        if (logsResult.status === "fulfilled" && !logsResult.value.error) {
          // Convert from snake_case to camelCase and ensure timestamp is a number
          const convertedLogs = logsResult.value.data.map((log: any) => ({
            id: log.id,
            tableId: log.table_id,
            tableName: log.table_name,
            action: log.action,
            timestamp: typeof log.timestamp === "string" ? new Date(log.timestamp).getTime() : log.timestamp,
            details: log.details || "",
          }))

          // Only update if there are actual changes
          if (!deepEqual(convertedLogs, prevLogsRef.current)) {
            setLogs(convertedLogs)
            prevLogsRef.current = convertedLogs
            // Save to localStorage as backup
            localStorage.setItem("logs", JSON.stringify(convertedLogs))
          }
        } else {
          console.warn(
            "Failed to load logs from Supabase, using localStorage",
            logsResult.status === "rejected" ? logsResult.reason : logsResult.value.error,
          )
          loadLogsFromLocalStorage()
        }

        // Process settings data
        if (settingsResult.status === "fulfilled" && !settingsResult.value.error) {
          setDayStarted(settingsResult.value.data.day_started || false)
          setGroupCounter(settingsResult.value.data.group_counter || 1)
          // Save to localStorage as backup
          localStorage.setItem("dayStarted", String(settingsResult.value.data.day_started || false))
          localStorage.setItem("groupCounter", String(settingsResult.value.data.group_counter || 1))
        } else {
          console.warn(
            "Failed to load settings from Supabase, using localStorage",
            settingsResult.status === "rejected" ? settingsResult.reason : settingsResult.value.error,
          )
          loadSettingsFromLocalStorage()
        }

        // Process servers data
        if (
          serversResult.status === "fulfilled" &&
          !serversResult.value.error &&
          serversResult.value.data?.length > 0
        ) {
          // Only update if there are actual changes
          if (!deepEqual(serversResult.value.data, prevServersRef.current)) {
            setServers(serversResult.value.data)
            prevServersRef.current = serversResult.value.data
            // Save to localStorage as backup
            localStorage.setItem("servers", JSON.stringify(serversResult.value.data))
          }
        } else {
          console.warn(
            "Failed to load servers from Supabase, using localStorage",
            serversResult.status === "rejected" ? serversResult.reason : serversResult.value.error,
          )
          loadServersFromLocalStorage()
        }

        // Process templates data
        if (
          templatesResult.status === "fulfilled" &&
          !templatesResult.value.error &&
          templatesResult.value.data?.length > 0
        ) {
          // Only update if there are actual changes
          if (!deepEqual(templatesResult.value.data, prevTemplatesRef.current)) {
            setNoteTemplates(templatesResult.value.data)
            prevTemplatesRef.current = templatesResult.value.data
            // Save to localStorage as backup
            localStorage.setItem("noteTemplates", JSON.stringify(templatesResult.value.data))
          }
        } else {
          console.warn(
            "Failed to load note templates from Supabase, using localStorage",
            templatesResult.status === "rejected" ? templatesResult.reason : templatesResult.value.error,
          )
          loadTemplatesFromLocalStorage()
        }

        // If we got here, we're online
        setOfflineMode(false)
      } catch (err) {
        console.error("Error loading data from Supabase:", err)
        setUseLocalStorage(true)
        setOfflineMode(true)
        loadFromLocalStorage()
      }

      setLastSyncTime(new Date())
      setError(null)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load data")
      setOfflineMode(true)
    } finally {
      setLoading(false)
    }
  }, [useLocalStorage, connectionTested, testConnection])

  // Load data from localStorage
  const loadFromLocalStorage = useCallback(() => {
    loadTablesFromLocalStorage()
    loadLogsFromLocalStorage()
    loadSettingsFromLocalStorage()
    loadServersFromLocalStorage()
    loadTemplatesFromLocalStorage()
    setLastSyncTime(new Date())
  }, [])

  // Load tables from localStorage
  const loadTablesFromLocalStorage = useCallback(() => {
    try {
      const storedTables = localStorage.getItem("tables")
      if (storedTables) {
        const parsedTables = JSON.parse(storedTables)
        if (Array.isArray(parsedTables) && parsedTables.length > 0) {
          // Only update if there are actual changes
          if (!deepEqual(parsedTables, prevTablesRef.current)) {
            setTables(parsedTables)
            prevTablesRef.current = parsedTables
          }
        } else {
          setTables(initialTables)
          prevTablesRef.current = initialTables
          localStorage.setItem("tables", JSON.stringify(initialTables))
        }
      } else {
        setTables(initialTables)
        prevTablesRef.current = initialTables
        localStorage.setItem("tables", JSON.stringify(initialTables))
      }
    } catch (e) {
      console.error("Error loading tables from localStorage:", e)
      setTables(initialTables)
      prevTablesRef.current = initialTables
      localStorage.setItem("tables", JSON.stringify(initialTables))
    }
  }, [])

  // Load logs from localStorage
  const loadLogsFromLocalStorage = useCallback(() => {
    try {
      const storedLogs = localStorage.getItem("logs")
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs)
        if (Array.isArray(parsedLogs)) {
          // Only update if there are actual changes
          if (!deepEqual(parsedLogs, prevLogsRef.current)) {
            setLogs(parsedLogs)
            prevLogsRef.current = parsedLogs
          }
        } else {
          setLogs([])
          prevLogsRef.current = []
          localStorage.setItem("logs", JSON.stringify([]))
        }
      } else {
        setLogs([])
        prevLogsRef.current = []
        localStorage.setItem("logs", JSON.stringify([]))
      }
    } catch (e) {
      console.error("Error loading logs from localStorage:", e)
      setLogs([])
      prevLogsRef.current = []
      localStorage.setItem("logs", JSON.stringify([]))
    }
  }, [])

  // Load settings from localStorage
  const loadSettingsFromLocalStorage = useCallback(() => {
    try {
      const storedDayStarted = localStorage.getItem("dayStarted")
      if (storedDayStarted !== null) {
        setDayStarted(storedDayStarted === "true")
      } else {
        setDayStarted(false)
        localStorage.setItem("dayStarted", "false")
      }

      const storedGroupCounter = localStorage.getItem("groupCounter")
      if (storedGroupCounter) {
        setGroupCounter(Number.parseInt(storedGroupCounter, 10))
      } else {
        setGroupCounter(1)
        localStorage.setItem("groupCounter", "1")
      }
    } catch (e) {
      console.error("Error loading settings from localStorage:", e)
      setDayStarted(false)
      setGroupCounter(1)
      localStorage.setItem("dayStarted", "false")
      localStorage.setItem("groupCounter", "1")
    }
  }, [])

  // Load servers from localStorage
  const loadServersFromLocalStorage = useCallback(() => {
    try {
      const storedServers = localStorage.getItem("servers")
      if (storedServers) {
        const parsedServers = JSON.parse(storedServers)
        if (Array.isArray(parsedServers) && parsedServers.length > 0) {
          // Only update if there are actual changes
          if (!deepEqual(parsedServers, prevServersRef.current)) {
            setServers(parsedServers)
            prevServersRef.current = parsedServers
          }
        } else {
          setServers(defaultServers)
          prevServersRef.current = defaultServers
          localStorage.setItem("servers", JSON.stringify(defaultServers))
        }
      } else {
        setServers(defaultServers)
        prevServersRef.current = defaultServers
        localStorage.setItem("servers", JSON.stringify(defaultServers))
      }
    } catch (e) {
      console.error("Error loading servers from localStorage:", e)
      setServers(defaultServers)
      prevServersRef.current = defaultServers
      localStorage.setItem("servers", JSON.stringify(defaultServers))
    }
  }, [])

  // Load note templates from localStorage
  const loadTemplatesFromLocalStorage = useCallback(() => {
    try {
      const storedTemplates = localStorage.getItem("noteTemplates")
      if (storedTemplates) {
        const parsedTemplates = JSON.parse(storedTemplates)
        if (Array.isArray(parsedTemplates) && parsedTemplates.length > 0) {
          // Only update if there are actual changes
          if (!deepEqual(parsedTemplates, prevTemplatesRef.current)) {
            setNoteTemplates(parsedTemplates)
            prevTemplatesRef.current = parsedTemplates
          }
        } else {
          setNoteTemplates(defaultNoteTemplates)
          prevTemplatesRef.current = defaultNoteTemplates
          localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
        }
      } else {
        setNoteTemplates(defaultNoteTemplates)
        prevTemplatesRef.current = defaultNoteTemplates
        localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
      }
    } catch (e) {
      console.error("Error loading note templates from localStorage:", e)
      setNoteTemplates(defaultNoteTemplates)
      prevTemplatesRef.current = defaultNoteTemplates
      localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
    }
  }, [])

  // INITIAL FETCH ON MOUNT
  useEffect(() => {
    loadAllData()

    // Clean up function
    return () => {
      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Flush any pending localStorage writes
      localStorageWriterRef.current?.flush()

      // Clean up all subscriptions
      subscriptionsRef.current.forEach((unsubscribe) => unsubscribe())
      subscriptionsRef.current = []
    }
  }, [loadAllData])

  // CLEAN REALTIME SUBSCRIPTIONS
  useEffect(() => {
    // Clean up existing subscriptions first
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe())
    subscriptionsRef.current = []

    let tablesSub: RealtimeSubscription | null = null
    let logsSub: RealtimeSubscription | null = null
    let settingsSub: RealtimeSubscription | null = null
    let serversSub: RealtimeSubscription | null = null

    try {
      if (!useLocalStorage && isSupabaseConfigured()) {
        const supabase = getSupabaseClient()

        // Set up more resilient subscriptions with error handling
        try {
          tablesSub = supabase
            .channel("tables-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.TABLES }, ({ new: newTbl }) => {
              setTables((ts) => {
                // Only update the specific table that changed
                const updatedTables = ts.map((t) =>
                  t.id === newTbl.id
                    ? {
                        id: newTbl.id,
                        name: newTbl.name,
                        isActive: newTbl.is_active,
                        startTime: newTbl.start_time,
                        remainingTime: newTbl.remaining_time,
                        initialTime: newTbl.initial_time,
                        guestCount: newTbl.guest_count,
                        server: newTbl.server_id,
                        groupId: newTbl.group_id,
                        hasNotes: newTbl.has_notes,
                        noteId: newTbl.note_id || "",
                        noteText: newTbl.note_text || "",
                        statusIndicators: newTbl.status_indicators || [],
                        updated_by_admin: newTbl.updated_by_admin || false,
                        updated_by: newTbl.updated_by || null,
                        updatedAt: newTbl.updated_at || new Date().toISOString(),
                      }
                    : t,
                )

                // Only update state if there's an actual change
                if (!deepEqual(updatedTables, ts)) {
                  prevTablesRef.current = updatedTables
                  return updatedTables
                }
                return ts
              })
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                debugLog("Subscribed to tables changes")
              } else if (status === "CHANNEL_ERROR") {
                console.error("Error subscribing to tables changes")
                // Don't immediately go offline, let the connection check handle it
              }
            })
        } catch (err) {
          console.error("Error setting up tables subscription:", err)
        }

        try {
          logsSub = supabase
            .channel("logs-changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: TABLE_NAMES.LOGS },
              ({ eventType, new: newLog }) => {
                setLogs((ls) => {
                  let updatedLogs
                  if (eventType === "INSERT") {
                    updatedLogs = [
                      {
                        id: newLog.id,
                        tableId: newLog.table_id,
                        tableName: newLog.table_name,
                        action: newLog.action,
                        timestamp: newLog.timestamp,
                        details: newLog.details || "",
                      },
                      ...ls,
                    ]
                  } else {
                    updatedLogs = ls.map((l) =>
                      l.id === newLog.id
                        ? {
                            id: newLog.id,
                            tableId: newLog.table_id,
                            tableName: newLog.table_name,
                            action: newLog.action,
                            timestamp: newLog.timestamp,
                            details: newLog.details || "",
                          }
                        : l,
                    )
                  }

                  // Only update state if there's an actual change
                  if (!deepEqual(updatedLogs, ls)) {
                    prevLogsRef.current = updatedLogs
                    return updatedLogs
                  }
                  return ls
                })
              },
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                debugLog("Subscribed to logs changes")
              } else if (status === "CHANNEL_ERROR") {
                console.error("Error subscribing to logs changes")
              }
            })
        } catch (err) {
          console.error("Error setting up logs subscription:", err)
        }

        try {
          settingsSub = supabase
            .channel("settings-changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: TABLE_NAMES.SETTINGS },
              ({ new: newSettings }) => {
                setDayStarted(newSettings.day_started || false)
                setGroupCounter(newSettings.group_counter || 1)
              },
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                debugLog("Subscribed to settings changes")
              } else if (status === "CHANNEL_ERROR") {
                console.error("Error subscribing to settings changes")
              }
            })
        } catch (err) {
          console.error("Error setting up settings subscription:", err)
        }

        try {
          serversSub = supabase
            .channel("servers-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.SERVERS }, ({ new: newSrv }) => {
              setServers((ss) => {
                const updatedServers = ss.map((s) => (s.id === newSrv.id ? newSrv : s))

                // Only update state if there's an actual change
                if (!deepEqual(updatedServers, ss)) {
                  prevServersRef.current = updatedServers
                  return updatedServers
                }
                return ss
              })
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                debugLog("Subscribed to servers changes")
              } else if (status === "CHANNEL_ERROR") {
                console.error("Error subscribing to servers changes")
              }
            })
        } catch (err) {
          console.error("Error setting up servers subscription:", err)
        }

        // Store unsubscribe functions
        if (tablesSub) subscriptionsRef.current.push(() => tablesSub?.unsubscribe())
        if (logsSub) subscriptionsRef.current.push(() => logsSub?.unsubscribe())
        if (settingsSub) subscriptionsRef.current.push(() => settingsSub?.unsubscribe())
        if (serversSub) subscriptionsRef.current.push(() => serversSub?.unsubscribe())
      }
    } catch (err) {
      console.error("Realtime subscription error", err)
      // Don't immediately go offline, let the connection check handle it
    }

    return () => {
      // Clean up subscriptions
      if (tablesSub) tablesSub.unsubscribe()
      if (logsSub) logsSub.unsubscribe()
      if (settingsSub) settingsSub.unsubscribe()
      if (serversSub) serversSub.unsubscribe()
    }
  }, [useLocalStorage, isSupabaseConfigured])

  // Set up event listeners for real-time updates
  useEffect(() => {
    // Handle sync requests
    const handleSyncRequest = () => {
      debugLog("Sync request received")
      loadAllData()
    }

    // Handle admin sync
    const handleAdminSync = () => {
      debugLog("Admin sync event received")
      loadAllData()
    }

    // Handle admin presence
    const handleAdminPresence = (event: Event) => {
      const { present } = (event as CustomEvent).detail
      debugLog("Admin presence update:", present)
      setAdminPresent(present)
    }

    // Handle online status changes with debounce
    let onlineStatusTimeout: NodeJS.Timeout | null = null

    const handleOnline = () => {
      debugLog("Browser reports online status")

      // Clear any existing timeout
      if (onlineStatusTimeout) {
        clearTimeout(onlineStatusTimeout)
      }

      // Add a small delay to ensure network is stable
      onlineStatusTimeout = setTimeout(() => {
        testConnection().then((isConnected) => {
          if (isConnected) {
            setOfflineMode(false)
            setUseLocalStorage(false)
            loadAllData()
          }
        })
      }, 2000)
    }

    const handleOffline = () => {
      debugLog("Browser reports offline status")

      // Clear any existing timeout
      if (onlineStatusTimeout) {
        clearTimeout(onlineStatusTimeout)
      }

      setOfflineMode(true)
      setUseLocalStorage(true)
    }

    window.addEventListener("supabase-sync-request", handleSyncRequest)
    window.addEventListener("supabase-admin-sync", handleAdminSync)
    window.addEventListener("supabase-admin-presence", handleAdminPresence)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Clean up event listeners
    return () => {
      window.removeEventListener("supabase-sync-request", handleSyncRequest)
      window.removeEventListener("supabase-admin-sync", handleAdminSync)
      window.removeEventListener("supabase-admin-presence", handleAdminPresence)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)

      if (onlineStatusTimeout) {
        clearTimeout(onlineStatusTimeout)
      }
    }
  }, [loadAllData, testConnection])

  // Periodically sync data, but avoid excessive network activity
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!offlineMode && !useLocalStorage) {
        if (process.env.NODE_ENV !== "production") {
          debugLog("Performing periodic data sync")
        }
        loadAllData()
      }
    }, 120000) // Every 2 minutes

    return () => clearInterval(syncInterval)
  }, [loadAllData, offlineMode, useLocalStorage])

  useEffect(() => {
    if (useLocalStorage || offlineMode) return

    const syncInterval = setInterval(async () => {
      const now = Date.now()

      if (now - lastTimerSyncRef.current < TIMER_SYNC_INTERVAL) {
        return
      }

      const activeTables = tables.filter((t) => t.isActive && t.startTime)
      if (activeTables.length === 0) {
        return
      }

      try {
        const supabase = getSupabaseClient()
        const updates = activeTables.map((table) => {
          const elapsed = now - (table.startTime ?? 0)
          const remainingTime = table.initialTime - elapsed

          return {
            id: table.id,
            remaining_time: remainingTime,
            updated_at: new Date().toISOString(),
          }
        })

        const { error } = await supabase
          .from(TABLE_NAMES.TABLES)
          .upsert(updates, { onConflict: "id" })

        if (error) {
          console.error("Error syncing timer updates:", error)
        } else {
          lastTimerSyncRef.current = now
        }
      } catch (error) {
        console.error("Failed to sync timers:", error)
      }
    }, 5000)

    return () => clearInterval(syncInterval)
  }, [tables, useLocalStorage, offlineMode])

  // Batch update function to reduce database calls
  const batchUpdateTables = useCallback(async () => {
    if (pendingUpdatesRef.current.size === 0) return

    try {
      const updatesToProcess = new Map(pendingUpdatesRef.current)
      pendingUpdatesRef.current.clear()

      const updatedTables = tables.map((table) => {
        const updates = updatesToProcess.get(table.id)
        if (updates) {
          return { ...table, ...updates }
        }
        return table
      })

      localStorageWriterRef.current?.setItem("tables", JSON.stringify(updatedTables))

      if (!deepEqual(updatedTables, prevTablesRef.current)) {
        setTables(updatedTables)
        prevTablesRef.current = updatedTables
      }

      if (useLocalStorage || offlineMode) {
        return { success: true }
      }

      try {
        const supabase = getSupabaseClient()

        const supabaseTables = updatedTables
          .filter((table) => {
            const updates = updatesToProcess.get(table.id)
            if (!updates) return false

            const keys = Object.keys(updates)
            const isTimerOnly = keys.every(
              (k) => k === "remainingTime" || k === "initialTime" || k === "updatedAt",
            )

            return !isTimerOnly
          })
          .map(convertTableToSupabase)

        if (supabaseTables.length > 0) {
          const batchSize = 5
          const batchPromises = []
          for (let i = 0; i < supabaseTables.length; i += batchSize) {
            const batch = supabaseTables.slice(i, i + batchSize)
            batchPromises.push(supabase.from(TABLE_NAMES.TABLES).upsert(batch))
          }
          await Promise.all(batchPromises)
        }
      } catch (err) {
        console.error("Error updating tables in Supabase:", err)
        setOfflineMode(true)
      }

      return { success: true }
    } catch (err) {
      console.error("Error in batch update:", err)
      return { success: false, error: (err as Error).message }
    }
  }, [tables, useLocalStorage, offlineMode])

  // Update a single table with batching
  const updateTable = useCallback(
    async (table: Table) => {
      try {
        // Add to pending updates
        pendingUpdatesRef.current.set(table.id, table)

        // Update local state immediately for responsive UI
        setTables((prevTables) => {
          const updatedTables = prevTables.map((t) => (t.id === table.id ? table : t))

          // Only update if there's a change
          if (!deepEqual(updatedTables, prevTables)) {
            prevTablesRef.current = updatedTables
            return updatedTables
          }
          return prevTables
        })

        // Persist to localStorage using debounced writer
        localStorageWriterRef.current?.setItem("tables", JSON.stringify(prevTablesRef.current))

        // Dispatch event for real-time updates across components
        window.dispatchEvent(
          new CustomEvent("table-updated", {
            detail: { tableId: table.id, table: table },
          }),
        )

        // Schedule batch update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current)
        }

        updateTimeoutRef.current = setTimeout(() => {
          batchUpdateTables()
        }, 300) // Batch updates after 300ms of inactivity

        return { success: true }
      } catch (err) {
        console.error("Error updating table:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [batchUpdateTables],
  )

  // Update multiple tables
  const updateTables = useCallback(
    async (updatedTables: Table[]) => {
      try {
        // Add all tables to pending updates
        updatedTables.forEach((table) => {
          pendingUpdatesRef.current.set(table.id, table)
        })

        // Update local state immediately
        setTables((prevTables) => {
          const newTables = [...prevTables]

          // Update only the tables that changed
          updatedTables.forEach((updatedTable) => {
            const index = newTables.findIndex((t) => t.id === updatedTable.id)
            if (index !== -1) {
              newTables[index] = updatedTable
            }
          })

          // Only update if there's a change
          if (!deepEqual(newTables, prevTables)) {
            prevTablesRef.current = newTables
            return newTables
          }
          return prevTables
        })

        // Update localStorage using debounced writer
        localStorageWriterRef.current?.setItem("tables", JSON.stringify(prevTablesRef.current))

        // Schedule batch update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current)
        }

        updateTimeoutRef.current = setTimeout(() => {
          batchUpdateTables()
        }, 300) // Batch updates after 300ms of inactivity

        return { success: true }
      } catch (err) {
        console.error("Error updating tables:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [batchUpdateTables],
  )

  // Add a log entry
  const addLogEntry = useCallback(
    async (tableId: number, tableName: string, action: string, details = "") => {
      const newLog: LogEntry = {
        id: uuidv4(),
        tableId,
        tableName,
        action,
        timestamp: Date.now(), // Keep as number for internal use
        details,
      }

      try {
        // Update local state immediately
        setLogs((prevLogs) => {
          const updatedLogs = [newLog, ...prevLogs]

          // Only update if there's a change
          if (!deepEqual(updatedLogs, prevLogs)) {
            prevLogsRef.current = updatedLogs
            localStorage.setItem("logs", JSON.stringify(updatedLogs))
            return updatedLogs
          }
          return prevLogs
        })

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to add to Supabase with proper timestamp conversion
        try {
          const supabase = getSupabaseClient()

          // Convert timestamp to ISO string for Supabase
          const logForSupabase = {
            id: newLog.id,
            table_id: newLog.tableId,
            table_name: newLog.tableName,
            action: newLog.action,
            timestamp: new Date(newLog.timestamp).toISOString(), // Convert to ISO string
            details: newLog.details || "",
          }

          const { error } = await supabase.from(TABLE_NAMES.LOGS).insert(logForSupabase)

          if (error) {
            console.error("Error adding log entry to Supabase:", error)
            console.error("Data sent to Supabase:", logForSupabase)
            setOfflineMode(true)
          }
        } catch (err) {
          console.error("Error adding log entry to Supabase:", err)
          setOfflineMode(true)
        }

        return { success: true }
      } catch (err) {
        console.error("Error adding log entry:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [useLocalStorage, offlineMode],
  )

  // Update system settings
  const updateSystemSettings = useCallback(
    async (dayStarted: boolean, groupCounter: number) => {
      try {
        // Always update localStorage
        localStorage.setItem("dayStarted", dayStarted.toString())
        localStorage.setItem("groupCounter", groupCounter.toString())
        setDayStarted(dayStarted)
        setGroupCounter(groupCounter)

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to update in Supabase
        try {
          const supabase = getSupabaseClient()
          const { error } = await supabase.from(TABLE_NAMES.SETTINGS).upsert({
            id: 1, // Use a fixed ID for the single settings row
            day_started: dayStarted,
            group_counter: groupCounter,
            last_updated: new Date().toISOString(),
          })

          if (error) {
            console.error("Error updating system settings in Supabase:", error)
            setOfflineMode(true)
          }
        } catch (err) {
          console.error("Error updating system settings in Supabase:", err)
          setOfflineMode(true)
        }

        return { success: true }
      } catch (err) {
        console.error("Error updating system settings:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [useLocalStorage, offlineMode],
  )

  // Update servers
  const updateServers = useCallback(
    async (updatedServers: Server[]) => {
      try {
        setLoading(true)

        // Check for duplicates before updating
        const uniqueServers = updatedServers.reduce((acc, server) => {
          // Only add if not already in the accumulator by name
          if (!acc.some((s) => s.name.toLowerCase() === server.name.toLowerCase())) {
            acc.push(server)
          }
          return acc
        }, [] as Server[])

        // Only update if there's a change
        if (!deepEqual(uniqueServers, prevServersRef.current)) {
          localStorage.setItem("servers", JSON.stringify(uniqueServers))
          setServers(uniqueServers)
          prevServersRef.current = uniqueServers
        }

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to update in Supabase
        try {
          const supabase = getSupabaseClient()
          // Ensure all servers have valid UUIDs
          const serversWithUUIDs = uniqueServers.map((server) => {
            // Check if the ID is a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(server.id)) {
              // Generate a new UUID if the current ID is not valid
              return { ...server, id: uuidv4() }
            }
            return server
          })

          // First get existing servers to avoid duplicates
          const { data: existingServers } = await supabase.from(TABLE_NAMES.SERVERS).select("name")
          const existingNames = new Set((existingServers || []).map((s) => s.name.toLowerCase()))

          // Only upsert servers that don't already exist by name
          const serversToUpsert = serversWithUUIDs.filter((server) => !existingNames.has(server.name.toLowerCase()))

          if (serversToUpsert.length > 0) {
            const { error } = await supabase.from(TABLE_NAMES.SERVERS).upsert(serversToUpsert)
            if (error) {
              console.error("Error updating servers in Supabase:", error)
              setOfflineMode(true)
            }
          }
        } catch (err) {
          console.error("Error updating servers in Supabase:", err)
          setOfflineMode(true)
        }

        return { success: true }
      } catch (error) {
        console.error("Error updating servers:", error)
        setError("Failed to update servers")
        return { success: false, error: (error as Error).message }
      } finally {
        setLoading(false)
      }
    },
    [useLocalStorage, offlineMode],
  )

  // Update note templates
  const updateNoteTemplates = useCallback(
    async (updatedTemplates: NoteTemplate[]) => {
      try {
        // Check for duplicates before updating
        const uniqueTemplates = updatedTemplates.reduce((acc, template) => {
          // Only add if not already in the accumulator by text
          if (!acc.some((t) => t.text.toLowerCase() === template.text.toLowerCase())) {
            acc.push(template)
          }
          return acc
        }, [] as NoteTemplate[])

        // Only update if there's a change
        if (!deepEqual(uniqueTemplates, prevTemplatesRef.current)) {
          localStorage.setItem("noteTemplates", JSON.stringify(uniqueTemplates))
          setNoteTemplates(uniqueTemplates)
          prevTemplatesRef.current = uniqueTemplates
        }

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to update in Supabase
        try {
          const supabase = getSupabaseClient()
          // Ensure all templates have valid UUIDs
          const templatesWithUUIDs = uniqueTemplates.map((template) => {
            // Check if the ID is a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(template.id)) {
              // Generate a new UUID if the current ID is not valid
              return { ...template, id: uuidv4() }
            }
            return template
          })

          // First get existing templates to avoid duplicates
          const { data: existingTemplates } = await supabase.from(TABLE_NAMES.TEMPLATES).select("text")
          const existingTexts = new Set((existingTemplates || []).map((t) => t.text.toLowerCase()))

          // Only upsert templates that don't already exist by text
          const templatesToUpsert = templatesWithUUIDs.filter(
            (template) => !existingTexts.has(template.text.toLowerCase()),
          )

          if (templatesToUpsert.length > 0) {
            const { error } = await supabase.from(TABLE_NAMES.TEMPLATES).upsert(templatesToUpsert)
            if (error) {
              console.error("Error updating note templates in Supabase:", error)
              setOfflineMode(true)
            }
          }
        } catch (err) {
          console.error("Error updating note templates in Supabase:", err)
          setOfflineMode(true)
        }

        return { success: true }
      } catch (err) {
        console.error("Error updating note templates:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [useLocalStorage, offlineMode],
  )

  // Sync data from localStorage to Supabase
  const syncData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()

      // Fetch all data from Supabase
      const [
        { data: tablesData, error: tablesError },
        { data: logsData, error: logsError },
        { data: serversData, error: serversError },
        { data: templatesData, error: templatesError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        // TABLES - SELECTIVE COLUMNS
        supabase
          .from(TABLE_NAMES.TABLES)
          .select(
            "id, name, is_active, start_time, remaining_time, initial_time, guest_count, server_id, group_id, has_notes, note_id, note_text, status_indicators, updated_by_admin, updated_by, updated_at",
          ),
        supabase.from(TABLE_NAMES.LOGS).select("*").order("timestamp", { ascending: false }),
        supabase.from(TABLE_NAMES.SERVERS).select("*"),
        supabase.from(TABLE_NAMES.TEMPLATES).select("*"),
        supabase.from(TABLE_NAMES.SETTINGS).select("*").eq("id", 1).single(),
      ])

      if (tablesError) console.error("Error fetching tables:", tablesError)
      if (logsError) console.error("Error fetching logs:", logsError)
      if (serversError) console.error("Error fetching servers:", serversError)
      if (templatesError) console.error("Error fetching note templates:", templatesError)

      // Convert tables from snake_case to camelCase
      const fetchedTables =
        tablesData?.map((table: any) => ({
          id: table.id,
          name: table.name,
          isActive: table.is_active,
          startTime: table.start_time,
          remainingTime: table.remaining_time,
          initialTime: table.initial_time,
          guestCount: table.guest_count,
          server: table.server_id,
          groupId: table.group_id,
          hasNotes: table.has_notes,
          noteId: table.note_id || "",
          noteText: table.note_text || "",
          statusIndicators: table.status_indicators || [],
          updated_by_admin: table.updated_by_admin || false,
          updated_by: table.updated_by || null,
          updatedAt: table.updated_at || new Date().toISOString(),
        })) || []

      // Convert logs from snake_case to camelCase
      const fetchedLogs =
        logsData?.map((log: any) => ({
          id: log.id,
          tableId: log.table_id,
          tableName: log.table_name,
          action: log.action,
          timestamp: log.timestamp,
          details: log.details || "",
        })) || []

      const fetchedServers = serversData || []
      const fetchedTemplates = templatesData || []

      const settings = {
        dayStarted: settingsData?.day_started || false,
        groupCounter: settingsData?.group_counter || 1,
      }

      // Update state with fetched data only if there are changes
      if (!deepEqual(fetchedTables, prevTablesRef.current)) {
        setTables(fetchedTables)
        prevTablesRef.current = fetchedTables
      }

      if (!deepEqual(fetchedLogs, prevLogsRef.current)) {
        setLogs(fetchedLogs)
        prevLogsRef.current = fetchedLogs
      }

      if (!deepEqual(fetchedServers, prevServersRef.current)) {
        setServers(fetchedServers)
        prevServersRef.current = fetchedServers
      }

      if (!deepEqual(fetchedTemplates, prevTemplatesRef.current)) {
        setNoteTemplates(fetchedTemplates)
        prevTemplatesRef.current = fetchedTemplates
      }

      setDayStarted(settings.dayStarted)
      setGroupCounter(settings.groupCounter)

      // Show success notification
      debugLog("Data synced successfully from Supabase")
      return true
    } catch (error) {
      console.error("Error syncing data from Supabase:", error)
      setError("Failed to sync data from Supabase")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Force sync from admin (for viewers)
  const forceAdminSync = async () => {
    debugLog("Force admin sync requested")
    return loadAllData()
  }

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      tables,
      logs,
      servers,
      noteTemplates,
      dayStarted,
      groupCounter,
      loading,
      error,
      lastSyncTime,
      adminPresent,
      isAdmin,
      updateTable,
      updateTables,
      addLogEntry,
      updateSystemSettings,
      updateServers,
      updateNoteTemplates,
      syncData,
      forceAdminSync,
      useLocalStorage,
      offlineMode,
    }),
    [
      tables,
      logs,
      servers,
      noteTemplates,
      dayStarted,
      groupCounter,
      loading,
      error,
      lastSyncTime,
      adminPresent,
      isAdmin,
      updateTable,
      updateTables,
      addLogEntry,
      updateSystemSettings,
      updateServers,
      updateNoteTemplates,
      syncData,
      useLocalStorage,
      offlineMode,
    ],
  )

  return returnValue
}
