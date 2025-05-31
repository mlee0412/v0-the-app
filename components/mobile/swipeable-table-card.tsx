"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { TableCard } from "@/components/tables/table-card";
import { Clock, X } from "lucide-react";
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard";
import { hapticFeedback } from "@/utils/haptic-feedback";

interface SwipeableTableCardProps {
  table: Table;
  servers: Server[];
  logs: LogEntry[];
  onClick: () => void;
  onAddTime: (tableId: number) => void;
  onEndSession: (tableId: number) => void;
  canEndSession: boolean;
  canAddTime: boolean;
  className?: string;
  showAnimations?: boolean;
}

// Tuned thresholds for better gesture differentiation on mobile
const TAP_MAX_MOVEMENT = 8; // Pixels: Max movement for a tap (reduced for sensitivity)
const TAP_MAX_DURATION = 200; // Milliseconds: Max duration for a tap (reduced)
const HORIZONTAL_SWIPE_INITIATION_THRESHOLD = 15; // Pixels: Min X movement to consider initiating a horizontal swipe
const VERTICAL_SCROLL_PRIORITY_THRESHOLD = 10; // Pixels: If Y movement exceeds this and is dominant, it's a vertical scroll
const SWIPE_ACTION_TRIGGER_THRESHOLD = 70; // Pixels: How far the card needs to be visually swiped to trigger action

export function SwipeableTableCard({
  table,
  servers,
  logs,
  onClick,
  onAddTime,
  onEndSession,
  canEndSession,
  canAddTime,
  className = "",
  showAnimations = true,
}: SwipeableTableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartDetails = useRef<{ x: number; y: number; time: number; } | null>(null);
  // gestureType helps distinguish between tap, horizontal swipe, and vertical scroll
  const gestureType = useRef<"tap" | "horizontal_swipe" | "vertical_scroll" | "multi_touch" | null>(null);
  
  const swipeHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (table.isActive && (canEndSession || canAddTime) && showAnimations) {
      swipeHintTimeoutRef.current = setTimeout(() => {
        setShowSwipeHint(true);
        setTimeout(() => setShowSwipeHint(false), 2000); // Hint disappears after 2s
      }, 1500); // Show hint after 1.5s of inactivity on an active card
    }
    return () => {
      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    };
  }, [table.isActive, canEndSession, canAddTime, showAnimations]);

  const resetGestureState = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease-out'; // Smooth transition back
    }
    setSwipeOffset(0);
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartDetails.current = null;
    gestureType.current = null; // Reset gesture type
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      gestureType.current = "multi_touch"; // Handle multi-touch separately if needed
      return;
    }
    touchStartDetails.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    gestureType.current = null; // Reset on new touch
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'; // No transition during active drag/swipe
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current || e.touches.length > 1 || gestureType.current === "multi_touch") return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartDetails.current.x;
    const deltaY = currentY - touchStartDetails.current.y;

    // *** MODIFICATION: Improved gesture determination logic ***
    if (gestureType.current === null) { // Determine gesture type only once per touch sequence
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > VERTICAL_SCROLL_PRIORITY_THRESHOLD) {
        // If vertical movement is dominant and exceeds threshold, it's a vertical scroll.
        gestureType.current = "vertical_scroll";
      } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > HORIZONTAL_SWIPE_INITIATION_THRESHOLD) {
        // If horizontal movement is dominant and exceeds its threshold, it's a horizontal swipe.
        gestureType.current = "horizontal_swipe";
      }
      // If neither, gestureType remains null (could be a tap or very small movement).
    }

    if (gestureType.current === "horizontal_swipe") {
      e.preventDefault(); // *** CRITICAL: Only prevent default for confirmed horizontal swipes on the card. ***
                          // This allows vertical scrolling on the parent list.
      const resistance = 0.6;
      let newOffset = deltaX * resistance;

      if (table.isActive) {
        const canShowLeft = canEndSession && newOffset < 0;
        const canShowRight = canAddTime && newOffset > 0;

        // Restrict swipe if action not allowed for that direction
        if ((newOffset < 0 && !canShowLeft) || (newOffset > 0 && !canShowRight)) {
          newOffset = newOffset * 0.2; // Heavily resist swipe if action not allowed
        }
        setSwipeOffset(newOffset);

        // Determine if action indicators should be shown based on swipe distance
        const leftThresholdActive = canShowLeft && Math.abs(newOffset) > SWIPE_ACTION_TRIGGER_THRESHOLD / 2;
        const rightThresholdActive = canShowRight && newOffset > SWIPE_ACTION_TRIGGER_THRESHOLD / 2;

        if (leftThresholdActive !== showLeftAction && leftThresholdActive) hapticFeedback.light();
        if (rightThresholdActive !== showRightAction && rightThresholdActive) hapticFeedback.light();
        
        setShowLeftAction(leftThresholdActive);
        setShowRightAction(rightThresholdActive);
      } else {
        setSwipeOffset(0); // No swipe on inactive tables
      }
    } else if (gestureType.current === "vertical_scroll") {
      // If it's a vertical scroll, reset any horizontal swipe state for this card
      if (swipeOffset !== 0) setSwipeOffset(0);
      if (showLeftAction) setShowLeftAction(false);
      if (showRightAction) setShowRightAction(false);
      // Do NOT call e.preventDefault() here, let the parent list scroll.
    }
    // If gestureType is still null, it's likely a tap or very small movement.
    // No preventDefault here either, to allow tap or parent scroll.
  }, [table.isActive, canEndSession, canAddTime, showLeftAction, showRightAction, swipeOffset]); // Added swipeOffset

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const startDetails = touchStartDetails.current;
    const currentGesture = gestureType.current; // Use the determined gesture type
    const currentSwipeOffset = swipeOffset;   // Use the current state of swipeOffset

    resetGestureState(); // Visually snaps back and clears refs

    if (!startDetails || currentGesture === "multi_touch") return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startDetails.x;
    const deltaY = endY - startDetails.y;
    const duration = Date.now() - startDetails.time;

    // *** MODIFICATION: Refined Tap Detection ***
    // A gesture is a tap if:
    // 1. It was not identified as a vertical scroll.
    // 2. It was not identified as a horizontal swipe.
    // 3. The total movement (both X and Y) was minimal.
    // 4. The touch duration was short.
    const isTap =
      currentGesture === null && // Gesture type remained undetermined (i.e., not clearly swipe or scroll)
      Math.abs(deltaX) < TAP_MAX_MOVEMENT &&
      Math.abs(deltaY) < TAP_MAX_MOVEMENT &&
      duration < TAP_MAX_DURATION;

    if (isTap) {
      hapticFeedback.selection();
      onClick(); // This is the prop that opens the dialog
      return;
    }

    // Horizontal SWIPE ACTION detection:
    // Only trigger if it was confirmed as a horizontal swipe during touchMove
    if (currentGesture === "horizontal_swipe") {
      const velocity = Math.abs(deltaX) / Math.max(duration, 1); // Avoid division by zero
      const isActionTriggered = Math.abs(currentSwipeOffset) > SWIPE_ACTION_TRIGGER_THRESHOLD || (velocity > 0.3 && Math.abs(deltaX) > SWIPE_ACTION_TRIGGER_THRESHOLD / 1.5);

      if (isActionTriggered) {
        if (currentSwipeOffset < 0 && table.isActive && canEndSession) {
          hapticFeedback.strong();
          onEndSession(table.id);
        } else if (currentSwipeOffset > 0 && table.isActive && canAddTime) {
          hapticFeedback.success();
          onAddTime(table.id);
        }
      } else {
        // Swipe didn't meet threshold for action
        hapticFeedback.light();
      }
    }
    // If gestureType was "vertical_scroll", do nothing here, parent handled scroll.
  }, [table.id, table.isActive, canEndSession, canAddTime, onClick, onEndSession, onAddTime, resetGestureState, swipeOffset]); // Added swipeOffset and resetGestureState

  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }} // Crucial: Allows vertical scrolling by default for the list
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action Indicators (UI remains largely the same) */}
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${swipeOffset < -SWIPE_ACTION_TRIGGER_THRESHOLD / 3 ? Math.max(0, swipeOffset + SWIPE_ACTION_TRIGGER_THRESHOLD / 1.8) : -SWIPE_ACTION_TRIGGER_THRESHOLD / 1.5 }px)` }}
        >
          <div className="flex flex-col items-center pointer-events-none">
            <X size={24} /> <span className="text-xs mt-1">End</span>
          </div>
        </div>
      )}
      {table.isActive && canAddTime && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-green-600 to-green-500 text-white z-0 rounded-r-lg transition-opacity duration-200 ${
            showRightAction && swipeOffset > 0 ? "opacity-100" : "opacity-0"
          }`}
           style={{ transform: `translateX(${swipeOffset > SWIPE_ACTION_TRIGGER_THRESHOLD / 3 ? Math.min(0, swipeOffset - SWIPE_ACTION_TRIGGER_THRESHOLD / 1.8) : SWIPE_ACTION_TRIGGER_THRESHOLD / 1.5 }px)` }}
        >
          <div className="flex flex-col items-center pointer-events-none">
            <Clock size={24} /> <span className="text-xs mt-1">Add Time</span>
          </div>
        </div>
      )}

      {/* Swipe Hint (UI remains the same) */}
      {showSwipeHint && table.isActive && showAnimations && (
         <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs animate-pulse">
            {canAddTime && canEndSession ? "Swipe card for actions" : canAddTime ? "Swipe right to add time" : canEndSession ? "Swipe left to end" : ""}
          </div>
        </div>
      )}
      <div
        ref={cardRef}
        className="relative z-10 rounded-lg shadow-lg"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          // transition is managed by JS: 'none' during swipe, 'transform 0.3s ease-out' on reset
        }}
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs} // Assuming logs are already filtered for this table by parent if necessary
          onClick={onClick} // This onClick is now more reliably a "tap"
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default SwipeableTableCard;
