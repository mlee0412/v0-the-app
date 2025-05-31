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

const TAP_MAX_MOVEMENT = 10; // Max pixels moved for it to be considered a tap
const TAP_MAX_DURATION = 250; // Max ms for a tap
const SWIPE_ACTION_THRESHOLD = 60;
const VERTICAL_SCROLL_LOCK_THRESHOLD = 10; // How much Y movement before we decide it's a vertical scroll

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
  const touchStartDetails = useRef<{ x: number; y: number; time: number; scrollY: number } | null>(null);
  const gestureType = useRef<"tap" | "horizontal_swipe" | "vertical_scroll" | null>(null);
  
  const swipeHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show swipe hint logic (same as before)
    if (table.isActive && (canEndSession || canAddTime) && showAnimations) {
      swipeHintTimeoutRef.current = setTimeout(() => {
        setShowSwipeHint(true);
        setTimeout(() => setShowSwipeHint(false), 2000);
      }, 500);
    }
    return () => {
      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    };
  }, [table.isActive, canEndSession, canAddTime, showAnimations]);

  const resetGestureState = useCallback(() => {
    setSwipeOffset(0);
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartDetails.current = null;
    gestureType.current = null;
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease-out';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    // Record initial scroll position of the window/document
    touchStartDetails.current = { 
      x: e.touches[0].clientX, 
      y: e.touches[0].clientY, 
      time: Date.now(),
      scrollY: window.scrollY 
    };
    gestureType.current = null; // Reset gesture type
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'; // Allow direct manipulation during swipe
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartDetails.current.x;
    const deltaY = currentY - touchStartDetails.current.y;

    if (gestureType.current === null) { // Determine gesture type if not already set
      if (Math.abs(deltaY) > VERTICAL_SCROLL_LOCK_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        gestureType.current = "vertical_scroll";
      } else if (Math.abs(deltaX) > TAP_MAX_MOVEMENT) {
        gestureType.current = "horizontal_swipe";
      }
      // If still null, it's potentially a tap or very small movement
    }

    if (gestureType.current === "horizontal_swipe") {
      e.preventDefault(); // Prevent page scroll if we are swiping horizontally on the card
      const resistance = 0.6;
      const newOffset = deltaX * resistance;
      setSwipeOffset(newOffset);

      if (table.isActive) {
        const canShowLeft = canEndSession && newOffset < 0;
        const canShowRight = canAddTime && newOffset > 0;
        const leftThresholdActive = canShowLeft && Math.abs(newOffset) > SWIPE_ACTION_THRESHOLD / 2;
        const rightThresholdActive = canShowRight && newOffset > SWIPE_ACTION_THRESHOLD / 2;

        if (leftThresholdActive !== showLeftAction && leftThresholdActive) hapticFeedback.light();
        if (rightThresholdActive !== showRightAction && rightThresholdActive) hapticFeedback.light();
        
        setShowLeftAction(leftThresholdActive);
        setShowRightAction(rightThresholdActive);
        
        if (!canShowLeft && newOffset < 0) setSwipeOffset(0);
        if (!canShowRight && newOffset > 0) setSwipeOffset(0);
      } else {
        setSwipeOffset(0);
      }
    } else if (gestureType.current === "vertical_scroll") {
      // If it's a vertical scroll, we don't want to hold onto touchStartDetails
      // as it might interfere with the parent's scroll end detection.
      // However, we should NOT reset swipeOffset here, let parent handle scroll.
      // The key is to just not process this as a tap or horizontal swipe in touchend.
      return;
    }
  }, [table.isActive, canEndSession, canAddTime, showLeftAction, showRightAction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const startDetails = touchStartDetails.current; // Capture before reset
    const currentGesture = gestureType.current; // Capture before reset
    const currentSwipeOffset = swipeOffset; // Capture before reset

    // Reset visual swipe state smoothly
    if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
    }
    setSwipeOffset(0); // Snap back
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartDetails.current = null; // Important: clear start details
    gestureType.current = null;


    if (!startDetails) return; // Touch was likely handled as a parent scroll

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY; // Use changedTouches for end coordinates

    const deltaX = endX - startDetails.x;
    const deltaY = endY - startDetails.y;
    const duration = Date.now() - startDetails.time;

    // Check if the main document scrolled significantly during this touch
    const documentScrolledSignificantly = Math.abs(window.scrollY - startDetails.scrollY) > (TAP_MAX_MOVEMENT * 2);

    // TAP detection:
    // Must NOT be a clear vertical scroll, NOT a clear horizontal swipe,
    // AND minimal movement, AND short duration, AND document didn't scroll much
    if (
      currentGesture !== "vertical_scroll" && 
      currentGesture !== "horizontal_swipe" &&
      Math.abs(deltaX) < TAP_MAX_MOVEMENT && 
      Math.abs(deltaY) < TAP_MAX_MOVEMENT && 
      duration < TAP_MAX_DURATION &&
      !documentScrolledSignificantly 
    ) {
      hapticFeedback.selection();
      onClick(); // This is the prop passed from EnhancedMobileTableList
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
        } else if (currentSwipeOffset > 0 && table.isActive && canAddTime) {
          hapticFeedback.success();
          onAddTime(table.id);
        }
      } else {
        hapticFeedback.light();
      }
    }
  }, [table.id, table.isActive, canEndSession, canAddTime, onClick, onEndSession, onAddTime, swipeOffset]);


  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }} // Allow vertical scroll, horizontal will be managed by component
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action Indicators (same as before) */}
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${Math.max(0, swipeOffset + SWIPE_ACTION_THRESHOLD / 1.5)}px)` }}
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
          style={{ transform: `translateX(${Math.min(0, swipeOffset - SWIPE_ACTION_THRESHOLD / 1.5)}px)` }}
        >
          <div className="flex flex-col items-center pointer-events-none">
            <Clock size={24} /> <span className="text-xs mt-1">Add Time</span>
          </div>
        </div>
      )}

      {showSwipeHint && table.isActive && showAnimations && (
         <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs animate-pulse">
            {canAddTime && canEndSession ? "Swipe card for actions" : canAddTime ? "Swipe right to add time" : canEndSession ? "Swipe left to end" : ""}
          </div>
        </div>
      )}
      <div
        ref={cardRef}
        className="relative z-10 touch-action-none rounded-lg shadow-lg" // touch-action-none here to prevent interference if horizontal swipe is active
        style={{
          transform: `translateX(${swipeOffset}px)`,
          // transition managed by ref for active swipe, then reset in touchend
        }}
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs}
          onClick={onClick} 
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default SwipeableTableCard;
