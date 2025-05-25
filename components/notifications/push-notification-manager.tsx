"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, AlertTriangle } from "lucide-react"
import { hapticFeedback } from "@/utils/haptic-feedback"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "default">("default")
  const [supported, setSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Check if push notifications are supported
    const isPushSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window

    setSupported(isPushSupported)

    if (isPushSupported) {
      setPermission(Notification.permission)

      // Check for existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((existingSubscription) => {
          setSubscription(existingSubscription)
        })
      })

      // Try to get user ID from localStorage or session
      try {
        const storedUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId")
        if (storedUserId) {
          setUserId(storedUserId)
        }
      } catch (err) {
        console.error("Error accessing storage:", err)
      }
    }
  }, [])

  const requestPermission = async () => {
    if (!supported) return
    setLoading(true)
    setError(null)

    try {
      hapticFeedback.medium()
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "granted") {
        hapticFeedback.success()
        await subscribeUserToPush()
        toast({
          title: "Notifications enabled",
          description: "You'll receive notifications about table status changes",
          variant: "default",
        })
      } else {
        hapticFeedback.error()
        toast({
          title: "Notifications disabled",
          description: "You won't receive notifications about table status changes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      setError("Failed to request notification permission. Please try again.")
      hapticFeedback.error()
      toast({
        title: "Error enabling notifications",
        description: "Please try again or check browser settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeUserToPush = async () => {
    try {
      setLoading(true)
      const registration = await navigator.serviceWorker.ready

      // Get the server's public key
      const response = await fetch("/api/notifications/public-key")
      if (!response.ok) {
        throw new Error(`Failed to fetch public key: ${response.status}`)
      }

      const { publicKey } = await response.json()
      if (!publicKey) {
        throw new Error("No public key returned from server")
      }

      // Subscribe the user
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send the subscription to the server
      const subscribeResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userId: userId || "anonymous-user",
        }),
      })

      if (!subscribeResponse.ok) {
        throw new Error(`Failed to send subscription to server: ${subscribeResponse.status}`)
      }

      setSubscription(subscription)
      return subscription
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error)
      setError(`Failed to subscribe: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return
    setLoading(true)

    try {
      hapticFeedback.medium()
      await subscription.unsubscribe()

      // Notify the server
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userId: userId || "anonymous-user",
        }),
      })

      setSubscription(null)
      hapticFeedback.success()
      toast({
        title: "Notifications disabled",
        description: "You've unsubscribed from push notifications",
        variant: "default",
      })
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      setError(`Failed to unsubscribe: ${error instanceof Error ? error.message : String(error)}`)
      hapticFeedback.error()
      toast({
        title: "Error disabling notifications",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Test notification function
  const sendTestNotification = async () => {
    if (!subscription) return
    setLoading(true)

    try {
      hapticFeedback.medium()
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          title: "Test Notification",
          body: "This is a test notification from the Billiards Timer app",
          icon: "/images/space-billiard-logo.png",
          data: {
            type: "test",
            url: window.location.href,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send test notification: ${response.status}`)
      }

      hapticFeedback.success()
      toast({
        title: "Test notification sent",
        description: "If you don't receive it, check your browser settings",
        variant: "default",
      })
    } catch (error) {
      console.error("Error sending test notification:", error)
      setError(`Failed to send test: ${error instanceof Error ? error.message : String(error)}`)
      hapticFeedback.error()
      toast({
        title: "Error sending test notification",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Not Supported</AlertTitle>
        <AlertDescription>Push notifications are not supported in your browser or device.</AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col space-y-4 p-4 bg-black/30 rounded-lg border border-cyan-500/20 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white">Push Notifications</h3>
          <p className="text-xs text-gray-400">
            {permission === "granted"
              ? "Receive alerts about table status changes"
              : "Enable notifications for table alerts"}
          </p>
        </div>
        {permission === "granted" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={unsubscribeFromPush}
            disabled={loading}
            className="bg-transparent border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400"
          >
            <BellOff className="h-4 w-4 mr-2" />
            Disable
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={requestPermission}
            disabled={loading || permission === "denied"}
            className="bg-transparent border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400"
          >
            <Bell className="h-4 w-4 mr-2" />
            Enable
          </Button>
        )}
      </div>

      {permission === "denied" && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Notifications Blocked</AlertTitle>
          <AlertDescription>
            You've blocked notifications. Please update your browser settings to enable them.
          </AlertDescription>
        </Alert>
      )}

      {permission === "granted" && subscription && (
        <Button
          variant="outline"
          size="sm"
          onClick={sendTestNotification}
          disabled={loading}
          className="mt-2 bg-transparent border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400"
        >
          Send Test Notification
        </Button>
      )}
    </div>
  )
}

// Helper function to convert base64 to Uint8Array
// (Required for the applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
