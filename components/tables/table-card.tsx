"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
import { UserIcon, MessageSquareIcon, ClockIcon, ServerIcon, TimerIcon } from "lucide-react"
import { NeonGlow } from "@/components/ui/neon-glow"
import { PopupSessionLog } from "@/components/system/popup-session-log"
import type { Table, LogEntry, Server as AppServer } from "@/components/system/billiards-timer-dashboard"
import { TableStatusBadge } from "@/components/tables/table-status-badge"
import { TableTimerDisplay } from "@/components/tables/table-timer-display"
import { useTableStore, addTableUpdateListener } from "@/utils/table-state-manager"
import { hapticFeedback } from "@/utils/haptic-feedback"
import { useParticleAnimation } from "@/hooks/use-particle-animation"
import { THRESHOLDS } from "@/constants"
import { throttle, formatTime as formatTimeUtil } from "@/utils/timer-sync-utils"

interface TableCardProps {
  table: Table
  servers: AppServer[]
  logs: LogEntry[]
  onClick: () => void
  onUpdateTable?: (tableId: number, updates: Partial<Table>) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  tabIndex?: number
  showAnimations?: boolean
}

const animationStyles = `
  @keyframes borderPulseBase {
    0% { box-shadow: 0 0 8px var(--pulse-color-start, transparent), inset 0 0 6px var(--pulse-color-start-inset, transparent); opacity: 0.7; }
    50% { box-shadow: 0 0 20px var(--pulse-color-end, transparent), inset 0 0 12px var(--pulse-color-end-inset, transparent); opacity: 1; }
    100% { box-shadow: 0 0 8px var(--pulse-color-start, transparent), inset 0 0 6px var(--pulse-color-start-inset, transparent); opacity: 0.7; }
  }
  @keyframes backgroundPulseBase {
    0% { opacity: 0.85; background-position: 0% 50%; }
    50% { opacity: 1; background-position: 100% 50%; }
    100% { opacity: 0.85; background-position: 0% 50%; }
  }
  @keyframes glowText {
    0% { text-shadow: 0 0 5px var(--glow-color, rgba(255, 255, 255, 0.7)), 0 0 10px var(--glow-color, rgba(255, 255, 255, 0.5)); }
    50% { text-shadow: 0 0 15px var(--glow-color, rgba(255, 255, 255, 0.9)), 0 0 20px var(--glow-color, rgba(255, 255, 255, 0.7)); }
    100% { text-shadow: 0 0 5px var(--glow-color, rgba(255, 255, 255, 0.7)), 0 0 10px var(--glow-color, rgba(255, 255, 255, 0.5)); }
  }
  @keyframes floatUp {
    0% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
    100% { transform: translateY(0); }
  }
  @keyframes scaleIn {
    0% { transform: scale(0.95); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }

  .animate-border-pulse-red {
    --pulse-color-start: rgba(255, 0, 0, 0.6);
    --pulse-color-start-inset: rgba(255, 0, 0, 0.5);
    --pulse-color-end: #FF0000;
    --pulse-color-end-inset: rgba(255, 0, 0, 0.9);
    animation: borderPulseBase 0.7s infinite ease-in-out;
  }
  .animate-background-pulse-red {
    animation: backgroundPulseBase 0.7s infinite ease-in-out;
    background-size: 200% 200% !important;
  }

  .animate-border-pulse-orange {
    --pulse-color-start: rgba(255, 165, 0, 0.5);
    --pulse-color-start-inset: rgba(255, 165, 0, 0.4);
    --pulse-color-end: #FFA500;
    --pulse-color-end-inset: rgba(255, 165, 0, 0.8);
    animation: borderPulseBase 1.2s infinite ease-in-out;
  }
   .animate-background-pulse-orange {
    animation: backgroundPulseBase 1.2s infinite ease-in-out;
    background-size: 200% 200% !important;
  }

  .animate-border-pulse-yellow {
    --pulse-color-start: rgba(255, 255, 0, 0.5);
    --pulse-color-start-inset: rgba(255, 255, 0, 0.4);
    --pulse-color-end: #FFFF00;
    --pulse-color-end-inset: rgba(255, 255, 0, 0.8);
    animation: borderPulseBase 1.5s infinite ease-in-out;
  }
  .animate-background-pulse-yellow {
    animation: backgroundPulseBase 1.5s infinite ease-in-out;
    background-size: 200% 200% !important;
  }
  
  .animate-border-pulse-group {
    animation: borderPulseBase 1.8s infinite ease-in-out;
  }

  .animate-background-pulse-green {
     animation: backgroundPulseBase 2.5s infinite ease-in-out alternate;
     background-size: 200% 200% !important;
  }
  
  .animate-glow-text {
    animation: glowText 2s infinite ease-in-out;
  }
  
  .animate-float {
    animation: floatUp 3s infinite ease-in-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.3s ease-out forwards;
  }

  @keyframes pulseHighlight {
    0% { background-color: rgba(255, 255, 255, 0.2); }
    50% { background-color: rgba(255, 255, 255, 0.4); }
    100% { background-color: rgba(255, 255, 255, 0.2); }
  }
  
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  @keyframes slideIn {
    0% { transform: translateY(10px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  .animate-pulse-highlight {
    animation: pulseHighlight 1.5s ease-in-out;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
  }
`

const TableCardComponent = function TableCard({
  table: initialTable,
  servers,
  logs,
  onClick,
  onUpdateTable,
  onKeyDown,
  tabIndex = 0,
  showAnimations = true,
}: TableCardProps) {
  const [showSessionLog, setShowSessionLog] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  const storeTable = useTableStore(
    useCallback((state) => state.tables[initialTable.id] || initialTable, [initialTable.id, initialTable]),
  )
  const [localTable, setLocalTable] = useState<Table>(storeTable)

  const cardRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLCanvasElement>(null)

  const getCurrentRemainingTime = useCallback(() => {
    if (localTable.isActive && localTable.startTime) {
      return localTable.initialTime - (Date.now() - localTable.startTime)
    }

    if (typeof localTable.remainingTime === "number") {
      return localTable.remainingTime
    }

    return localTable.initialTime
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, localTable.remainingTime])

  const currentRemainingTime = useMemo(() => getCurrentRemainingTime(), [getCurrentRemainingTime])

  const formattedRemainingTime = useMemo(() => formatTimeUtil(currentRemainingTime), [currentRemainingTime])

  useEffect(() => {
    setLocalTable(storeTable)
  }, [storeTable])

  useEffect(() => {
    setLocalTable(initialTable)
    if (JSON.stringify(initialTable) !== JSON.stringify(storeTable)) {
      useTableStore.getState().refreshTable(initialTable.id, initialTable)
    }
  }, [initialTable, storeTable])

  const fifteenMinutesInMs = THRESHOLDS.WARNING
  const tenMinutesInMs = 10 * 60 * 1000
  const criticalThresholdMs = THRESHOLDS.CRITICAL

  const tableStatus = useMemo(() => {
    const rt = currentRemainingTime
    const isActive = localTable.isActive

    const isOvertime = isActive && rt < 0
    const isWarningYellow = isActive && rt <= fifteenMinutesInMs && rt > tenMinutesInMs
    const isWarningOrange = isActive && rt <= tenMinutesInMs && rt > criticalThresholdMs
    const isCritical = isActive && rt <= criticalThresholdMs && rt >= 0

    const orangeIntensity =
      isWarningOrange && tenMinutesInMs - criticalThresholdMs > 0
        ? 1 - (rt - criticalThresholdMs) / (tenMinutesInMs - criticalThresholdMs)
        : 0

    const criticalIntensity = isCritical && criticalThresholdMs > 0 ? 1 - rt / criticalThresholdMs : 0

    const shouldAnimateWarning = showAnimations && isActive && rt <= fifteenMinutesInMs

    return {
      isOvertime,
      isWarningYellow,
      isWarningOrange,
      isCritical,
      orangeIntensity,
      criticalIntensity,
      shouldAnimateWarning,
    }
  }, [
    localTable.isActive,
    currentRemainingTime,
    showAnimations,
    fifteenMinutesInMs,
    tenMinutesInMs,
    criticalThresholdMs,
  ])

  useParticleAnimation(
    particlesRef,
    cardRef,
    localTable.isActive,
    tableStatus.isOvertime || tableStatus.isCritical,
    tableStatus.isWarningYellow,
    tableStatus.isWarningOrange,
    showAnimations,
  )

  const getGroupColor = useCallback(() => {
    if (!localTable.groupId) return ""
    const groupMatch = localTable.groupId.match(/Group (\d+)/)
    if (groupMatch) {
      const groupNumber = Number.parseInt(groupMatch[1], 10)
      const groupColors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FFA500",
        "#800080",
        "#008000",
        "#FFC0CB",
      ]
      return groupColors[(groupNumber - 1) % groupColors.length]
    }
    const groupHash = localTable.groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = groupHash % 360
    return `hsl(${hue}, 100%, 60%)`
  }, [localTable.groupId])

  const borderStyles = useMemo(() => {
    const { isOvertime, isWarningYellow, isWarningOrange, isCritical, shouldAnimateWarning } = tableStatus
    let style: React.CSSProperties = {
      borderWidth: "2px",
      borderStyle: "solid",
      borderRadius: "0.5rem",
      transition: "all 0.3s ease-in-out",
    }
    let animationClassName = ""

    if (localTable.groupId) {
      const color = getGroupColor()
      style = {
        ...style,
        borderColor: color,
        boxShadow: `0 0 5px ${color}66, 0 0 10px ${color}33, inset 0 0 3px ${color}99, 0 10px 20px rgba(0,0,0,0.3)`,
        borderWidth: "3px",
        borderStyle: "double",
        ["--pulse-color-start" as string]: `${color}99`,
        ["--pulse-color-start-inset" as string]: `${color}66`,
        ["--pulse-color-end" as string]: color,
        ["--pulse-color-end-inset" as string]: `${color}CC`,
      }
      if (showAnimations) animationClassName = "animate-border-pulse-group"
    } else if (isOvertime || isCritical) {
      style = {
        ...style,
        borderColor: "#FF0000",
        boxShadow: `0 0 8px #FF000099, inset 0 0 4px #FF000066, 0 10px 20px rgba(0,0,0,0.3)`,
        borderWidth: "2.5px",
      }
      if (shouldAnimateWarning) animationClassName = "animate-border-pulse-red"
    } else if (isWarningOrange) {
      style = {
        ...style,
        borderColor: "#FFA500",
        boxShadow: `0 0 7px #FFA50099, inset 0 0 3px #FFA50066, 0 10px 20px rgba(0,0,0,0.3)`,
      }
      if (shouldAnimateWarning) animationClassName = "animate-border-pulse-orange"
    } else if (isWarningYellow) {
      style = {
        ...style,
        borderColor: "#FFFF00",
        boxShadow: `0 0 6px #FFFF0099, inset 0 0 2px #FFFF0066, 0 10px 20px rgba(0,0,0,0.3)`,
      }
      if (shouldAnimateWarning) animationClassName = "animate-border-pulse-yellow"
    } else if (localTable.isActive) {
      style = {
        ...style,
        borderColor: "#00FF00",
        boxShadow: `0 0 5px #00FF0099, inset 0 0 1px #00FF0066, 0 10px 20px rgba(0,0,0,0.3)`,
      }
    } else {
      style = {
        ...style,
        borderColor: "#00FFFF",
        boxShadow: `0 0 5px #00FFFF99, inset 0 0 1px #00FFFF66, 0 10px 20px rgba(0,0,0,0.3)`,
      }
    }
    return { style, animationClassName }
  }, [
    localTable.groupId,
    localTable.isActive,
    getGroupColor,
    showAnimations,
    tableStatus.isOvertime,
    tableStatus.isWarningYellow,
    tableStatus.isWarningOrange,
    tableStatus.isCritical,
    showAnimations,
  ])

  const backgroundStyles = useMemo(() => {
    const {
      isOvertime,
      isWarningYellow,
      isWarningOrange,
      isCritical,
      orangeIntensity,
      criticalIntensity,
      shouldAnimateWarning,
    } = tableStatus
    const style: React.CSSProperties = {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      transition: "all 0.3s ease-in-out",
    }
    let animationClassName = ""

    const baseBg = "rgba(0, 5, 15, 0.90)"

    if (!localTable.isActive) {
      style.background = `linear-gradient(135deg, rgba(0, 20, 40, 0.9), ${baseBg})`
    } else if (isOvertime || isCritical) {
      const r = 120 + Math.floor(60 * criticalIntensity)
      style.background = `linear-gradient(135deg, rgba(${r}, 0, 0, 0.95), ${baseBg}, rgba(${r - 20}, 0, 0, 0.85))`
      if (shouldAnimateWarning) animationClassName = "animate-background-pulse-red"
    } else if (isWarningOrange) {
      const r = 200 + Math.floor(55 * orangeIntensity)
      const g = 100 + Math.floor(65 * orangeIntensity)
      style.background = `linear-gradient(135deg, rgba(${r}, ${g}, 0, 0.95), ${baseBg}, rgba(${r - 30}, ${g - 20}, 0, 0.85))`
      if (shouldAnimateWarning) animationClassName = "animate-background-pulse-orange"
    } else if (isWarningYellow) {
      style.background = `linear-gradient(135deg, rgba(100, 100, 0, 0.95), ${baseBg}, rgba(80, 80, 0, 0.85))`
      if (shouldAnimateWarning) animationClassName = "animate-background-pulse-yellow"
    } else {
      style.background = `linear-gradient(135deg, rgba(0, 60, 30, 0.9), ${baseBg}, rgba(0, 40, 20, 0.85))`
      if (showAnimations) animationClassName = "animate-background-pulse-green"
    }
    return { style, animationClassName }
  }, [
    localTable.isActive,
    showAnimations,
    tableStatus.isOvertime,
    tableStatus.isWarningYellow,
    tableStatus.isWarningOrange,
    tableStatus.isCritical,
    showAnimations,
  ])

  useEffect(() => {
    const handleBatchTimerUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        updates: Array<{ tableId: number; remainingTime: number; initialTime: number }>
      }>
      const update = customEvent.detail.updates.find((u) => u.tableId === localTable.id)
      if (update) {
        setLocalTable((prev) => ({
          ...prev,
          remainingTime: update.remainingTime,
          initialTime: update.initialTime,
        }))
      }
    }

    window.addEventListener("batch-timer-update", handleBatchTimerUpdate as EventListener)

    return () => {
      window.removeEventListener("batch-timer-update", handleBatchTimerUpdate as EventListener)
    }
  }, [localTable.id])

  useEffect(() => {
    const unsubscribe = addTableUpdateListener((updatedTableId, updates) => {
      if (updatedTableId === localTable.id) {
        setLocalTable((prev) => ({ ...prev, ...updates }))
      }
    })
    useTableStore.getState().refreshTable(localTable.id, localTable)

    return () => {
      unsubscribe()
    }
  }, [localTable.id])

  const throttledOnUpdateTable = useMemo(() => (onUpdateTable ? throttle(onUpdateTable, 1000) : null), [onUpdateTable])

  useEffect(() => {
    const handleLocalTableUpdate = (event: Event) => {
      const { tableId, field, value } = (event as CustomEvent).detail
      if (tableId !== localTable.id) return

      let newLocalTableValues: Partial<Table> = {}
      if (field === "time") {
        newLocalTableValues = { remainingTime: value.remainingTime, initialTime: value.initialTime }
      } else if (field === "guestCount") {
        newLocalTableValues = { guestCount: value }
      } else if (field === "server") {
        newLocalTableValues = { server: value }
      } else if (field === "notes") {
        newLocalTableValues = { noteId: value.noteId, noteText: value.noteText, hasNotes: value.hasNotes }
      } else if (field === "sessionStart") {
        newLocalTableValues = {
          isActive: true,
          startTime: value.startTime,
          initialTime: value.initialTime,
          remainingTime: value.initialTime,
        }
      } else if (field === "sessionEnd") {
        newLocalTableValues = { isActive: false, startTime: null }
      }

      if (Object.keys(newLocalTableValues).length > 0) {
        const updatedTableForCallback = { ...localTable, ...newLocalTableValues, updatedAt: new Date().toISOString() }
        setLocalTable(updatedTableForCallback)

        if (throttledOnUpdateTable) {
          throttledOnUpdateTable(tableId, newLocalTableValues as Partial<Table>)
        }
      }
    }

    window.addEventListener("local-table-update", handleLocalTableUpdate as EventListener)
    return () => {
      window.removeEventListener("local-table-update", handleLocalTableUpdate as EventListener)
    }
  }, [localTable, throttledOnUpdateTable])

  useEffect(() => {
    const handleSessionEnd = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableId: number }>
      if (customEvent.detail?.tableId === localTable.id) {
        const DEFAULT_TIME = localTable.initialTime || THRESHOLDS.DEFAULT_SESSION_TIME || 60 * 60 * 1000
        setLocalTable((prev) => ({
          ...prev,
          isActive: false,
          startTime: null,
          remainingTime: DEFAULT_TIME,
          guestCount: 0,
          server: null,
          updatedAt: new Date().toISOString(),
        }))
      }
    }
    window.addEventListener("session-ended", handleSessionEnd as EventListener)
    return () => window.removeEventListener("session-ended", handleSessionEnd as EventListener)
  }, [localTable.id, localTable.initialTime])

  const formatStartTime = useCallback((timestamp: number | null) => {
    if (!timestamp) return "Not started"
    return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  }, [])

  const handleInteraction = useCallback(
    (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        hapticFeedback.selection()
      } catch (error) {
        console.warn("Haptic feedback not supported:", error)
      }
      onClick()
    },
    [onClick],
  )

  const getServerName = useCallback(
    (serverId: string | null) => {
      if (!serverId) return "Unassigned"
      if (!servers || servers.length === 0) return "Unknown"
      const server = servers.find((s) => s.id === serverId)
      return server ? server.name : "Unknown"
    },
    [servers],
  )

  return (
    <>
      <style>{showAnimations ? animationStyles : ""}</style>
      <div
        ref={cardRef}
        className={`relative rounded-lg overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.03] active:scale-[0.98] h-auto min-h-[160px] sm:min-h-[200px] table-card ios-touch-fix shadow-2xl ${
            showAnimations ? "animate-scale-in" : ""
        } ${borderStyles.animationClassName} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500 focus-visible:ring-opacity-75`}
        style={{ ...borderStyles.style, WebkitTapHighlightColor: "transparent" }}
        role="button"
        tabIndex={tabIndex}
        onClick={handleInteraction}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleInteraction(e)
          onKeyDown?.(e)
        }}
        aria-label={`Table ${localTable.name}, ${localTable.isActive ? "Active" : "Inactive"}, Time remaining: ${formattedRemainingTime}${
          localTable.server && servers && servers.length > 0
            ? `, Server: ${servers.find((s) => s.id === localTable.server)?.name || "Unknown"}`
            : ""
        }, ${localTable.guestCount} guests${localTable.hasNotes ? ", Has notes" : ""}`}
      >
        <div
          className={`p-3 h-full flex flex-col relative overflow-hidden rounded-md z-10 m-[1px] 
                    ${backgroundStyles.animationClassName}`}
          style={backgroundStyles.style}
        >
          <canvas ref={particlesRef} className="absolute inset-0 pointer-events-none z-0" />
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03), transparent)",
              opacity: 0.6,
            }}
          />

          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-20"
            style={{
              background: "linear-gradient(145deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%, transparent 100%)",
              borderRadius: "0.375rem",
            }}
          />

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <span
                className={`text-lg font-bold text-white ${showAnimations ? "animate-glow-text" : ""}`}
                style={{
                  textShadow: "0 0 8px rgba(0, 255, 255, 0.7), 0 0 3px rgba(0, 255, 255, 0.5)",
                  ["--glow-color" as string]: "rgba(0, 255, 255, 0.7)",
                }}
              >
                {localTable.name}
              </span>
              <div
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  localTable.isActive
                    ? tableStatus.isOvertime || tableStatus.isCritical
                      ? "bg-red-600/80 text-white shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                      : "bg-green-600/80 text-white shadow-[0_0_10px_rgba(0,255,0,0.3)]"
                    : "bg-gray-700/80 text-white"
                }`}
              >
                {localTable.isActive ? (
                  tableStatus.isOvertime ? (
                    <NeonGlow color="red" pulse intensity="high" className="text-[11px] font-bold">
                      OVERTIME
                    </NeonGlow>
                  ) : (
                    <NeonGlow color="green" className="text-[11px] font-bold">
                      Active
                    </NeonGlow>
                  )
                ) : (
                  <span className="text-[11px]">Inactive</span>
                )}
              </div>
            </div>

            <TableTimerDisplay
              table={{
                id: localTable.id,
                isActive: localTable.isActive,
                startTime: localTable.startTime,
                initialTime: localTable.initialTime,
                remainingTime: localTable.remainingTime,
              }}
              isOvertime={tableStatus.isOvertime}
              isCritical={tableStatus.isCritical}
              isWarningOrange={tableStatus.isWarningOrange}
              isWarningYellow={tableStatus.isWarningYellow}
              showAnimations={showAnimations}
            />

            <div className="flex flex-col gap-1.5 mt-auto text-xs bg-black/40 p-2 rounded-md backdrop-blur-sm overflow-visible mb-1">
              <div
                className={`flex items-center ${
                  showAnimations ? "animate-fade-in" : ""
                } ${
                  localTable.isActive && localTable.server
                    ? "justify-between"
                    : "justify-center"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="bg-[#FF00FF]/30 p-1 rounded-full">
                    <UserIcon className="h-3.5 w-3.5 text-[#FF00FF]" />
                  </div>
                  <span className="font-semibold text-white" style={{ textShadow: "0 0 5px rgba(255, 0, 255, 0.7)" }}>
                    {localTable.isActive ? localTable.guestCount : "-"}
                  </span>
                </div>
                {localTable.isActive && localTable.server && (
                  <div className={`flex items-center gap-1.5 ${showAnimations ? "animate-slide-in" : ""}`}>
                    <div className="bg-[#00FF00]/30 p-1 rounded-full">
                      <ServerIcon className="h-3.5 w-3.5 text-[#00FF00]" />
                    </div>
                    <span
                      className="font-semibold truncate max-w-[60px] xs:max-w-[70px] sm:max-w-[120px] text-white"
                      style={{ textShadow: "0 0 5px rgba(0, 255, 0, 0.7)" }}
                    >
                      {servers && servers.length > 0
                        ? servers.find((s) => s.id === localTable.server)?.name || "Unknown"
                        : "Unknown"}
                    </span>
                  </div>
                )}
              </div>
              {localTable.isActive && localTable.hasNotes && localTable.noteText && (
                <div className={`flex items-center gap-1.5 w-full ${showAnimations ? "animate-slide-in" : ""} overflow-hidden`}>
                  <div className="bg-[#FFFF00]/30 p-1 rounded-full">
                    <MessageSquareIcon className="h-3 w-3 flex-shrink-0 text-[#FFFF00]" />
                  </div>
                  <span
                    className="w-full text-white text-[10px] sm:text-xs break-words"
                    style={{
                      textShadow: "0 0 4px rgba(255, 255, 0, 0.7)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {localTable.noteText}
                  </span>
                </div>
              )}
              {localTable.isActive && (
                <div className={`flex justify-between items-center ${showAnimations ? "animate-fade-in" : ""}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#00FFFF]/30 p-1 rounded-full">
                      <ClockIcon className="h-3 w-3 text-[#00FFFF]" />
                    </div>
                    <span className="text-white" style={{ textShadow: "0 0 4px rgba(0, 255, 255, 0.7)" }}>
                      {formatStartTime(localTable.startTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#00FFFF]/30 p-1 rounded-full">
                      <TimerIcon className="h-3 w-3 text-[#00FFFF]" />
                    </div>
                    <span className="text-white" style={{ textShadow: "0 0 4px rgba(0, 255, 255, 0.7)" }}>
                      {localTable.startTime
                        ? (() => {
                            const elapsed = Date.now() - localTable.startTime
                            const totalSeconds = Math.floor(elapsed / 1000)
                            const hours = Math.floor(totalSeconds / 3600)
                            const minutes = Math.floor((totalSeconds % 3600) / 60)
                            const seconds = totalSeconds % 60
                            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
                              .toString()
                              .padStart(2, "0")}`
                          })()
                        : "00:00:00"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {localTable.statusIndicators && localTable.statusIndicators.length > 0 && (
            <div className="absolute bottom-1 right-1 z-30">
              <TableStatusBadge statuses={localTable.statusIndicators} />
            </div>
          )}
        </div>
      </div>

      {showSessionLog && (
        <PopupSessionLog
          logs={logs}
          tableId={localTable.id}
          sessionStartTime={localTable.startTime}
          position={popupPosition}
          onClose={() => setShowSessionLog(false)}
        />
      )}
    </>
  )
}

export const TableCard = memo(TableCardComponent)
