"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAiAssistant } from "@/hooks/use-ai-assistant"
import { Loader2, BarChart4, PieChart, RefreshCw, AlertTriangle, TrendingUp, Clock, ChevronRight } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { SpaceButton } from "@/components/space-button"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

interface AiAnalyticsDashboardProps {
  tables: Table[]
  logs: LogEntry[]
  servers: Server[]
}

interface Insight {
  text: string
  details: string
  category: "usage" | "trend" | "time"
}

export function AiAnalyticsDashboard({ tables, logs, servers }: AiAnalyticsDashboardProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null)
  const { askAi } = useAiAssistant()

  // Generate insights on component mount
  useEffect(() => {
    generateInsights()
  }, [])

  const generateInsights = async () => {
    setRefreshing(true)
    setError(null)
    setSelectedInsight(null)

    try {
      // Create different categories of insights with simpler prompts
      const usageInsightPrompt =
        "Analyze the current table usage and provide 1-2 insights about billiards hall operations."
      const operationalInsightPrompt =
        "Provide 1-2 operational recommendations for billiards hall management based on the current state."

      // Request insights with robust error handling
      const usageInsightsPromise = askAi(usageInsightPrompt, { tables, logs, servers })
        .then((response) => {
          if (!response || response.trim() === "") {
            console.warn("Empty usage insights response, using fallback")
            return "Table usage appears to be at normal levels. Monitor for peak times."
          }
          return response
        })
        .catch((error) => {
          console.error("Error getting usage insights:", error)
          return "Table usage appears to be at normal levels. Monitor for peak times."
        })

      const operationalInsightsPromise = askAi(operationalInsightPrompt, { tables, logs, servers })
        .then((response) => {
          if (!response || response.trim() === "") {
            console.warn("Empty operational insights response, using fallback")
            return "Consider optimizing server assignments based on table distribution."
          }
          return response
        })
        .catch((error) => {
          console.error("Error getting operational insights:", error)
          return "Consider optimizing server assignments based on table distribution."
        })

      // Wait for all promises to resolve
      const [usageInsights, operationalInsights] = await Promise.all([usageInsightsPromise, operationalInsightsPromise])

      // Process and combine insights
      const allInsights: Insight[] = []

      // Extract bullet points from each response
      const extractBulletPoints = (text: string | null, category: "usage" | "trend" | "time") => {
        if (!text) return []
        // First try to extract bullet points
        const bulletPoints = text
          .split("\n")
          .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("•"))
          .map((line) => line.trim().replace(/^[-•]\s+/, ""))

        // If no bullet points found, split by sentences
        if (bulletPoints.length === 0) {
          return text
            .split(/[.!?]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 10)
            .slice(0, 2)
            .map((sentence) => ({
              text: sentence,
              details: generateDetails(sentence, category),
              category,
            }))
        }

        return bulletPoints.map((point) => ({
          text: point,
          details: generateDetails(point, category),
          category,
        }))
      }

      allInsights.push(...extractBulletPoints(usageInsights, "usage"))
      allInsights.push(...extractBulletPoints(operationalInsights, "trend"))

      // Add time-based insights
      const timeBasedInsights = generateTimeBasedInsights()
      allInsights.push(...timeBasedInsights)

      // If no insights were extracted, use default insights
      if (allInsights.length === 0) {
        generateDefaultInsights()
      } else {
        setInsights(allInsights.filter((insight) => Boolean(insight.text)))
      }
    } catch (error) {
      console.error("Error generating insights:", error)
      setError("Unable to generate insights at this time")
      generateDefaultInsights()
    } finally {
      setRefreshing(false)
    }
  }

  // Generate time-based insights
  const generateTimeBasedInsights = (): Insight[] => {
    const activeTables = tables.filter((t) => t.isActive)
    const timeInsights: Insight[] = []

    if (activeTables.length > 0) {
      // Find tables with less than 15 minutes remaining
      const warningTables = activeTables.filter((t) => {
        // Check if remainingTime exists and is a number before comparing
        return (
          t.remainingTime !== undefined &&
          t.remainingTime !== null &&
          t.remainingTime > 0 &&
          t.remainingTime <= 15 * 60 * 1000
        )
      })

      if (warningTables.length > 0) {
        timeInsights.push({
          text: `${warningTables.length} tables have less than 15 minutes remaining`,
          details: `Tables ${warningTables.map((t) => t.name).join(", ")} are nearing their time limit. Consider sending a server to check if they want to extend their session.`,
          category: "time",
        })
      }

      // Find tables in overtime
      const overtimeTables = activeTables.filter((t) => {
        // Check if remainingTime exists and is a number before comparing
        return t.remainingTime !== undefined && t.remainingTime !== null && t.remainingTime < 0
      })

      if (overtimeTables.length > 0) {
        timeInsights.push({
          text: `${overtimeTables.length} tables are currently in overtime`,
          details: `Tables ${overtimeTables.map((t) => t.name).join(", ")} have exceeded their allotted time. This is an opportunity to collect additional revenue or offer a courtesy extension.`,
          category: "time",
        })
      }
    }

    return timeInsights
  }

  // Generate detailed explanation for an insight
  const generateDetails = (insight: string, category: "usage" | "trend" | "time"): string => {
    const activeTables = tables.filter((t) => t.isActive).length
    const totalTables = tables.length
    const utilization = Math.round((activeTables / totalTables) * 100)

    // Default details based on category
    if (category === "usage") {
      return `This insight is based on current table utilization of ${utilization}%. Monitoring usage patterns can help optimize staffing and table availability. Consider historical data to identify trends and make data-driven decisions.`
    } else if (category === "trend") {
      return `This recommendation is based on analyzing operational patterns. Implementing this suggestion could improve efficiency, customer satisfaction, and potentially increase revenue. Consider tracking the impact of any changes made.`
    } else {
      return `Time management is critical for billiards hall operations. Proper monitoring of table time can maximize revenue and improve customer experience. Consider implementing automated notifications for tables approaching time limits.`
    }
  }

  // Generate default insights based on current data
  const generateDefaultInsights = () => {
    const activeTables = tables.filter((t) => t.isActive).length
    const totalTables = tables.length
    const utilization = Math.round((activeTables / totalTables) * 100)

    const defaultInsights: Insight[] = [
      {
        text: `Current table utilization is at ${utilization}%`,
        details: `With ${activeTables} of ${totalTables} tables currently active, your hall is operating at ${utilization}% capacity. This is a key metric to track throughout the day to optimize staffing and operations.`,
        category: "usage",
      },
      {
        text: "Consider monitoring peak hours to optimize staffing",
        details:
          "Analyzing historical data shows that staffing aligned with peak usage hours can improve service quality and reduce costs during slower periods. Consider creating a heat map of busy times.",
        category: "trend",
      },
      {
        text: `${activeTables} of ${totalTables} tables are currently active`,
        details: `Having ${activeTables} tables in use represents a ${utilization}% utilization rate. Tracking this metric over time can help identify patterns and optimize your business operations.`,
        category: "usage",
      },
      {
        text: "Regular monitoring helps optimize operations",
        details:
          "Consistent tracking of key metrics like table utilization, server assignments, and session duration provides valuable insights for business optimization and improved customer experience.",
        category: "trend",
      },
    ]

    // Add more specific insights based on current state
    if (activeTables > 0) {
      const tablesWithServer = tables.filter((t) => t.isActive && t.server).length

      // Add null/undefined checks for remainingTime
      const overtimeTables = tables.filter(
        (t) => t.isActive && t.remainingTime !== undefined && t.remainingTime !== null && t.remainingTime < 0,
      ).length

      const warningTables = tables.filter(
        (t) =>
          t.isActive &&
          t.remainingTime !== undefined &&
          t.remainingTime !== null &&
          t.remainingTime > 0 &&
          t.remainingTime <= 15 * 60 * 1000,
      ).length

      if (tablesWithServer < activeTables) {
        defaultInsights.push({
          text: `${activeTables - tablesWithServer} active tables need server assignment`,
          details: `Unassigned tables may lead to decreased customer satisfaction. Consider implementing a rotation system to ensure all tables receive adequate attention from servers.`,
          category: "trend",
        })
      }

      if (overtimeTables > 0) {
        defaultInsights.push({
          text: `${overtimeTables} tables are currently in overtime`,
          details: `Tables in overtime represent both an opportunity for additional revenue and a potential bottleneck during busy periods. Consider implementing a notification system for tables approaching their time limit.`,
          category: "time",
        })
      }

      if (warningTables > 0) {
        defaultInsights.push({
          text: `${warningTables} tables have less than 15 minutes remaining`,
          details: `Proactively notifying customers about their remaining time can improve the customer experience and help with table turnover planning. Consider sending servers to check if these customers want to extend their session.`,
          category: "time",
        })
      }
    }

    // Shuffle and limit insights
    const shuffled = defaultInsights.sort(() => 0.5 - Math.random())
    setInsights(shuffled.slice(0, 5))
  }

  // Handle clicking on an insight
  const handleInsightClick = (index: number) => {
    if (selectedInsight === index) {
      setSelectedInsight(null)
    } else {
      setSelectedInsight(index)
    }
  }

  return (
    <Card className="w-full border-[#00FFFF] bg-black h-full overflow-hidden relative">
      {/* Animated background for the card */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#000033] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00FFFF] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00FFFF] opacity-30 animate-pulse"></div>
        <div className="absolute top-0 left-0 h-full w-[1px] bg-[#00FFFF] opacity-30 animate-pulse"></div>
        <div className="absolute top-0 right-0 h-full w-[1px] bg-[#00FFFF] opacity-30 animate-pulse"></div>

        {/* Particle effect */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-[#00FFFF] opacity-20"
              style={{
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                boxShadow: "0 0 5px #00FFFF",
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      <CardHeader className="pb-1 pt-2 relative z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base text-[#00FFFF] flex items-center gap-2">
            <BarChart4 className="h-4 w-4 text-[#FF00FF]" />
            <NeonGlow color="cyan" intensity="medium">
              <span>AI Insights</span>
            </NeonGlow>
            {error && (
              <div className="flex items-center text-xs text-amber-400 gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Limited Mode</span>
              </div>
            )}
          </CardTitle>
          <SpaceButton
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={refreshing}
            className="h-6 text-xs border-[#00FFFF] text-[#00FFFF] hover:bg-[#000066]"
            glowColor="rgba(0, 255, 255, 0.3)"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </>
            )}
          </SpaceButton>
        </div>
      </CardHeader>
      <CardContent className="pt-0 overflow-auto relative z-10" style={{ maxHeight: "calc(100% - 40px)" }}>
        {refreshing && insights.length === 0 ? (
          <div className="p-2 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#00FFFF]" />
            <span className="ml-2 text-[#00FFFF] text-sm">Analyzing data...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {insights.map((insight, index) => (
              <div key={index} className="space-y-1">
                <div
                  className="flex items-start gap-2 p-1 rounded-md bg-[#000033] border border-[#003366] hover:border-[#00FFFF] transition-colors duration-300 cursor-pointer"
                  style={{
                    boxShadow: "0 0 5px rgba(0, 255, 255, 0.2)",
                    animation: `pulse ${3 + index * 0.5}s infinite alternate`,
                  }}
                  onClick={() => handleInsightClick(index)}
                >
                  {insight.category === "usage" ? (
                    <PieChart className="h-3 w-3 text-[#FF00FF] mt-0.5 flex-shrink-0" />
                  ) : insight.category === "trend" ? (
                    <TrendingUp className="h-3 w-3 text-[#00FFFF] mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-[#FFFF00] mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-xs text-white flex-1">{insight.text}</p>
                  <ChevronRight
                    className={`h-3 w-3 text-[#00FFFF] transition-transform ${selectedInsight === index ? "rotate-90" : ""}`}
                  />
                </div>

                {selectedInsight === index && (
                  <div className="ml-5 p-2 text-xs bg-[#001122] border-l-2 border-[#00FFFF] rounded-r-md text-gray-300 animate-fadeIn">
                    {insight.details}
                  </div>
                )}
              </div>
            ))}
            {insights.length === 0 && !refreshing && (
              <div className="p-2 text-center text-gray-400 text-xs">
                No insights available. Click refresh to generate new insights.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
