"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import type { Table } from "@/components/billiards-timer-dashboard"
import type { Server } from "@/components/billiards-timer-dashboard"
import type { LogEntry } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { TableCard } from "@/components/table-card"
import { hapticFeedback } from "@/utils/haptic-feedback"

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
  const [lastTouchEnd, setLastTouchEnd] = useState(0)

  // Filter tables based on active status and assigned tables - memoized for performance
  const filteredTables = useMemo(() => {
    let result = [...tables]

    // Filter by active status if needed
    if (filterActive) {
      result = result.filter((table) => table.isActive)
    }

    // Filter by assigned server if server is logged in and filter is enabled
    if (isServer && filterAssigned && currentUser) {
      result = result.filter((table) => table.server === currentUser.id)
    }

    // Sort tables numerically by ID
    return result.sort((a, b) => a.id - b.id)
  }, [tables, filterActive, filterAssigned, isServer, currentUser])

  // Handle filter toggles with haptic feedback
  const handleFilterActiveToggle = useCallback(() => {
    hapticFeedback.selection()
    setFilterActive(!filterActive)
  }, [filterActive])

  const handleFilterAssignedToggle = useCallback(() => {
    hapticFeedback.selection()
    setFilterAssigned(!filterAssigned)
  }, [filterAssigned])

  // Handle table click with touch optimizations
  const handleTableClick = useCallback(
    (table: Table) => {
      // Prevent double tap by checking time since last touch
      const now = Date.now()
      if (now - lastTouchEnd < 300) {
        return
      }
      setLastTouchEnd(now)

      // Provide haptic feedback
      hapticFeedback.medium()

      // Call the click handler
      onTableClick(table)
    },
    [onTableClick, lastTouchEnd],
  )

  // Handle scroll optimization
  const handleTouchMove = useCallback(() => {
    // This helps optimize performance during scrolling
    // by signaling this is a scroll operation
    containerRef.current?.classList.add("is-scrolling")
  }, [])

  const handleTouchEnd = useCallback(() => {
    // Remove scrolling class when touch ends
    containerRef.current?.classList.remove("is-scrolling")
  }, [])

  return (
    <div
      ref={containerRef}
      className="space-y-4 max-w-full overflow-x-hidden overflow-y-auto h-full pb-4 mobile-scroll-container smooth-scroll hardware-accelerated notch-aware"
      style={{ WebkitOverflowScrolling: "touch" }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-wrap justify-between items-center gap-2 sticky top-0 z-10 bg-black/80 backdrop-blur-md p-2 rounded-md notch-aware">
        <h2 className="text-xl text-[#00FFFF]">Tables</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1 rounded-full text-xs elastic-press ios-tap-highlight ${
              filterActive ? "bg-[#00FFFF] text-black" : "bg-[#000033] text-[#00FFFF] border border-[#00FFFF]"
            }`}
            onClick={handleFilterActiveToggle}
          >
            {filterActive ? "Show All" : "Active Only"}
          </button>

          {isServer && (
            <button
              className={`px-3 py-1 rounded-full text-xs elastic-press ios-tap-highlight ${
                filterAssigned ? "bg-[#FF00FF] text-black" : "bg-[#000033] text-[#FF00FF] border border-[#FF00FF]"
              }`}
              onClick={handleFilterAssignedToggle}
            >
              {filterAssigned ? "Show All" : "My Tables"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 pb-16">
        {filteredTables.map((table) => (
          <div key={table.id} className="mb-4 relative touch-target">
            <div className="absolute inset-0 z-30 touch-target" onClick={() => handleTableClick(table)}></div>
            <TableCard table={table} servers={servers} logs={logs} onClick={() => handleTableClick(table)} />
          </div>
        ))}
      </div>
    </div>
  )
}
