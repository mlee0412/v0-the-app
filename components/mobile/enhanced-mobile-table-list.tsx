"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { SwipeableTableCard } from "@/components/mobile/swipeable-table-card"; // Adjusted path if necessary
const MemoizedSwipeableTableCard = memo(SwipeableTableCard);
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard";
import { useTableStore } from "@/utils/table-state-manager";
import { hapticFeedback } from "@/utils/haptic-feedback";
import { toast } from "@/hooks/use-toast"; // Assuming this is your custom toast hook
import { ArrowDown, Loader2 } from "lucide-react";

interface EnhancedMobileTableListProps {
  tables: Table[];
  servers: Server[];
  logs: LogEntry[];
  onTableClick: (tableId: number) => void;
  onAddTime: (tableId: number) => void;
  onEndSession: (tableId: number) => void;
  onOpenQuickStartDialog?: (tableId: number) => void;
  canEndSession: boolean;
  canAddTime: boolean;
  canQuickStart?: boolean;
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
  onOpenQuickStartDialog,
  canEndSession,
  canAddTime,
  canQuickStart,
  onRefresh,
  showAnimations = true,
}: EnhancedMobileTableListProps) {
  const [localTables, setLocalTables] = useState<Table[]>(tables);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);

  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const isAttemptingPullToRefresh = useRef(false);
  const pullDistanceVisual = useRef(0);
  const refreshThreshold = 70; // Pixels to pull down for refresh action

  const lastUpdateTime = useRef(Date.now());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      const tableIds = tables.map((t) => t.id);
      const storeStateTables = state.tables;
      const updatedTablesFromStore = tableIds.map((id) => {
        // Ensure the structure from the store matches the Table type
        const storeTableData = storeStateTables[id];
        if (storeTableData) {
          // Map store fields to Table fields if they differ
          return {
            id: storeTableData.id,
            name: storeTableData.name,
            isActive: storeTableData.is_active || false,
            startTime: storeTableData.start_time_data ? new Date(storeTableData.start_time_data).getTime() : null,
            remainingTime: storeTableData.remaining_time || (storeTableData.timer_minutes * 60000),
            initialTime: storeTableData.initial_time || (storeTableData.timer_minutes * 60000),
            guestCount: storeTableData.guest_count || 0,
            server: storeTableData.server_id ? String(storeTableData.server_id) : null,
            groupId: storeTableData.table_group_id ? String(storeTableData.table_group_id) : null,
            hasNotes: false, // Assuming not in basic store data
            noteId: "",      // Assuming not in basic store data
            noteText: "",    // Assuming not in basic store data
            updatedAt: new Date().toISOString(), // Or a proper updated_at from store if available
          } as Table;
        }
        return tables.find((t) => t.id === id)!;
      });

      if (JSON.stringify(updatedTablesFromStore) !== JSON.stringify(localTables)) {
        setLocalTables(updatedTablesFromStore);
      }
    });
    return () => unsubscribe();
  }, [tables, localTables]);


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
  }, [onRefresh, isRefreshing, toast]); // Added toast as dependency

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1 || isRefreshing) {
      isAttemptingPullToRefresh.current = false;
      return;
    }
    // MODIFICATION: Only consider pull-to-refresh if scrolled exactly to the top.
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
      isAttemptingPullToRefresh.current = true;
      pullDistanceVisual.current = 0;
      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transition = 'none'; // Allow direct manipulation of transform
      }
    } else {
      isAttemptingPullToRefresh.current = false;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isAttemptingPullToRefresh.current || !touchStartRef.current || e.touches.length > 1 || isRefreshing) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartRef.current.y;

    // MODIFICATION: Stricter condition, ensure it's a downward pull from the very top.
    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      e.preventDefault(); // Prevent native scroll only when actively pulling for our custom refresh

      const resistance = 0.5; // How much to resist the pull
      pullDistanceVisual.current = Math.min(refreshThreshold * 1.8, deltaY * resistance); // Cap visual pull

      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transform = `translateY(${pullDistanceVisual.current}px)`;
        refreshIndicatorRef.current.style.opacity = Math.min(1, pullDistanceVisual.current / refreshThreshold).toString();
        const arrowElement = refreshIndicatorRef.current.querySelector(".refresh-arrow") as HTMLElement;
        if (arrowElement) {
          const rotation = Math.min(180, (pullDistanceVisual.current / refreshThreshold) * 180);
          arrowElement.style.transform = `rotate(${rotation}deg)`;
        }
      }
    } else {
      // If scrolling up, or not pulling down enough, or scrolled away from top, reset the attempt.
      isAttemptingPullToRefresh.current = false;
      if (refreshIndicatorRef.current) {
        // Smoothly hide the indicator if it was partially shown
        refreshIndicatorRef.current.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
        refreshIndicatorRef.current.style.opacity = '0';
        refreshIndicatorRef.current.style.transform = 'translateY(0px)';
      }
    }
  }, [isRefreshing, refreshThreshold]);

  const handleTouchEnd = useCallback(() => {
    const wasAttemptingPull = isAttemptingPullToRefresh.current;
    const currentPullDistance = pullDistanceVisual.current;

    isAttemptingPullToRefresh.current = false;
    pullDistanceVisual.current = 0;
    touchStartRef.current = null;

    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
      refreshIndicatorRef.current.style.transform = "translateY(0)";
      refreshIndicatorRef.current.style.opacity = "0";
      // Clear transition after animation to allow direct manipulation next time
      setTimeout(() => {
        if (refreshIndicatorRef.current) {
          refreshIndicatorRef.current.style.transition = "";
        }
      }, 300);
    }

    if (wasAttemptingPull && currentPullDistance >= refreshThreshold && !isRefreshing) {
      triggerRefresh();
    }
  }, [triggerRefresh, isRefreshing, refreshThreshold]);

  const filteredAndSortedTables = useMemo(
    () =>
      [...localTables]
        .filter((table) => !table.name.toLowerCase().includes("system"))
        .sort((a, b) => a.id - b.id),
    [localTables],
  );

  return (
    <div
      className="relative w-full overflow-y-auto pb-20 ios-momentum-scroll" // Ensure class allows iOS momentum scrolling
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }} // Allows vertical panning, horizontal swipe for cards is handled by child
    >
      <div
        ref={refreshIndicatorRef}
        className="absolute top-[-64px] left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10 opacity-0"
        style={{ transform: 'translateY(0px)'}} // Initial position
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
              {/* MODIFICATION: Clearer text based on actual pull distance vs threshold */}
              {pullDistanceVisual.current >= refreshThreshold ? "Release to refresh" : "Pull to refresh"}
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
            <MemoizedSwipeableTableCard
              key={table.id}
              table={table}
              servers={servers}
              logs={logs.filter((log) => log.tableId === table.id)}
              onClick={() => onTableClick(table.id)}
              onAddTime={onAddTime}
              onOpenQuickStartDialog={onOpenQuickStartDialog}
              onEndSession={onEndSession}
              canEndSession={canEndSession}
              canAddTime={canAddTime}
              canQuickStart={canQuickStart}
              showAnimations={showAnimations}
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
              onClick={triggerRefresh}
              className="mt-4 px-4 py-2 bg-[#00FFFF]/10 text-[#00FFFF] rounded-md text-sm font-medium border border-[#00FFFF]/30"
              disabled={isRefreshing} // Disable button while refreshing
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
