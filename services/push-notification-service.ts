import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Base64 encoded VAPID public key
const PUBLIC_VAPID_KEY =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdOkHndftQ+y/qbNYFUCDnT4qYbel" +
  "RsU9eT+TL4zBlGn8Po3F8rGlHTSgJOsdA3wIO8LuOBisOTVI+wYeYP6yLA=="

// Convert base64 to Uint8Array for applicationServerKey
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

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false

  // Check if permission is granted
  if (Notification.permission === "granted") {
    // Also check if we have an active subscription
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  }

  return false
}

// Request permission and subscribe to push notifications
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      console.error("Push notifications not supported")
      return false
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.error("Notification permission denied")
      return false
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    })

    // Save subscription to database
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        subscription: JSON.stringify(subscription),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      console.error("Error saving subscription:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return false
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Get current subscription
    const subscription = await registration.pushManager.getSubscription()

    // If subscription exists, unsubscribe
    if (subscription) {
      await subscription.unsubscribe()
    }

    // Remove subscription from database
    const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId)

    if (error) {
      console.error("Error removing subscription from database:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

// Register for background sync
export async function registerBackgroundSync(syncTag = "sync-tables"): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
      console.error("Background sync not supported")
      return false
    }

    const registration = await navigator.serviceWorker.ready
    await registration.sync.register(syncTag)
    return true
  } catch (error) {
    console.error("Error registering background sync:", error)
    return false
  }
}

// Check if background sync is supported
export function isBackgroundSyncSupported(): boolean {
  return "serviceWorker" in navigator && "SyncManager" in window
}
