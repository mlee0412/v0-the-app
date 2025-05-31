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

  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const isAttemptingPullToRefresh = useRef(false);
  const pullDistanceVisual = useRef(0);
  const refreshThreshold = 70; // Pixels to pull down for refresh action

  const lastUpdateTime = useRef(Date.now());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Update localTables when the tables prop changes
  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  // Subscribe to table store updates for real-time changes within the list
  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      const tableIds = tables.map((t) => t.id); // Use IDs from the initial prop
      const storeStateTables = state.tables;
      const updatedTablesFromStore = tableIds.map((id) => {
        const storeTableData = storeStateTables[id];
        const originalTableData = tables.find((t) => t.id === id) || {} as Table; // Fallback to original or empty

        // Merge, prioritizing store data for fields it manages, but keep original structure
        if (storeTableData) {
          return {
            ...originalTableData, // Keep all original fields
            id: storeTableData.id || originalTableData.id,
            name: storeTableData.name || originalTableData.name,
            isActive: typeof storeTableData.is_active === 'boolean' ? storeTableData.is_active : originalTableData.isActive,
            startTime: storeTableData.start_time_data ? new Date(storeTableData.start_time_data).getTime() : originalTableData.startTime,
            // Ensure remainingTime and initialTime are numbers
            remainingTime: typeof storeTableData.remaining_time === 'number' ? storeTableData.remaining_time : (typeof originalTableData.remainingTime === 'number' ? originalTableData.remainingTime : 0),
            initialTime: typeof storeTableData.initial_time === 'number' ? storeTableData.initial_time : (typeof originalTableData.initialTime === 'number' ? originalTableData.initialTime : 0),
            guestCount: typeof storeTableData.guest_count === 'number' ? storeTableData.guest_count : originalTableData.guestCount,
            server: storeTableData.server_id !== undefined ? String(storeTableData.server_id) : originalTableData.server,
            groupId: storeTableData.table_group_id !== undefined ? String(storeTableData.table_group_id) : originalTableData.groupId,
            // Keep UI-specific fields from original data if not in store
            hasNotes: originalTableData.hasNotes,
            noteId: originalTableData.noteId,
            noteText: originalTableData.noteText,
            updatedAt: storeTableData.updated_at || originalTableData.updatedAt || new Date().toISOString(),
          } as Table;
        }
        return originalTableData; // Fallback to original table data if not in store
      });

      // Only update if there's a meaningful change to avoid unnecessary re-renders
      if (JSON.stringify(updatedTablesFromStore) !== JSON.stringify(localTables)) {
        setLocalTables(updatedTablesFromStore);
      }
    });
    return () => unsubscribe();
  }, [tables, localTables]); // localTables added to deps to re-evaluate if it changes from elsewhere

  const triggerRefresh = useCallback(async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback.medium();
      try {
        await onRefresh();
        lastUpdateTime.current = Date.now();
        setLastRefreshTime(new Date()); // Update the timestamp for display
        hapticFeedback.success();
        toast({ title: "Tables refreshed", duration: 2000 });
      } catch (error) {
        hapticFeedback.error();
        toast({ title: "Refresh failed", variant: "destructive", duration: 3000 });
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, isRefreshing, toast]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1 || isRefreshing) { // Ignore multi-touch or if already refreshing
      isAttemptingPullToRefresh.current = false;
      return;
    }
    // *** MODIFICATION: Stricter condition for initiating pull-to-refresh.
    // Only consider if the user is scrolled exactly to the top.
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
      isAttemptingPullToRefresh.current = true;
      pullDistanceVisual.current = 0; // Reset visual pull distance
      if (refreshIndicatorRef.current) {
        refreshIndicatorRef.current.style.transition = 'none'; // Remove transition for direct manipulation
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

    // *** MODIFICATION: Only process and prevent default if pulling down from the very top.
    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      e.preventDefault(); // Prevent browser's native pull-to-refresh/scroll only when our refresh is active.

      const resistance = 0.5; // Makes the pull feel a bit "heavier"
      pullDistanceVisual.current = Math.min(refreshThreshold * 1.8, deltaY * resistance); // Cap visual effect

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
      // If user scrolls up, or not at the very top, or not pulling down enough, cancel the refresh attempt.
      isAttemptingPullToRefresh.current = false;
      if (refreshIndicatorRef.current && pullDistanceVisual.current > 0) { // Only transition if it was visible
        refreshIndicatorRef.current.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
        refreshIndicatorRef.current.style.opacity = '0';
        refreshIndicatorRef.current.style.transform = 'translateY(0px)';
      }
      pullDistanceVisual.current = 0; // Reset visual pull
    }
  }, [isRefreshing, refreshThreshold]);

  const handleTouchEnd = useCallback(() => {
    const wasAttemptingPull = isAttemptingPullToRefresh.current;
    const currentPullDistance = pullDistanceVisual.current;

    // Reset flags
    isAttemptingPullToRefresh.current = false;
    pullDistanceVisual.current = 0;
    touchStartRef.current = null;

    // Animate refresh indicator back
    if (refreshIndicatorRef.current) {
      refreshIndicatorRef.current.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
      refreshIndicatorRef.current.style.transform = "translateY(0)";
      refreshIndicatorRef.current.style.opacity = "0";
      // Clean up transition style after animation
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

  // Memoize sorted tables to prevent re-sorting on every render unless localTables changes.
  const filteredAndSortedTables = useMemo(() => {
    return [...localTables]
      .filter((table) => !table.name.toLowerCase().includes("system"))
      .sort((a, b) => a.id - b.id);
  }, [localTables]);

  return (
    <div
      className="relative w-full overflow-y-auto pb-20 ios-momentum-scroll"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }} // Essential for allowing vertical scroll by default.
    >
      <div
        ref={refreshIndicatorRef}
        className="absolute top-[-64px] left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10 opacity-0"
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
              {pullDistanceVisual.current >= refreshThreshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        )}
      </div>

      {lastRefreshTime && (
        <div className="text-center text-xs text-gray-400 py-2 bg-black/30 backdrop-blur-sm sticky top-0 z-20">
          Last updated: {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="space-y-4 p-4 mobile-table-card-list">
        {filteredAndSortedTables.length > 0 ? (
          filteredAndSortedTables.map((table) => (
            <SwipeableTableCard
              key={table.id}
              table={table}
              servers={servers}
              logs={logs.filter((log) => log.tableId === table.id)} // Pass only relevant logs
              onClick={() => onTableClick(table.id)}
              onAddTime={onAddTime}
              onEndSession={onEndSession}
              canEndSession={canEndSession}
              canAddTime={canAddTime}
              showAnimations={showAnimations}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-[#00FFFF] opacity-70 mb-2">
              {/* Placeholder Icon */}
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
              disabled={isRefreshing}
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
