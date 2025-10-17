"use client"

import { memo, useMemo } from "react"
import { formatTime } from "@/utils/timer-sync-utils"

interface TableTimerDisplayProps {
  currentTimeMs: number
  isActive: boolean
  isOvertime: boolean
  isCritical: boolean
  isWarningOrange: boolean
  isWarningYellow: boolean
  showAnimations?: boolean
}

const normalizeTime = (ms: number) => {
  if (!Number.isFinite(ms)) {
    return 0
  }

  if (ms >= 0) {
    return Math.floor(ms / 1000) * 1000
  }

  const normalized = Math.ceil(ms / 1000) * 1000
  return normalized === 0 ? -1000 : normalized
}

const TableTimerDisplayComponent = ({
  currentTimeMs,
  isActive,
  isOvertime,
  isCritical,
  isWarningOrange,
  isWarningYellow,
  showAnimations = true,
}: TableTimerDisplayProps) => {
  const normalizedTime = useMemo(() => normalizeTime(currentTimeMs), [currentTimeMs])

  const formattedTime = useMemo(() => formatTime(normalizedTime), [normalizedTime])

  const timerTextColor = useMemo(() => {
    if (isOvertime || isCritical) return "#FF4500"
    if (isWarningOrange) return "#FFA500"
    if (isWarningYellow) return "#FFFF00"
    if (isActive) return "#ADFF2F"
    return "#FFFFFF"
  }, [isActive, isOvertime, isCritical, isWarningOrange, isWarningYellow])

  const timerTextShadow = useMemo(() => {
    if (isOvertime || isCritical)
      return "0 0 12px rgba(255, 69, 0, 0.9), 0 0 20px rgba(255, 0, 0, 0.7), 0 0 30px rgba(255, 0, 0, 0.5)"
    if (isWarningOrange) return "0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6)"
    if (isWarningYellow) return "0 0 8px rgba(255, 255, 0, 0.8), 0 0 16px rgba(255, 255, 0, 0.6)"
    if (isActive) return "0 0 7px rgba(173, 255, 47, 0.8), 0 0 14px rgba(173, 255, 47, 0.6)"
    return "0 0 5px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.2)"
  }, [isActive, isOvertime, isCritical, isWarningOrange, isWarningYellow])

  const timerBorder = useMemo(() => {
    if (isOvertime || isCritical) return "border-red-500/80"
    if (isWarningOrange) return "border-orange-500/70"
    if (isWarningYellow) return "border-yellow-400/70"
    if (isActive) return "border-green-500/60"
    return "border-cyan-500/60"
  }, [isActive, isOvertime, isCritical, isWarningOrange, isWarningYellow])

  const shouldPulseMinute =
    showAnimations && Math.abs(normalizedTime % 60000) < 1000 && isActive && normalizedTime !== 0

  return (
    <div className={`flex justify-center items-center my-1 sm:my-2 ${showAnimations ? "animate-float" : ""}`}>
      <div
        className={`text-xl sm:text-2xl md:text-3xl font-bold py-1 px-3 rounded-md border bg-black/50 backdrop-blur-sm shadow-inner ${timerBorder} transition-all duration-300 ${shouldPulseMinute ? "animate-pulse-highlight" : ""}`}
        style={{ color: timerTextColor, textShadow: timerTextShadow }}
        data-value={normalizedTime}
      >
        {formattedTime}
      </div>
    </div>
  )
}

export const TableTimerDisplay = memo(TableTimerDisplayComponent)

TableTimerDisplay.displayName = "TableTimerDisplay"
