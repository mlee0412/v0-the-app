"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import supabaseRealTimeService from "@/services/supabase-real-time-service"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const { lastSyncTime: dataLastSyncTime, syncData, adminPresent, offlineMode } = useSupabaseData()

  // Check Supabase connection on mount
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      if (!isSupabaseConfigured()) {
        setIsSupabaseConnected(false)
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from("system_settings").select("count")
        setIsSupabaseConnected(!error)
      } catch (err) {
        console.error("Error checking Supabase connection:", err)
        setIsSupabaseConnected(false)
      }
    }

    checkSupabaseConnection()
  }, [])

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

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

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("supabase-connected", handleConnected)
      window.removeEventListener("supabase-disconnected", handleDisconnected)
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
