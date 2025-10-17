"use client"

import { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from "react"
import type { CSSProperties } from "react"
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
import { FixedSizeList as List } from "react-window"

interface TableLogsDialogProps {
  open: boolean
  onClose: () => void
  logs: LogEntry[]
}

type SortField = "timestamp" | "tableId" | "action"
type SortDirection = "asc" | "desc"
type FilterTimeRange = "all" | "today" | "yesterday" | "thisWeek" | "custom"

interface EnhancedLog {
  original: LogEntry
  lowerAction: string
  lowerDetails: string
  lowerTableName: string
  date: Date
}

export function TableLogsDialog({ open, onClose, logs }: TableLogsDialogProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Filtering state
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [filterTable, setFilterTable] = useState<string>("all")
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterTimeRange, setFilterTimeRange] = useState<FilterTimeRange>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // View state
  const [viewMode, setViewMode] = useState<"all" | "grouped">("all")

  const timestampFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    [],
  )

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    [],
  )

  const formatTimestamp = useCallback((date: Date) => timestampFormatter.format(date), [timestampFormatter])

  const formatDateOnly = useCallback((date: Date) => dateFormatter.format(date), [dateFormatter])

  const formatTimeOnly = useCallback((date: Date) => timeFormatter.format(date), [timeFormatter])

  const enhancedLogs = useMemo<EnhancedLog[]>(
    () =>
      logs.map((log) => ({
        original: log,
        lowerAction: log.action.toLowerCase(),
        lowerDetails: (log.details || "").toLowerCase(),
        lowerTableName: log.tableName.toLowerCase(),
        date: new Date(log.timestamp),
      })),
    [logs],
  )

  // Get unique tables and actions for filters
  const uniqueTables = useMemo(() => {
    const tables = new Set(enhancedLogs.map((log) => log.original.tableName))
    return Array.from(tables).sort()
  }, [enhancedLogs])

  const uniqueActions = useMemo(() => {
    const actions = new Set(enhancedLogs.map((log) => log.original.action))
    return Array.from(actions).sort()
  }, [enhancedLogs])

  // Filter logs based on all criteria
  const filteredLogs = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (filterTimeRange === "today") {
      rangeStart = new Date()
      rangeStart.setHours(0, 0, 0, 0)
    } else if (filterTimeRange === "yesterday") {
      const start = new Date()
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      rangeStart = start

      const end = new Date()
      end.setHours(0, 0, 0, 0)
      rangeEnd = end
    } else if (filterTimeRange === "thisWeek") {
      const start = new Date()
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)
      rangeStart = start
    } else if (filterTimeRange === "custom" && customStartDate) {
      const start = new Date(customStartDate)
      start.setHours(0, 0, 0, 0)
      rangeStart = start

      const end = customEndDate ? new Date(customEndDate) : new Date()
      end.setHours(23, 59, 59, 999)
      rangeEnd = end
    }

    return enhancedLogs.filter((log) => {
      const { original, lowerAction, lowerDetails, lowerTableName, date } = log

      const matchesSearch =
        normalizedSearch.length === 0 ||
        lowerTableName.includes(normalizedSearch) ||
        lowerAction.includes(normalizedSearch) ||
        lowerDetails.includes(normalizedSearch)

      if (!matchesSearch) {
        return false
      }

      if (filterTable !== "all" && original.tableName !== filterTable) {
        return false
      }

      if (filterAction !== "all" && original.action !== filterAction) {
        return false
      }

      if (rangeStart && date < rangeStart) {
        return false
      }

      if (rangeEnd && date >= rangeEnd) {
        return false
      }

      return true
    })
  }, [enhancedLogs, deferredSearchTerm, filterTable, filterAction, filterTimeRange, customStartDate, customEndDate])

  const totalLogCount = enhancedLogs.length
  const hasActiveFilters =
    filterTable !== "all" ||
    filterAction !== "all" ||
    filterTimeRange !== "all" ||
    deferredSearchTerm.trim().length > 0 ||
    Boolean(customStartDate || customEndDate)

  // Sort filtered logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let comparison = 0

      if (sortField === "timestamp") {
        comparison = a.original.timestamp - b.original.timestamp
      } else if (sortField === "tableId") {
        comparison = a.original.tableId - b.original.tableId
      } else if (sortField === "action") {
        comparison = a.original.action.localeCompare(b.original.action)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredLogs, sortField, sortDirection])

  // Group logs by date for grouped view
  const groupedLogs = useMemo(() => {
    const groups = new Map<string, EnhancedLog[]>()

    sortedLogs.forEach((log) => {
      const dateKey = formatDateOnly(log.date)
      const existing = groups.get(dateKey)
      if (existing) {
        existing.push(log)
      } else {
        groups.set(dateKey, [log])
      }
    })

    return Array.from(groups.entries())
  }, [sortedLogs, formatDateOnly])

  const containerRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState<number>(400)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateHeight = () => setListHeight(element.clientHeight)
    updateHeight()

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (open && containerRef.current) {
      setListHeight(containerRef.current.clientHeight)
    }
  }, [open])

  const Row = useCallback(
    ({ index, style, data }: { index: number; style: CSSProperties; data: EnhancedLog[] }) => {
      const log = data[index]
      const { original, date } = log

      return (
        <div
          style={style}
          className="px-1 py-2 border-b border-white/5 last:border-b-0 last:pb-0"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="font-medium text-cyan-300 text-xs tracking-wide">
                {original.tableName}
              </span>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-200">
                {original.action}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {formatTimestamp(date)}
            </span>
          </div>
          {original.details && (
            <p className="mt-1 text-[11px] leading-tight text-slate-200/90">
              {original.details}
            </p>
          )}
        </div>
      )
    },
    [formatTimestamp],
  )

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
    const rows = sortedLogs.map((log) => [
      formatTimestamp(log.date),
      log.original.tableName,
      log.original.action,
      log.original.details || "",
    ])

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
      <DialogContent className="sm:max-w-[880px] max-h-[92vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 border border-white/10 shadow-[0_0_40px_rgba(137,84,255,0.35)]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-fuchsia-300">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <NeonGlow color="magenta" intensity="medium">
                <span>System Logs</span>
              </NeonGlow>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300/80">
              <span className="rounded-full bg-slate-800/70 px-2 py-0.5">
                {filteredLogs.length} shown
              </span>
              <span className="rounded-full bg-slate-800/40 px-2 py-0.5">
                {totalLogCount} total
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 flex-1 overflow-hidden">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/10 bg-slate-900/80 pl-9 text-sm text-slate-100 placeholder:text-slate-400 focus:border-fuchsia-400/60 focus:ring-0"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="h-9 w-[140px] rounded-lg border border-white/10 bg-slate-900/70 text-sm text-slate-100">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent className="border border-white/10 bg-slate-900/95 text-slate-100 shadow-xl">
                <SelectItem value="all">All Tables</SelectItem>
                {uniqueTables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg border border-white/10 bg-slate-900/70 text-sm text-slate-100">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="border border-white/10 bg-slate-900/95 text-slate-100 shadow-xl">
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
              <SelectTrigger className="h-9 w-[150px] rounded-lg border border-white/10 bg-slate-900/70 text-sm text-slate-100">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="border border-white/10 bg-slate-900/95 text-slate-100 shadow-xl">
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
              disabled={!hasActiveFilters}
              className="h-9 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-xs font-medium text-slate-200 transition hover:border-fuchsia-500/50 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reset
            </SpaceButton>
          </div>

          {filterTimeRange === "custom" && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>From</span>
              </div>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 rounded border border-white/10 bg-slate-950/80 px-2 text-xs text-slate-100 focus:border-fuchsia-400/60 focus:ring-0"
              />
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>To</span>
              </div>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 rounded border border-white/10 bg-slate-950/80 px-2 text-xs text-slate-100 focus:border-fuchsia-400/60 focus:ring-0"
              />
            </div>
          )}

          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "all" | "grouped")}
            className="w-full"
          >
            <TabsList className="grid h-9 grid-cols-2 rounded-lg border border-white/10 bg-slate-900/70">
              <TabsTrigger
                value="all"
                className="h-9 text-xs font-semibold uppercase tracking-wide text-slate-300 data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
              >
                Chronological
              </TabsTrigger>
              <TabsTrigger
                value="grouped"
                className="h-9 text-xs font-semibold uppercase tracking-wide text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                Grouped by Date
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <SpaceButton
              variant={sortField === "timestamp" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("timestamp")}
              className={`h-9 rounded-lg px-3 text-xs font-semibold uppercase tracking-wide ${
                sortField === "timestamp"
                  ? "bg-gradient-to-r from-fuchsia-500/80 to-purple-500/80 text-white shadow-lg shadow-fuchsia-500/30 hover:from-fuchsia-500 hover:to-purple-500"
                  : "border border-white/10 bg-slate-900/70 text-slate-200 hover:border-fuchsia-500/40 hover:text-white"
              }`}
            >
              <Clock className="mr-1 h-3 w-3" />
              Time
              {sortField === "timestamp" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="ml-1 h-3 w-3" />
                ) : (
                  <SortDesc className="ml-1 h-3 w-3" />
                ))}
            </SpaceButton>

            <SpaceButton
              variant={sortField === "tableId" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("tableId")}
              className={`h-9 rounded-lg px-3 text-xs font-semibold uppercase tracking-wide ${
                sortField === "tableId"
                  ? "bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-500 hover:to-blue-500"
                  : "border border-white/10 bg-slate-900/70 text-slate-200 hover:border-cyan-400/40 hover:text-white"
              }`}
            >
              <Table2 className="mr-1 h-3 w-3" />
              Table
              {sortField === "tableId" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="ml-1 h-3 w-3" />
                ) : (
                  <SortDesc className="ml-1 h-3 w-3" />
                ))}
            </SpaceButton>

            <SpaceButton
              variant={sortField === "action" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("action")}
              className={`h-9 rounded-lg px-3 text-xs font-semibold uppercase tracking-wide ${
                sortField === "action"
                  ? "bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white shadow-lg shadow-amber-500/30 hover:from-amber-500 hover:to-orange-500"
                  : "border border-white/10 bg-slate-900/70 text-slate-200 hover:border-amber-400/40 hover:text-white"
              }`}
            >
              <Activity className="mr-1 h-3 w-3" />
              Action
              {sortField === "action" &&
                (sortDirection === "asc" ? (
                  <SortAsc className="ml-1 h-3 w-3" />
                ) : (
                  <SortDesc className="ml-1 h-3 w-3" />
                ))}
            </SpaceButton>

            <div className="ml-auto flex gap-2">
              <SpaceButton
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="h-9 rounded-lg border border-white/10 bg-slate-900/70 px-3 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-emerald-400/40 hover:text-white"
              >
                <Download className="mr-1 h-3 w-3" />
                Export
              </SpaceButton>
            </div>
          </div>

          <ScrollArea
            ref={containerRef}
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 p-3 shadow-inner"
          >
            {viewMode === "all" ? (
              sortedLogs.length > 0 ? (
                <List
                  height={listHeight}
                  itemCount={sortedLogs.length}
                  itemSize={68}
                  width="100%"
                  itemData={sortedLogs}
                >
                  {Row}
                </List>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  {hasActiveFilters
                    ? "No logs match your filters"
                    : "No logs available"}
                </div>
              )
            ) : groupedLogs.length > 0 ? (
              <div className="space-y-6 pr-2">
                {groupedLogs.map(([dateLabel, logsForDate]) => (
                  <div key={dateLabel} className="space-y-2">
                    <div className="sticky top-0 z-10 -mx-3 px-3 py-1 backdrop-blur bg-slate-950/90">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                        {dateLabel}
                      </h3>
                    </div>
                    {logsForDate.map((log) => (
                      <div
                        key={log.original.id}
                        className="rounded-lg border border-white/10 bg-slate-900/70 p-3 shadow-sm transition hover:border-fuchsia-400/40"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                              {log.original.tableName}
                            </span>
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-200">
                              {log.original.action}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeOnly(log.date)}
                          </span>
                        </div>
                        {log.original.details && (
                          <p className="mt-2 text-[11px] leading-tight text-slate-100/90">
                            {log.original.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {hasActiveFilters
                  ? "No logs match your filters"
                  : "No logs available"}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-end pt-2">
          <Button
            onClick={onClose}
            className="h-9 rounded-lg border border-white/10 bg-slate-900/70 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-fuchsia-400/40 hover:text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
