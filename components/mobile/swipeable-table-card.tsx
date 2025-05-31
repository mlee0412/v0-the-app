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
  const [isActivelySwipingHorizontal, setIsActivelySwipingHorizontal] = useState(false);
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDetails = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingCard = useRef(false); // To track if a drag/swipe on THIS card is happening

  const swipeThreshold = 60;
  const tapMaxMovement = 15; // Increased slightly to be more lenient for taps
  const tapMaxDuration = 250; // Max ms for a tap
  const verticalScrollLockThreshold = 10; // Pixels Y before swipe is locked to vertical

  const swipeHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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

  const resetSwipeState = useCallback(() => {
    setSwipeOffset(0);
    setIsActivelySwipingHorizontal(false);
    setShowLeftAction(false);
    setShowRightAction(false);
    isDraggingCard.current = false;
    touchStartDetails.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    touchStartDetails.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    isDraggingCard.current = false; // Reset drag state for this card
    setIsActivelySwipingHorizontal(false); // Reset active swipe state
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartDetails.current.x;
    const deltaY = currentY - touchStartDetails.current.y;

    if (!isDraggingCard.current) { // If not already determined to be dragging this card
      if (Math.abs(deltaY) > verticalScrollLockThreshold && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        // Primarily a vertical scroll, let the parent handle it, invalidate this card's swipe
        touchStartDetails.current = null; 
        return;
      }
      if (Math.abs(deltaX) > tapMaxMovement || Math.abs(deltaY) > tapMaxMovement) {
        // Moved enough to be considered a drag/swipe, not a tap
        isDraggingCard.current = true;
        if (Math.abs(deltaX) > Math.abs(deltaY)) { // It's more horizontal
             setIsActivelySwipingHorizontal(true);
        } else { // It's more vertical, let parent scroll
            touchStartDetails.current = null;
            return;
        }
      }
    }
    
    if (isActivelySwipingHorizontal) {
      e.preventDefault(); // Prevent page scroll if we are actively swiping horizontally
      const resistance = 0.5;
      const newOffset = deltaX * resistance;
      setSwipeOffset(newOffset);

      if (table.isActive) {
        const canShowLeft = canEndSession && newOffset < 0;
        const canShowRight = canAddTime && newOffset > 0;

        const leftThresholdActive = canShowLeft && Math.abs(newOffset) > swipeThreshold / 2;
        const rightThresholdActive = canShowRight && newOffset > swipeThreshold / 2;

        if (leftThresholdActive !== showLeftAction && leftThresholdActive) hapticFeedback.light();
        if (rightThresholdActive !== showRightAction && rightThresholdActive) hapticFeedback.light();
        
        setShowLeftAction(leftThresholdActive);
        setShowRightAction(rightThresholdActive);
        
        if (!canShowLeft && newOffset < 0) setSwipeOffset(0); // Don't allow swipe if no permission
        if (!canShowRight && newOffset > 0) setSwipeOffset(0); // Don't allow swipe if no permission

      } else {
        setSwipeOffset(0); // No swipe actions for inactive tables
      }
    }
  }, [table.isActive, canEndSession, canAddTime, swipeThreshold, tapMaxMovement, verticalScrollLockThreshold, isActivelySwipingHorizontal, showLeftAction, showRightAction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current) { // Touch was invalidated (e.g., became a vertical scroll)
      resetSwipeState();
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartDetails.current.x;
    const deltaY = endY - touchStartDetails.current.y;
    const duration = Date.now() - touchStartDetails.current.time;

    const wasDraggingThisCard = isDraggingCard.current;
    const wasActivelySwipingHorizontal = isActivelySwipingHorizontal;
    const currentSwipeOffset = swipeOffset;

    resetSwipeState(); // Reset visual state immediately

    // Check for Tap: small movement and short duration
    if (!wasDraggingThisCard && Math.abs(deltaX) < tapMaxMovement && Math.abs(deltaY) < tapMaxMovement && duration < tapMaxDuration) {
      hapticFeedback.selection();
      onClick();
      return;
    }

    // Handle Swipe Action
    if (wasActivelySwipingHorizontal) {
      const velocity = Math.abs(deltaX) / duration;
      const isActionTriggered = Math.abs(currentSwipeOffset) > swipeThreshold || velocity > 0.35; // Adjusted velocity threshold

      if (isActionTriggered) {
        if (currentSwipeOffset < 0 && table.isActive && canEndSession) {
          hapticFeedback.strong();
          onEndSession(table.id);
        } else if (currentSwipeOffset > 0 && table.isActive && canAddTime) {
          hapticFeedback.success();
          onAddTime(table.id);
        }
      } else {
        hapticFeedback.light(); // Feedback for incomplete swipe
      }
    }
  }, [table.id, table.isActive, canEndSession, canAddTime, onClick, onEndSession, onAddTime, resetSwipeState, swipeThreshold, tapMaxMovement, tapMaxDuration, isActivelySwipingHorizontal, swipeOffset]);

  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${Math.max(0, swipeOffset + swipeThreshold / 1.5)}px)` }}
        >
          <div className="flex flex-col items-center">
            <X size={24} /> <span className="text-xs mt-1">End</span>
          </div>
        </div>
      )}
      {table.isActive && canAddTime && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-green-600 to-green-500 text-white z-0 rounded-r-lg transition-opacity duration-200 ${
            showRightAction && swipeOffset > 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${Math.min(0, swipeOffset - swipeThreshold / 1.5)}px)` }}
        >
          <div className="flex flex-col items-center">
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
        className="relative z-10 touch-action-none rounded-lg shadow-lg"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: !isActivelySwipingHorizontal && !isDraggingCard.current ? "transform 0.3s ease-out" : "none",
        }}
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs}
          onClick={onClick} // Still pass for accessibility/fallback
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default SwipeableTableCard;
