"use client"

import { useState, useEffect, useRef } from "react"

interface TableTimerProps {
  isActive: boolean
  startTime: number | null
  initialTime: number
  remainingTime: number
  tableId: number
}

export function TableTimer({ isActive, startTime, initialTime, remainingTime, tableId }: TableTimerProps) {
  const [displayTime, setDisplayTime] = useState(isActive ? remainingTime : initialTime)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Update timer based on active state and startTime
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // For inactive tables, just show the initial time
    if (!isActive) {
      setDisplayTime(initialTime)
      return
    }

    // For active tables without a start time, show the remaining time
    if (!startTime) {
      setDisplayTime(remainingTime)
      return
    }

    // Calculate current time based on startTime and initialTime
    const calculateTime = () => {
      const now = Date.now()
      const elapsed = now - startTime
      // Allow negative values for overtime (don't use Math.max here)
      const current = initialTime - elapsed

      // Only update if time has changed by at least 1 second to reduce rerenders
      if (Math.abs(current - displayTime) >= 1000) {
        setDisplayTime(current)

        // Broadcast the update to ensure all components stay in sync
        window.dispatchEvent(
          new CustomEvent("table-time-update", {
            detail: {
              tableId,
              remainingTime: current,
              initialTime,
              source: "timer-component",
            },
          }),
        )
      }

      // Dispatch event for table updates every 10 seconds to reduce traffic
      if (now - lastUpdateRef.current >= 10000) {
        window.dispatchEvent(
          new CustomEvent("timer-update", {
            detail: { tableId, remainingTime: current },
          }),
        )
        lastUpdateRef.current = now
      }
    }

    // Initial calculation
    calculateTime()

    // Set up interval for active tables - use a faster interval for more responsive UI
    intervalRef.current = setInterval(calculateTime, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, startTime, initialTime, remainingTime, tableId, displayTime])

  // Format time as HH:MM:SS with support for negative values
  const formatTime = (ms: number) => {
    // Handle negative time for overtime
    const isNegative = ms < 0
    const absoluteMs = Math.abs(ms)

    const totalSeconds = Math.floor(absoluteMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const formattedTime = [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":")

    // Add negative sign for overtime
    return isNegative ? `-${formattedTime}` : formattedTime
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl font-mono font-bold">{formatTime(displayTime)}</div>
      <p className="text-xs text-muted-foreground">{isActive ? "Time Remaining" : "Timer Paused"}</p>
    </div>
  )
}
