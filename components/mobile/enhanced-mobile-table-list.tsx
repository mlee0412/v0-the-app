"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { SwipeableTableCard } from "@/components/mobile/swipeable-table-card"
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard"
import { useTableStore } from "@/utils/table-state-manager"
import { hapticFeedback } from "@/utils/haptic-feedback"
import { toast } from "@/hooks/use-toast"
import { ArrowDown, Loader2 } from "lucide-react"

interface EnhancedMobileTableListProps {
  tables: Table[]
  servers: Server[]
  logs: LogEntry[]
  onTableClick: (tableId: number) => void
  onAddTime: (tableId: number) => void
  onEndSession: (tableId: number) => void
  canEndSession: boolean
  canAddTime: boolean
  onRefresh?: () => Promise<void>
}

export function EnhancedMobileTableList({
  tables,
  servers,
  logs,
  onTableClick,
  onAddTime,
  onEndSession,
  canEndSession,
  canAddTime,
  onRefresh,
}: EnhancedMobileTableListProps) {
  const [localTables, setLocalTables] = useState<Table[]>(tables)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRefreshHint, setShowRefreshHint] = useState(false)
  const refreshStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const refreshThreshold = 80 // pixels to pull down to trigger refresh
  const refreshIndicatorRef = useRef<HTMLDivElement>(null)
  const pullDistance = useRef(0)
  const isPullingRef = useRef(false)
  const lastUpdateTime = useRef(Date.now())

  // Update local tables when props change
  useEffect(() => {
    setLocalTables(tables)
  }, [tables])

  // Subscribe to table updates from the store
  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      const tableIds = tables.map((t) => t.id)
      const updatedTables = tableIds.map((id) => state.tables[id] || tables.find((t) => t.id === id)!)

      // Only update if there are actual changes
      if (JSON.stringify(updatedTables) !== JSON.stringify(localTables)) {
        setLocalTables(updatedTables)
      }
    })

    return () => unsubscribe()
  }, [tables, localTables])

  // Subscribe to real-time updates
  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => {
      const { tableId, remainingTime, initialTime } = event.detail

      setLocalTables((prevTables) =>
        prevTables.map((table) => (table.id === tableId ? { ...table, remainingTime, initialTime } : table)),
      )
    }

    const handleBatchUpdate = (event: CustomEvent) => {
      const { updates } = event.detail

      if (updates && updates.length > 0) {
        setLocalTables((prevTables) =>
          prevTables.map((table) => {
            const update = updates.find((u: any) => u.tableId === table.id)
            if (update) {
              return { ...table, remainingTime: update.remainingTime, initialTime: update.initialTime }
            }
            return table
          }),
        )
      }
    }

    const handleTableUpdate = (event: CustomEvent) => {
      const { table } = event.detail

      if (table) {
        setLocalTables((prevTables) => prevTables.map((t) => (t.id === table.id ? { ...t, ...table } : t)))
      }
    }

    window.addEventListener("supabase-timer-update", handleTimerUpdate as EventListener)
    window.addEventListener("batch-timer-update", handleBatchUpdate as EventListener)
    window.addEventListener("supabase-tables-update", handleTableUpdate as EventListener)

    // Set up periodic refresh for active tables
    const refreshInterval = setInterval(() => {
      // Only refresh if it's been more than 30 seconds since the last update
      if (Date.now() - lastUpdateTime.current > 30000) {
        if (onRefresh && !isRefreshing) {
          onRefresh().then(() => {
            lastUpdateTime.current = Date.now()
          })
        }
      }
    }, 60000) // Check every minute

    return () => {
      window.removeEventListener("supabase-timer-update", handleTimerUpdate as EventListener)
      window.removeEventListener("batch-timer-update", handleBatchUpdate as EventListener)
      window.removeEventListener("supabase-tables-update", handleTableUpdate as EventListener)
      clearInterval(refreshInterval)
    }
  }, [onRefresh, isRefreshing])

  // Handle pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when at the top of the container
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      refreshStartY.current = e.touches[0].clientY
      isPullingRef.current = true
      setShowRefreshHint(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current) return

    const currentY = e.touches[0].clientY
    pullDistance.current = Math.max(0, currentY - refreshStartY.current)

    if (pullDistance.current > 0) {
      // Prevent default to disable native scroll while pulling
      e.preventDefault()
    }

    // Apply resistance to make the pull feel more natural
    const resistance = 0.4
    const pullWithResistance = Math.min(refreshThreshold * 1.5, pullDistance.current * resistance)

    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transform = `translateY(${pullWithResistance}px)`
      refreshIndicatorRef.current.style.opacity = Math.min(1, pullWithResistance / refreshThreshold).toString()

      // Rotate the arrow based on pull distance
      const rotation = Math.min(180, (pullWithResistance / refreshThreshold) * 180)
      const arrowElement = refreshIndicatorRef.current.querySelector(".refresh-arrow")
      if (arrowElement) {
        arrowElement.setAttribute("style", `transform: rotate(${rotation}deg)`)
      }
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return

    isPullingRef.current = false

    // Reset the indicator position with animation
    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out"
      refreshIndicatorRef.current.style.transform = "translateY(0)"
      refreshIndicatorRef.current.style.opacity = "0"

      // Reset the transition after animation completes
      setTimeout(() => {
        if (refreshIndicatorRef.current) {
          refreshIndicatorRef.current.style.transition = ""
        }
      }, 300)
    }

    // If pulled enough, trigger refresh
    if (pullDistance.current >= refreshThreshold && onRefresh) {
      setIsRefreshing(true)
      hapticFeedback.medium() // Provide haptic feedback when refresh is triggered

      try {
        await onRefresh()
        lastUpdateTime.current = Date.now()
        hapticFeedback.success() // Success feedback when refresh completes
        toast({
          title: "Tables refreshed",
          description: "Latest table data has been loaded",
          duration: 2000,
        })
      } catch (error) {
        console.error("Error refreshing tables:", error)
        hapticFeedback.error() // Error feedback
        toast({
          title: "Refresh failed",
          description: "Could not refresh table data",
          variant: "destructive",
          duration: 3000,
        })
      } finally {
        setIsRefreshing(false)
        setShowRefreshHint(false)
      }
    } else {
      setShowRefreshHint(false)
    }

    pullDistance.current = 0
  }, [onRefresh])

  // Filter out system tables and sort numerically by ID
  const filteredAndSortedTables = [...localTables]
    .filter((table) => !table.name.toLowerCase().includes("system")) // Filter out system tables
    .sort((a, b) => a.id - b.id) // Sort numerically by ID

  return (
    <div
      className="relative w-full overflow-y-auto pb-20"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        ref={refreshIndicatorRef}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10 opacity-0"
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
        ) : (
          <div className="flex flex-col items-center">
            <ArrowDown className="h-6 w-6 text-cyan-500 refresh-arrow transition-transform duration-200" />
            <span className="text-xs text-cyan-500 mt-1">
              {pullDistance.current >= refreshThreshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        {filteredAndSortedTables.map((table) => (
          <SwipeableTableCard
            key={table.id}
            table={table}
            servers={servers}
            logs={logs.filter((log) => log.tableId === table.id)}
            onClick={() => {
              hapticFeedback.selection() // Light feedback on table selection
              onTableClick(table.id)
            }}
            onAddTime={(tableId) => {
              hapticFeedback.success() // Success feedback when adding time
              onAddTime(tableId)
            }}
            onEndSession={(tableId) => {
              hapticFeedback.strong() // Strong feedback for ending session
              onEndSession(tableId)
            }}
            canEndSession={canEndSession}
            canAddTime={canAddTime}
            className="mb-4"
          />
        ))}
      </div>
    </div>
  )
}
