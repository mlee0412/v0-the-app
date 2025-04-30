"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react"
import { AiAnalyticsDashboard } from "@/components/ai-analytics-dashboard"
import { NeonGlow } from "@/components/neon-glow"
import { SpaceButton } from "@/components/space-button"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

interface PullUpInsightsPanelProps {
  tables: Table[]
  logs: LogEntry[]
  servers: Server[]
}

export function PullUpInsightsPanel({ tables, logs, servers }: PullUpInsightsPanelProps) {
  // Panel states: "closed", "partial", "full"
  const [panelState, setPanelState] = useState<"closed" | "partial" | "full">("closed")
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const startPanelState = useRef<"closed" | "partial" | "full">("closed")

  // Calculate panel heights based on viewport
  const closedHeight = 40 // Just the handle visible
  const partialHeight = Math.min(200, window.innerHeight * 0.25) // 25% of screen or 200px max
  const fullHeight = window.innerHeight * 0.85 // 85% of screen

  // Get current height based on state
  const getCurrentHeight = () => {
    switch (panelState) {
      case "closed":
        return closedHeight
      case "partial":
        return partialHeight
      case "full":
        return fullHeight
    }
  }

  // Handle direct state changes
  const togglePanelState = () => {
    setPanelState((current) => {
      if (current === "closed") return "partial"
      if (current === "partial") return "full"
      return "closed"
    })
  }

  // Handle maximize/minimize buttons
  const maximizePanel = () => setPanelState("full")
  const minimizePanel = () => setPanelState("closed")

  // Touch/mouse handlers for dragging
  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY
    startPanelState.current = panelState

    // Add event listeners for drag and end
    document.addEventListener("mousemove", handleDragMove)
    document.addEventListener("touchmove", handleTouchMove)
    document.addEventListener("mouseup", handleDragEnd)
    document.addEventListener("touchend", handleDragEnd)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientY)
    }
  }

  const handleDragMove = (e: MouseEvent) => {
    if (dragStartY.current === null || !panelRef.current) return

    const deltaY = dragStartY.current - e.clientY
    const startHeight =
      startPanelState.current === "closed"
        ? closedHeight
        : startPanelState.current === "partial"
          ? partialHeight
          : fullHeight

    const newHeight = startHeight + deltaY

    // Update panel height during drag
    panelRef.current.style.height = `${newHeight}px`
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      if (dragStartY.current === null || !panelRef.current) return

      const deltaY = dragStartY.current - e.touches[0].clientY
      const startHeight =
        startPanelState.current === "closed"
          ? closedHeight
          : startPanelState.current === "partial"
            ? partialHeight
            : fullHeight

      const newHeight = startHeight + deltaY

      // Update panel height during drag
      panelRef.current.style.height = `${newHeight}px`

      // Prevent scrolling while dragging
      e.preventDefault()
    }
  }

  const handleDragEnd = () => {
    dragStartY.current = null

    // Remove event listeners
    document.removeEventListener("mousemove", handleDragMove)
    document.removeEventListener("touchmove", handleTouchMove)
    document.removeEventListener("mouseup", handleDragEnd)
    document.removeEventListener("touchend", handleDragEnd)

    // Determine final state based on current height
    if (panelRef.current) {
      const currentHeight = panelRef.current.offsetHeight

      // Determine which state to snap to
      if (currentHeight < (closedHeight + partialHeight) / 2) {
        setPanelState("closed")
      } else if (currentHeight < (partialHeight + fullHeight) / 2) {
        setPanelState("partial")
      } else {
        setPanelState("full")
      }
    }
  }

  // Update panel height when state changes
  useEffect(() => {
    if (panelRef.current) {
      const height = getCurrentHeight()
      panelRef.current.style.height = `${height}px`
    }
  }, [panelState])

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-black border-t border-[#00FFFF] transition-height duration-300 z-30 overflow-hidden"
      style={{
        height: `${getCurrentHeight()}px`,
        boxShadow: "0 -4px 20px rgba(0, 255, 255, 0.3)",
        width: "1152px", // 12 inches at 96 DPI (standard web resolution)
        maxWidth: "calc(100% - 2rem)", // Ensure it doesn't overflow on small screens
      }}
    >
      {/* Handle for dragging */}
      <div
        className="h-10 w-full flex items-center justify-center cursor-grab active:cursor-grabbing bg-gradient-to-r from-[#000033] via-[#000066] to-[#000033] border-b border-[#00FFFF]/30"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center justify-between w-full px-4">
          <NeonGlow color="cyan" intensity="low">
            <span className="text-sm font-bold">AI INSIGHTS</span>
          </NeonGlow>

          <div className="flex items-center gap-2">
            {panelState !== "full" ? (
              <SpaceButton onClick={maximizePanel} size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Maximize2 className="h-3 w-3 text-[#00FFFF]" />
              </SpaceButton>
            ) : (
              <SpaceButton onClick={minimizePanel} size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Minimize2 className="h-3 w-3 text-[#00FFFF]" />
              </SpaceButton>
            )}

            <div className="flex flex-col items-center justify-center h-6 w-6" onClick={togglePanelState}>
              {panelState === "closed" ? (
                <ChevronUp className="h-4 w-4 text-[#00FFFF]" />
              ) : panelState === "partial" ? (
                <ChevronUp className="h-4 w-4 text-[#00FFFF]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#00FFFF]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="overflow-auto h-[calc(100%-40px)]">
        <AiAnalyticsDashboard tables={tables} logs={logs} servers={servers} />
      </div>
    </div>
  )
}
