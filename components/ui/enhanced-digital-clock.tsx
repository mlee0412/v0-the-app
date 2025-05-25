"use client"
import { Clock } from "lucide-react"
import { useState, useEffect } from "react"

interface EnhancedDigitalClockProps {
  currentTime?: Date
}

export function EnhancedDigitalClock({ currentTime: propCurrentTime }: EnhancedDigitalClockProps) {
  // Use internal state if no prop is provided
  const [internalTime, setInternalTime] = useState(new Date())

  // Update internal time every second if no prop is provided
  useEffect(() => {
    if (!propCurrentTime) {
      const timer = setInterval(() => {
        setInternalTime(new Date())
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [propCurrentTime])

  // Use prop time if provided, otherwise use internal time
  const timeToUse = propCurrentTime || internalTime

  // Get day of week
  const dayOfWeek = timeToUse.toLocaleDateString("en-US", { weekday: "short" })

  // Get week number
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const weekNumber = getWeekNumber(timeToUse)

  // Format date like "Apr 29, 2025"
  const formattedDate = timeToUse.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-2 text-right">
      <div className="flex items-center justify-center text-[#00FFFF] text-xl font-mono">
        <Clock className="h-5 w-5 mr-2" />
        {timeToUse.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </div>
      <div className="text-[#00FFFF] text-sm font-mono">{formattedDate}</div>
      <div className="text-gray-400 text-xs font-mono">
        {dayOfWeek} • Week {weekNumber}
      </div>
    </div>
  )
}
