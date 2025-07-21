"use client"

import type { Table, LogEntry } from "@/components/system/billiards-timer-dashboard"
import { TableCard } from "@/components/tables/table-card"
import { SwipeableTableCard } from "@/components/tables/swipeable-table-card"
import { useMemo, useCallback, memo } from "react"

// Define interfaces
interface Server {
  id: number
  name: string
}

// Centralize default table creation for reusability
export const createDefaultTable = (id: number): Table => ({
  id,
  name: `T${id}`,
  isActive: false,
  startTime: null,
  remainingTime: 60 * 60 * 1000, // 60 minutes
  initialTime: 60 * 60 * 1000,
  guestCount: 0,
  server: null,
  groupId: null,
  hasNotes: false,
  noteId: "",
  noteText: "",
})

interface TableGridProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (table: Table) => void
  onOpenQuickStartDialog?: (tableId: number) => void
  onOpenQuickNoteDialog?: (tableId: number) => void
  onOpenStatusDialog?: (tableId: number) => void
  onMoveRequest?: (tableId: number) => void
  onGroupRequest?: (tableId: number) => void
  onQuickEndSession?: (tableId: number) => void
  canQuickStart?: boolean
  canEndSession?: boolean
  showAnimations?: boolean
}

// Define layout configuration for flexibility
const TABLE_LAYOUT: { id: number; row: number; col: number }[] = [
  // Top row: T1-T6
  { id: 1, row: 1, col: 1 },
  { id: 2, row: 1, col: 2 },
  { id: 3, row: 1, col: 3 },
  { id: 4, row: 1, col: 4 },
  { id: 5, row: 1, col: 5 },
  { id: 6, row: 1, col: 6 },
  // Second row: T10, T7
  { id: 10, row: 2, col: 3 },
  { id: 7, row: 2, col: 6 },
  // Third row: T11, T9, T8
  { id: 11, row: 3, col: 1 },
  { id: 9, row: 3, col: 5 },
  { id: 8, row: 3, col: 6 },
]

function TableGridComponent({
  tables = [],
  servers = [],
  logs = [],
  onTableClick,
  onOpenQuickStartDialog,
  onOpenQuickNoteDialog,
  onOpenStatusDialog,
  onMoveRequest,
  onGroupRequest,
  onQuickEndSession,
  canQuickStart,
  canEndSession,
  showAnimations = true,
}: TableGridProps) {
  // Memoize the table lookup map for performance
  const tableMap = useMemo(() => {
    return new Map<number, Table>(tables.map((table) => [table.id, table]))
  }, [tables])

  // Memoize the getTable function
  const getTable = useCallback(
    (id: number): Table => {
      const table = tableMap.get(id)
      if (table) return table

      console.warn(`Table with ID ${id} not found, using default.`)
      return createDefaultTable(id)
    },
    [tableMap],
  )

  // Memoize the table cards to prevent unnecessary re-renders
  const tableCards = useMemo(() => {
    return TABLE_LAYOUT.map(({ id, row, col }) => {
      const table = getTable(id)
      return {
        table,
        row,
        col,
        key: `table-${id}`,
      }
    })
  }, [getTable])

  // Memoize the click handler for each table
  const handleTableClick = useCallback(
    (table: Table) => {
      onTableClick(table)
    },
    [onTableClick],
  )

  // Validate props
  const isValidProps = useMemo(() => {
    return Array.isArray(tables) && Array.isArray(servers || []) && Array.isArray(logs || [])
  }, [tables, servers, logs])

  if (!isValidProps) {
    console.error("Invalid props: tables, servers, and logs must be arrays.")
    return <div className="text-destructive">Error: Invalid data provided.</div>
  }

  return (
    <div className="w-full">
      <div
        className="grid gap-3 mt-2 mb-2 grid-cols-2 sm:grid-cols-6"
        style={{
          gridTemplateRows: "repeat(3, auto)",
        }}
        role="grid"
        aria-label="Billiards table layout"
      >
        {tableCards.map(({ table, row, col, key }) => (
          <div
            key={key}
            className="w-full"
            style={{
              gridRow: row,
              gridColumn: col,
            }}
            role="gridcell"
          >
            {onOpenQuickStartDialog || onQuickEndSession ? (
              <SwipeableTableCard
                table={table}
                servers={servers}
                logs={logs}
                onClick={() => handleTableClick(table)}
                onOpenQuickStartDialog={onOpenQuickStartDialog}
                onOpenQuickNoteDialog={onOpenQuickNoteDialog}
                onOpenStatusDialog={onOpenStatusDialog}
                onMoveRequest={onMoveRequest}
                onGroupRequest={onGroupRequest}
                onEndSession={onQuickEndSession}
                canQuickStart={canQuickStart}
                canEndSession={canEndSession}
                showAnimations={showAnimations}
              />
            ) : (
              <TableCard
                table={table}
                servers={servers}
                logs={logs}
                onClick={() => handleTableClick(table)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleTableClick(table)
                  }
                }}
                tabIndex={0}
                showAnimations={showAnimations}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Ensure the component is memoized
export const TableGrid = memo(TableGridComponent)
