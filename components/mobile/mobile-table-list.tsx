"use client"

import { useState, useRef } from "react"
import type { Table } from "@/components/billiards-timer-dashboard"
import type { Server } from "@/components/billiards-timer-dashboard"
import type { LogEntry } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { TableCard } from "@/components/table-card"

interface MobileTableListProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (table: Table) => void
}

export function MobileTableList({ tables, servers, logs, onTableClick }: MobileTableListProps) {
  const { isAuthenticated, isServer, currentUser } = useAuth()
  const [filterActive, setFilterActive] = useState(false)
  const [filterAssigned, setFilterAssigned] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter tables based on active status and assigned tables
  let filteredTables = [...tables]

  // Filter by active status if needed
  if (filterActive) {
    filteredTables = filteredTables.filter((table) => table.isActive)
  }

  // Filter by assigned server if server is logged in and filter is enabled
  if (isServer && filterAssigned && currentUser) {
    filteredTables = filteredTables.filter((table) => table.server === currentUser.id)
  }

  // Sort tables numerically by ID
  filteredTables.sort((a, b) => a.id - b.id)

  return (
    <div
      ref={containerRef}
      className="space-y-4 max-w-full overflow-x-hidden overflow-y-auto h-full pb-4 mobile-scroll-container"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex flex-wrap justify-between items-center gap-2 sticky top-0 z-10 bg-black/80 backdrop-blur-md p-2 rounded-md">
        <h2 className="text-xl text-[#00FFFF]">Tables</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1 rounded-full text-xs ${
              filterActive ? "bg-[#00FFFF] text-black" : "bg-[#000033] text-[#00FFFF] border border-[#00FFFF]"
            }`}
            onClick={() => setFilterActive(!filterActive)}
          >
            {filterActive ? "Show All" : "Active Only"}
          </button>

          {isServer && (
            <button
              className={`px-3 py-1 rounded-full text-xs ${
                filterAssigned ? "bg-[#FF00FF] text-black" : "bg-[#000033] text-[#FF00FF] border border-[#FF00FF]"
              }`}
              onClick={() => setFilterAssigned(!filterAssigned)}
            >
              {filterAssigned ? "Show All" : "My Tables"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 pb-4">
        {filteredTables.map((table) => {
          // Simple direct click handler - no conditions or checks
          return (
            <div key={table.id} className="mb-4 relative">
              <div className="absolute inset-0 z-30" onClick={() => onTableClick(table)}></div>
              <TableCard table={table} servers={servers} logs={logs} onClick={() => onTableClick(table)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
