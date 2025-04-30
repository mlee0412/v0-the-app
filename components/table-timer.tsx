"use client"

import { useState, useEffect } from "react"

interface TableTimerProps {
  isActive: boolean
  startTime: number | null
  pausedElapsed: number
}

export function TableTimer({ isActive, startTime, pausedElapsed }: TableTimerProps) {
  const [elapsed, setElapsed] = useState(pausedElapsed)

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (isActive && startTime) {
      // Initialize with current elapsed time
      setElapsed(Date.now() - startTime + pausedElapsed)

      // Update elapsed time every second
      intervalId = setInterval(() => {
        setElapsed(Date.now() - startTime + pausedElapsed)
      }, 1000)
    } else {
      // Ensure we display the correct paused elapsed time
      setElapsed(pausedElapsed)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isActive, startTime, pausedElapsed])

  // Format time as HH:MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":")
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl font-mono font-bold">{formatTime(elapsed)}</div>
      <p className="text-xs text-muted-foreground">{isActive ? "Time Elapsed" : "Timer Paused"}</p>
    </div>
  )
}
