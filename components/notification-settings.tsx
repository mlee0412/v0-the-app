"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  isPushNotificationSupported,
  areNotificationsEnabled,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isBackgroundSyncSupported,
  registerBackgroundSync,
} from "@/services/push-notification-service"
import { useAuth } from "@/contexts/auth-context"

export function NotificationSettings() {
  const { currentUser } = useAuth()
  const [notificationsSupported, setNotificationsSupported] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [syncSupported, setSyncSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSupport = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if notifications are supported
        const supported = isPushNotificationSupported()
        setNotificationsSupported(supported)

        // Check if background sync is supported
        const syncSupport = isBackgroundSyncSupported()
        setSyncSupported(syncSupport)

        // Check if notifications are enabled
        if (supported) {
          const enabled = await areNotificationsEnabled()
          setNotificationsEnabled(enabled)
        }
      } catch (err) {
        setError("Failed to check notification status")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSupport()
  }, [])

  const handleToggleNotifications = async () => {
    if (!currentUser?.id) {
      setError("You must be logged in to manage notifications")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (notificationsEnabled) {
        // Unsubscribe from notifications
        const success = await unsubscribeFromPushNotifications(currentUser.id)
        if (success) {
          setNotificationsEnabled(false)
        } else {
          setError("Failed to disable notifications")
        }
      } else {
        // Subscribe to notifications
        const success = await subscribeToPushNotifications(currentUser.id)
        if (success) {
          setNotificationsEnabled(true)
        } else {
          setError("Failed to enable notifications")
        }
      }
    } catch (err) {
      setError("An error occurred while managing notifications")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSync = async () => {
    if (!syncSupported) return

    setIsLoading(true)
    setError(null)

    try {
      const success = await registerBackgroundSync()
      if (!success) {
        setError("Failed to register background sync")
      }
    } catch (err) {
      setError("An error occurred while registering background sync")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!notificationsSupported && !syncSupported) {
    return (
      <div className="p-4 bg-gray-800 rounded-md border border-gray-700">
        <p className="text-amber-400 text-sm">Your browser doesn't support push notifications or background sync.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-2 bg-red-900/30 border border-red-700 rounded text-red-300 text-xs">{error}</div>}

      {notificationsSupported && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="h-4 w-4 text-cyan-400" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Push Notifications</span>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || !currentUser?.id}
            className={notificationsEnabled ? "bg-cyan-600" : ""}
          />
        </div>
      )}

      {syncSupported && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-purple-400" />
            <span className="text-sm">Background Sync</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegisterSync}
            disabled={isLoading || !currentUser?.id}
            className="h-7 text-xs border-purple-500 text-purple-400 hover:bg-purple-900/20"
          >
            Register
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Enable notifications to receive updates about table status changes, session completions, and other important
        events.
      </p>
    </div>
  )
}
