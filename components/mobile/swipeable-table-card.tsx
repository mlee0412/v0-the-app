"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { throttle } from "lodash";
import { TableCard } from "@/components/tables/table-card"; // Adjusted path if necessary
import { Clock, X, ArrowLeft, ArrowRight } from "lucide-react";
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard";
import { hapticFeedback } from "@/utils/haptic-feedback";

interface SwipeableTableCardProps {
  table: Table;
  servers: Server[];
  logs: LogEntry[];
  onClick: () => void;
  onEndSession: (tableId: number) => void;
  onOpenQuickStartDialog?: (tableId: number) => void;
  canEndSession: boolean;
  canQuickStart?: boolean;
  className?: string;
  showAnimations?: boolean;
}

// MODIFICATION: Slightly reduced thresholds for more sensitivity in distinguishing tap from scroll/swipe.
// If issues persist, these can be tuned further. Start with original values if preferred.
const TAP_MAX_MOVEMENT = 8; // Max pixels moved for it to be considered a tap (was 10)
const TAP_MAX_DURATION = 200; // Max ms for a tap (was 250)
const SWIPE_ACTION_THRESHOLD = 60; // Threshold to trigger a swipe action
const VERTICAL_SCROLL_LOCK_THRESHOLD = 8; // How much Y movement before we decide it's a vertical scroll (was 10)


export function SwipeableTableCard({
  table,
  servers,
  logs,
  onClick,
  onEndSession,
  onOpenQuickStartDialog,
  canEndSession,
  canQuickStart,
  className = "",
  showAnimations = true,
}: SwipeableTableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  // Store initial touch X, Y, time, and the window's scrollY position at touch start
  const touchStartDetails = useRef<{ x: number; y: number; time: number; scrollY: number } | null>(null);
  // Determines the type of gesture being performed on this card
  const gestureType = useRef<"tap" | "horizontal_swipe" | "vertical_scroll" | null>(null);

  const swipeHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (table.isActive && canEndSession && showAnimations) {
      swipeHintTimeoutRef.current = setTimeout(() => {
        setShowSwipeHint(true);
        hapticFeedback.light();
        setTimeout(() => setShowSwipeHint(false), 2000);
      }, 500);
    }
    return () => {
      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    };
  }, [table.isActive, canEndSession, showAnimations]);

  const resetGestureState = useCallback(() => {
    setSwipeOffset(0);
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartDetails.current = null;
    gestureType.current = null;
    if (cardRef.current) {
      // Ensure smooth transition back after a swipe gesture ends
      cardRef.current.style.transition = 'transform 0.3s ease-out';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return; // Ignore multi-touch gestures
    touchStartDetails.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      scrollY: window.scrollY, // Store initial window scrollY
    };
    gestureType.current = null; // Reset gesture type for new touch
    hapticFeedback.selection();
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'; // Remove transition during active swipe for direct manipulation
    }
  }, []);

  const handleTouchMoveInternal = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartDetails.current.x;
    const deltaY = currentY - touchStartDetails.current.y;

    // Determine gesture type if not already set
    if (gestureType.current === null) {
      if (Math.abs(deltaY) > VERTICAL_SCROLL_LOCK_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        gestureType.current = "vertical_scroll";
      } else if (Math.abs(deltaX) > TAP_MAX_MOVEMENT) { // Use TAP_MAX_MOVEMENT to decide if it's not a tap
        gestureType.current = "horizontal_swipe";
      }
    }

    if (gestureType.current === "horizontal_swipe") {
      e.preventDefault(); // Prevent page scroll if we are swiping horizontally on the card
      const resistance = 0.6; // Make swipe feel a bit heavier
      const newOffset = deltaX * resistance;
      setSwipeOffset(newOffset);

      if (table.isActive) {
        const canShowLeft = canEndSession && newOffset < 0;

        const leftThresholdActive = canShowLeft && Math.abs(newOffset) > SWIPE_ACTION_THRESHOLD / 2;

        if (leftThresholdActive && !showLeftAction) hapticFeedback.light();

        setShowLeftAction(leftThresholdActive);

        // Prevent swiping further if action not allowed
        if (!canShowLeft && newOffset < 0) setSwipeOffset(0);
      } else {
        const canShowRight = canQuickStart && newOffset > 0;
        const rightThresholdInactive = canShowRight && newOffset > SWIPE_ACTION_THRESHOLD / 2;

        if (rightThresholdInactive && !showRightAction) hapticFeedback.light();

        setShowRightAction(rightThresholdInactive);

        if (!canShowRight && newOffset > 0) setSwipeOffset(0);
      }
    } else if (gestureType.current === "vertical_scroll") {
      // If it's a vertical scroll, let the parent (EnhancedMobileTableList) handle it.
      // No e.preventDefault() here for vertical scroll on card.
      return;
    }
  }, [table.isActive, canEndSession, canQuickStart, showLeftAction, showRightAction]);

  const handleTouchMove = useMemo(
    () => throttle(handleTouchMoveInternal, 16, { trailing: false }),
    [handleTouchMoveInternal],
  );

  useEffect(() => {
    return () => {
      handleTouchMove.cancel();
    };
  }, [handleTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const startDetails = touchStartDetails.current;
    const currentGesture = gestureType.current;
    const currentSwipeOffset = swipeOffset;

    // Reset visual swipe state smoothly
    if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
    }
    setSwipeOffset(0); // Snap back
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartDetails.current = null;
    gestureType.current = null;

    if (!startDetails) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startDetails.x;
    const deltaY = endY - startDetails.y;
    const duration = Date.now() - startDetails.time;

    // MODIFICATION: Removed `documentScrolledSignificantly` check.
    // Tap detection now relies on the gestureType not being identified as scroll/swipe
    // and small movement deltas on the card itself.
    if (
      currentGesture === null && // Gesture was not determined as swipe or scroll
      Math.abs(deltaX) < TAP_MAX_MOVEMENT &&
      Math.abs(deltaY) < TAP_MAX_MOVEMENT &&
      duration < TAP_MAX_DURATION
    ) {
      hapticFeedback.selection();
      onClick();
      return;
    }

    // Horizontal SWIPE ACTION detection:
    if (currentGesture === "horizontal_swipe") {
      const velocity = Math.abs(deltaX) / duration;
      const isActionTriggered = Math.abs(currentSwipeOffset) > SWIPE_ACTION_THRESHOLD || velocity > 0.3;

      if (isActionTriggered) {
        if (currentSwipeOffset < 0 && table.isActive && canEndSession) {
          hapticFeedback.strong();
          onEndSession(table.id);
        } else if (currentSwipeOffset > 0) {
          if (!table.isActive && canQuickStart && onOpenQuickStartDialog) {
            hapticFeedback.success();
            onOpenQuickStartDialog(table.id);
          }
        }
      } else {
        // If swipe was not enough to trigger action, but was a swipe
        hapticFeedback.light();
      }
    }
  }, [table.id, table.isActive, canEndSession, canQuickStart, onClick, onEndSession, onOpenQuickStartDialog, swipeOffset]);

  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }} // Allows parent vertical scroll, horizontal swipe managed here
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action Indicators */}
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0"
          }`}
          // MODIFICATION: Visual feedback adjustment for action reveal
          style={{ transform: `translateX(${swipeOffset < -SWIPE_ACTION_THRESHOLD / 3 ? Math.max(0, swipeOffset + SWIPE_ACTION_THRESHOLD / 2) : -SWIPE_ACTION_THRESHOLD / 1.2}px)` }}

        >
          <div className="flex flex-col items-center pointer-events-none">
            <X size={24} /> <span className="text-xs mt-1">End</span>
          </div>
        </div>
      )}
      {!table.isActive && canQuickStart && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-green-600 to-green-500 text-white z-0 rounded-r-lg transition-opacity duration-200 ${
            showRightAction && swipeOffset > 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${swipeOffset > SWIPE_ACTION_THRESHOLD / 3 ? Math.min(0, swipeOffset - SWIPE_ACTION_THRESHOLD / 2) : SWIPE_ACTION_THRESHOLD / 1.2}px)` }}
        >
          <div className="flex flex-col items-center pointer-events-none">
            <Clock size={24} /> <span className="text-xs mt-1">Quick Start</span>
          </div>
        </div>
      )}

      {/* Swipe Hint */}
      {showSwipeHint && table.isActive && showAnimations && (
         <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-2 animate-pulse">
            <ArrowLeft className="w-3 h-3" />
            {canEndSession ? "Swipe left" : "Swipe"}
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Table Card Content */}
      <div
        ref={cardRef}
        className="relative z-10 rounded-lg shadow-lg" // Ensure card is above action indicators
        style={{
          transform: `translateX(${swipeOffset}px)`,
          // transition will be set by resetGestureState or handleTouchStart
        }}
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs.filter(log => log.tableId === table.id)} // Pass only relevant logs
          onClick={onClick} // This onClick is now more reliably a tap
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default React.memo(SwipeableTableCard);
