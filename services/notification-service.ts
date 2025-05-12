// This service provides a unified API for push notifications
// that works in both production and development environments

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Check if we're in a development environment
const isDevelopment =
  isBrowser &&
  (process.env.NODE_ENV === "development" ||
    window.location.hostname.includes("vusercontent.net") ||
    window.location.hostname.includes("localhost"))

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  if (!isBrowser) return false

  if (isDevelopment) {
    // In development, we'll use our mock service
    return true
  }

  // In production, check for real push support
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// Request permission for notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isBrowser) return "denied"

  if (!("Notification" in window)) {
    console.log("This browser does not support notifications")
    return "denied"
  }

  // If we already have permission, return it
  if (Notification.permission === "granted") {
    return "granted"
  }

  // Otherwise, request permission
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return "denied"
  }
}

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (!isBrowser) return false

  if (isDevelopment) {
    // In development, use our mock service
    if (window.mockPushService) {
      window.mockPushService.enable()
      return true
    }
    return false
  }

  // In production, use the real service worker
  try {
    const permission = await requestNotificationPermission()
    if (permission !== "granted") {
      return false
    }

    const registration = await navigator.serviceWorker.ready

    // Get the existing subscription
    let subscription = await registration.pushManager.getSubscription()

    // If we already have a subscription, return true
    if (subscription) {
      return true
    }

    // Otherwise, create a new subscription
    // Note: In a real app, you would need to get a valid applicationServerKey
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // This would be your VAPID public key in production
      applicationServerKey: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    })

    // Send the subscription to your server
    await fetch("/api/push-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscription }),
    })

    return true
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return false
  }
}

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isBrowser) return false

  if (isDevelopment) {
    // In development, use our mock service
    if (window.mockPushService) {
      window.mockPushService.disable()
      return true
    }
    return false
  }

  // In production, use the real service worker
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push
      await subscription.unsubscribe()

      // Tell the server to remove the subscription
      await fetch("/api/push-subscription", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      })
    }

    return true
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

// Send a test notification (useful for development)
export const sendTestNotification = async (title: string, body: string): Promise<boolean> => {
  if (!isBrowser) return false

  if (isDevelopment) {
    // In development, use our mock service
    if (window.mockPushService) {
      window.mockPushService.sendNotification(title, { body })
      return true
    }

    // Fallback to regular notifications if available
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body })
      return true
    }

    return false
  }

  // In production, send via the server
  try {
    const response = await fetch("/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    })

    return response.ok
  } catch (error) {
    console.error("Error sending test notification:", error)
    return false
  }
}

// Add TypeScript interface for the mock service
declare global {
  interface Window {
    mockPushService?: {
      enable: () => void
      disable: () => void
      sendNotification: (title: string, options: any) => void
    }
  }
}
