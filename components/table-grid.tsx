"use client"

import type { Table } from "@/components/billiards-timer-dashboard"
import type { LogEntry } from "@/components/billiards-timer-dashboard"
import { TableCard } from "@/components/table-card"

// Define the Server type
interface Server {
  id: number
  name: string
}

// Update the interface
interface TableGridProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (table: Table) => void
}

// Update the function signature
export function TableGrid({ tables, servers, logs, onTableClick }: TableGridProps) {
  // Find tables by ID with safety check
  const getTable = (id: number) => {
    const table = tables.find((table) => table.id === id)
    if (table) return table

    // If table not found, create a default one
    return {
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
    }
  }

  // Top row tables (T1-T6)
  const topRowTables = [1, 2, 3, 4, 5, 6].map((id) => getTable(id))

  // Bottom tables with specific layout
  const t7 = getTable(7)
  const t8 = getTable(8)
  const t9 = getTable(9)
  const t10 = getTable(10)
  const t11 = getTable(11)

  return (
    <div className="w-full">
      {/* Top row (T1-T6) */}
      <div className="grid grid-cols-6 gap-2 mb-2">
        {topRowTables.map((table) => (
          <div key={table.id} className="col-span-1">
            <TableCard table={table} servers={servers} logs={logs} onClick={() => onTableClick(table)} />
          </div>
        ))}
      </div>

      {/* Second row with T10 and T7 */}
      <div className="grid grid-cols-6 gap-2 mt-2">
        {/* Empty space where T11 was */}
        <div className="col-span-1"></div>

        {/* Empty space */}
        <div className="col-span-1"></div>

        {/* T10 in third position */}
        <div className="col-span-1">
          <TableCard table={t10} servers={servers} logs={logs} onClick={() => onTableClick(t10)} />
        </div>

        {/* Empty spaces */}
        <div className="col-span-2"></div>

        {/* T7 directly below T6 (sixth position) */}
        <div className="col-span-1">
          <TableCard table={t7} servers={servers} logs={logs} onClick={() => onTableClick(t7)} />
        </div>
      </div>

      {/* Third row with T11, T9 and T8 */}
      <div className="grid grid-cols-6 gap-2 mt-2">
        {/* T11 moved down to first position of third row */}
        <div className="col-span-1">
          <TableCard table={t11} servers={servers} logs={logs} onClick={() => onTableClick(t11)} />
        </div>

        {/* Empty spaces */}
        <div className="col-span-3"></div>

        {/* T9 to the left of T8 (fifth position) */}
        <div className="col-span-1">
          <TableCard table={t9} servers={servers} logs={logs} onClick={() => onTableClick(t9)} />
        </div>

        {/* T8 directly below T7 (sixth position) */}
        <div className="col-span-1">
          <TableCard table={t8} servers={servers} logs={logs} onClick={() => onTableClick(t8)} />
        </div>
      </div>
    </div>
  )
}
