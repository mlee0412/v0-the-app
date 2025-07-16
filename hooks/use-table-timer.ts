"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { formatTime as formatTimeUtil } from "@/utils/timer-sync-utils" // Import the utility functions
import type { Table } from "@/components/system/billiards-timer-dashboard" // Adjusted path to match dashboard

// Simplified Table type for the hook, ensuring it has what it needs.
// The consuming component will pass the full Table type.
type HookTableInput = Pick<Table, "id" | "isActive" | "startTime" | "initialTime" | "remainingTime">

export function useTableTimer(table: HookTableInput) {
  // Initialize remainingTime:
  // - If active and has startTime, calculate current remaining.
  // - If active but no startTime (e.g., session started but data not fully synced), use table.remainingTime.
  // - If inactive, use table.initialTime.
  const calculateInitialRemainingTime = () => {
    if (table.isActive && table.startTime) {
      return table.initialTime - (Date.now() - table.startTime)
    }
    if (table.isActive) {
      return table.remainingTime // Use the prop's remainingTime if active but no startTime yet
    }
    return table.initialTime // Default to initialTime if inactive
  }

  const [remainingTime, setRemainingTime] = useState<number>(calculateInitialRemainingTime())
  const [elapsedTime, setElapsedTime] = useState<number>(
    table.isActive && table.startTime ? Date.now() - table.startTime : 0,
  )
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<string>(formatTimeUtil(remainingTime))

  // Use refs to avoid dependencies in the tick function
const tableRef = useRef(table)
const lastTickTimeRef = useRef<number>(Date.now())
// Limit timer state updates to once per second
const UPDATE_INTERVAL_MS = 1000
// The old per-table animation frame loop was removed in favor of global
// "global-time-tick" events that fire once per second.

  // Update the ref when the table changes
  useEffect(() => {
    tableRef.current = table
  }, [table])

  // Effect to re-initialize or update state when the core table prop changes significantly
  useEffect(() => {
    let newRemaining: number
    let newElapsed: number

    if (table.isActive && table.startTime) {
      const now = Date.now()
      newElapsed = now - table.startTime
      newRemaining = table.initialTime - newElapsed
    } else if (table.isActive) {
      // If active but no startTime, rely on the table.remainingTime prop.
      // This could happen if a session is started, but the card hasn't received the startTime yet.
      newElapsed = table.initialTime - table.remainingTime // Approximate elapsed
      newRemaining = table.remainingTime
    } else {
      // Inactive
      newElapsed = 0
      newRemaining = table.initialTime
    }

    setElapsedTime(newElapsed)
    setRemainingTime(newRemaining)
    setFormattedRemainingTime(formatTimeUtil(newRemaining))

    // Reset tick limiter so the next global tick updates immediately
    lastTickTimeRef.current = Date.now() - UPDATE_INTERVAL_MS
  }, [table.isActive, table.startTime, table.initialTime, table.remainingTime, table.id])
  // Added table.id to dependencies in case the table instance itself changes for the same card (e.g. after a move operation)

  // Tick function that doesn't depend on state values
  const tick = useCallback((currentTime: number) => {
    if (currentTime - lastTickTimeRef.current < UPDATE_INTERVAL_MS) return
    lastTickTimeRef.current = currentTime

    const currentTable = tableRef.current

    if (currentTable.isActive && currentTable.startTime) {
      const newElapsed = currentTime - currentTable.startTime
      const newRemaining = currentTable.initialTime - newElapsed

      setElapsedTime(newElapsed)
      setRemainingTime(newRemaining)
      setFormattedRemainingTime(formatTimeUtil(newRemaining))
    }
    // If not active or no startTime, the useEffect above handles setting the display appropriately.
  }, []) // No dependencies to avoid re-creation

  // Handle global time tick events dispatched elsewhere in the app
  useEffect(() => {
    const handleGlobalTimeTick = (event: Event) => {
      const customEvent = event as CustomEvent<{ timestamp: number }>
      tick(customEvent.detail.timestamp)
    }

    window.addEventListener("global-time-tick", handleGlobalTimeTick as EventListener)

    return () => {
      window.removeEventListener("global-time-tick", handleGlobalTimeTick as EventListener)
    }
  }, [tick])

  // No internal interval loop; rely on global "global-time-tick" events

  // Exposed formatTime function (re-wrapped for stability if formatTimeUtil is stable)
  const formatTime = useCallback(
    (ms: number, showHours = false): string => {
      return formatTimeUtil(ms, showHours)
    },
    [], // Assuming formatTimeUtil itself doesn't change
  )

  return {
    remainingTime,
    elapsedTime,
    formattedRemainingTime,
    formatTime,
    // Expose setters if TableCard needs to directly manipulate time
    // based on events like 'local-table-update' from TableDialog
    setRemainingTime,
    setElapsedTime,
    setFormattedRemainingTime, // Allow external update of formatted string if needed
    tick, // Expose the tick function
  }
}
