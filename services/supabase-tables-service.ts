import { getSupabaseClient } from "@/lib/supabase/client"
import type { Table } from "@/components/billiards-timer-dashboard"

// Tables interface for Supabase
interface TablesRecord {
  id: number
  name: string
  is_active: boolean
  start_time: number | null
  remaining_time: number
  initial_time: number
  guest_count: number
  server_id: string | null // Changed from server to server_id to match DB schema
  group_id: string | null
  has_notes: boolean
  note_id: string
  note_text: string
  updated_by_admin: boolean
  updated_by: string | null
  updated_at: string
}

// Convert from Supabase format to app format
function convertTableFromDB(record: TablesRecord): Table {
  return {
    id: record.id,
    name: record.name,
    isActive: record.is_active,
    startTime: record.start_time,
    remainingTime: record.remaining_time,
    initialTime: record.initial_time,
    guestCount: record.guest_count,
    server: record.server_id, // Map server_id to server in the app
    groupId: record.group_id,
    hasNotes: record.has_notes,
    noteId: record.note_id || "",
    noteText: record.note_text || "",
    updated_by_admin: record.updated_by_admin,
    updated_by: record.updated_by,
    updatedAt: record.updated_at,
  }
}

// Convert from app format to Supabase format
function convertTableToDB(table: Table): TablesRecord {
  return {
    id: table.id,
    name: table.name,
    is_active: table.isActive,
    start_time: table.startTime,
    remaining_time: table.remainingTime,
    initial_time: table.initialTime,
    guest_count: table.guestCount,
    server_id: table.server && table.server.trim() !== "" ? table.server : null, // Ensure empty strings become null
    group_id: table.groupId && table.groupId.trim() !== "" ? table.groupId : null, // Ensure empty strings become null
    has_notes: table.hasNotes,
    note_id: table.noteId || "",
    note_text: table.noteText || "",
    updated_by_admin: table.updated_by_admin,
    updated_by: table.updated_by && table.updated_by.trim() !== "" ? table.updated_by : null, // Ensure empty strings become null
    updated_at: table.updatedAt,
  }
}

class SupabaseTablesService {
  private subscriptions: (() => void)[] = []
  private tableName = "billiard_tables" // Match your actual table name in Supabase

  // Initialize tables
  async initializeTables(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      // Check if tables exist
      const { data, error } = await supabase.from(this.tableName).select("count")

      if (error) {
        console.error("Error checking tables:", error)
        // If table doesn't exist, create it using SQL
        if (error.code === "PGRST116") {
          console.log("Tables table does not exist, creating...")
          await this.createTablesTable()
        } else {
          throw error
        }
      }

      // Initialize default tables if none exist
      if (!data || data.length === 0) {
        console.log("No tables found, initializing default tables")
        await this.initializeDefaultTables()
      }
    } catch (error) {
      console.error("Error initializing tables:", error)
      throw error
    }
  }

  // Create tables table using SQL
  private async createTablesTable(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.rpc("create_tables_table")
      if (error) throw error
    } catch (error) {
      console.error("Error creating tables table:", error)
      throw error
    }
  }

  // Initialize default tables
  private async initializeDefaultTables(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const DEFAULT_TIME = 60 * 60 * 1000

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

      await this.updateTables(initialTables)
    } catch (error) {
      console.error("Error initializing default tables:", error)
      throw error
    }
  }

  // Get all tables
  async getTables(): Promise<Table[]> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from(this.tableName).select("*").order("id")

      if (error) throw error

      return data ? data.map(convertTableFromDB) : []
    } catch (error) {
      console.error("Error fetching tables:", error)
      return []
    }
  }

  // Update a single table
  async updateTable(table: Table): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from(this.tableName).upsert(convertTableToDB(table), { onConflict: "id" })

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-tables-update", {
          detail: { table: convertTableToDB(table) },
        }),
      )
    } catch (error) {
      console.error("Error updating table:", error)
      throw error
    }
  }

  // Update multiple tables
  async updateTables(tables: Table[]): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from(this.tableName).upsert(tables.map(convertTableToDB), { onConflict: "id" })

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-tables-update", {
          detail: { tables: tables.map(convertTableToDB) },
        }),
      )
    } catch (error) {
      console.error("Error updating tables:", error)
      throw error
    }
  }

  // Get system settings
  async getSystemSettings(): Promise<{ dayStarted: boolean; groupCounter: number }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("system_settings").select("*").eq("id", 1).single()

      if (error) {
        if (error.code === "PGRST116") {
          // Settings don't exist, create default
          await this.updateSystemSettings(false, 1)
          return { dayStarted: false, groupCounter: 1 }
        }
        throw error
      }

      return {
        dayStarted: data.day_started,
        groupCounter: data.group_counter,
      }
    } catch (error) {
      console.error("Error fetching system settings:", error)
      return { dayStarted: false, groupCounter: 1 }
    }
  }

  // Update system settings
  async updateSystemSettings(dayStarted: boolean, groupCounter: number): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("system_settings").upsert(
        {
          id: 1,
          day_started: dayStarted,
          group_counter: groupCounter,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "id" },
      )

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-settings-update", {
          detail: { dayStarted, groupCounter },
        }),
      )
    } catch (error) {
      console.error("Error updating system settings:", error)
      throw error
    }
  }

  // Subscribe to tables changes
  subscribeToTables(callback: (tables: Table[]) => void): () => void {
    try {
      const supabase = getSupabaseClient()
      const channel = supabase
        .channel("tables-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: this.tableName }, (payload) => {
          console.log("Tables change received:", payload)
          this.getTables().then(callback)
        })
        .subscribe()

      const unsubscribe = () => {
        channel.unsubscribe()
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to tables:", error)
      return () => {}
    }
  }

  // Subscribe to system settings changes
  subscribeToSystemSettings(callback: (settings: { dayStarted: boolean; groupCounter: number }) => void): () => void {
    try {
      const supabase = getSupabaseClient()
      const channel = supabase
        .channel("settings-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "system_settings" }, (payload) => {
          console.log("Settings change received:", payload)
          this.getSystemSettings().then(callback)
        })
        .subscribe()

      const unsubscribe = () => {
        channel.unsubscribe()
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to system settings:", error)
      return () => {}
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.subscriptions = []
  }
}

const supabaseTablesService = new SupabaseTablesService()
export default supabaseTablesService
