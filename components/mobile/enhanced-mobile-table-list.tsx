"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import type { Table } from "@/components/system/billiards-timer-dashboard"
import type { Server } from "@/components/system/billiards-timer-dashboard"
import type { LogEntry } from "@/components/system/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { TableCard } from "@/components/tables/table-card"
import { hapticFeedback } from "@/utils/haptic-feedback"

interface MobileTableListProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (table: Table) => void
}

export function EnhancedMobileTableList({ tables, servers, logs, onTableClick }: MobileTableListProps) {
  const { isAuthenticated, isServer, currentUser } = useAuth()
  const [filterActive, setFilterActive] = useState(false)
  const [filterAssigned, setFilterAssigned] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [lastTouchEnd, setLastTouchEnd] = useState(0)

  // Filter tables based on active status and assigned tables - memoized for performance
  const filteredTables = useMemo(() => {
    let result = [...tables]

    // Filter out system tables
    result = result.filter((table) => !table.name.toLowerCase().includes("system"))

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
      <div className="flex flex-wrap justify-between items-center gap-2 sticky top-0 z-10 bg-black/80 backdrop-blur-md p-3 rounded-lg notch-aware cosmic-panel">
        <h2 className="text-xl font-bold text-[#00FFFF] cosmic-text">Tables</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-1.5 rounded-full text-xs font-medium elastic-press ios-tap-highlight transition-all duration-300 ${
              filterActive
                ? "bg-gradient-to-r from-[#00FFFF] to-[#00CCFF] text-black shadow-glow-cyan"
                : "bg-black/60 text-[#00FFFF] border border-[#00FFFF]/50 shadow-inner-subtle"
            }`}
            onClick={handleFilterActiveToggle}
          >
            <span className="flex items-center gap-1">{filterActive ? "Showing Active" : "Show Active Only"}</span>
          </button>

          {isServer && (
            <button
              className={`px-4 py-1.5 rounded-full text-xs font-medium elastic-press ios-tap-highlight transition-all duration-300 ${
                filterAssigned
                  ? "bg-gradient-to-r from-[#FF00FF] to-[#CC00FF] text-black shadow-glow-magenta"
                  : "bg-black/60 text-[#FF00FF] border border-[#FF00FF]/50 shadow-inner-subtle"
              }`}
              onClick={handleFilterAssignedToggle}
            >
              <span className="flex items-center gap-1">{filterAssigned ? "Showing My Tables" : "Show My Tables"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 pb-20 px-1">
        {filteredTables.length > 0 ? (
          filteredTables.map((table, index) => (
            <div
              key={table.id}
              className="mb-4 relative touch-target table-card-container"
              style={{
                animationDelay: `${index * 50}ms`,
                transform: "translateY(0)",
                opacity: 1,
              }}
            >
              <div className="absolute inset-0 z-30 touch-target" onClick={() => handleTableClick(table)}></div>
              <TableCard table={table} servers={servers} logs={logs} onClick={() => handleTableClick(table)} />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-[#00FFFF] opacity-70 mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 17H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-white/70 text-sm">No tables match your current filters</p>
            <button
              onClick={() => {
                setFilterActive(false)
                setFilterAssigned(false)
                hapticFeedback.light()
              }}
              className="mt-4 px-4 py-2 bg-[#00FFFF]/10 text-[#00FFFF] rounded-md text-sm font-medium border border-[#00FFFF]/30"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
