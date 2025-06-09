"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import supabaseRealTimeService from "@/services/supabase-real-time-service"
import { isSupabaseConfigured, checkSupabaseConnection, pingSupabase } from "@/lib/supabase/client"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const { lastSyncTime: dataLastSyncTime, syncData, adminPresent, offlineMode } = useSupabaseData()
  const connectionCheckInProgress = useRef(false)
  const connectionCheckTimer = useRef<NodeJS.Timeout | null>(null)
  const pingTimer = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const lastConnectionStatus = useRef<boolean | null>(null)
  const lastConnectionChangeTime = useRef<number>(0)
  const MIN_STATUS_CHANGE_INTERVAL = 10000 // 10 seconds minimum between status changes

  // Debounced connection status update to prevent rapid changes
  const updateConnectionStatus = (connected: boolean) => {
    const now = Date.now()

    // Only update if it's been at least MIN_STATUS_CHANGE_INTERVAL since the last change
    // or if this is the first status update
    if (
      lastConnectionStatus.current === null ||
      connected !== lastConnectionStatus.current ||
      now - lastConnectionChangeTime.current > MIN_STATUS_CHANGE_INTERVAL
    ) {
      setIsSupabaseConnected(connected)

      if (connected !== lastConnectionStatus.current) {
        lastConnectionStatus.current = connected
        lastConnectionChangeTime.current = now

        if (connected) {
          window.dispatchEvent(new CustomEvent("supabase-connected"))
          reconnectAttempts.current = 0 // Reset reconnect attempts on success
        } else {
          window.dispatchEvent(new CustomEvent("supabase-disconnected"))
        }
      }
    }
  }

  // Check Supabase connection with exponential backoff
  const checkConnection = async () => {
    if (!isSupabaseConfigured() || connectionCheckInProgress.current) {
      return
    }

    connectionCheckInProgress.current = true

    try {
      const { connected } = await checkSupabaseConnection()
      updateConnectionStatus(connected)

      // Attempt to reconnect if we're online but Supabase is disconnected
      if (navigator.onLine && !connected && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++

        // Exponential backoff for reconnection attempts
        const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${backoffDelay}ms`
          )
        }

        setTimeout(async () => {
          try {
            await syncData()
            // Check connection again after sync
            const { connected: reconnected } = await checkSupabaseConnection()
            updateConnectionStatus(reconnected)
          } catch (syncError) {
            console.error("Error during reconnect sync:", syncError)
          }
        }, backoffDelay)
      }
    } catch (err) {
      console.error("Error checking Supabase connection:", err)
      updateConnectionStatus(false)
    } finally {
      connectionCheckInProgress.current = false
    }
  }

  // Set up periodic connection check and ping
  useEffect(() => {
    // Initial connection check
    checkConnection()

    // Set up periodic connection check (less frequent)
    // Check connection less frequently to reduce network chatter
    connectionCheckTimer.current = setInterval(checkConnection, 60000) // Every 60 seconds

    // Set up more frequent ping to keep connection alive
    // Keep the connection alive but ping less aggressively
    pingTimer.current = setInterval(async () => {
      if (navigator.onLine && isSupabaseConfigured()) {
        await pingSupabase()
      }
    }, 180000) // Every 3 minutes

    return () => {
      if (connectionCheckTimer.current) clearInterval(connectionCheckTimer.current)
      if (pingTimer.current) clearInterval(pingTimer.current)
    }
  }, [syncData])

  // Handle online/offline events
  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      setIsOnline(true)
      // Recheck Supabase connection when we come back online
      // Add a small delay to allow network to stabilize
      setTimeout(() => {
        checkConnection()
      }, 2000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      updateConnectionStatus(false)
    }

    // Get device ID
    const id = supabaseRealTimeService.getDeviceId()
    setDeviceId(id)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Handle Supabase connection events
    const handleConnected = () => {
      setIsSupabaseConnected(true)
      setLastSyncTime(new Date())
    }

    const handleDisconnected = () => {
      setIsSupabaseConnected(false)
    }

    window.addEventListener("supabase-connected", handleConnected)
    window.addEventListener("supabase-disconnected", handleDisconnected)

    // Check connection on auth events
    const handleAuthEvent = () => {
      checkConnection()
    }

    window.addEventListener("supabase-user-login", handleAuthEvent)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("supabase-connected", handleConnected)
      window.removeEventListener("supabase-disconnected", handleDisconnected)
      window.removeEventListener("supabase-user-login", handleAuthEvent)
    }
  }, [])

  // Update last sync time when data is synced
  useEffect(() => {
    if (dataLastSyncTime) {
      setLastSyncTime(dataLastSyncTime)
    }
  }, [dataLastSyncTime])

  const handleManualSync = () => {
    syncData()
    // Force a connection check after manual sync
    setTimeout(() => {
      checkConnection()
    }, 1000)
  }

  // Determine connection status
  const connectionStatus = offlineMode
    ? "Offline Mode"
    : !isOnline
      ? "Offline"
      : isSupabaseConnected
        ? "Connected"
        : "Local Only"

  // Determine badge color
  const getBadgeClass = () => {
    if (!isOnline) return "bg-red-500/20 text-red-500" // Offline
    if (offlineMode) return "bg-yellow-500/20 text-yellow-500" // Offline Mode
    if (isSupabaseConnected) return "bg-green-500/20 text-green-500" // Connected
    return "bg-blue-500/20 text-blue-500" // Local Only
  }

  // Determine dot color
  const getDotClass = () => {
    if (!isOnline) return "bg-red-500"
    if (offlineMode) return "bg-yellow-500"
    if (isSupabaseConnected) return "bg-green-500"
    return "bg-blue-500"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 cursor-pointer" onClick={handleManualSync}>
            <Badge variant="outline" className={`px-2 py-1 ${getBadgeClass()}`}>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getDotClass()} animate-pulse`} />
                <span className="text-xs">
                  {connectionStatus}
                  {adminPresent && isSupabaseConnected && " (Admin)"}
                </span>
              </div>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p>
              <strong>Status:</strong> {connectionStatus}
            </p>
            <p>
              <strong>Device ID:</strong> {deviceId.substring(0, 8)}...
            </p>
            {lastSyncTime && (
              <p>
                <strong>Last Sync:</strong>{" "}
                {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
            <p className="italic mt-1">Click to sync data</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
