"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { TableCard } from "@/components/table-card"
import { Clock, X } from "lucide-react"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

interface SwipeableTableCardProps {
  table: Table
  servers: Server[]
  logs: LogEntry[]
  onClick: () => void
  onAddTime?: (tableId: number) => void
  onEndSession?: (tableId: number) => void
  canEndSession: boolean
  canAddTime: boolean
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
}: SwipeableTableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showLeftIndicator, setShowLeftIndicator] = useState(false)
  const [showRightIndicator, setShowRightIndicator] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset indicators when table changes
  useEffect(() => {
    setSwipeOffset(0)
    setShowLeftIndicator(false)
    setShowRightIndicator(false)
  }, [table.id])

  // Show swipe indicators briefly when component mounts
  useEffect(() => {
    if (table.isActive) {
      if (canEndSession) {
        setShowLeftIndicator(true)
      }
      if (canAddTime) {
        setShowRightIndicator(true)
      }

      const timer = setTimeout(() => {
        setShowLeftIndicator(false)
        setShowRightIndicator(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [table.isActive, canEndSession, canAddTime])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!table.isActive) return // Only allow swiping on active tables

    startX.current = e.touches[0].clientX
    currentX.current = startX.current
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !table.isActive) return

    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Limit swipe distance and only allow appropriate actions
    if ((diff < 0 && canEndSession) || (diff > 0 && canAddTime)) {
      // Apply resistance as we get further from center
      const resistance = Math.abs(diff) > 50 ? 0.2 : 0.8
      setSwipeOffset(diff * resistance)
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping || !table.isActive) return

    setIsSwiping(false)

    // Threshold for triggering action
    const threshold = 80

    if (swipeOffset < -threshold && canEndSession) {
      // Swiped left - end session
      if (onEndSession) {
        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([20, 30, 40])
        }
        onEndSession(table.id)
      }
    } else if (swipeOffset > threshold && canAddTime) {
      // Swiped right - add time
      if (onAddTime) {
        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(15)
        }
        onAddTime(table.id)
      }
    }

    // Reset position with animation
    setSwipeOffset(0)
  }

  return (
    <div className="swipe-action-container relative" ref={cardRef}>
      {/* Left action (End Session) */}
      {table.isActive && canEndSession && (
        <div className="swipe-action-left">
          <X size={24} />
        </div>
      )}

      {/* Right action (Add Time) */}
      {table.isActive && canAddTime && (
        <div className="swipe-action-right">
          <Clock size={24} />
        </div>
      )}

      {/* Swipe indicators */}
      {showLeftIndicator && table.isActive && canEndSession && (
        <div className="swipe-indicator left visible">
          <X size={16} />
        </div>
      )}

      {showRightIndicator && table.isActive && canAddTime && (
        <div className="swipe-indicator right visible">
          <Clock size={16} />
        </div>
      )}

      {/* Card content */}
      <div
        className="swipe-action-content"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <TableCard table={table} servers={servers} logs={logs} onClick={onClick} />
      </div>
    </div>
  )
}
