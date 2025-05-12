"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestNotification,
} from "@/services/notification-service"

export function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationsSupported, setNotificationsSupported] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unknown">("unknown")
  const [isLoading, setIsLoading] = useState(false)

  // Check if notifications are supported and get current permission status
  useEffect(() => {
    const checkNotificationSupport = async () => {
      const supported = isPushSupported()
      setNotificationsSupported(supported)

      if (supported && "Notification" in window) {
        setPermissionStatus(Notification.permission)

        // Check if we're already subscribed
        if (Notification.permission === "granted") {
          // In a real app, you would check with your server if this user is subscribed
          // For now, we'll just use localStorage as a simple way to remember the setting
          const storedSetting = localStorage.getItem("notificationsEnabled")
          setNotificationsEnabled(storedSetting === "true")
        }
      }
    }

    checkNotificationSupport()
  }, [])

  // Handle toggling notifications
  const handleToggleNotifications = async () => {
    setIsLoading(true)

    try {
      if (!notificationsEnabled) {
        // Enable notifications
        const permission = await requestNotificationPermission()
        setPermissionStatus(permission)

        if (permission === "granted") {
          const success = await subscribeToPushNotifications()
          if (success) {
            setNotificationsEnabled(true)
            localStorage.setItem("notificationsEnabled", "true")

            // Show a test notification to confirm it worked
            setTimeout(() => {
              sendTestNotification("Notifications Enabled", "You will now receive notifications from Space Billiards")
            }, 1000)
          }
        }
      } else {
        // Disable notifications
        const success = await unsubscribeFromPushNotifications()
        if (success) {
          setNotificationsEnabled(false)
          localStorage.setItem("notificationsEnabled", "false")
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sending a test notification
  const handleSendTestNotification = () => {
    sendTestNotification("Test Notification", "This is a test notification from Space Billiards")
  }

  if (!notificationsSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">Your browser doesn't support push notifications</p>
          </div>
          <Switch disabled />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Push Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {permissionStatus === "granted"
              ? "Receive notifications about table status and events"
              : permissionStatus === "denied"
                ? "Notifications are blocked. Please update your browser settings."
                : "Allow notifications to stay updated on table status and events"}
          </p>
        </div>
        <Switch
          checked={notificationsEnabled}
          onCheckedChange={handleToggleNotifications}
          disabled={isLoading || permissionStatus === "denied"}
        />
      </div>

      {notificationsEnabled && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={handleSendTestNotification}>
            Send Test Notification
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-medium">Notification Types</h4>

        <div className="flex items-center space-x-2">
          <Switch id="table-status" checked={notificationsEnabled} disabled={!notificationsEnabled} />
          <Label htmlFor="table-status">Table status changes</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="session-end" checked={notificationsEnabled} disabled={!notificationsEnabled} />
          <Label htmlFor="session-end">Session end alerts</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="system-updates" checked={notificationsEnabled} disabled={!notificationsEnabled} />
          <Label htmlFor="system-updates">System updates</Label>
        </div>
      </div>
    </div>
  )
}
