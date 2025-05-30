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
  showAnimations?: boolean; // Added prop
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
  showAnimations = true, // Default value
}: SwipeableTableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingHorizontal, setIsSwipingHorizontal] = useState(false); // Differentiate horizontal swipe
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartCoords = useRef<{ x: number; y: number } | null>(null);
  const currentXRef = useRef(0); // Only for horizontal tracking
  const startTimeRef = useRef(0);
  const swipeThreshold = 60; // Slightly reduced threshold for easier activation
  const verticalScrollThreshold = 10; // Pixels to move vertically before considering it a scroll
  const tapMaxMovement = 10; // Max pixels moved for it to be considered a tap
  const tapMaxDuration = 200; // Max ms for a tap

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
    setIsSwipingHorizontal(false);
    setShowLeftAction(false);
    setShowRightAction(false);
    touchStartCoords.current = null;
    currentXRef.current = 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return; // Ignore multi-touch
    touchStartCoords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    currentXRef.current = e.touches[0].clientX; // Initialize currentXRef
    startTimeRef.current = Date.now();
    setIsSwipingHorizontal(false); // Reset horizontal swipe state
    //setShowSwipeHint(false); // Hide hint on any touch start
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartCoords.current || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartCoords.current.x;
    const deltaY = currentY - touchStartCoords.current.y;

    if (!isSwipingHorizontal) { // If not already determined to be a horizontal swipe
      if (Math.abs(deltaY) > verticalScrollThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
        // It's primarily a vertical scroll, release control for native scrolling
        touchStartCoords.current = null; // Invalidate current swipe attempt
        return;
      }
      if (Math.abs(deltaX) > tapMaxMovement) { // Moved enough horizontally to be a swipe
        setIsSwipingHorizontal(true);
      }
    }

    if (isSwipingHorizontal) {
      e.preventDefault(); // Prevent vertical scroll if we are swiping horizontally
      currentXRef.current = currentX; // Update currentXRef for handleTouchEnd
      const resistance = 0.5;
      const newOffset = deltaX * resistance;

      if (table.isActive) {
        if (canEndSession && newOffset < 0) { // Swiping left
          setSwipeOffset(newOffset);
          const isThresholdActive = Math.abs(newOffset) > swipeThreshold / 2;
          if (isThresholdActive !== showLeftAction && isThresholdActive) hapticFeedback.light();
          setShowLeftAction(isThresholdActive);
          setShowRightAction(false);
        } else if (canAddTime && newOffset > 0) { // Swiping right
          setSwipeOffset(newOffset);
          const isThresholdActive = newOffset > swipeThreshold / 2;
          if (isThresholdActive !== showRightAction && isThresholdActive) hapticFeedback.light();
          setShowRightAction(isThresholdActive);
          setShowLeftAction(false);
        } else {
           setSwipeOffset(0); // Don't allow swipe if permission is missing for that direction
           setShowLeftAction(false);
           setShowRightAction(false);
        }
      }
    }
  }, [table.isActive, canEndSession, canAddTime, swipeThreshold, verticalScrollThreshold, tapMaxMovement, showLeftAction, showRightAction, isSwipingHorizontal]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartCoords.current) { // If invalidated (e.g., due to vertical scroll)
      resetSwipeState();
      return;
    }

    const deltaX = currentXRef.current - touchStartCoords.current.x;
    const deltaY = touchStartCoords.current.y - (touchStartCoords.current.y + (currentXRef.current - touchStartCoords.current.x)); // Re-calculate deltaY if needed, or just use X
    const duration = Date.now() - startTimeRef.current;

    const isHorizontalSwipe = isSwipingHorizontal; // Capture state before reset
    const currentSwipeOffset = swipeOffset; // Capture before reset

    resetSwipeState(); // Reset visually first

    if (Math.abs(deltaX) < tapMaxMovement && Math.abs(deltaY) < tapMaxMovement && duration < tapMaxDuration) {
      hapticFeedback.selection();
      onClick();
      return;
    }

    if (isHorizontalSwipe) {
      const velocity = Math.abs(deltaX) / duration;
      const isActionTriggered = Math.abs(currentSwipeOffset) > swipeThreshold || velocity > 0.4;


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
  }, [table.id, table.isActive, canEndSession, canAddTime, onClick, onEndSession, onAddTime, resetSwipeState, swipeThreshold, tapMaxMovement, tapMaxDuration, isSwipingHorizontal, swipeOffset]);


  // Desktop mouse events for testing (simplified, no vertical scroll consideration here)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined' || !('ontouchstart' in window)) { // Only add mouse if not a touch device
        const onMouseDown = (e: MouseEvent) => {
            touchStartCoords.current = { x: e.clientX, y: e.clientY };
            currentXRef.current = e.clientX;
            startTimeRef.current = Date.now();
            setIsSwipingHorizontal(true); // Assume horizontal for mouse
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!touchStartCoords.current || !isSwipingHorizontal) return;
            const deltaX = e.clientX - touchStartCoords.current.x;
            currentXRef.current = e.clientX;
            setSwipeOffset(deltaX * 0.5); // Apply resistance
             if (table.isActive) {
                setShowLeftAction(canEndSession && deltaX < -swipeThreshold / 2);
                setShowRightAction(canAddTime && deltaX > swipeThreshold / 2);
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!touchStartCoords.current) return;

            const deltaX = e.clientX - touchStartCoords.current.x;
            const duration = Date.now() - startTimeRef.current;

            if (Math.abs(deltaX) < tapMaxMovement && duration < tapMaxDuration) {
                onClick();
            } else if (isSwipingHorizontal && Math.abs(swipeOffset) > swipeThreshold / 2) {
                 if (swipeOffset < 0 && table.isActive && canEndSession) onEndSession(table.id);
                 else if (swipeOffset > 0 && table.isActive && canAddTime) onAddTime(table.id);
            }
            resetSwipeState();
        };
        el.addEventListener('mousedown', onMouseDown);
        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
  }, [onClick, onAddTime, onEndSession, resetSwipeState, table.isActive, canAddTime, canEndSession, swipeThreshold, tapMaxMovement, tapMaxDuration, isSwipingHorizontal, swipeOffset]); // Added isSwipingHorizontal and swipeOffset

  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }} // Allow vertical scroll by default
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0" // Changed for smoother visual cue
          }`}
          style={{ transform: `translateX(${Math.max(0, swipeOffset + swipeThreshold/1.5)}px)` }} // Follow gesture slightly
        >
          <div className="flex flex-col items-center">
            <X size={24} />
            <span className="text-xs mt-1">End</span>
          </div>
        </div>
      )}

      {table.isActive && canAddTime && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-green-600 to-green-500 text-white z-0 rounded-r-lg transition-opacity duration-200 ${
            showRightAction && swipeOffset > 0 ? "opacity-100" : "opacity-0" // Changed for smoother visual cue
          }`}
          style={{ transform: `translateX(${Math.min(0, swipeOffset - swipeThreshold/1.5)}px)` }} // Follow gesture slightly
        >
          <div className="flex flex-col items-center">
            <Clock size={24} />
            <span className="text-xs mt-1">Add Time</span>
          </div>
        </div>
      )}

      {showSwipeHint && table.isActive && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm animate-pulse">
            {canAddTime && canEndSession
              ? "Swipe right to add time, left to end"
              : canAddTime
              ? "Swipe right to add time"
              : canEndSession ? "Swipe left to end session" : ""}
          </div>
        </div>
      )}

      <div
        className="relative z-10 touch-action-none rounded-lg shadow-lg" // Ensure this is above action indicators
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipingHorizontal ? "none" : "transform 0.3s ease-out",
        }}
        // onClick={onClick} // Main click handled by touch/mouse end logic for tap detection
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs}
          onClick={onClick} // Pass original onClick for accessibility/fallback
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default SwipeableTableCard;
