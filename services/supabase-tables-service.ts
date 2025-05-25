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
    updated_by_admin: table.updated_by_admin || false,
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
  async updateTable(table: Table, updateType = "all"): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Convert to DB format
      const dbTable = convertTableToDB(table)

      // For timer-only updates, we can use a more efficient update
      if (updateType === "timer-only") {
        const { error } = await supabase
          .from(this.tableName)
          .update({
            remaining_time: dbTable.remaining_time,
            initial_time: dbTable.initial_time,
            is_active: dbTable.is_active,
            start_time: dbTable.start_time,
            updated_at: dbTable.updated_at,
          })
          .eq("id", table.id)

        if (error) throw error
      } else {
        // Full update
        const { error } = await supabase.from(this.tableName).upsert(dbTable, { onConflict: "id" })

        if (error) throw error
      }

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

  // Update only the timer-related fields of a table - optimized for frequent updates
  async updateTableTimerOnly(
    tableId: number,
    remainingTime: number,
    initialTime: number,
    isActive: boolean,
    startTime: number | null,
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Direct update of only timer fields for efficiency
      const { error } = await supabase
        .from(this.tableName)
        .update({
          remaining_time: remainingTime,
          initial_time: initialTime,
          is_active: isActive,
          start_time: startTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tableId)

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-timer-update", {
          detail: {
            tableId: tableId,
            remainingTime: remainingTime,
            initialTime: initialTime,
            isActive: isActive,
            startTime: startTime,
          },
        }),
      )
    } catch (error) {
      console.error("Error updating table timer:", error)
    }
  }

  // Update only the timer-related fields of a table - optimized for frequent updates
  async updateTableTimer(tableId: number, remainingTime: number, initialTime: number): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Direct update without fetching first for better performance
      const { error } = await supabase
        .from(this.tableName)
        .update({
          remaining_time: remainingTime,
          initial_time: initialTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tableId)

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-timer-update", {
          detail: {
            tableId: tableId,
            remainingTime: remainingTime,
            initialTime: initialTime,
          },
        }),
      )
    } catch (error) {
      console.error("Error updating table timer:", error)
    }
  }

  // Process a local update without sending to Supabase
  processLocalUpdate(tableId: number, field: string, value: any): void {
    // Dispatch event for local components to update
    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: {
          tableId,
          field,
          value,
        },
      }),
    )
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

  // Batch update multiple table timers
  async batchUpdateTimers(updates: { tableId: number; remainingTime: number; initialTime: number }[]): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Skip if no updates
      if (updates.length === 0) return

      // Process updates in batches of 10 to avoid overwhelming the database
      const batchSize = 10

      // Group updates by tableId to ensure we only have the latest update for each table
      const latestUpdates = new Map<number, { remainingTime: number; initialTime: number }>()
      updates.forEach(({ tableId, remainingTime, initialTime }) => {
        latestUpdates.set(tableId, { remainingTime, initialTime })
      })

      // Convert map back to array
      const dedupedUpdates = Array.from(latestUpdates.entries()).map(([tableId, data]) => ({
        tableId,
        ...data,
      }))

      // Create batches
      for (let i = 0; i < dedupedUpdates.length; i += batchSize) {
        const batch = dedupedUpdates.slice(i, i + batchSize)

        // Prepare upsert data with minimal fields
        const upsertData = batch.map(({ tableId, remainingTime, initialTime }) => ({
          id: tableId,
          remaining_time: remainingTime,
          initial_time: initialTime,
          updated_at: new Date().toISOString(),
        }))

        // Perform the batch update
        const { error } = await supabase.from(this.tableName).upsert(upsertData, { onConflict: "id" })

        if (error) {
          console.error("Error batch updating timers:", error)
        }
      }

      // Dispatch a single batch event instead of multiple individual events
      window.dispatchEvent(
        new CustomEvent("batch-timer-update", {
          detail: {
            updates: dedupedUpdates,
            timestamp: Date.now(),
          },
        }),
      )
    } catch (error) {
      console.error("Error batch updating timers:", error)
    }
  }

  // Add a new method for efficient bulk updates
  async bulkUpdateTables(tableUpdates: Array<{ id: number; updates: Partial<TablesRecord> }>): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Group updates by fields to update
      const updatesByFields = new Map<string, Array<{ id: number; updates: Partial<TablesRecord> }>>()

      tableUpdates.forEach((update) => {
        const fields = Object.keys(update.updates).sort().join(",")
        if (!updatesByFields.has(fields)) {
          updatesByFields.set(fields, [])
        }
        updatesByFields.get(fields)?.push(update)
      })

      // Process each group of updates
      for (const [fields, updates] of updatesByFields.entries()) {
        const fieldsList = fields.split(",")

        // For small batches with many fields, use upsert
        if (updates.length <= 5 || fieldsList.length > 3) {
          const upsertData = updates.map(({ id, updates }) => ({
            id,
            ...updates,
            updated_at: new Date().toISOString(),
          }))

          const { error } = await supabase.from(this.tableName).upsert(upsertData, { onConflict: "id" })

          if (error) {
            console.error("Error bulk updating tables:", error)
          }
        }
        // For larger batches with few fields, use more efficient approach
        else {
          // Group by values to reduce number of queries
          const updatesByValues = new Map<string, number[]>()

          updates.forEach(({ id, updates }) => {
            const valueKey = fieldsList.map((field) => updates[field as keyof typeof updates]).join("|")
            if (!updatesByValues.has(valueKey)) {
              updatesByValues.set(valueKey, [])
            }
            updatesByValues.get(valueKey)?.push(id)
          })

          // Execute each group as a single query
          for (const [valueKey, ids] of updatesByValues.entries()) {
            const values = valueKey.split("|")
            const updateObj: any = {}

            fieldsList.forEach((field, index) => {
              updateObj[field] = values[index]
            })
            updateObj.updated_at = new Date().toISOString()

            const { error } = await supabase.from(this.tableName).update(updateObj).in("id", ids)

            if (error) {
              console.error("Error bulk updating tables with in clause:", error)
            }
          }
        }
      }

      // Dispatch events for the updates
      window.dispatchEvent(
        new CustomEvent("tables-bulk-updated", {
          detail: {
            updates: tableUpdates,
            timestamp: Date.now(),
          },
        }),
      )
    } catch (error) {
      console.error("Error in bulkUpdateTables:", error)
    }
  }

  // Update a table's timer based on the current time
  async updateTableTimerBasedOnCurrentTime(tableId: number): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Get the current table data
      const { data, error } = await supabase.from(this.tableName).select("*").eq("id", tableId).single()

      if (error || !data) {
        console.error(`Error fetching table ${tableId} for timer update:`, error)
        return
      }

      // Only update if the table is active
      if (!data.is_active || !data.start_time) return

      const now = Date.now()
      const startTime = data.start_time
      const initialTime = data.initial_time

      // Calculate the current remaining time
      const elapsedTime = now - startTime
      const remainingTime = initialTime - elapsedTime

      // Update the table with the current remaining time
      const { error: updateError } = await supabase
        .from(this.tableName)
        .update({
          remaining_time: remainingTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tableId)

      if (updateError) {
        console.error(`Error updating table ${tableId} timer:`, updateError)
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-timer-update", {
          detail: {
            tableId,
            remainingTime,
            initialTime,
          },
        }),
      )
    } catch (error) {
      console.error("Error updating table timer based on current time:", error)
    }
  }

  // Add a method to sync all active table timers
  async syncAllActiveTableTimers(): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Get all active tables
      const { data, error } = await supabase.from(this.tableName).select("*").eq("is_active", true).order("id")

      if (error) {
        console.error("Error fetching active tables for timer sync:", error)
        return
      }

      if (!data || data.length === 0) return

      const now = Date.now()

      // Update each active table
      for (const table of data) {
        if (!table.start_time) continue

        const elapsedTime = now - table.start_time
        const remainingTime = table.initial_time - elapsedTime

        // Update the table with the current remaining time
        const { error: updateError } = await supabase
          .from(this.tableName)
          .update({
            remaining_time: remainingTime,
            updated_at: new Date().toISOString(),
          })
          .eq("id", table.id)

        if (updateError) {
          console.error(`Error updating table ${table.id} timer during sync:`, updateError)
        }

        // Dispatch event for real-time updates
        window.dispatchEvent(
          new CustomEvent("supabase-timer-update", {
            detail: {
              tableId: table.id,
              remainingTime,
              initialTime: table.initial_time,
            },
          }),
        )
      }
    } catch (error) {
      console.error("Error syncing all active table timers:", error)
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

  // Subscribe to timer updates
  subscribeToTimerUpdates(callback: (tableId: number, remainingTime: number, initialTime: number) => void): () => void {
    try {
      // Listen for custom timer update events
      const handleTimerUpdate = (event: CustomEvent) => {
        if (event.detail && event.detail.tableId && event.detail.remainingTime !== undefined) {
          callback(
            event.detail.tableId,
            event.detail.remainingTime,
            event.detail.initialTime || event.detail.remainingTime,
          )
        }
      }

      window.addEventListener("supabase-timer-update", handleTimerUpdate as EventListener)
      window.addEventListener("timer-update", handleTimerUpdate as EventListener)

      const unsubscribe = () => {
        window.removeEventListener("supabase-timer-update", handleTimerUpdate as EventListener)
        window.removeEventListener("timer-update", handleTimerUpdate as EventListener)
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to timer updates:", error)
      return () => {}
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
export { supabaseTablesService }
export default supabaseTablesService
