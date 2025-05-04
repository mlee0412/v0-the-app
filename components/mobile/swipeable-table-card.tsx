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
  const isScrolling = useRef(false)
  const startTime = useRef(0)

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

    // Store the start time to detect taps vs swipes
    startTime.current = Date.now()

    // Reset scrolling detection
    isScrolling.current = false

    startX.current = e.touches[0].clientX
    currentX.current = startX.current
    setIsSwiping(true)

    // Prevent default to avoid iOS issues
    e.stopPropagation()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !table.isActive) return

    // Check if user is scrolling vertically
    const touchY = e.touches[0].clientY
    const touchX = e.touches[0].clientX

    // If this is primarily vertical movement, mark as scrolling and exit
    if (!isScrolling.current && Math.abs(touchY - e.touches[0].clientY) > Math.abs(touchX - startX.current)) {
      isScrolling.current = true
      return
    }

    if (isScrolling.current) return

    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Limit swipe distance and only allow appropriate actions
    if ((diff < 0 && canEndSession) || (diff > 0 && canAddTime)) {
      // Apply resistance as we get further from center
      const resistance = Math.abs(diff) > 50 ? 0.2 : 0.8
      setSwipeOffset(diff * resistance)

      // Prevent default to avoid iOS issues
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping || !table.isActive) return

    // Calculate touch duration
    const touchDuration = Date.now() - startTime.current

    setIsSwiping(false)

    // If this was a quick tap (less than 300ms) and minimal movement, treat as a click
    if (touchDuration < 300 && Math.abs(currentX.current - startX.current) < 10 && !isScrolling.current) {
      onClick()
      return
    }

    // If we were scrolling, don't trigger swipe actions
    if (isScrolling.current) {
      setSwipeOffset(0)
      return
    }

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

    // Prevent default to avoid iOS issues
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle regular click for non-touch devices
  const handleClick = (e: React.MouseEvent) => {
    if (!isSwiping) {
      onClick()
    }
  }

  return (
    <div className="swipe-action-container relative ios-touch-fix" ref={cardRef}>
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
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Table ${table.name} - Click to view details`}
      >
        <TableCard table={table} servers={servers} logs={logs} onClick={() => {}} />
      </div>
    </div>
  )
}
