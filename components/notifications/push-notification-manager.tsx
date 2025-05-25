"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { hapticFeedback } from "@/utils/haptic-feedback"
import { toast } from "@/hooks/use-toast"

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "default">("default")
  const [supported, setSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

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
    }
  }, [])

  const requestPermission = async () => {
    if (!supported) return

    try {
      hapticFeedback.medium()
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "granted") {
        hapticFeedback.success()
        subscribeUserToPush()
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
      toast({
        title: "Error enabling notifications",
        description: "Please try again or check browser settings",
        variant: "destructive",
      })
    }
  }

  const subscribeUserToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      // Get the server's public key
      const response = await fetch("/api/notifications/public-key")
      const { publicKey } = await response.json()

      // Subscribe the user
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send the subscription to the server
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      })

      setSubscription(subscription)
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return

    try {
      hapticFeedback.medium()
      await subscription.unsubscribe()

      // Notify the server
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      })

      setSubscription(null)
      toast({
        title: "Notifications disabled",
        description: "You've unsubscribed from push notifications",
        variant: "default",
      })
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
    }
  }

  if (!supported) return null

  return (
    <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-cyan-500/20 mb-4">
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
          className="bg-transparent border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400"
        >
          <Bell className="h-4 w-4 mr-2" />
          Enable
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
