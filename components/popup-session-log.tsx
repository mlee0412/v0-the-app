"use client"

import { useEffect, useRef } from "react"
import type { LogEntry } from "@/components/billiards-timer-dashboard"

interface PopupSessionLogProps {
  logs: LogEntry[]
  tableId: number
  sessionStartTime: number | null
  position: { x: number; y: number }
  onClose: () => void
}

export function PopupSessionLog({ logs, tableId, sessionStartTime, position, onClose }: PopupSessionLogProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Filter logs for this table and current session
  const sessionLogs = logs
    .filter((log) => log.tableId === tableId && sessionStartTime && log.timestamp >= sessionStartTime)
    .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  // Handle mouse leave
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!popupRef.current) return

      const rect = popupRef.current.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

      if (!isInside) {
        onClose()
      }
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [onClose])

  // Get action color
  const getActionColor = (action: string) => {
    if (action.includes("Started")) return "#00FF00"
    if (action.includes("Ended")) return "#FF0000"
    if (action.includes("Added")) return "#00FFFF"
    if (action.includes("Subtracted")) return "#FFFF00"
    if (action.includes("Updated")) return "#FF00FF"
    if (action.includes("Assigned")) return "#FFA500"
    return "#FFFFFF"
  }

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 max-h-80 overflow-auto rounded-lg p-3"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -110%)",
        background: "rgba(0, 0, 30, 0.9)",
        border: "2px solid #00FFFF",
        boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        backdropFilter: "blur(10px)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <h3 className="text-[#00FFFF] text-sm font-bold mb-2 flex justify-between items-center">
        <span>Session Logs</span>
        <span className="text-xs text-gray-400">
          {sessionLogs.length} {sessionLogs.length === 1 ? "entry" : "entries"}
        </span>
      </h3>

      {sessionLogs.length > 0 ? (
        <div className="space-y-2">
          {sessionLogs.map((log) => (
            <div key={log.id} className="border-b border-gray-800 pb-2 last:border-0 last:pb-0">
              <div className="flex justify-between items-start">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${getActionColor(log.action)}20`,
                    color: getActionColor(log.action),
                  }}
                >
                  {log.action}
                </span>
                <span className="text-[10px] text-gray-400">{formatTimestamp(log.timestamp)}</span>
              </div>
              {log.details && <p className="text-xs text-gray-300 mt-1">{log.details}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-xs">No logs for current session</p>
      )}
    </div>
  )
}
