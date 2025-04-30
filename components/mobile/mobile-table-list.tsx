"use client"

import { useState, useRef, useEffect } from "react"
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
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setIsScrolling(true)

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Set a timeout to reset the scrolling flag
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 200)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

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

  // Check if current user can interact with this table
  const canInteractWithTable = (table: Table) => {
    if (!isAuthenticated) return false
    if (!isServer) return true // Admin or viewer can see all tables

    // Server can only interact with their own tables or unassigned tables
    return !table.server || table.server === currentUser?.id
  }

  // Handle table click with scrolling check
  const handleTableClick = (table: Table) => {
    if (isScrolling) return

    if (canInteractWithTable(table)) {
      onTableClick(table)
    }
  }

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
          const canInteract = canInteractWithTable(table)

          return (
            <div key={table.id} className={`${canInteract ? "" : "opacity-70"} mb-4`}>
              <TableCard table={table} servers={servers} logs={logs} onClick={() => handleTableClick(table)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
