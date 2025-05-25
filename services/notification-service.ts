// services/notification-service.ts
import type { Table, Server } from "@/components/system/billiards-timer-dashboard"

// Check if push notifications are supported
const isPushNotificationSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window
}

// Request permission for notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.log("Push notifications not supported")
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return false
  }
}

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    console.log("Push notifications not supported")
    return null
  }

  try {
    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready

    // Get the server's public key
    const response = await fetch("/api/notifications/public-key")
    const { publicKey } = await response.json()

    if (!publicKey) {
      console.error("No public key available")
      return null
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    })

    // Send the subscription to the server
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscription }),
    })

    return subscription
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return null
  }
}

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe locally
      await subscription.unsubscribe()

      // Notify the server
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      })

      return true
    }

    return false
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

// Send a table warning notification
export const sendTableWarningNotification = async (table: Table, minutesRemaining: number): Promise<void> => {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `Table ${table.name} Warning`,
        body: `Table ${table.name} has ${minutesRemaining} minutes remaining.`,
        icon: "/images/space-billiard-logo.png",
        data: {
          type: "table-warning",
          tableId: table.id,
          minutesRemaining,
          url: `/?table=${table.id}`,
        },
      }),
    })
  } catch (error) {
    console.error("Error sending table warning notification:", error)
  }
}

// Send a table expired notification
export const sendTableExpiredNotification = async (table: Table): Promise<void> => {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `Table ${table.name} Expired`,
        body: `Table ${table.name} has expired. Please check it.`,
        icon: "/images/space-billiard-logo.png",
        data: {
          type: "table-expired",
          tableId: table.id,
          url: `/?table=${table.id}`,
        },
      }),
    })
  } catch (error) {
    console.error("Error sending table expired notification:", error)
  }
}

// Send a server assigned notification
export const sendServerAssignedNotification = async (table: Table, server: Server): Promise<void> => {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `New Table Assignment`,
        body: `${server.name}, you've been assigned to Table ${table.name}.`,
        icon: "/images/space-billiard-logo.png",
        data: {
          type: "server-assigned",
          tableId: table.id,
          serverId: server.id,
          url: `/?table=${table.id}`,
        },
      }),
    })
  } catch (error) {
    console.error("Error sending server assigned notification:", error)
  }
}

// Send a system notification
export const sendSystemNotification = async (title: string, body: string, data?: any): Promise<void> => {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        icon: "/images/space-billiard-logo.png",
        data: {
          type: "system",
          ...data,
        },
      }),
    })
  } catch (error) {
    console.error("Error sending system notification:", error)
  }
}
