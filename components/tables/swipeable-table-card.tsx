"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { TableCard } from "@/components/tables/table-card"
import { Clock, X } from "lucide-react"
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard"

interface SwipeableTableCardProps {
  table: Table
  servers: Server[]
  logs: LogEntry[]
  onClick: () => void
  onEndSession: (tableId: number) => void
  onOpenQuickStartDialog?: (tableId: number) => void
  canEndSession: boolean
  canQuickStart?: boolean
  className?: string
}

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
}: SwipeableTableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showLeftAction, setShowLeftAction] = useState(false)
  const [showRightAction, setShowRightAction] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const currentXRef = useRef(0)
  const startTimeRef = useRef(0)
  const swipeThreshold = 80 // Minimum distance to trigger action
  const isSwipingRef = useRef(false)
  const touchStartedRef = useRef(false)
  const isScrollingVerticallyRef = useRef(false)
  const swipeDirectionDeterminedRef = useRef(false)

  // Reset swipe state
  const resetSwipe = useCallback(() => {
    setSwipeOffset(0)
    setIsSwiping(false)
    isSwipingRef.current = false
    setShowLeftAction(false)
    setShowRightAction(false)
    isScrollingVerticallyRef.current = false
    swipeDirectionDeterminedRef.current = false
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Store the initial touch position
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    currentXRef.current = e.touches[0].clientX
    startTimeRef.current = Date.now()
    touchStartedRef.current = true
    setIsSwiping(false)
    isSwipingRef.current = false
    isScrollingVerticallyRef.current = false
    swipeDirectionDeterminedRef.current = false
  }, [])

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartedRef.current) return

      // Update current position
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      currentXRef.current = currentX

      // Calculate horizontal and vertical distances
      const deltaX = currentX - startXRef.current
      const deltaY = currentY - startYRef.current
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // If we haven't determined the swipe direction yet, do it now
      if (!swipeDirectionDeterminedRef.current) {
        // If we've moved enough to determine direction
        if (absX > 5 || absY > 5) {
          // If moving more vertically than horizontally, mark as vertical scrolling
          if (absY > absX) {
            isScrollingVerticallyRef.current = true
            // Don't prevent default - allow normal scrolling
            e.stopPropagation() // Stop propagation but allow default behavior
          } else {
            // Horizontal swipe - prevent default to handle our custom swipe
            isSwipingRef.current = true
            setIsSwiping(true)
            e.preventDefault() // Prevent default to handle our custom swipe
          }
          swipeDirectionDeterminedRef.current = true
        }
      }

      // If we're scrolling vertically, don't handle the swipe
      if (isScrollingVerticallyRef.current) {
        return
      }

      // If we're swiping horizontally, handle the swipe
      if (isSwipingRef.current) {
        // Calculate swipe distance
        const distance = deltaX

        // Update swipe offset with some resistance for better feel
        const resistance = 0.5
        const newOffset = distance * resistance

        // Only allow swiping if the appropriate permission exists
        if (table.isActive && canEndSession && distance < 0) {
          // Left swipe (end session)
          setSwipeOffset(newOffset)
          setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
        } else if (distance > 0) {
          if (!table.isActive && canQuickStart) {
            // Right swipe (quick start)
            setSwipeOffset(newOffset)
            setShowRightAction(newOffset > swipeThreshold / 2)
          }
        }
      }
    },
    [table.isActive, canEndSession, canQuickStart, swipeThreshold],
  )

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!touchStartedRef.current) return
    touchStartedRef.current = false

    // If we were scrolling vertically, just reset and return
    if (isScrollingVerticallyRef.current) {
      resetSwipe()
      return
    }

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

    if (isSwipeComplete && isSwipingRef.current) {
      if (distance < 0 && table.isActive && canEndSession) {
        // Complete left swipe - end session
        onEndSession(table.id)

        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(20)
        }
      } else if (distance > 0) {
        if (!table.isActive && canQuickStart && onOpenQuickStartDialog) {
          // Complete right swipe - quick start session
          onOpenQuickStartDialog(table.id)

          if (navigator.vibrate) {
            navigator.vibrate(20)
          }
        }
      }
    }

    // Reset swipe state with animation
    resetSwipe()
  }, [
    table.id,
    table.isActive,
    canEndSession,
    canQuickStart,
    onClick,
    onEndSession,
    onOpenQuickStartDialog,
    resetSwipe,
    swipeThreshold,
  ])

  // Add event listeners for mouse events (for desktop testing)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      startXRef.current = e.clientX
      startYRef.current = e.clientY
      currentXRef.current = e.clientX
      startTimeRef.current = Date.now()
      setIsSwiping(false)
      isSwipingRef.current = false
      isScrollingVerticallyRef.current = false
      swipeDirectionDeterminedRef.current = false

      // Add temporary event listeners for mouse move and up
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!touchStartedRef.current) return

      const currentX = e.clientX
      const currentY = e.clientY
      currentXRef.current = currentX

      // Calculate horizontal and vertical distances
      const deltaX = currentX - startXRef.current
      const deltaY = currentY - startYRef.current
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // If we haven't determined the swipe direction yet, do it now
      if (!swipeDirectionDeterminedRef.current) {
        // If we've moved enough to determine direction
        if (absX > 5 || absY > 5) {
          // If moving more vertically than horizontally, mark as vertical scrolling
          if (absY > absX) {
            isScrollingVerticallyRef.current = true
          } else {
            // Horizontal swipe
            isSwipingRef.current = true
            setIsSwiping(true)
          }
          swipeDirectionDeterminedRef.current = true
        }
      }

      // If we're scrolling vertically, don't handle the swipe
      if (isScrollingVerticallyRef.current) {
        return
      }

      // If we're swiping horizontally, handle the swipe
      if (isSwipingRef.current) {
        const distance = deltaX
        const resistance = 0.5
        const newOffset = distance * resistance

        if (table.isActive && canEndSession && distance < 0) {
          setSwipeOffset(newOffset)
          setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
        } else if (distance > 0) {
          if (!table.isActive && canQuickStart) {
            setSwipeOffset(newOffset)
            setShowRightAction(newOffset > swipeThreshold / 2)
          }
        }
      }
    }

    const handleMouseUp = () => {
      if (!touchStartedRef.current) return

      // If we were scrolling vertically, just reset and return
      if (isScrollingVerticallyRef.current) {
        resetSwipe()
        return
      }

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

      if (isSwipeComplete && isSwipingRef.current) {
        if (distance < 0 && table.isActive && canEndSession) {
          onEndSession(table.id)
        } else if (distance > 0) {
          if (!table.isActive && canQuickStart && onOpenQuickStartDialog) {
            onOpenQuickStartDialog(table.id)
          }
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
    canQuickStart,
    onClick,
    onEndSession,
    onOpenQuickStartDialog,
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
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y" }}
      ref={containerRef}
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

      {/* Right action indicator (Quick Start) */}
      {!table.isActive && canQuickStart && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white z-10 ${
            showRightAction ? "opacity-100" : "opacity-70"
          }`}
        >
          <div className="flex flex-col items-center">
            <Clock size={24} />
            <span className="text-xs mt-1">Quick Start</span>
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
