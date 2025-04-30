"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { NeonGlow } from "@/components/neon-glow"
import { SpaceButton } from "@/components/space-button"
import {
  Loader2,
  BarChart4,
  Clock,
  Users,
  Table2,
  FileText,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react"
import { useAiAssistant } from "@/hooks/use-ai-assistant"
import type { Table, Server as ServerType, LogEntry } from "@/components/billiards-timer-dashboard"

interface DayReportDialogProps {
  open: boolean
  onClose: () => void
  tables: Table[]
  logs: LogEntry[]
  servers: ServerType[]
  isStarting: boolean
}

export function DayReportDialog({ open, onClose, tables, logs, servers, isStarting }: DayReportDialogProps) {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageSessionTime: 0,
    busyTables: [] as { id: number; name: string; sessions: number }[],
    topServers: [] as { id: string; name: string; tables: number }[],
  })

  // New feedback stats
  const [feedbackStats, setFeedbackStats] = useState({
    totalFeedback: 0,
    positiveCount: 0,
    negativeCount: 0,
    positivePercentage: 0,
    commonFeedback: [] as { text: string; count: number }[],
  })

  const { askAi } = useAiAssistant()

  // Generate report when dialog opens
  useEffect(() => {
    if (open) {
      generateReport()
      calculateStats()
      calculateFeedbackStats()
    }
  }, [open])

  // Calculate statistics from logs and tables
  const calculateStats = () => {
    try {
      // Filter logs for today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayLogs = logs.filter((log) => new Date(log.timestamp) >= todayStart)

      // Count sessions
      const sessionStarts = todayLogs.filter((log) => log.action.includes("Session Started"))
      const totalSessions = sessionStarts.length

      // Calculate average session time
      let totalSessionTime = 0
      let sessionCount = 0
      const sessionEnds = todayLogs.filter((log) => log.action.includes("Session Ended"))

      sessionEnds.forEach((endLog) => {
        const details = endLog.details
        const durationMatch = details.match(/Duration: (\d+) minutes/)
        if (durationMatch && durationMatch[1]) {
          totalSessionTime += Number.parseInt(durationMatch[1])
          sessionCount++
        }
      })

      const averageSessionTime = sessionCount > 0 ? Math.round(totalSessionTime / sessionCount) : 0

      // Calculate busy tables
      const tableCounts = new Map<number, number>()
      sessionStarts.forEach((log) => {
        const tableId = log.tableId
        tableCounts.set(tableId, (tableCounts.get(tableId) || 0) + 1)
      })

      const busyTables = Array.from(tableCounts.entries())
        .map(([id, sessions]) => ({
          id,
          name: tables.find((t) => t.id === id)?.name || `Table ${id}`,
          sessions,
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 3)

      // Calculate top servers
      const serverCounts = new Map<string, number>()
      sessionStarts.forEach((log) => {
        const tableId = log.tableId
        const table = tables.find((t) => t.id === tableId)
        if (table && table.server) {
          serverCounts.set(table.server, (serverCounts.get(table.server) || 0) + 1)
        }
      })

      const topServers = Array.from(serverCounts.entries())
        .map(([id, tables]) => ({
          id,
          name: servers.find((s) => s.id === id)?.name || "Unknown",
          tables,
        }))
        .sort((a, b) => b.tables - a.tables)
        .slice(0, 3)

      setStats({
        totalSessions,
        averageSessionTime,
        busyTables,
        topServers,
      })
    } catch (error) {
      console.error("Error calculating stats:", error)
      // Set fallback stats
      setStats({
        totalSessions: 0,
        averageSessionTime: 0,
        busyTables: [],
        topServers: [],
      })
    }
  }

  // Calculate feedback statistics
  const calculateFeedbackStats = () => {
    try {
      // Filter logs for feedback entries
      const feedbackLogs = logs.filter((log) => log.action.includes("Session Feedback"))

      // Count total feedback entries
      const totalFeedback = feedbackLogs.length

      if (totalFeedback === 0) {
        setFeedbackStats({
          totalFeedback: 0,
          positiveCount: 0,
          negativeCount: 0,
          positivePercentage: 0,
          commonFeedback: [],
        })
        return
      }

      // Count positive and negative ratings
      const positiveCount = feedbackLogs.filter((log) => log.details.includes("Rating: good")).length
      const negativeCount = feedbackLogs.filter((log) => log.details.includes("Rating: bad")).length

      // Calculate positive percentage
      const positivePercentage = Math.round((positiveCount / totalFeedback) * 100)

      // Extract and count common feedback comments
      const commentMap = new Map<string, number>()

      feedbackLogs.forEach((log) => {
        const commentMatch = log.details.match(/Comment: (.+)/)
        if (commentMatch && commentMatch[1]) {
          const comment = commentMatch[1].trim()
          if (comment) {
            commentMap.set(comment, (commentMap.get(comment) || 0) + 1)
          }
        }
      })

      // Sort comments by frequency
      const commonFeedback = Array.from(commentMap.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5 most common comments

      setFeedbackStats({
        totalFeedback,
        positiveCount,
        negativeCount,
        positivePercentage,
        commonFeedback,
      })
    } catch (error) {
      console.error("Error calculating feedback stats:", error)
      setFeedbackStats({
        totalFeedback: 0,
        positiveCount: 0,
        negativeCount: 0,
        positivePercentage: 0,
        commonFeedback: [],
      })
    }
  }

  // Generate AI report
  const generateReport = async () => {
    setLoading(true)
    try {
      const prompt = isStarting
        ? "Generate a brief welcome message for starting a new business day at a billiards hall. Include some positive encouragement and a tip for success."
        : "Generate a brief end-of-day summary for a billiards hall. Summarize the day's activities and provide a positive closing message."

      const aiResponse = await askAi(prompt, { tables, logs, servers })
      setReport(aiResponse)
    } catch (error) {
      console.error("Error generating report:", error)
      setReport(
        isStarting
          ? "Welcome to a new day at Space Billiards! Remember to keep tables clean and provide excellent service to maximize customer satisfaction."
          : "Thank you for your hard work today. All tables have been reset and the system is ready for tomorrow.",
      )
    } finally {
      setLoading(false)
    }
  }

  // Format date
  const formatDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Calculate feedback sentiment color
  const getFeedbackSentimentColor = useMemo(() => {
    if (feedbackStats.totalFeedback === 0) return "#AAAAAA"

    if (feedbackStats.positivePercentage >= 80) return "#00FF00"
    if (feedbackStats.positivePercentage >= 60) return "#AAFF00"
    if (feedbackStats.positivePercentage >= 40) return "#FFFF00"
    if (feedbackStats.positivePercentage >= 20) return "#FFAA00"
    return "#FF0000"
  }, [feedbackStats.positivePercentage, feedbackStats.totalFeedback])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] bg-black text-white border-[#00FFFF] max-h-[85vh] overflow-hidden flex flex-col space-theme font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
          backgroundSize: "cover",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        }}
      >
        <DialogHeader className="pb-0">
          <DialogTitle className="text-xl text-[#00FFFF] flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-[#FF00FF]" />
            <NeonGlow color="cyan" intensity="high">
              <span>{isStarting ? "Start of Day Report" : "End of Day Report"}</span>
            </NeonGlow>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto">
          {/* Date display */}
          <div className="flex justify-center">
            <div className="bg-[#000033] border border-[#00FFFF] rounded-md px-4 py-2 inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#00FFFF]" />
              <NeonGlow color="cyan" intensity="low">
                <span>{formatDate()}</span>
              </NeonGlow>
            </div>
          </div>

          {/* AI Report */}
          <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
            <h3 className="text-[#00FFFF] text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <NeonGlow color="cyan" intensity="low">
                <span>{isStarting ? "Welcome Message" : "Summary"}</span>
              </NeonGlow>
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#00FFFF] mr-2" />
                <span className="text-[#00FFFF]">Generating report...</span>
              </div>
            ) : (
              <div className="text-white text-sm whitespace-pre-wrap">{report}</div>
            )}
          </div>

          {/* Statistics - Only show for end of day */}
          {!isStarting && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sessions Statistics */}
              <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
                <h3 className="text-[#00FFFF] text-sm mb-3 flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  <NeonGlow color="cyan" intensity="low">
                    <span>Sessions</span>
                  </NeonGlow>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Sessions:</span>
                    <NeonGlow color="magenta" intensity="medium">
                      <span className="text-lg">{stats.totalSessions}</span>
                    </NeonGlow>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Average Duration:</span>
                    <NeonGlow color="yellow" intensity="medium">
                      <span className="text-lg">{stats.averageSessionTime} min</span>
                    </NeonGlow>
                  </div>
                </div>
              </div>

              {/* Feedback Statistics */}
              <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
                <h3 className="text-[#00FFFF] text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <NeonGlow color="cyan" intensity="low">
                    <span>Feedback</span>
                  </NeonGlow>
                </h3>
                <div className="space-y-2">
                  {feedbackStats.totalFeedback > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Feedback:</span>
                        <span className="text-white">{feedbackStats.totalFeedback}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3 text-green-400" />
                          <span className="text-gray-300">Positive:</span>
                        </div>
                        <span className="text-green-400">{feedbackStats.positiveCount}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3 text-red-400" />
                          <span className="text-gray-300">Negative:</span>
                        </div>
                        <span className="text-red-400">{feedbackStats.negativeCount}</span>
                      </div>

                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300">Satisfaction Rate:</span>
                          <span style={{ color: getFeedbackSentimentColor }}>{feedbackStats.positivePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${feedbackStats.positivePercentage}%`,
                              backgroundColor: getFeedbackSentimentColor,
                            }}
                          ></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-400 py-2">No feedback collected today</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Common Feedback Comments - Only show if there are comments */}
          {!isStarting && feedbackStats.commonFeedback.length > 0 && (
            <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
              <h3 className="text-[#00FFFF] text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <NeonGlow color="cyan" intensity="low">
                  <span>Common Feedback</span>
                </NeonGlow>
              </h3>
              <div className="space-y-2">
                {feedbackStats.commonFeedback.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-white truncate max-w-[400px]">"{item.text}"</span>
                    <span className="text-gray-400 ml-2">×{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance - Only show for end of day */}
          {!isStarting && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Busy Tables */}
              {stats.busyTables.length > 0 && (
                <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
                  <h3 className="text-[#00FFFF] text-sm mb-3 flex items-center gap-2">
                    <Table2 className="h-4 w-4" />
                    <NeonGlow color="cyan" intensity="low">
                      <span>Busiest Tables</span>
                    </NeonGlow>
                  </h3>
                  <div className="space-y-1">
                    {stats.busyTables.map((table) => (
                      <div key={table.id} className="flex justify-between items-center text-sm">
                        <span className="text-[#00FFFF]">{table.name}</span>
                        <span className="text-white">{table.sessions} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Servers */}
              {stats.topServers.length > 0 && (
                <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-4">
                  <h3 className="text-[#00FFFF] text-sm mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <NeonGlow color="cyan" intensity="low">
                      <span>Top Servers</span>
                    </NeonGlow>
                  </h3>
                  <div className="space-y-1">
                    {stats.topServers.map((server) => (
                      <div key={server.id} className="flex justify-between items-center text-sm">
                        <span className="text-[#FF00FF]">{server.name}</span>
                        <span className="text-white">{server.tables} tables</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between pt-2">
          {!isStarting && (
            <SpaceButton
              onClick={() => {
                // In a real app, this would download a PDF or CSV report
                alert("Report download functionality would be implemented here")
              }}
              glowColor="rgba(255, 0, 255, 0.5)"
              className="bg-[#330033] hover:bg-[#440044] text-[#FF00FF] border border-[#FF00FF]"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </SpaceButton>
          )}
          <SpaceButton
            onClick={onClose}
            glowColor="rgba(0, 255, 255, 0.5)"
            className="bg-[#000033] hover:bg-[#000066] text-[#00FFFF] border border-[#00FFFF]"
          >
            {isStarting ? "Start Day" : "End Day"}
          </SpaceButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
