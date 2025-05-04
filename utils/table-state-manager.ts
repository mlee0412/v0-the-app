// Table State Manager - Centralized state management for table components
import { create } from "zustand"
import { throttle } from "lodash"
import { supabaseTablesService } from "@/services/supabase-tables-service"
import { calculateRemainingTime } from "@/utils/timer-sync-utils"

// Define the table state interface
interface TableState {
  tables: Record<number, TableData>
  pendingUpdates: Record<number, Partial<TableData>>
  isUpdating: Record<number, boolean>

  // Actions
  updateTableLocally: (tableId: number, data: Partial<TableData>, isManualUpdate?: boolean) => void
  commitUpdatesToSupabase: (tableId: number, updateType?: string) => Promise<void>
  refreshTable: (tableId: number, data: TableData) => void
  getTable: (tableId: number) => TableData | null
  commitUpdatesWithFrequency: (tableId: number) => void
  handleTimeUpdate: (tableId: number, remainingTime: number, initialTime: number, source: string) => void
}

// Define the table data interface
export interface TableData {
  id: number
  name: string
  status: string
  timer_minutes: number
  start_time: string | null
  end_time: string | null
  is_paused: boolean
  pause_time: string | null
  accumulated_time: number
  table_group_id: number | null
  server_id: number | null
  manuallyUpdated?: boolean // Track if the table has been manually updated
}

// Create the store
export const useTableStore = create<TableState>((set, get) => ({
  tables: {},
  pendingUpdates: {},
  isUpdating: {},

  // Update table locally without sending to Supabase
  updateTableLocally: (tableId: number, data: Partial<TableData>, isManualUpdate = false) => {
    set((state) => {
      // Get current table data or create empty object if it doesn't exist
      const currentTable = state.tables[tableId] || ({} as TableData)

      // Merge the updates with pending updates
      const currentPendingUpdates = state.pendingUpdates[tableId] || {}
      const newPendingUpdates = { ...currentPendingUpdates, ...data }

      // If this is a manual update (like adding/subtracting time), mark it
      if (isManualUpdate) {
        newPendingUpdates.manuallyUpdated = true
      }

      // Create a merged view for the UI (current table + all pending updates)
      const mergedTable = { ...currentTable, ...newPendingUpdates }

      // Handle session end case - ensure complete reset
      if (data.is_paused === false && data.start_time === null && currentTable.start_time !== null) {
        // This is a session end event - reset all values to defaults
        const DEFAULT_TIME = 60 * 60 * 1000
        mergedTable.timer_minutes = DEFAULT_TIME / 60000
        mergedTable.accumulated_time = 0
        mergedTable.is_paused = false
        mergedTable.pause_time = null
        mergedTable.server_id = null
        mergedTable.table_group_id = null
      }

      return {
        tables: { ...state.tables, [tableId]: mergedTable },
        pendingUpdates: { ...state.pendingUpdates, [tableId]: newPendingUpdates },
      }
    })
  },

  // Commit pending updates to Supabase
  commitUpdatesToSupabase: throttle(
    async (tableId: number, updateType = "all") => {
      const state = get()
      const pendingUpdates = state.pendingUpdates[tableId]

      if (!pendingUpdates || Object.keys(pendingUpdates).length === 0) {
        return
      }

      // Mark as updating
      set((state) => ({
        isUpdating: { ...state.isUpdating, [tableId]: true },
      }))

      try {
        // Filter updates based on type if needed
        let updatesToSend = { ...pendingUpdates }

        if (updateType === "timer-only") {
          // Only send timer-related updates
          const { timer_minutes, start_time, is_paused, pause_time, accumulated_time } = pendingUpdates
          updatesToSend = {
            ...(timer_minutes !== undefined ? { timer_minutes } : {}),
            ...(start_time !== undefined ? { start_time } : {}),
            ...(is_paused !== undefined ? { is_paused } : {}),
            ...(pause_time !== undefined ? { pause_time } : {}),
            ...(accumulated_time !== undefined ? { accumulated_time } : {}),
          }
        } else if (updateType === "non-timer") {
          // Only send non-timer updates
          const { timer_minutes, start_time, is_paused, pause_time, accumulated_time, ...nonTimerUpdates } =
            pendingUpdates
          updatesToSend = nonTimerUpdates
        }

        if (Object.keys(updatesToSend).length > 0) {
          // Send updates to Supabase
          await supabaseTablesService.updateTable(tableId, updatesToSend)

          // Clear only the sent pending updates
          set((state) => {
            const newPendingUpdates = { ...state.pendingUpdates[tableId] }
            Object.keys(updatesToSend).forEach((key) => {
              delete newPendingUpdates[key]
            })

            return {
              pendingUpdates: {
                ...state.pendingUpdates,
                [tableId]: newPendingUpdates,
              },
            }
          })
        }
      } catch (error) {
        console.error("Failed to update table in Supabase:", error)
      } finally {
        // Mark as no longer updating
        set((state) => ({
          isUpdating: { ...state.isUpdating, [tableId]: false },
        }))
      }
    },
    500, // Reduced from 1000ms to 500ms for better responsiveness
    { leading: true, trailing: true }, // Changed to leading: true to start updates immediately
  ),

  // Commit updates with different frequencies based on data type
  commitUpdatesWithFrequency: (tableId: number) => {
    const state = get()
    const pendingUpdates = state.pendingUpdates[tableId]

    if (!pendingUpdates || Object.keys(pendingUpdates).length === 0) {
      return
    }

    // Check if there are timer-related updates
    const hasTimerUpdates =
      pendingUpdates.remainingTime !== undefined ||
      pendingUpdates.initialTime !== undefined ||
      pendingUpdates.isActive !== undefined ||
      pendingUpdates.startTime !== undefined

    // Check if there are non-timer updates
    const hasNonTimerUpdates = Object.keys(pendingUpdates).some(
      (key) => !["remainingTime", "initialTime", "isActive", "startTime"].includes(key),
    )

    // Commit timer updates immediately (real-time)
    if (hasTimerUpdates) {
      get().commitUpdatesToSupabase(tableId, "timer-only")
    }

    // Non-timer updates are committed less frequently by the component
    // using the periodic interval
  },

  // Refresh table with data from Supabase
  refreshTable: (tableId: number, data: TableData) => {
    set((state) => ({
      tables: { ...state.tables, [tableId]: data },
      // Keep pending updates that haven't been sent yet
      pendingUpdates: {
        ...state.pendingUpdates,
        [tableId]: state.pendingUpdates[tableId] || {},
      },
    }))
  },

  // Get table data
  getTable: (tableId: number) => {
    const state = get()
    return state.tables[tableId] || null
  },

  // Handle time updates from any source (dialog, card, etc.)
  handleTimeUpdate: (tableId: number, remainingTime: number, initialTime: number, source: string) => {
    // Update locally first
    get().updateTableLocally(
      tableId,
      {
        remainingTime,
        initialTime,
        manuallyUpdated: true,
      },
      true,
    )

    // Commit timer updates immediately for real-time experience
    get().commitUpdatesToSupabase(tableId, "timer-only")

    // Notify all listeners
    notifyTableUpdate(tableId, {
      remainingTime,
      initialTime,
      manuallyUpdated: true,
    })
  },
}))

// Helper function to calculate remaining time with support for negative values
export function getRemainingTime(table: TableData | null): number {
  if (!table) return 0

  const remainingTime = calculateRemainingTime(
    table.timer_minutes,
    table.start_time,
    table.is_paused,
    table.pause_time,
    table.accumulated_time,
  )

  // Allow negative values (don't use Math.max here)
  return remainingTime
}

// Event system for table updates
type TableEventListener = (tableId: number, data: Partial<TableData>) => void
const listeners: TableEventListener[] = []

export function addTableUpdateListener(listener: TableEventListener) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }
}

export function notifyTableUpdate(tableId: number, data: Partial<TableData>) {
  listeners.forEach((listener) => listener(tableId, data))
}
