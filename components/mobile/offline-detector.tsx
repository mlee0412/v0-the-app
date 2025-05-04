"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<any[]>([])

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)

      // If we have pending operations, show a notification
      if (pendingOperations.length > 0) {
        setShowBanner(true)
        // Attempt to sync pending operations
        syncPendingOperations()
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [pendingOperations.length])

  // Listen for operations that need to be queued when offline
  useEffect(() => {
    const handleQueueOperation = (event: CustomEvent) => {
      if (isOffline && event.detail) {
        // Add operation to queue
        setPendingOperations((prev) => [...prev, event.detail])

        // Provide feedback that operation was queued
        if (navigator.vibrate) {
          navigator.vibrate([10, 30, 10])
        }
      }
    }

    window.addEventListener("queue-offline-operation", handleQueueOperation as EventListener)

    return () => {
      window.removeEventListener("queue-offline-operation", handleQueueOperation as EventListener)
    }
  }, [isOffline])

  // Sync pending operations when back online
  const syncPendingOperations = async () => {
    if (pendingOperations.length === 0 || isOffline) return

    // Process each operation in order
    const operations = [...pendingOperations]
    setPendingOperations([])

    for (const operation of operations) {
      try {
        // Execute the operation
        if (operation.type === "addTime") {
          // Example: await onAddTime(operation.tableId, operation.minutes)
          console.log("Syncing operation:", operation)
        } else if (operation.type === "endSession") {
          // Example: await onEndSession(operation.tableId)
          console.log("Syncing operation:", operation)
        }
        // Add more operation types as needed
      } catch (error) {
        console.error("Failed to sync operation:", operation, error)
      }
    }

    // Hide banner after sync completes
    setTimeout(() => {
      setShowBanner(false)
    }, 3000)
  }

  // Hide banner after a few seconds
  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [showBanner])

  if (!showBanner) return null

  return (
    <div className={`offline-indicator ${showBanner ? "visible" : ""}`}>
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={16} />
        {isOffline ? (
          <span>You're offline. Changes will be saved when you reconnect.</span>
        ) : pendingOperations.length > 0 ? (
          <span>Back online! Syncing {pendingOperations.length} pending changes...</span>
        ) : (
          <span>Connected</span>
        )}
      </div>
    </div>
  )
}
