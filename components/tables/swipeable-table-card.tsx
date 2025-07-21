"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { TableCard } from "@/components/tables/table-card"
import { Clock, X, MessageSquare, Info } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard"

interface SwipeableTableCardProps {
  table: Table
  servers: Server[]
  logs: LogEntry[]
  onClick: () => void
  onEndSession: (tableId: number) => void
  onOpenQuickStartDialog?: (tableId: number) => void
  onOpenStatusDialog?: (tableId: number) => void
  onOpenQuickNoteDialog?: (tableId: number) => void
  onMoveRequest?: (tableId: number) => void
  onGroupRequest?: (tableId: number) => void
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
  onOpenStatusDialog,
  onOpenQuickNoteDialog,
  onMoveRequest,
  onGroupRequest,
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
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)

  // Reset swipe state
  const resetSwipe = useCallback(() => {
    setSwipeOffset(0)
    setIsSwiping(false)
    isSwipingRef.current = false
    setShowLeftAction(false)
    setShowRightAction(false)
    isScrollingVerticallyRef.current = false
    swipeDirectionDeterminedRef.current = false
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    setMenuPosition(null)
    setShowActionDialog(false)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    document.querySelectorAll('.touch-active').forEach((el) => {
      el.classList.remove('touch-active')
    })
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
    longPressTimeoutRef.current = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const x = Math.min(Math.max(rect.left + rect.width / 2, 60), vw - 60)
        const y = Math.min(Math.max(rect.top, 10), vh - 10)
        setMenuPosition({ x, y })
      }
      setShowActionDialog(true)
    }, 500)
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

      if (absX > 10 || absY > 10) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
        setMenuPosition(null)
        setShowActionDialog(false)
      }

      if (absX > 10 || absY > 10) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
        setMenuPosition(null)
        setShowActionDialog(false)
      }

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
        if (distance < 0) {
          // Left swipe - quick note always allowed
          setSwipeOffset(newOffset)
          setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
        } else if (distance > 0) {
          // Right swipe - only if action available
          if (
            (table.isActive && canEndSession) ||
            (!table.isActive && canQuickStart)
          ) {
            setSwipeOffset(newOffset)
            setShowRightAction(newOffset > swipeThreshold / 2)
          }
        }
      }
    },
    [table.isActive, canEndSession, canQuickStart, swipeThreshold],
  )

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartedRef.current) return
    e.preventDefault()
    e.stopPropagation()
    document.querySelectorAll('.touch-active').forEach((el) => {
      el.classList.remove('touch-active')
    })
    touchStartedRef.current = false

    if (showActionDialog) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = null
      }
      setSwipeOffset(0)
      setIsSwiping(false)
      isSwipingRef.current = false
      isScrollingVerticallyRef.current = false
      swipeDirectionDeterminedRef.current = false
      return
    }

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
      if (distance < 0) {
        // Left swipe - quick note for both active and inactive tables
        if (onOpenQuickNoteDialog) {
          onOpenQuickNoteDialog(table.id)
          if (navigator.vibrate) {
            navigator.vibrate(20)
          }
        }
      } else if (distance > 0) {
        // Right swipe
        if (table.isActive && canEndSession) {
          onEndSession(table.id)
          if (navigator.vibrate) {
            navigator.vibrate(20)
          }
        } else if (!table.isActive && canQuickStart && onOpenQuickStartDialog) {
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
    onOpenQuickNoteDialog,
    resetSwipe,
    swipeThreshold,
    showActionDialog,
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

      longPressTimeoutRef.current = setTimeout(() => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const x = Math.min(Math.max(startXRef.current, 60), vw - 60)
        const y = Math.min(Math.max(startYRef.current, 10), vh - 10)
        setMenuPosition({ x, y })
      }, 500)

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

        if (distance < 0) {
          setSwipeOffset(newOffset)
          setShowLeftAction(Math.abs(newOffset) > swipeThreshold / 2)
        } else if (distance > 0) {
          if (
            (table.isActive && canEndSession) ||
            (!table.isActive && canQuickStart)
          ) {
            setSwipeOffset(newOffset)
            setShowRightAction(newOffset > swipeThreshold / 2)
          }
        }
      }
    }

    const handleMouseUp = () => {
      if (!touchStartedRef.current) return

      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = null
      }
      if (menuPosition) {
        setMenuPosition(null)
        setShowActionDialog(false)
      }

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
        if (distance < 0) {
          // Left swipe - quick note
          if (onOpenQuickNoteDialog) {
            onOpenQuickNoteDialog(table.id)
          }
        } else if (distance > 0) {
          // Right swipe
          if (table.isActive && canEndSession) {
            onEndSession(table.id)
          } else if (!table.isActive && canQuickStart && onOpenQuickStartDialog) {
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
    onOpenQuickNoteDialog,
    resetSwipe,
    swipeThreshold,
  ])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (showActionDialog) {
      // If the long-press menu is showing, ignore click
      return
    }
    setMenuPosition(null)
    onClick()
  }

  return (
    <div
      className={`relative swipeable-card-container ${className}`}
      style={{ touchAction: "pan-y", userSelect: "none", WebkitTapHighlightColor: "transparent" }}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Left action indicator */}
      {onOpenQuickNoteDialog ? (
        <div
          className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-purple-500 to-purple-600 text-white z-10 ${showLeftAction ? "opacity-100" : "opacity-70"}`}
        >
          <div className="flex flex-col items-center">
            <MessageSquare size={24} />
            <span className="text-xs mt-1">Note</span>
          </div>
        </div>
      ) : null}

      {/* Right action indicator */}
      {(table.isActive && canEndSession) || (!table.isActive && canQuickStart) ? (
        <div
          className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r ${
            table.isActive ? "from-red-600 to-red-500" : "from-green-500/80 to-green-600/80"
          } text-white z-10 ${showRightAction ? "opacity-100" : "opacity-50"}`}
        >
          <div className="flex flex-col items-center">
            {table.isActive ? <X size={24} /> : <Clock size={24} />}
            <span className="text-xs mt-1">{table.isActive ? "End" : "Quick Start"}</span>
          </div>
        </div>
      ) : null}

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

      {menuPosition && (
        <Dialog
          open={showActionDialog}
          onOpenChange={(o) => {
            if (!o) setShowActionDialog(false)
          }}
        >
          <DialogContent
            className="absolute z-30 bg-black text-white text-sm rounded-md p-2 space-y-2"
            style={{
              top: menuPosition.y,
              left: menuPosition.x,
              transform: "translate(-50%, -100%)",
            }}
          >
            <Button
              variant="outline"
              className="w-full text-white border-gray-500"
              onClick={() => {
                setShowActionDialog(false)
                setMenuPosition(null)
                onMoveRequest && onMoveRequest(table.id)
              }}
            >
              Move
            </Button>
            <Button
              variant="outline"
              className="w-full text-white border-gray-500"
              onClick={() => {
                setShowActionDialog(false)
                setMenuPosition(null)
                onGroupRequest && onGroupRequest(table.id)
              }}
            >
              Group
            </Button>
            <Button
              variant="outline"
              className="w-full text-white border-gray-500"
              onClick={() => {
                setShowActionDialog(false)
                setMenuPosition(null)
                onOpenStatusDialog && onOpenStatusDialog(table.id)
              }}
            >
              Add Status
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
