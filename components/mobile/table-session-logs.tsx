"use client"

import { useState, useEffect } from "react"
import type { LogEntry } from "@/components/system/billiards-timer-dashboard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

interface TableSessionLogsProps {
  logs: LogEntry[]
}

export function TableSessionLogs({ logs }: TableSessionLogsProps) {
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Sort logs by timestamp (newest first) and filter by search term
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp)

    if (!searchTerm) {
      setFilteredLogs(sorted)
      return
    }

    const filtered = sorted.filter(
      (log) =>
        log.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    setFilteredLogs(filtered)
  }, [logs, searchTerm])

  // Format timestamp to relative time (e.g., "5 minutes ago")
  const formatTimestamp = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return "Invalid date"
    }
  }

  // Get color based on action type
  const getActionColor = (action: string) => {
    if (action.includes("Started")) return "text-green-500"
    if (action.includes("Ended")) return "text-red-500"
    if (action.includes("Added")) return "text-blue-500"
    if (action.includes("Subtracted")) return "text-orange-500"
    return "text-gray-300"
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-2">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Search logs..."
          className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1 rounded-md border border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="p-4 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="border-b border-gray-800 pb-3 last:border-0 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-cyan-400">{log.tableName}</span>
                  <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
                </div>
                <div className={`font-medium ${getActionColor(log.action)}`}>{log.action}</div>
                {log.details && <div className="text-sm text-gray-300">{log.details}</div>}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
