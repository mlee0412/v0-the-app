import { getSupabaseClient } from "@/lib/supabase/client"
import type { LogEntry } from "@/components/billiards-timer-dashboard"

// Logs interface for Supabase
interface LogsRecord {
  id: string
  table_id: number
  table_name: string
  action: string
  timestamp: number
  details: string
}

// Convert log from Supabase format to app format
function convertLogFromDB(record: LogsRecord): LogEntry {
  return {
    id: record.id,
    tableId: record.table_id,
    tableName: record.table_name,
    action: record.action,
    timestamp: record.timestamp,
    details: record.details,
  }
}

// Convert log from app format to Supabase format
function convertLogToDB(log: LogEntry): LogsRecord {
  return {
    id: log.id,
    table_id: log.tableId,
    table_name: log.tableName,
    action: log.action,
    timestamp: log.timestamp,
    details: log.details,
  }
}

class SupabaseLogsService {
  private subscriptions: (() => void)[] = []

  // Initialize logs table
  async initializeLogs(): Promise<void> {
    try {
      // Check if logs table exists
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("logs").select("count")

      if (error) {
        console.error("Error checking logs table:", error)
        // If table doesn't exist, create it using SQL
        if (error.code === "PGRST116") {
          console.log("Logs table does not exist, creating...")
          await this.createLogsTable()
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error("Error initializing logs:", error)
      throw error
    }
  }

  // Create logs table using SQL
  private async createLogsTable(): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Create the logs table directly with SQL
      const { error } = await supabase.rpc("create_logs_table")

      if (error) {
        console.error("Error creating logs table with RPC:", error)

        // Fallback: create table directly with SQL
        const { error: sqlError } = await supabase.sql(`
          CREATE TABLE IF NOT EXISTS public.logs (
            id TEXT PRIMARY KEY,
            table_id INTEGER NOT NULL,
            table_name TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `)

        if (sqlError) throw sqlError
      }
    } catch (error) {
      console.error("Error creating logs table:", error)
      throw error
    }
  }

  // Get all logs
  async getLogs(): Promise<LogEntry[]> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("logs").select("*").order("timestamp", { ascending: false })

      if (error) throw error

      return data ? data.map(convertLogFromDB) : []
    } catch (error) {
      console.error("Error fetching logs:", error)
      return []
    }
  }

  // Add a log entry
  async addLogEntry(tableId: number, tableName: string, action: string, details = ""): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const newLog: LogEntry = {
        id: Date.now().toString(),
        tableId,
        tableName,
        action,
        timestamp: Date.now(),
        details,
      }

      const { error } = await supabase.from("logs").insert(convertLogToDB(newLog))

      if (error) throw error

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-logs-update", {
          detail: { log: convertLogToDB(newLog) },
        }),
      )
    } catch (error) {
      console.error("Error adding log entry:", error)
      throw error
    }
  }

  // Subscribe to logs changes
  subscribeToLogs(callback: (logs: LogEntry[]) => void): () => void {
    try {
      const supabase = getSupabaseClient()
      const channel = supabase
        .channel("logs-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, (payload) => {
          console.log("Logs change received:", payload)
          this.getLogs().then(callback)
        })
        .subscribe()

      const unsubscribe = () => {
        channel.unsubscribe()
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to logs:", error)
      return () => {}
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.subscriptions = []
  }
}

const supabaseLogsService = new SupabaseLogsService()
export default supabaseLogsService
