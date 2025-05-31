// File: billiards-timer (31)/components/mobile/swipeable-table-card.tsx
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

const TAP_MAX_MOVEMENT = 12; // Increased from 8
const TAP_MAX_DURATION = 250; // Kept original, can be tuned
const SWIPE_ACTION_THRESHOLD = 70; // Increased from 60
const VERTICAL_SCROLL_LOCK_THRESHOLD = 12; // Increased from 8


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
    touchStartDetails.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      scrollY: window.scrollY, 
    };
    gestureType.current = null; 
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'; 
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartDetails.current || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartDetails.current.x;
    const deltaY = currentY - touchStartDetails.current.y;

    if (gestureType.current === null) {
      if (Math.abs(deltaY) > VERTICAL_SCROLL_LOCK_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        gestureType.current = "vertical_scroll";
      } else if (Math.abs(deltaX) > TAP_MAX_MOVEMENT) { 
        gestureType.current = "horizontal_swipe";
      }
    }

    if (gestureType.current === "horizontal_swipe") {
      e.preventDefault(); 
      const resistance = 0.6; 
      const newOffset = deltaX * resistance;
      setSwipeOffset(newOffset);

      if (table.isActive) {
        const canShowLeft = canEndSession && newOffset < 0;
        const canShowRight = canAddTime && newOffset > 0;

        const leftThresholdActive = canShowLeft && Math.abs(newOffset) > SWIPE_ACTION_THRESHOLD / 2;
        const rightThresholdActive = canShowRight && newOffset > SWIPE_ACTION_THRESHOLD / 2;

        if (leftThresholdActive && !showLeftAction) hapticFeedback.light();
        if (rightThresholdActive && !showRightAction) hapticFeedback.light();
        
        setShowLeftAction(leftThresholdActive);
        setShowRightAction(rightThresholdActive);
        
        if (!canShowLeft && newOffset < 0) setSwipeOffset(0);
        if (!canShowRight && newOffset > 0) setSwipeOffset(0);
      } else {
        setSwipeOffset(0); 
      }
    } else if (gestureType.current === "vertical_scroll") {
      return;
    }
  }, [table.isActive, canEndSession, canAddTime, showLeftAction, showRightAction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const startDetails = touchStartDetails.current;
    const currentGesture = gestureType.current;
    const currentSwipeOffset = swipeOffset;

    if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
    }
    setSwipeOffset(0); 
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

    if (
      currentGesture === null && 
      Math.abs(deltaX) < TAP_MAX_MOVEMENT &&
      Math.abs(deltaY) < TAP_MAX_MOVEMENT &&
      duration < TAP_MAX_DURATION
    ) {
      hapticFeedback.selection();
      onClick();
      return;
    }

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
      style={{ touchAction: "pan-y" }} 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-0 rounded-l-lg transition-opacity duration-200 ${
            showLeftAction && swipeOffset < 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateX(${swipeOffset < -SWIPE_ACTION_THRESHOLD / 3 ? Math.max(0, swipeOffset + SWIPE_ACTION_THRESHOLD / 2) : -SWIPE_ACTION_THRESHOLD / 1.2}px)` }}
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
          style={{ transform: `translateX(${swipeOffset > SWIPE_ACTION_THRESHOLD / 3 ? Math.min(0, swipeOffset - SWIPE_ACTION_THRESHOLD / 2) : SWIPE_ACTION_THRESHOLD / 1.2}px)` }}
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
        className="relative z-10 rounded-lg shadow-lg" 
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        <TableCard
          table={table}
          servers={servers}
          logs={logs.filter(log => log.tableId === table.id)} 
          onClick={onClick} 
          showAnimations={showAnimations}
        />
      </div>
    </div>
  );
}

export default SwipeableTableCard;
