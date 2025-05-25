import { create } from "zustand"
import { debounce } from "lodash"
import { supabaseTablesService } from "@/services/supabase-tables-service"

enum UpdateType {
  All = "all",
  TimerOnly = "timer-only",
  NonTimer = "non-timer",
}

interface TableData {
  id: number
  name: string
  status: string
  timer_minutes: number
  start_time_data: string | null
  end_time: string | null
  is_paused: boolean
  pause_time: string | null
  accumulated_time: number
  table_group_id: number | null
  server_id: number | null
  manuallyUpdated?: boolean
  remaining_time?: number
  initial_time?: number
  is_active?: boolean
  start_time?: string
}

interface TableState {
  tables: Record<number, TableData>
  pendingUpdates: Record<number, Partial<TableData>>
  isUpdating: Record<number, boolean>
  updateTableLocally: (tableId: number, data: Partial<TableData>, isManualUpdate?: boolean) => void
  commitUpdatesToSupabase: (tableId: number, updateType?: UpdateType) => Promise<void>
  refreshTable: (tableId: number, data: TableData) => void
  getTable: (tableId: number) => TableData | null
  commitUpdatesWithFrequency: (tableId: number) => void
  handleTimeUpdate: (tableId: number, remainingTime: number, initialTime: number, source: string) => void
}

const DEFAULT_TABLE_TIME_MINUTES = 60

const validateTableId = (tableId: number): void => {
  // Modified to allow tableId 0 (used for system-wide logs/operations)
  if (!Number.isInteger(tableId) || tableId < 0) {
    throw new Error(`Invalid tableId: ${tableId}`)
  }
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: {},
  pendingUpdates: {},
  isUpdating: {},

  updateTableLocally: (tableId: number, data: Partial<TableData>, isManualUpdate = false) => {
    validateTableId(tableId)
    set((state) => {
      const currentTable = state.tables[tableId] || ({} as TableData)
      const currentPendingUpdates = state.pendingUpdates[tableId] || {}
      const newPendingUpdates = { ...currentPendingUpdates, ...data }
      if (isManualUpdate) {
        newPendingUpdates.manuallyUpdated = true
      }

      const mergedTable = { ...currentTable, ...newPendingUpdates }

      if (data.is_paused === false && data.start_time_data === null && currentTable.start_time_data !== null) {
        mergedTable.timer_minutes = DEFAULT_TABLE_TIME_MINUTES
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

  commitUpdatesToSupabase: debounce(
    async (tableId: number, updateType = UpdateType.All) => {
      validateTableId(tableId)

      // Skip Supabase updates for tableId 0 (system table)
      if (tableId === 0) return

      const state = get()
      const pendingUpdates = state.pendingUpdates[tableId]

      if (!pendingUpdates || Object.keys(pendingUpdates).length === 0) {
        return
      }

      set((state) => ({
        isUpdating: { ...state.isUpdating, [tableId]: true },
      }))

      try {
        let updatesToSend = { ...pendingUpdates }
        if (updateType === UpdateType.TimerOnly) {
          updatesToSend = {
            ...(pendingUpdates.timer_minutes !== undefined ? { timer_minutes: pendingUpdates.timer_minutes } : {}),
            ...(pendingUpdates.start_time_data !== undefined
              ? { start_time_data: pendingUpdates.start_time_data }
              : {}),
            ...(pendingUpdates.is_paused !== undefined ? { is_paused: pendingUpdates.is_paused } : {}),
            ...(pendingUpdates.pause_time !== undefined ? { pause_time: pendingUpdates.pause_time } : {}),
            ...(pendingUpdates.accumulated_time !== undefined
              ? { accumulated_time: pendingUpdates.accumulated_time }
              : {}),
          }
        } else if (updateType === UpdateType.NonTimer) {
          const { timer_minutes, start_time_data, is_paused, pause_time, accumulated_time, ...nonTimerUpdates } =
            pendingUpdates
          updatesToSend = nonTimerUpdates
        }

        if (Object.keys(updatesToSend).length > 0) {
          await supabaseTablesService.updateTable(tableId, updatesToSend)
          notifyTableUpdate(tableId, { type: "commit", id: tableId })

          set((state) => {
            const newPendingUpdates = { ...state.pendingUpdates[tableId] }
            Object.keys(updatesToSend).forEach((key) => delete newPendingUpdates[key])
            return {
              pendingUpdates: { ...state.pendingUpdates, [tableId]: newPendingUpdates },
            }
          })
        }
      } catch (error) {
        console.error("Failed to update table in Supabase:", error)
        // Consider adding to a retry queue or logging to an external service
      } finally {
        set((state) => ({
          isUpdating: { ...state.isUpdating, [tableId]: false },
        }))
      }
    },
    500,
    { leading: false, trailing: true },
  ),

  refreshTable: (tableId: number, data: TableData) => {
    validateTableId(tableId)
    // Special handling for tableId 0 (system table)
    if (tableId === 0) {
      // For system table, just store it without validation
      set((state) => ({
        tables: { ...state.tables, [tableId]: { ...data } },
      }))
      return
    }

    set((state) => ({
      tables: { ...state.tables, [tableId]: { ...data } },
    }))
  },

  getTable: (tableId: number) => {
    validateTableId(tableId)
    return get().tables[tableId] || null
  },

  commitUpdatesWithFrequency: (tableId: number) => {
    validateTableId(tableId)
    // Skip for system table
    if (tableId === 0) return

    get().commitUpdatesToSupabase(tableId)
  },

  handleTimeUpdate: (tableId: number, remainingTime: number, initialTime: number, source: string) => {
    validateTableId(tableId)
    // Skip for system table
    if (tableId === 0) return

    const updates = {
      remaining_time: remainingTime,
      initial_time: initialTime,
    }
    get().updateTableLocally(tableId, updates, true)

    // Notify listeners about the time update
    notifyTableUpdate(tableId, {
      type: "update",
      id: tableId,
      data: updates,
    })
  },
}))

// Event system
type TableEventPayload = { type: "commit"; id: number } | { type: "update"; id: number; data: Partial<TableData> }

type TableEventListener = (tableId: number, event: TableEventPayload) => void

const listeners: TableEventListener[] = []

export const addTableUpdateListener = (listener: TableEventListener) => {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }
}

export const notifyTableUpdate = (tableId: number | string, event: TableEventPayload) => {
  const id = typeof tableId === "string" ? Number.parseInt(tableId, 10) : tableId
  listeners.forEach((listener) => {
    try {
      listener(id, event)
    } catch (error) {
      console.error("Error notifying listener:", error)
    }
  })
}
