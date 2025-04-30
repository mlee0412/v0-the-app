"use client"

import { useState, useEffect, useCallback } from "react"
import type { Table, Server, NoteTemplate, LogEntry } from "@/components/billiards-timer-dashboard"
import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"

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
    // Fix: Ensure server_id is null when server is null or empty string
    server_id: table.server && table.server.trim() !== "" ? table.server : null,
    group_id: table.groupId && table.groupId.trim() !== "" ? table.groupId : null,
    has_notes: table.hasNotes,
    note_id: table.noteId && table.noteId.trim() !== "" ? table.noteId : null,
    note_text: table.noteText || "",
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

  // Test Supabase connection on init
  const testConnection = useCallback(async () => {
    if (useLocalStorage || !isSupabaseConfigured()) {
      console.log("Using localStorage mode (Supabase not configured)")
      setOfflineMode(true)
      setUseLocalStorage(true)
      setConnectionTested(true)
      return false
    }

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from(TABLE_NAMES.SETTINGS).select("count")

      const isConnected = !error
      console.log("Supabase connection test:", isConnected ? "Connected" : "Failed")

      setOfflineMode(!isConnected)
      setUseLocalStorage(!isConnected)
      setConnectionTested(true)

      if (isConnected) {
        window.dispatchEvent(new CustomEvent("supabase-connected"))
      } else {
        window.dispatchEvent(new CustomEvent("supabase-disconnected"))
      }

      return isConnected
    } catch (err) {
      console.error("Error testing Supabase connection:", err)
      setOfflineMode(true)
      setUseLocalStorage(true)
      setConnectionTested(true)
      window.dispatchEvent(new CustomEvent("supabase-disconnected"))
      return false
    }
  }, [useLocalStorage])

  // Function to load all data
  const loadAllData = useCallback(async () => {
    try {
      console.log("Loading all data...")
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

        // Load tables
        const { data: tablesData, error: tablesError } = await supabase.from(TABLE_NAMES.TABLES).select("*")
        if (!tablesError && tablesData && tablesData.length > 0) {
          // Convert from snake_case to camelCase
          const convertedTables = tablesData.map((table: any) => ({
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
            updated_by_admin: table.updated_by_admin || false,
            updated_by: table.updated_by || null,
            updatedAt: table.updated_at || new Date().toISOString(),
          }))
          setTables(convertedTables)
          // Save to localStorage as backup
          localStorage.setItem("tables", JSON.stringify(convertedTables))
        } else {
          console.warn("Failed to load tables from Supabase, using localStorage", tablesError)
          loadTablesFromLocalStorage()
        }

        // Load logs
        const { data: logsData, error: logsError } = await supabase
          .from(TABLE_NAMES.LOGS)
          .select("*")
          .order("timestamp", { ascending: false })
        if (!logsError && logsData) {
          // Convert from snake_case to camelCase
          const convertedLogs = logsData.map((log: any) => ({
            id: log.id,
            tableId: log.table_id,
            tableName: log.table_name,
            action: log.action,
            timestamp: log.timestamp,
            details: log.details || "",
          }))
          setLogs(convertedLogs)
          // Save to localStorage as backup
          localStorage.setItem("logs", JSON.stringify(convertedLogs))
        } else {
          console.warn("Failed to load logs from Supabase, using localStorage", logsError)
          loadLogsFromLocalStorage()
        }

        // Load system settings
        const { data: settingsData, error: settingsError } = await supabase
          .from(TABLE_NAMES.SETTINGS)
          .select("*")
          .eq("id", 1)
          .single()
        if (!settingsError && settingsData) {
          setDayStarted(settingsData.day_started || false)
          setGroupCounter(settingsData.group_counter || 1)
          // Save to localStorage as backup
          localStorage.setItem("dayStarted", String(settingsData.day_started || false))
          localStorage.setItem("groupCounter", String(settingsData.group_counter || 1))
        } else {
          console.warn("Failed to load settings from Supabase, using localStorage", settingsError)
          loadSettingsFromLocalStorage()
        }

        // Load servers
        const { data: serversData, error: serversError } = await supabase.from(TABLE_NAMES.SERVERS).select("*")
        if (!serversError && serversData && serversData.length > 0) {
          setServers(serversData)
          // Save to localStorage as backup
          localStorage.setItem("servers", JSON.stringify(serversData))
        } else {
          console.warn("Failed to load servers from Supabase, using localStorage", serversError)
          loadServersFromLocalStorage()
        }

        // Load note templates
        const { data: templatesData, error: templatesError } = await supabase.from(TABLE_NAMES.TEMPLATES).select("*")
        if (!templatesError && templatesData && templatesData.length > 0) {
          setNoteTemplates(templatesData)
          // Save to localStorage as backup
          localStorage.setItem("noteTemplates", JSON.stringify(templatesData))
        } else {
          console.warn("Failed to load note templates from Supabase, using localStorage", templatesError)
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
  const loadFromLocalStorage = () => {
    loadTablesFromLocalStorage()
    loadLogsFromLocalStorage()
    loadSettingsFromLocalStorage()
    loadServersFromLocalStorage()
    loadTemplatesFromLocalStorage()
    setLastSyncTime(new Date())
  }

  // Load tables from localStorage
  const loadTablesFromLocalStorage = () => {
    try {
      const storedTables = localStorage.getItem("tables")
      if (storedTables) {
        const parsedTables = JSON.parse(storedTables)
        if (Array.isArray(parsedTables) && parsedTables.length > 0) {
          setTables(parsedTables)
        } else {
          setTables(initialTables)
          localStorage.setItem("tables", JSON.stringify(initialTables))
        }
      } else {
        setTables(initialTables)
        localStorage.setItem("tables", JSON.stringify(initialTables))
      }
    } catch (e) {
      console.error("Error loading tables from localStorage:", e)
      setTables(initialTables)
      localStorage.setItem("tables", JSON.stringify(initialTables))
    }
  }

  // Load logs from localStorage
  const loadLogsFromLocalStorage = () => {
    try {
      const storedLogs = localStorage.getItem("logs")
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs)
        if (Array.isArray(parsedLogs)) {
          setLogs(parsedLogs)
        } else {
          setLogs([])
          localStorage.setItem("logs", JSON.stringify([]))
        }
      } else {
        setLogs([])
        localStorage.setItem("logs", JSON.stringify([]))
      }
    } catch (e) {
      console.error("Error loading logs from localStorage:", e)
      setLogs([])
      localStorage.setItem("logs", JSON.stringify([]))
    }
  }

  // Load settings from localStorage
  const loadSettingsFromLocalStorage = () => {
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
  }

  // Load servers from localStorage
  const loadServersFromLocalStorage = () => {
    try {
      const storedServers = localStorage.getItem("servers")
      if (storedServers) {
        const parsedServers = JSON.parse(storedServers)
        if (Array.isArray(parsedServers) && parsedServers.length > 0) {
          setServers(parsedServers)
        } else {
          setServers(defaultServers)
          localStorage.setItem("servers", JSON.stringify(defaultServers))
        }
      } else {
        setServers(defaultServers)
        localStorage.setItem("servers", JSON.stringify(defaultServers))
      }
    } catch (e) {
      console.error("Error loading servers from localStorage:", e)
      setServers(defaultServers)
      localStorage.setItem("servers", JSON.stringify(defaultServers))
    }
  }

  // Load note templates from localStorage
  const loadTemplatesFromLocalStorage = () => {
    try {
      const storedTemplates = localStorage.getItem("noteTemplates")
      if (storedTemplates) {
        const parsedTemplates = JSON.parse(storedTemplates)
        if (Array.isArray(parsedTemplates) && parsedTemplates.length > 0) {
          setNoteTemplates(parsedTemplates)
        } else {
          setNoteTemplates(defaultNoteTemplates)
          localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
        }
      } else {
        setNoteTemplates(defaultNoteTemplates)
        localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
      }
    } catch (e) {
      console.error("Error loading note templates from localStorage:", e)
      setNoteTemplates(defaultNoteTemplates)
      localStorage.setItem("noteTemplates", JSON.stringify(defaultNoteTemplates))
    }
  }

  // Initialize and load data
  useEffect(() => {
    loadAllData()

    // Set up real-time subscriptions if not using localStorage
    if (!useLocalStorage && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient()

        // Tables subscription
        const tablesSubscription = supabase
          .channel("tables-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.TABLES }, (payload) => {
            console.log("Tables update received:", payload)
            loadAllData()
          })
          .subscribe()

        // Logs subscription
        const logsSubscription = supabase
          .channel("logs-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.LOGS }, (payload) => {
            console.log("Logs update received:", payload)
            loadAllData()
          })
          .subscribe()

        // Settings subscription
        const settingsSubscription = supabase
          .channel("settings-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.SETTINGS }, (payload) => {
            console.log("Settings update received:", payload)
            loadAllData()
          })
          .subscribe()

        // Servers subscription
        const serversSubscription = supabase
          .channel("servers-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.SERVERS }, (payload) => {
            console.log("Servers update received:", payload)
            loadAllData()
          })
          .subscribe()

        // Note templates subscription
        const templatesSubscription = supabase
          .channel("templates-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAMES.TEMPLATES }, (payload) => {
            console.log("Note templates update received:", payload)
            loadAllData()
          })
          .subscribe()

        return () => {
          tablesSubscription.unsubscribe()
          logsSubscription.unsubscribe()
          settingsSubscription.unsubscribe()
          serversSubscription.unsubscribe()
          templatesSubscription.unsubscribe()
        }
      } catch (err) {
        console.error("Error setting up real-time subscriptions:", err)
        setUseLocalStorage(true)
        setOfflineMode(true)
      }
    }
  }, [loadAllData, useLocalStorage, isSupabaseConfigured])

  // Set up event listeners for real-time updates
  useEffect(() => {
    // Handle sync requests
    const handleSyncRequest = () => {
      console.log("Sync request received")
      loadAllData()
    }

    // Handle admin sync
    const handleAdminSync = () => {
      console.log("Admin sync event received")
      loadAllData()
    }

    // Handle admin presence
    const handleAdminPresence = (event: Event) => {
      const { present } = (event as CustomEvent).detail
      console.log("Admin presence update:", present)
      setAdminPresent(present)
    }

    // Handle online status changes
    const handleOnline = () => {
      console.log("Browser reports online status")
      testConnection().then((isConnected) => {
        if (isConnected) {
          setOfflineMode(false)
          setUseLocalStorage(false)
          loadAllData()
        }
      })
    }

    const handleOffline = () => {
      console.log("Browser reports offline status")
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
    }
  }, [loadAllData, testConnection])

  // Add a periodic sync function to ensure data consistency
  useEffect(() => {
    // Set up a periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      if (!offlineMode && !useLocalStorage) {
        console.log("Performing periodic data sync")
        loadAllData()
      }
    }, 30000)

    return () => clearInterval(syncInterval)
  }, [loadAllData, offlineMode, useLocalStorage])

  // Update a single table
  const updateTable = useCallback(
    async (table: Table) => {
      try {
        // Always update localStorage
        const updatedTables = tables.map((t) => (t.id === table.id ? table : t))
        localStorage.setItem("tables", JSON.stringify(updatedTables))
        setTables(updatedTables)

        // Dispatch an event to notify all components of the table update
        window.dispatchEvent(
          new CustomEvent("table-updated", {
            detail: { tableId: table.id, table: table },
          }),
        )

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to update in Supabase
        try {
          const supabase = getSupabaseClient()
          const { error } = await supabase.from(TABLE_NAMES.TABLES).upsert(convertTableToSupabase(table))

          if (error) {
            console.error("Error updating table in Supabase:", error)
            setOfflineMode(true)
            // We already updated localStorage, so just return success
            return { success: true }
          }
        } catch (err) {
          console.error("Error updating table in Supabase:", err)
          setOfflineMode(true)
          // We already updated localStorage, so just return success
          return { success: true }
        }

        return { success: true }
      } catch (err) {
        console.error("Error updating table:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [tables, useLocalStorage, offlineMode],
  )

  // Update multiple tables
  const updateTables = useCallback(
    async (updatedTables: Table[]) => {
      try {
        // Always update localStorage
        localStorage.setItem("tables", JSON.stringify(updatedTables))
        setTables(updatedTables)

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to update in Supabase
        try {
          const supabase = getSupabaseClient()
          const { error } = await supabase.from(TABLE_NAMES.TABLES).upsert(updatedTables.map(convertTableToSupabase))

          if (error) {
            console.error("Error updating tables in Supabase:", error)
            setOfflineMode(true)
            // We already updated localStorage, so just return success
            return { success: true }
          }
        } catch (err) {
          console.error("Error updating tables in Supabase:", err)
          setOfflineMode(true)
          // We already updated localStorage, so just return success
          return { success: true }
        }

        return { success: true }
      } catch (err) {
        console.error("Error updating tables:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [useLocalStorage, offlineMode],
  )

  // Add a log entry
  const addLogEntry = useCallback(
    async (tableId: number, tableName: string, action: string, details = "") => {
      const newLog: LogEntry = {
        id: uuidv4(),
        tableId,
        tableName,
        action,
        timestamp: Date.now(),
        details,
      }

      try {
        // Always update localStorage
        const updatedLogs = [newLog, ...logs]
        localStorage.setItem("logs", JSON.stringify(updatedLogs))
        setLogs(updatedLogs)

        // If using localStorage only, we're done
        if (useLocalStorage || offlineMode) {
          return { success: true }
        }

        // Try to add to Supabase
        try {
          const supabase = getSupabaseClient()
          const { error } = await supabase.from(TABLE_NAMES.LOGS).insert(convertLogToSupabase(newLog))

          if (error) {
            console.error("Error adding log entry to Supabase:", error)
            setOfflineMode(true)
            // We already updated localStorage, so just return success
            return { success: true }
          }
        } catch (err) {
          console.error("Error adding log entry to Supabase:", err)
          setOfflineMode(true)
          // We already updated localStorage, so just return success
          return { success: true }
        }

        return { success: true }
      } catch (err) {
        console.error("Error adding log entry:", err)
        return { success: false, error: (err as Error).message }
      }
    },
    [logs, useLocalStorage, offlineMode],
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
            // We already updated localStorage, so just return success
            return { success: true }
          }
        } catch (err) {
          console.error("Error updating system settings in Supabase:", err)
          setOfflineMode(true)
          // We already updated localStorage, so just return success
          return { success: true }
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

        localStorage.setItem("servers", JSON.stringify(uniqueServers))
        setServers(uniqueServers)

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
              return { success: true }
            }
          }
        } catch (err) {
          console.error("Error updating servers in Supabase:", err)
          setOfflineMode(true)
          return { success: true }
        }

        return { success: true }
      } catch (error) {
        console.error("Error updating servers:", error)
        setError("Failed to update servers")
        return false
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

        // Always update localStorage
        localStorage.setItem("noteTemplates", JSON.stringify(uniqueTemplates))
        setNoteTemplates(uniqueTemplates)

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
              return { success: true }
            }
          }
        } catch (err) {
          console.error("Error updating note templates in Supabase:", err)
          setOfflineMode(true)
          return { success: true }
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
        supabase.from(TABLE_NAMES.TABLES).select("*"),
        supabase.from(TABLE_NAMES.LOGS).select("*").order("timestamp", { ascending: false }),
        supabase.from(TABLE_NAMES.SERVERS).select("*"),
        supabase.from(TABLE_NAMES.TEMPLATES).select("*"),
        supabase.from(TABLE_NAMES.SETTINGS).select("*").eq("id", 1).single(),
      ])

      if (tablesError) console.error("Error fetching tables:", tablesError)
      if (logsError) console.error("Error fetching logs:", logsError)
      if (serversError) console.error("Error fetching servers:", serversError)
      if (templatesError) console.error("Error fetching note templates:", templatesError)
      if (settingsError) console.error("Error fetching settings:", settingsError)

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

      // Update state with fetched data
      setTables(fetchedTables)
      setLogs(fetchedLogs)
      setServers(fetchedServers)
      setNoteTemplates(fetchedTemplates)
      setDayStarted(settings.dayStarted)
      setGroupCounter(settings.groupCounter)

      // Show success notification
      console.log("Data synced successfully from Supabase")
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
    console.log("Force admin sync requested")
    return loadAllData()
  }

  return {
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
  }
}
