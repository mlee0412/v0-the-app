"use client";

// MODIFICATION: Ensure React and all used hooks are explicitly imported.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAiAssistant } from "@/hooks/use-ai-assistant";
import { Loader2, BarChart4, PieChart, RefreshCw, AlertTriangle, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { NeonGlow } from "@/components/ui/neon-glow";
import { SpaceButton } from "@/components/ui/space-button";
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard";
import menuDataService, { type MenuItem, type MenuRecommendation } from "@/services/menu-data-service";


interface AiAnalyticsDashboardProps {
  tables: Table[];
  logs: LogEntry[];
  servers: Server[];
}

interface Insight {
  text: string;
  details: string;
  category: "usage" | "trend" | "time";
}

export function AiAnalyticsDashboard({ tables, logs, servers }: AiAnalyticsDashboardProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);
  const { askAi } = useAiAssistant(); // Assuming useAiAssistant is correctly set up

  // Generate insights on component mount or when relevant data changes
  // MODIFICATION: Added tables, logs, servers to dependency array for re-fetching if they change.
  useEffect(() => {
    generateInsights();
  }, [tables, logs, servers]); // Regenerate if core data changes

  const generateInsights = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setSelectedInsight(null);

    try {
      const usageInsightPrompt =
        "Analyze the current table usage and provide 1-2 insights about billiards hall operations.";
      const operationalInsightPrompt =
        "Provide 1-2 operational recommendations for billiards hall management based on the current state.";

      const usageInsightsPromise = askAi(usageInsightPrompt, { tables, logs, servers })
        .then((response) => {
          if (!response || response.trim() === "") {
            console.warn("Empty usage insights response, using fallback");
            return "Table usage appears to be at normal levels. Monitor for peak times.";
          }
          return response;
        })
        .catch((error) => {
          console.error("Error getting usage insights:", error);
          return "Table usage appears to be at normal levels. Monitor for peak times.";
        });

      const operationalInsightsPromise = askAi(operationalInsightPrompt, { tables, logs, servers })
        .then((response) => {
          if (!response || response.trim() === "") {
            console.warn("Empty operational insights response, using fallback");
            return "Consider optimizing server assignments based on table distribution.";
          }
          return response;
        })
        .catch((error) => {
          console.error("Error getting operational insights:", error);
          return "Consider optimizing server assignments based on table distribution.";
        });

      const [usageInsights, operationalInsights] = await Promise.all([usageInsightsPromise, operationalInsightsPromise]);
      const allInsights: Insight[] = [];

      const extractBulletPoints = (text: string | null, category: "usage" | "trend" | "time"): Insight[] => {
        if (!text) return [];
        const bulletPoints = text
          .split("\n")
          .map(line => line.trim())
          .filter((line) => (line.startsWith("- ") || line.startsWith("• ") || /^\d+\.\s/.test(line)) && line.length > 15) // Stricter filter
          .map((line) => line.replace(/^[-•\d.]\s+/, "").trim());

        if (bulletPoints.length === 0) {
          return text
            .split(/[.!?]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 20) // Slightly longer for sentence
            .slice(0, 2) // Limit to 2 sentences if no bullets
            .map((sentence) => ({
              text: sentence,
              details: generateDetails(sentence, category, tables), // Pass tables to generateDetails
              category,
            }));
        }

        return bulletPoints.slice(0, 3).map((point) => ({ // Limit to 3 bullet points
          text: point,
          details: generateDetails(point, category, tables), // Pass tables to generateDetails
          category,
        }));
      };

      allInsights.push(...extractBulletPoints(usageInsights, "usage"));
      allInsights.push(...extractBulletPoints(operationalInsights, "trend"));

      const timeBasedInsights = generateTimeBasedInsights(tables); // Pass tables
      allInsights.push(...timeBasedInsights);

      if (allInsights.filter(Boolean).length === 0) {
        setInsights(generateDefaultInsights(tables)); // Pass tables
      } else {
        setInsights(allInsights.filter((insight) => insight && insight.text && insight.text.trim() !== ""));
      }
    } catch (err) {
      console.error("Error generating insights:", err);
      setError("Unable to generate insights at this time.");
      setInsights(generateDefaultInsights(tables)); // Pass tables
    } finally {
      setRefreshing(false);
    }
  }, [askAi, tables, logs, servers]); // Added useCallback and dependencies

  const generateTimeBasedInsights = (currentTables: Table[]): Insight[] => {
    const activeTables = currentTables.filter((t) => t.isActive);
    const timeInsights: Insight[] = [];

    if (activeTables.length > 0) {
      const warningTables = activeTables.filter(
        (t) => t.remainingTime > 0 && t.remainingTime <= 15 * 60 * 1000
      );
      if (warningTables.length > 0) {
        timeInsights.push({
          text: `${warningTables.length} table${warningTables.length > 1 ? 's' : ''} ${warningTables.length > 1 ? 'have' : 'has'} <15 mins left`,
          details: `Tables: ${warningTables.map((t) => t.name).join(", ")}. Proactively check if they wish to extend.`,
          category: "time",
        });
      }

      const overtimeTables = activeTables.filter((t) => t.remainingTime < 0);
      if (overtimeTables.length > 0) {
        timeInsights.push({
          text: `${overtimeTables.length} table${overtimeTables.length > 1 ? 's are' : ' is'} in overtime`,
          details: `Tables: ${overtimeTables.map((t) => t.name).join(", ")}. This is an opportunity for extra revenue.`,
          category: "time",
        });
      }
    }
    return timeInsights;
  };

  const generateDetails = (insightText: string, category: "usage" | "trend" | "time", currentTables: Table[]): string => {
    const activeCount = currentTables.filter((t) => t.isActive).length;
    const totalCount = currentTables.length;
    const utilization = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    if (category === "usage") {
      return `Based on current utilization of ${utilization}% (${activeCount}/${totalCount} tables). Keep an eye on this metric to understand peak hours and optimize staffing.`;
    } else if (category === "trend") {
      return `This operational suggestion aims to improve efficiency. Consider implementing and tracking its impact over a week.`;
    } else if (category === "time") {
      return `Effective time management is key. For tables nearing their limit or in overtime, a quick check-in can enhance customer experience and revenue.`;
    }
    return "Further analysis can provide deeper understanding.";
  };

  const generateDefaultInsights = (currentTables: Table[]): Insight[] => {
    const activeCount = currentTables.filter((t) => t.isActive).length;
    const totalCount = currentTables.length;
    const utilization = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    return [
      {
        text: `Current table utilization: ${utilization}%`,
        details: `${activeCount} of ${totalCount} tables are active. This provides a snapshot of current activity.`,
        category: "usage",
      },
      {
        text: "Review server performance during peak hours.",
        details: "Check logs for server assignments and table turn-around times to identify potential bottlenecks or top performers.",
        category: "trend",
      },
    ];
  };

  const handleInsightClick = (index: number) => {
    setSelectedInsight(selectedInsight === index ? null : index);
  };
  
  // Render
  return (
    <Card className="w-full border-[#00FFFF] bg-black h-full overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        {/* Removed complex particle animation from here for brevity and focus on error */}
        <div className="absolute inset-0 bg-[#000033] opacity-50"></div>
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
      <CardContent className="pt-0 overflow-auto relative z-10" style={{ maxHeight: "calc(100% - 40px)" }}> {/* Adjust max height if needed */}
        {refreshing && insights.length === 0 ? (
          <div className="p-2 flex items-center justify-center h-full"> {/* Ensure loading takes full height */}
            <Loader2 className="h-5 w-5 animate-spin text-[#00FFFF]" />
            <span className="ml-2 text-[#00FFFF] text-sm">Analyzing data...</span>
          </div>
        ) : (
          <div className="space-y-1 py-2"> {/* Added py-2 for padding */}
            {insights.map((insight, index) => (
              <div key={index} className="space-y-1">
                <div
                  className="flex items-start gap-2 p-1.5 rounded-md bg-[#000033]/80 border border-[#003366]/70 hover:border-[#00FFFF]/70 transition-colors duration-300 cursor-pointer"
                  style={{
                    boxShadow: "0 0 5px rgba(0, 255, 255, 0.2)",
                  }}
                  onClick={() => handleInsightClick(index)}
                  role="button" // Accessibility: indicate it's clickable
                  tabIndex={0} // Accessibility: make it focusable
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleInsightClick(index)} // Accessibility: keyboard interaction
                >
                  {insight.category === "usage" ? (
                    <PieChart className="h-3.5 w-3.5 text-[#FF00FF] mt-0.5 flex-shrink-0" />
                  ) : insight.category === "trend" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-[#00FFFF] mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-[#FFFF00] mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-xs text-white flex-1">{insight.text}</p>
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-[#00FFFF] transition-transform duration-200 ${selectedInsight === index ? "rotate-90" : ""}`}
                  />
                </div>

                {selectedInsight === index && (
                  <div className="ml-5 p-2 text-xs bg-[#001122]/80 border-l-2 border-[#00FFFF] rounded-r-md text-gray-300 animate-fadeIn">
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
  );
}
