"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NeonGlow } from "@/components/ui/neon-glow"
import { SpaceButton } from "@/components/ui/space-button"
import { Search, SortAsc, SortDesc, Calendar, Table2, Activity, Clock, Download, X, RefreshCw } from "lucide-react"
import type { LogEntry } from "@/components/system/billiards-timer-dashboard"

interface TableLogsDialogProps {
  open: boolean
  onClose: () => void
  logs: LogEntry[]
}

type SortField = "timestamp" | "tableId" | "action"
type SortDirection = "asc" | "desc"
type FilterTimeRange = "all" | "today" | "yesterday" | "thisWeek" | "custom"

export function TableLogsDialog({ open, onClose, logs }: TableLogsDialogProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Filtering state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTable, setFilterTable] = useState<string>("all")
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterTimeRange, setFilterTimeRange] = useState<FilterTimeRange>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // View state
  const [viewMode, setViewMode] = useState<"all" | "grouped">("all")

  // Get unique tables and actions for filters
  const uniqueTables = useMemo(() => {
    const tables = new Set(logs.map((log) => log.tableName))
    return Array.from(tables).sort()
  }, [logs])

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action))
    return Array.from(actions).sort()
  }, [logs])

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Format date only
  const formatDateOnly = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Filter logs based on all criteria
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search term filter
      const matchesSearch =
        searchTerm === "" ||
        log.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())

      // Table filter
      const matchesTable = filterTable === "all" || log.tableName === filterTable

      // Action filter
      const matchesAction = filterAction === "all" || log.action === filterAction

      // Time range filter
      let matchesTimeRange = true
      const logDate = new Date(log.timestamp)

      if (filterTimeRange === "today") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        matchesTimeRange = logDate >= today
      } else if (filterTimeRange === "yesterday") {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        matchesTimeRange = logDate >= yesterday && logDate < today
      } else if (filterTimeRange === "thisWeek") {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0)

        matchesTimeRange = logDate >= weekStart
      } else if (filterTimeRange === "custom" && customStartDate) {
        const startDate = new Date(customStartDate)
        startDate.setHours(0, 0, 0, 0)

        let endDate
        if (customEndDate) {
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
        }

        matchesTimeRange = logDate >= startDate && logDate <= endDate
      }

      return matchesSearch && matchesTable && matchesAction && matchesTimeRange
    })
  }, [logs, searchTerm, filterTable, filterAction, filterTimeRange, customStartDate, customEndDate])

  // Sort filtered logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let comparison = 0

      if (sortField === "timestamp") {
        comparison = a.timestamp - b.timestamp
      } else if (sortField === "tableId") {
        comparison = a.tableId - b.tableId
      } else if (sortField === "action") {
        comparison = a.action.localeCompare(b.action)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredLogs, sortField, sortDirection])

  // Group logs by date for grouped view
  const groupedLogs = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {}

    sortedLogs.forEach((log) => {
      const dateKey = formatDateOnly(log.timestamp)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(log)
    })

    return groups
  }, [sortedLogs])

  // Toggle sort direction or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc") // Default to descending when changing fields
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setFilterTable("all")
    setFilterAction("all")
    setFilterTimeRange("all")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  // Export logs as CSV
  const exportLogs = () => {
    // Create CSV content
    const headers = ["Date", "Table", "Action", "Details"]
    const rows = sortedLogs.map((log) => [formatTimestamp(log.timestamp), log.tableName, log.action, log.details])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `billiards_logs_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-lg text-purple-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <NeonGlow color="magenta" intensity="medium">
                <span>System Logs</span>
              </NeonGlow>
            </div>
            <div className="text-xs text-gray-400">
              {filteredLogs.length} of {logs.length} entries
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 my-2 flex-1 overflow-hidden flex flex-col">
          {/* Search and filter bar */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white h-8 pl-8 text-xs"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-white"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-[200px]">
                <SelectItem value="all">All Tables</SelectItem>
                {uniqueTables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-[200px]">
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <SpaceButton
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset
            </SpaceButton>
          </div>

          {/* Custom date range inputs (only shown when custom range is selected) */}
          {filterTimeRange === "custom" && (
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400">From:</span>
              </div>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white h-8 text-xs w-auto"
              />

              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400">To:</span>
              </div>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white h-8 text-xs w-auto"
              />
            </div>
          )}

          {/* View mode tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "all" | "grouped")} className="w-full">
            <TabsList className="grid grid-cols-2 bg-gray-800 h-7">
              <TabsTrigger value="all" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                Chronological
              </TabsTrigger>
              <TabsTrigger value="grouped" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                Grouped by Date
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort buttons */}
          <div className="flex flex-wrap gap-2">
            <SpaceButton
              variant={sortField === "timestamp" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("timestamp")}
              className={`h-7 text-xs ${
                sortField === "timestamp"
                  ? "bg-purple-700 hover:bg-purple-800 text-white"
                  : "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <Clock className="h-3 w-3 mr-1" />
              Time
              {sortField === "timestamp" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </SpaceButton>

            <SpaceButton
              variant={sortField === "tableId" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("tableId")}
              className={`h-7 text-xs ${
                sortField === "tableId"
                  ? "bg-cyan-700 hover:bg-cyan-800 text-white"
                  : "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <Table2 className="h-3 w-3 mr-1" />
              Table
              {sortField === "tableId" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </SpaceButton>

            <SpaceButton
              variant={sortField === "action" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("action")}
              className={`h-7 text-xs ${
                sortField === "action"
                  ? "bg-amber-700 hover:bg-amber-800 text-white"
                  : "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <Activity className="h-3 w-3 mr-1" />
              Action
              {sortField === "action" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </SpaceButton>

            <div className="ml-auto">
              <SpaceButton
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="h-7 text-xs border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </SpaceButton>
            </div>
          </div>

          {/* Log entries */}
          <ScrollArea className="flex-1 rounded-md border border-gray-700 bg-gray-800 p-2">
            {viewMode === "all" ? (
              // Chronological view
              sortedLogs.length > 0 ? (
                <div className="space-y-2">
                  {sortedLogs.map((log) => (
                    <div key={log.id} className="border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-blue-400 text-xs">{log.tableName}</span>
                          <span className="bg-purple-900/30 px-1 py-0.5 rounded text-[8px] text-purple-300">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[8px] text-gray-400">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      {log.details && <p className="mt-0.5 text-[10px] text-gray-300">{log.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {searchTerm || filterTable !== "all" || filterAction !== "all" || filterTimeRange !== "all"
                    ? "No logs match your filters"
                    : "No logs available"}
                </div>
              )
            ) : // Grouped by date view
            Object.keys(groupedLogs).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedLogs).map(([date, logs]) => (
                  <div key={date} className="space-y-2">
                    <div className="sticky top-0 bg-gray-800 z-10 py-1">
                      <h3 className="text-xs font-medium text-cyan-400 border-b border-gray-700 pb-1">{date}</h3>
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} className="border-b border-gray-700 pb-2 last:border-0 last:pb-0 ml-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-blue-400 text-xs">{log.tableName}</span>
                            <span className="bg-purple-900/30 px-1 py-0.5 rounded text-[8px] text-purple-300">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[8px] text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                        {log.details && <p className="mt-0.5 text-[10px] text-gray-300">{log.details}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {searchTerm || filterTable !== "all" || filterAction !== "all" || filterTimeRange !== "all"
                  ? "No logs match your filters"
                  : "No logs available"}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-end pt-1 shrink-0">
          <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 h-7 text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
