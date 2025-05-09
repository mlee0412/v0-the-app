"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { SwipeableTableCard } from "@/components/mobile/swipeable-table-card"
import { RefreshCw, Search, X, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TableDialog } from "@/components/table-dialog"

interface EnhancedMobileTableListProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (table: Table) => void
  onRefresh: () => Promise<void>
  onAddTime: (tableId: number) => void
  onEndSession: (tableId: number) => void
  noteTemplates: any[]
  onStartSession: (tableId: number) => void
  onUpdateGuestCount: (tableId: number, count: number) => void
  onAssignServer: (tableId: number, serverId: string | null) => void
  onGroupTables: (tableIds: number[]) => void
  onUngroupTable: (tableId: number) => void
  onMoveTable: (sourceId: number, targetId: number) => void
  onUpdateNotes: (tableId: number, noteId: string, noteText: string) => void
  getServerName: (serverId: string | null) => string
  viewOnlyMode?: boolean
}

export function EnhancedMobileTableList({
  tables,
  servers,
  logs,
  onTableClick,
  onRefresh,
  onAddTime,
  onEndSession,
  noteTemplates,
  onStartSession,
  onUpdateGuestCount,
  onAssignServer,
  onGroupTables,
  onUngroupTable,
  onMoveTable,
  onUpdateNotes,
  getServerName,
  viewOnlyMode = false,
}: EnhancedMobileTableListProps) {
  const { isAuthenticated, isServer, currentUser, hasPermission } = useAuth()
  const [filterActive, setFilterActive] = useState(false)
  const [filterAssigned, setFilterAssigned] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [showAddTimeDialog, setShowAddTimeDialog] = useState(false)
  const [tableForAddTime, setTableForAddTime] = useState<number | null>(null)
  const [lastTouchEnd, setLastTouchEnd] = useState(0)
  const [touchDistance, setTouchDistance] = useState(0)
  const [scrollEndTime, setScrollEndTime] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const pullStartY = useRef(0)
  const pullMoveY = useRef(0)
  const refreshing = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartTime = useRef(0)
  const touchStartPos = useRef({ x: 0, y: 0 })
  const touchEndPos = useRef({ x: 0, y: 0 })
  const isTouchMoveRef = useRef(false)
  const touchMoveCount = useRef(0)
  const isScrollingRef = useRef(false)
  const lastScrollTop = useRef(0)
  const scrollVelocity = useRef(0)
  const scrollTimestamp = useRef(0)
  const scrollCooldownRef = useRef(false)
  const scrollCooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollDirectionRef = useRef<"up" | "down" | null>(null)

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape")
    }

    handleOrientationChange() // Initial check
    window.addEventListener("resize", handleOrientationChange)

    return () => {
      window.removeEventListener("resize", handleOrientationChange)
    }
  }, [])

  // Handle scroll events with improved detection
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const now = Date.now()
      const scrollTop = container.scrollTop

      // Calculate scroll velocity
      if (now - scrollTimestamp.current > 0) {
        scrollVelocity.current = Math.abs(scrollTop - lastScrollTop.current) / (now - scrollTimestamp.current)
      }

      // Determine scroll direction
      if (scrollTop > lastScrollTop.current) {
        scrollDirectionRef.current = "down"
      } else if (scrollTop < lastScrollTop.current) {
        scrollDirectionRef.current = "up"
      }

      // Update references
      lastScrollTop.current = scrollTop
      scrollTimestamp.current = now

      // Set scrolling state
      setIsScrolling(true)
      isScrollingRef.current = true

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Set a timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
        isScrollingRef.current = false
        setScrollEndTime(Date.now())

        // Set a cooldown period after scrolling ends
        scrollCooldownRef.current = true

        // The faster the scroll, the longer the cooldown
        const cooldownTime = Math.min(Math.max(scrollVelocity.current * 1000, 300), 1000)

        if (scrollCooldownTimeoutRef.current) {
          clearTimeout(scrollCooldownTimeoutRef.current)
        }

        scrollCooldownTimeoutRef.current = setTimeout(() => {
          scrollCooldownRef.current = false
        }, cooldownTime)
      }, 100)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (scrollCooldownTimeoutRef.current) {
        clearTimeout(scrollCooldownTimeoutRef.current)
      }
    }
  }, [])

  // Pull to refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    // Record touch start time and position for distinguishing between taps and swipes
    touchStartTime.current = Date.now()
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    touchMoveCount.current = 0
    isTouchMoveRef.current = false

    // Only enable pull-to-refresh when at the top of the container
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY
      pullMoveY.current = pullStartY.current
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    isTouchMoveRef.current = true
    touchMoveCount.current += 1
    touchEndPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

    // Calculate distance moved
    const dx = touchEndPos.current.x - touchStartPos.current.x
    const dy = touchEndPos.current.y - touchStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    setTouchDistance(distance)

    // If moved more than 5px, consider it a scroll
    if (distance > 5) {
      isScrollingRef.current = true
    }

    if (refreshing.current) return

    pullMoveY.current = e.touches[0].clientY

    // Only allow pull-to-refresh when at the top of the container
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const pullDistance = pullMoveY.current - pullStartY.current

      if (pullDistance > 0 && pullDistance < 100) {
        setRefreshProgress(pullDistance / 100)
        setIsRefreshing(true)
      }
    }
  }

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const now = Date.now()
    const touchDuration = now - touchStartTime.current
    const dx = touchEndPos.current.x - touchStartPos.current.x
    const dy = touchEndPos.current.y - touchStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Detect double-tap (prevent accidental double opens)
    const isDoubleTap = now - lastTouchEnd < 300
    setLastTouchEnd(now)

    if (refreshing.current) return

    const pullDistance = pullMoveY.current - pullStartY.current

    if (pullDistance > 70 && containerRef.current && containerRef.current.scrollTop === 0) {
      // Trigger refresh
      refreshing.current = true
      setRefreshProgress(1)

      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20)
      }

      try {
        setIsLoading(true)
        // Make sure onRefresh is a function before calling it
        if (typeof onRefresh === "function") {
          await onRefresh()
        } else {
          console.error("onRefresh is not a function")
        }
      } catch (error) {
        console.error("Refresh failed:", error)
      } finally {
        setIsLoading(false)
        refreshing.current = false
        setIsRefreshing(false)
        setRefreshProgress(0)
      }
    } else {
      setIsRefreshing(false)
      setRefreshProgress(0)
    }
  }

  // Filter tables based on active status, assigned tables, and search query
  const filteredTables = useMemo(() => {
    let filtered = [...tables]

    // IMPORTANT: Filter out the System table on mobile
    filtered = filtered.filter((table) => table.name.toLowerCase() !== "system")

    // Filter by active status if needed
    if (filterActive) {
      filtered = filtered.filter((table) => table.isActive)
    }

    // Filter by assigned server if server is logged in and filter is enabled
    if (isServer && filterAssigned && currentUser) {
      filtered = filtered.filter((table) => table.server === currentUser.id)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((table) => {
        // Search by table name
        if (table.name.toLowerCase().includes(query)) return true

        // Search by server name
        const serverName = getServerName(table.server).toLowerCase()
        if (serverName.includes(query)) return true

        // Search by note text
        if (table.noteText && table.noteText.toLowerCase().includes(query)) return true

        return false
      })
    }

    // Sort tables numerically by ID
    filtered.sort((a, b) => a.id - b.id)

    return filtered
  }, [tables, filterActive, filterAssigned, isServer, currentUser, searchQuery, getServerName])

  // Check if current user can interact with this table
  const canInteractWithTable = useCallback(
    (table: Table) => {
      if (!isAuthenticated) return false
      if (!isServer) return true // Admin or viewer can see all tables

      // Server can only interact with their own tables or unassigned tables
      return !table.server || table.server === currentUser?.id
    },
    [isAuthenticated, isServer, currentUser],
  )

  // Handle table click with improved scroll detection
  const handleTableClick = useCallback(
    (table: Table) => {
      // Don't trigger click if we're in the scroll cooldown period
      if (scrollCooldownRef.current) {
        return
      }

      // Don't trigger click if we've detected significant movement or scrolling
      if (
        isScrollingRef.current ||
        touchDistance > 5 ||
        touchMoveCount.current > 2 ||
        Date.now() - scrollEndTime < 300
      ) {
        return
      }

      if (canInteractWithTable(table)) {
        // Add haptic feedback for better UX
        if (navigator.vibrate) {
          navigator.vibrate(10)
        }
        setSelectedTable(table)
        onTableClick(table)
      }
    },
    [touchDistance, canInteractWithTable, scrollEndTime, onTableClick],
  )

  // Handle explicit table open via button
  const handleExplicitTableOpen = useCallback(
    (table: Table, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (canInteractWithTable(table)) {
        // Add haptic feedback for better UX
        if (navigator.vibrate) {
          navigator.vibrate(10)
        }
        setSelectedTable(table)
        onTableClick(table)
      }
    },
    [canInteractWithTable, onTableClick],
  )

  // Handle add time swipe action
  const handleAddTime = useCallback((tableId: number) => {
    setTableForAddTime(tableId)
    setShowAddTimeDialog(true)
  }, [])

  // Handle add time confirmation
  const confirmAddTime = useCallback(
    (minutes: number) => {
      if (tableForAddTime !== null) {
        onAddTime(tableForAddTime)
      }
      setShowAddTimeDialog(false)
      setTableForAddTime(null)
    },
    [tableForAddTime, onAddTime],
  )

  // Close table dialog
  const closeTableDialog = useCallback(() => {
    setSelectedTable(null)
  }, [])

  // Render skeleton loaders during initial load
  const renderSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={`skeleton-${index}`} className="mb-4">
          <div className="skeleton-loader h-[130px] rounded-lg"></div>
        </div>
      ))
  }

  // Handle manual refresh button click
  const handleManualRefresh = useCallback(async () => {
    if (typeof onRefresh !== "function") {
      console.error("onRefresh is not a function")
      return
    }

    try {
      setIsLoading(true)
      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      await onRefresh()
    } catch (error) {
      console.error("Manual refresh failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [onRefresh])

  return (
    <div
      ref={containerRef}
      className="space-y-4 max-w-full overflow-x-hidden overflow-y-auto pb-20 mobile-scroll-container ios-touch-fix touch-safe-zone improved-scroll min-h-screen"
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        scrollBehavior: "smooth",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div className={`pull-refresh-indicator ${isRefreshing ? "visible" : ""}`} style={{ opacity: refreshProgress }}>
        <RefreshCw
          className="pull-refresh-spinner"
          size={20}
          style={{ transform: `rotate(${refreshProgress * 360}deg)` }}
        />
        <span>Pull to refresh</span>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-2 sticky top-0 z-10 bg-black/80 backdrop-blur-md p-2 rounded-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tables..."
              className="pl-8 mobile-touch-target"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="mobile-touch-target"
            onClick={() => setSearchQuery("")}
            disabled={!searchQuery}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className={`px-3 py-1 rounded-full text-xs touch-feedback ${
              filterActive ? "bg-[#00FFFF] text-black" : "bg-[#000033] text-[#00FFFF] border border-[#00FFFF]"
            }`}
            onClick={() => setFilterActive(!filterActive)}
          >
            {filterActive ? "Show All" : "Active Only"}
          </Button>

          {isServer && (
            <Button
              className={`px-3 py-1 rounded-full text-xs touch-feedback ${
                filterAssigned ? "bg-[#FF00FF] text-black" : "bg-[#000033] text-[#FF00FF] border border-[#FF00FF]"
              }`}
              onClick={() => setFilterAssigned(!filterAssigned)}
            >
              {filterAssigned ? "Show All" : "My Tables"}
            </Button>
          )}

          <Button
            className="px-3 py-1 rounded-full text-xs bg-[#000033] text-[#FFFF00] border border-[#FFFF00] touch-feedback"
            onClick={handleManualRefresh}
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin mr-1" : "mr-1"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table list */}
      <div className={`space-y-4 pb-4 ${orientation === "landscape" ? "landscape-grid" : ""}`}>
        {isLoading && filteredTables.length === 0
          ? renderSkeletons()
          : filteredTables.map((table) => {
              const canInteract = canInteractWithTable(table)
              const canEnd = canInteract && hasPermission("canEndSession") && !viewOnlyMode
              const canAddSession = canInteract && hasPermission("canAddTime") && !viewOnlyMode

              return (
                <div key={table.id} className="mb-4 relative">
                  <div className="relative">
                    <div
                      className={`${canInteract ? "" : "opacity-70"} table-card-container no-text-select`}
                      onClick={() => handleTableClick(table)}
                    >
                      <SwipeableTableCard
                        table={table}
                        servers={servers}
                        logs={logs}
                        onClick={() => handleTableClick(table)}
                        onAddTime={handleAddTime}
                        onEndSession={onEndSession}
                        canEndSession={canEnd}
                        canAddTime={canAddSession}
                      />
                    </div>

                    {/* Redesigned open button that matches the space theme */}
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20 space-open-button"
                      onClick={(e) => handleExplicitTableOpen(table, e)}
                      aria-label={`Open ${table.name} details`}
                    >
                      <ExternalLink className="h-5 w-5 text-[#00FFFF]" />
                    </button>
                  </div>
                </div>
              )
            })}

        {filteredTables.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-[#00FFFF] mb-2">No tables found</div>
            <div className="text-gray-400 text-sm">Try adjusting your filters or search query</div>
          </div>
        )}
      </div>

      {/* Scroll indicator - shows when scrolling is active */}
      {isScrolling && (
        <div className="fixed bottom-20 right-4 bg-black/50 text-[#00FFFF] text-xs px-2 py-1 rounded-full backdrop-blur-sm border border-[#00FFFF]/30">
          Scrolling...
        </div>
      )}

      {/* Table dialog */}
      {selectedTable && (
        <div className="table-dialog">
          <TableDialog
            table={selectedTable}
            servers={servers}
            allTables={tables.filter((t) => t.name.toLowerCase() !== "system")}
            noteTemplates={noteTemplates}
            logs={logs}
            onClose={closeTableDialog}
            onStartSession={onStartSession}
            onEndSession={onEndSession}
            onAddTime={onAddTime}
            onSubtractTime={(tableId, minutes) => {
              // Provide haptic feedback
              if (navigator.vibrate) {
                navigator.vibrate(15)
              }
              onAddTime(tableId)
            }}
            onUpdateGuestCount={onUpdateGuestCount}
            onAssignServer={onAssignServer}
            onGroupTables={onGroupTables}
            onUngroupTable={onUngroupTable}
            onMoveTable={onMoveTable}
            onUpdateNotes={onUpdateNotes}
            getServerName={getServerName}
            currentUser={currentUser}
            hasPermission={hasPermission}
            viewOnlyMode={viewOnlyMode}
          />
        </div>
      )}

      {/* Add Time Dialog */}
      {showAddTimeDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 table-dialog">
          <div className="bg-[#000033] border border-[#00FFFF] rounded-lg p-4 w-[90%] max-w-[300px]">
            <h3 className="text-[#00FFFF] text-lg mb-4 text-center">Add Time</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                className="bg-[#00FFFF] text-black hover:bg-[#00CCCC] touch-feedback"
                onClick={() => confirmAddTime(5)}
              >
                +5 min
              </Button>
              <Button
                className="bg-[#00FFFF] text-black hover:bg-[#00CCCC] touch-feedback"
                onClick={() => confirmAddTime(15)}
              >
                +15 min
              </Button>
              <Button
                className="bg-[#00FFFF] text-black hover:bg-[#00CCCC] touch-feedback"
                onClick={() => confirmAddTime(30)}
              >
                +30 min
              </Button>
              <Button
                className="bg-[#00FFFF] text-black hover:bg-[#00CCCC] touch-feedback"
                onClick={() => confirmAddTime(60)}
              >
                +60 min
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full border-gray-500 text-gray-300 touch-feedback"
              onClick={() => setShowAddTimeDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
