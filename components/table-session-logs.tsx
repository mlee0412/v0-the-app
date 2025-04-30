"use client"

import type { LogEntry } from "@/components/billiards-timer-dashboard"

interface TableSessionLogsProps {
  logs: LogEntry[]
  tableId: number
  sessionStartTime: number | null
}

export function TableSessionLogs({ logs, tableId, sessionStartTime }: TableSessionLogsProps) {
  // Filter logs for this table only and only  tableId, sessionStartTime }: TableSessionLogsProps) {
  // Filter logs for this table only and only for the current session
  const tableLogs = logs.filter(
    (log) => log.tableId === tableId && sessionStartTime && log.timestamp >= sessionStartTime,
  )

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-1">
      <div className="h-[80px] rounded-md border border-gray-700 bg-gray-800 p-1 overflow-hidden">
        {tableLogs.length > 0 ? (
          <div className="space-y-1">
            {tableLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="border-b border-gray-700 pb-1 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1">
                    <span className="bg-purple-900/30 px-1 py-0.5 rounded text-[8px] text-purple-300">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[8px] text-gray-400">{formatTimestamp(log.timestamp)}</span>
                </div>
                {log.details && <p className="mt-0.5 text-[8px] text-gray-300 truncate">{log.details}</p>}
              </div>
            ))}
            {tableLogs.length > 3 && (
              <div className="text-[8px] text-gray-400 text-center">+ {tableLogs.length - 3} more entries</div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">No logs available</div>
        )}
      </div>
    </div>
  )
}
