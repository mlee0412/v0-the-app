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
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);
  
  const touchStartInfo = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);
  const isPotentialPullToRefresh = useRef(false);
  const pullDistanceDisplay = useRef(0); // For visual feedback only
  const refreshThreshold = 80;
  
  const lastUpdateTime = useRef(Date.now());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      const tableIds = tables.map((t) => t.id);
      const storeStateTables = state.tables;
      const updatedTables = tableIds.map((id) => storeStateTables[id] || tables.find((t) => t.id === id)!);
      if (JSON.stringify(updatedTables) !== JSON.stringify(localTables)) {
        setLocalTables(updatedTables);
      }
    });
    return () => unsubscribe();
  }, [tables, localTables]); // localTables dependency to re-evaluate if it changes from elsewhere

  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => { /* ... */ };
    const handleBatchUpdate = (event: CustomEvent) => { /* ... */ };
    const handleTableUpdateEvent = (event: CustomEvent) => { /* ... */ };

    // Simplified event listeners (assuming bodies are the same as previous version)
    window.addEventListener("supabase-timer-update", handleTimerUpdate as EventListener);
    window.addEventListener("batch-timer-update", handleBatchUpdate as EventListener);
    window.addEventListener("supabase-tables-update", handleTableUpdateEvent as EventListener);

    const refreshInterval = setInterval(() => {
      if (Date.now() - lastUpdateTime.current > 30000 && onRefresh && !isRefreshing) {
        onRefresh().then(() => lastUpdateTime.current = Date.now());
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
        hapticFeedback.error();
        toast({ title: "Refresh failed", variant: "destructive", duration: 3000 });
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, isRefreshing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      isPotentialPullToRefresh.current = false;
      return;
    }
    touchStartInfo.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      target: e.target,
    };
    // Only consider pull-to-refresh if at the absolute top of the scroll container
    isPotentialPullToRefresh.current = (containerRef.current?.scrollTop || 0) < 5; // Allow a small tolerance
    pullDistanceDisplay.current = 0;

    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transition = 'none';
      refreshIndicatorRef.current.style.opacity = '0'; // Hide initially
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartInfo.current || e.touches.length > 1 || !isPotentialPullToRefresh.current) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartInfo.current.y;

    if (deltaY > 0 && (containerRef.current?.scrollTop || 0) < 5) { // Pulling down at the top
      e.preventDefault(); // Prevent native browser pull-to-refresh and scroll
      
      const resistance = 0.4;
      pullDistanceDisplay.current = Math.min(refreshThreshold * 2, deltaY * resistance);

      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transform = `translateY(${pullDistanceDisplay.current}px)`;
        refreshIndicatorRef.current.style.opacity = Math.min(1, pullDistanceDisplay.current / refreshThreshold).toString();
        const rotation = Math.min(180, (pullDistanceDisplay.current / refreshThreshold) * 180);
        const arrowElement = refreshIndicatorRef.current.querySelector(".refresh-arrow");
        if (arrowElement) {
          arrowElement.setAttribute("style", `transform: rotate(${rotation}deg)`);
        }
      }
    } else {
      // If scrolling up, or not at the top, or horizontal scroll detected, cancel pull-to-refresh
      isPotentialPullToRefresh.current = false;
      if (refreshIndicatorRef.current) {
          refreshIndicatorRef.current.style.opacity = '0';
          refreshIndicatorRef.current.style.transform = `translateY(0px)`;
      }
    }
  }, [refreshThreshold]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const wasPotentialPull = isPotentialPullToRefresh.current;
    const currentPullDistance = pullDistanceDisplay.current;

    // Reset states immediately
    isPotentialPullToRefresh.current = false;
    pullDistanceDisplay.current = 0;

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

    if (wasPotentialPull && currentPullDistance >= refreshThreshold) {
      triggerRefresh();
    } else if (touchStartInfo.current) {
      // This was not a pull-to-refresh, check if it was a tap for a card
      // The tap handling will be managed by SwipeableTableCard's own touchend
    }
    touchStartInfo.current = null; // Clear touch start info
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
      style={{ touchAction: 'pan-y' }} // Prioritize vertical scrolling
    >
      <div
        ref={refreshIndicatorRef}
        className="absolute top-[-64px] left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10 opacity-0" // Positioned above the view
        style={{ transform: 'translateY(0px)'}}
      >
        {isRefreshing ? (
          <div className="flex flex-col items-center p-2 bg-black/70 rounded-lg">
            <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
            <span className="text-xs text-cyan-500 mt-1">Refreshing...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center p-2 bg-black/70 rounded-lg">
            <ArrowDown className="h-5 w-5 text-cyan-500 refresh-arrow transition-transform duration-200" />
            <span className="text-xs text-cyan-500 mt-1">
              {pullDistanceDisplay.current >= refreshThreshold ? "Release" : "Pull"}
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
                // The tap vs scroll differentiation will be handled within SwipeableTableCard
                onTableClick(table.id);
              }}
              onAddTime={onAddTime}
              onEndSession={onEndSession}
              canEndSession={canEndSession}
              canAddTime={canAddTime}
              showAnimations={showAnimations}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {/* ... no changes to this fallback UI ... */}
            <div className="text-[#00FFFF] opacity-70 mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white/70 text-sm">No tables available</p>
            <button
              onClick={triggerRefresh}
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
