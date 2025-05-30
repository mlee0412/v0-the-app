"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { SwipeableTableCard } from "@/components/mobile/swipeable-table-card";
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard";
import { useTableStore } from "@/utils/table-state-manager";
import { hapticFeedback } from "@/utils/haptic-feedback";
import { toast } from "@/hooks/use-toast";
import { ArrowDown, Loader2 } from "lucide-react";

interface EnhancedMobileTableListProps {
  tables: Table[];
  servers: Server[];
  logs: LogEntry[];
  onTableClick: (tableId: number) => void;
  onAddTime: (tableId: number) => void;
  onEndSession: (tableId: number) => void;
  canEndSession: boolean;
  canAddTime: boolean;
  onRefresh?: () => Promise<void>;
  showAnimations?: boolean;
}

export function EnhancedMobileTableList({
  tables,
  servers,
  logs,
  onTableClick,
  onAddTime,
  onEndSession,
  canEndSession,
  canAddTime,
  onRefresh,
  showAnimations = true,
}: EnhancedMobileTableListProps) {
  const [localTables, setLocalTables] = useState<Table[]>(tables);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshThreshold = 80;
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);
  const pullDistance = useRef(0);
  const isPullingActive = useRef(false); // Tracks if a valid pull-to-refresh gesture is active
  const isScrolling = useRef(false); // Track if the user is primarily scrolling
  const lastUpdateTime = useRef(Date.now());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      const tableIds = tables.map((t) => t.id);
      const updatedTables = tableIds.map((id) => state.tables[id] || tables.find((t) => t.id === id)!);
      if (JSON.stringify(updatedTables) !== JSON.stringify(localTables)) {
        setLocalTables(updatedTables);
      }
    });
    return () => unsubscribe();
  }, [tables, localTables]);

  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => {
      const { tableId, remainingTime, initialTime } = event.detail;
      setLocalTables((prevTables) =>
        prevTables.map((table) => (table.id === tableId ? { ...table, remainingTime, initialTime } : table)),
      );
    };
    const handleBatchUpdate = (event: CustomEvent) => {
      const { updates } = event.detail;
      if (updates && updates.length > 0) {
        setLocalTables((prevTables) =>
          prevTables.map((table) => {
            const update = updates.find((u: any) => u.tableId === table.id);
            return update ? { ...table, remainingTime: update.remainingTime, initialTime: update.initialTime } : table;
          }),
        );
      }
    };
    const handleTableUpdateEvent = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table) {
        setLocalTables((prevTables) => prevTables.map((t) => (t.id === table.id ? { ...t, ...table } : t)));
      }
    };

    window.addEventListener("supabase-timer-update", handleTimerUpdate as EventListener);
    window.addEventListener("batch-timer-update", handleBatchUpdate as EventListener);
    window.addEventListener("supabase-tables-update", handleTableUpdateEvent as EventListener);

    const refreshInterval = setInterval(() => {
      if (Date.now() - lastUpdateTime.current > 30000) {
        if (onRefresh && !isRefreshing) {
          onRefresh().then(() => {
            lastUpdateTime.current = Date.now();
          });
        }
      }
    }, 60000);

    return () => {
      window.removeEventListener("supabase-timer-update", handleTimerUpdate as EventListener);
      window.removeEventListener("batch-timer-update", handleBatchUpdate as EventListener);
      window.removeEventListener("supabase-tables-update", handleTableUpdateEvent as EventListener);
      clearInterval(refreshInterval);
    };
  }, [onRefresh, isRefreshing]);

  const triggerRefresh = useCallback(async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback.medium();
      try {
        await onRefresh();
        lastUpdateTime.current = Date.now();
        setLastRefreshTime(new Date());
        hapticFeedback.success();
        toast({ title: "Tables refreshed", duration: 2000 });
      } catch (error) {
        console.error("Error refreshing tables:", error);
        hapticFeedback.error();
        toast({ title: "Refresh failed", variant: "destructive", duration: 3000 });
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, isRefreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isScrolling.current = false; // Reset scrolling flag
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      refreshStartY.current = e.touches[0].clientY;
      isPullingActive.current = true; // Potential pull starts
      pullDistance.current = 0;
      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transition = 'none';
      }
    } else {
      isPullingActive.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingActive.current || !containerRef.current) return;

    const currentY = e.touches[0].clientY;
    const newPullDistance = currentY - refreshStartY.current;

    // If scrollTop is not 0, it means user scrolled down then up, so not a pull-to-refresh.
    if (containerRef.current.scrollTop !== 0 && newPullDistance > 0) {
        isPullingActive.current = false; // Invalidate pull
        // Reset indicator if it was shown
        if (refreshIndicatorRef.current) {
            refreshIndicatorRef.current.style.transform = `translateY(0px)`;
            refreshIndicatorRef.current.style.opacity = '0';
        }
        return;
    }
    
    if (newPullDistance < 0) { // User is scrolling up (content moves down)
        isPullingActive.current = false; // Invalidate pull
        if (refreshIndicatorRef.current) {
            refreshIndicatorRef.current.style.transform = `translateY(0px)`;
            refreshIndicatorRef.current.style.opacity = '0';
        }
        isScrolling.current = true;
        return; // Allow native scroll
    }

    // If we are at the top and pulling down
    if (newPullDistance > 0 && containerRef.current.scrollTop === 0) {
      e.preventDefault(); // Prevent native page scroll ONLY when actively pulling down at the top
      isScrolling.current = false; // This is a pull, not a scroll
      pullDistance.current = newPullDistance;
      const resistance = 0.4;
      const pullWithResistance = Math.min(refreshThreshold * 1.5, pullDistance.current * resistance);

      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transform = `translateY(${pullWithResistance}px)`;
        refreshIndicatorRef.current.style.opacity = Math.min(1, pullWithResistance / refreshThreshold).toString();
        const rotation = Math.min(180, (pullWithResistance / refreshThreshold) * 180);
        const arrowElement = refreshIndicatorRef.current.querySelector(".refresh-arrow");
        if (arrowElement) {
          arrowElement.setAttribute("style", `transform: rotate(${rotation}deg)`);
        }
      }
    } else {
        isScrolling.current = true; // Allow native scroll if not a valid pull
    }
  }, [refreshThreshold]);

  const handleTouchEnd = useCallback(() => {
    const wasAPullAttempt = isPullingActive.current && pullDistance.current > 0;
    isPullingActive.current = false;

    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
      refreshIndicatorRef.current.style.transform = "translateY(0)";
      refreshIndicatorRef.current.style.opacity = "0";
      setTimeout(() => {
        if (refreshIndicatorRef.current) {
          refreshIndicatorRef.current.style.transition = "";
        }
      }, 300);
    }

    if (wasAPullAttempt && !isScrolling.current && pullDistance.current >= refreshThreshold) {
      triggerRefresh();
    }
    pullDistance.current = 0;
    isScrolling.current = false;
  }, [triggerRefresh, refreshThreshold]);

  const filteredAndSortedTables = [...localTables]
    .filter((table) => !table.name.toLowerCase().includes("system"))
    .sort((a, b) => a.id - b.id);

  return (
    <div
      className="relative w-full overflow-y-auto pb-20 ios-momentum-scroll"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        ref={refreshIndicatorRef}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10 opacity-0"
        style={{ transform: 'translateY(0px)' }}
      >
        {isRefreshing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
            <span className="text-xs text-cyan-500 mt-1">Refreshing...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ArrowDown className="h-6 w-6 text-cyan-500 refresh-arrow transition-transform duration-200" />
            <span className="text-xs text-cyan-500 mt-1">
              {pullDistance.current >= refreshThreshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        )}
      </div>

      {lastRefreshTime && (
        <div className="text-center text-xs text-gray-400 py-2 bg-black/30 backdrop-blur-sm sticky top-0 z-20">
          Last updated: {lastRefreshTime.toLocaleTimeString()}
        </div>
      )}

      <div className="space-y-4 p-4 mobile-table-card-list">
        {filteredAndSortedTables.length > 0 ? (
          filteredAndSortedTables.map((table) => (
            <SwipeableTableCard
              key={table.id}
              table={table}
              servers={servers}
              logs={logs.filter((log) => log.tableId === table.id)}
              onClick={() => {
                // Check if it was a scroll, if so, don't trigger click
                if (isScrolling.current) return;
                hapticFeedback.selection();
                onTableClick(table.id);
              }}
              onAddTime={(tableId) => {
                hapticFeedback.success();
                onAddTime(tableId);
              }}
              onEndSession={(tableId) => {
                hapticFeedback.strong();
                onEndSession(tableId);
              }}
              canEndSession={canEndSession}
              canAddTime={canAddTime}
              showAnimations={showAnimations} // Pass down showAnimations
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-[#00FFFF] opacity-70 mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white/70 text-sm">No tables available</p>
            <button
              onClick={() => {
                if (onRefresh) {
                  triggerRefresh();
                }
              }}
              className="mt-4 px-4 py-2 bg-[#00FFFF]/10 text-[#00FFFF] rounded-md text-sm font-medium border border-[#00FFFF]/30"
            >
              {isRefreshing ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </span>
              ) : (
                "Refresh Tables"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
