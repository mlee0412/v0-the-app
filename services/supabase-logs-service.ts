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
      const { data, error } = await supabase.from("session_logs").select("count")

      if (error) {
        console.error("Error checking session_logs table:", error)
        // If table doesn't exist, create it using SQL
        if (error.code === "PGRST116") {
          console.log("Session logs table does not exist, creating...")
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
      // Call the correct RPC function that creates the session_logs table
      const { error } = await supabase.rpc("create_session_logs_table")
      if (error) throw error
    } catch (error) {
      console.error("Error creating session logs table:", error)
      throw error
    }
  }

  // Get all logs
  async getLogs(): Promise<LogEntry[]> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("session_logs").select("*").order("timestamp", { ascending: false })

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

      const { error } = await supabase.from("session_logs").insert(convertLogToDB(newLog))

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
        .on("postgres_changes", { event: "*", schema: "public", table: "session_logs" }, (payload) => {
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
