"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { TableCard } from "@/components/table-card"
import { Clock, X } from "lucide-react"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

interface SwipeableTableCardProps {
  table: Table
  servers: Server[]
  logs: LogEntry[]
  onClick: () => void
  onAddTime: (tableId: number) => void
  onEndSession: (tableId: number) => void
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
  const [showLeftAction, setShowLeftAction] = useState(false)
  const [showRightAction, setShowRightAction] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const startTimeRef = useRef(0)
  const swipeThreshold = 80 // Minimum distance to trigger action
  const isSwipingRef = useRef(false)
  const touchStartedRef = useRef(false)

  // Reset swipe state
  const resetSwipe = useCallback(() => {
    setSwipeOffset(0)
    setIsSwiping(false)
    isSwipingRef.current = false
    setShowLeftAction(false)
    setShowRightAction(false)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Store the initial touch position
    startXRef.current = e.touches[0].clientX
    currentXRef.current = e.touches[0].clientX
    startTimeRef.current = Date.now()
    touchStartedRef.current = true
    setIsSwiping(true)
    isSwipingRef.current = true
  }, [])

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartedRef.current) return

      // Update current position
      currentXRef.current = e.touches[0].clientX

      // Calculate swipe distance
      const distance = currentXRef.current - startXRef.current

      // Update swipe offset with some resistance for better feel
      const resistance = 0.5
      const newOffset = distance * resistance

      // Only allow swiping if the table is active and the appropriate permission exists
      if (table.isActive && canEndSession && distance < 0) {
        // Left swipe (end session)
        setSwipeOffset(newOffset)
        setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
      } else if (table.isActive && canAddTime && distance > 0) {
        // Right swipe (add time)
        setSwipeOffset(newOffset)
        setShowRightAction(newOffset > swipeThreshold / 2)
      }
    },
    [table.isActive, canEndSession, canAddTime, swipeThreshold],
  )

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!touchStartedRef.current) return
    touchStartedRef.current = false

    // Calculate swipe distance and duration
    const distance = currentXRef.current - startXRef.current
    const duration = Date.now() - startTimeRef.current
    const velocity = Math.abs(distance) / duration

    // Check if this was a tap rather than a swipe - use stricter criteria
    const isTap = Math.abs(distance) < 5 && duration < 200

    if (isTap) {
      // This was a tap, not a swipe
      resetSwipe()
      onClick()
      return
    }

    // Determine if swipe should trigger action
    const isSwipeComplete = Math.abs(distance) > swipeThreshold || velocity > 0.5

    if (isSwipeComplete) {
      if (distance < 0 && table.isActive && canEndSession) {
        // Complete left swipe - end session
        onEndSession(table.id)

        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(20)
        }
      } else if (distance > 0 && table.isActive && canAddTime) {
        // Complete right swipe - add time
        onAddTime(table.id)

        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(20)
        }
      }
    }

    // Reset swipe state with animation
    resetSwipe()
  }, [
    table.id,
    table.isActive,
    canEndSession,
    canAddTime,
    onClick,
    onEndSession,
    onAddTime,
    resetSwipe,
    swipeThreshold,
  ])

  // Add event listeners for mouse events (for desktop testing)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      startXRef.current = e.clientX
      currentXRef.current = e.clientX
      startTimeRef.current = Date.now()
      setIsSwiping(true)
      isSwipingRef.current = true

      // Add temporary event listeners for mouse move and up
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSwipingRef.current) return

      currentXRef.current = e.clientX
      const distance = currentXRef.current - startXRef.current
      const resistance = 0.5
      const newOffset = distance * resistance

      if (table.isActive && canEndSession && distance < 0) {
        setSwipeOffset(newOffset)
        setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
      } else if (table.isActive && canAddTime && distance > 0) {
        setSwipeOffset(newOffset)
        setShowRightAction(newOffset > swipeThreshold / 2)
      }
    }

    const handleMouseUp = () => {
      if (!isSwipingRef.current) return

      const distance = currentXRef.current - startXRef.current
      const duration = Date.now() - startTimeRef.current
      const velocity = Math.abs(distance) / duration

      const isTap = Math.abs(distance) < 10 && duration < 300

      if (isTap) {
        resetSwipe()
        onClick()
        return
      }

      const isSwipeComplete = Math.abs(distance) > swipeThreshold || velocity > 0.5

      if (isSwipeComplete) {
        if (distance < 0 && table.isActive && canEndSession) {
          onEndSession(table.id)
        } else if (distance > 0 && table.isActive && canAddTime) {
          onAddTime(table.id)
        }
      }

      resetSwipe()

      // Remove temporary event listeners
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    container.addEventListener("mousedown", handleMouseDown)

    return () => {
      container.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    table.id,
    table.isActive,
    canEndSession,
    canAddTime,
    onClick,
    onEndSession,
    onAddTime,
    resetSwipe,
    swipeThreshold,
  ])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg ios-touch-fix"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left action indicator (End Session) */}
      {table.isActive && canEndSession && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-red-600 to-red-500 text-white z-10 ${
            showLeftAction ? "opacity-100" : "opacity-70"
          }`}
        >
          <div className="flex flex-col items-center">
            <X size={24} />
            <span className="text-xs mt-1">End</span>
          </div>
        </div>
      )}

      {/* Right action indicator (Add Time) */}
      {table.isActive && canAddTime && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white z-10 ${
            showRightAction ? "opacity-100" : "opacity-70"
          }`}
        >
          <div className="flex flex-col items-center">
            <Clock size={24} />
            <span className="text-xs mt-1">Add Time</span>
          </div>
        </div>
      )}

      {/* Table card with transform based on swipe */}
      <div
        className="relative z-20 touch-action-none"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease",
        }}
        onClick={handleClick}
      >
        <TableCard table={table} servers={servers} logs={logs} onClick={onClick} />
      </div>
    </div>
  )
}
