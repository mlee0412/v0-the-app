import { getSupabaseClient } from "@/lib/supabase/client"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = getSupabaseClient()

class SupabaseRealTimeService {
  private deviceId: string
  private userId: string | null = null
  private role: string | null = null
  private initialized = false
  private presenceChannel: any = null
  private isBrowser = typeof window !== "undefined"

  constructor() {
    this.deviceId = this.generateDeviceId()
  }

  private generateDeviceId(): string {
    if (!this.isBrowser) return "server"

    // Try to get from localStorage first
    const storedDeviceId = localStorage.getItem("deviceId")
    if (storedDeviceId) return storedDeviceId

    // Generate a new device ID
    const newDeviceId = Math.random().toString(36).substring(2, 15)
    localStorage.setItem("deviceId", newDeviceId)
    return newDeviceId
  }

  getDeviceId(): string {
    return this.deviceId
  }

  async initialize(): Promise<boolean> {
    if (!this.isBrowser || this.initialized) return true

    try {
      // Set up presence channel
      this.presenceChannel = supabase.channel("online-users", {
        config: {
          presence: {
            key: this.deviceId,
          },
        },
      })

      // Track presence
      this.presenceChannel.on("presence", { event: "sync" }, () => {
        const state = this.presenceChannel.presenceState()
        console.log("Presence state:", state)

        // Check if any admin is present
        const adminPresent = Object.values(state).some((presences: any) =>
          presences.some((presence: any) => presence.role === "admin"),
        )

        // Dispatch admin presence event
        window.dispatchEvent(
          new CustomEvent("supabase-admin-presence", {
            detail: { present: adminPresent },
          }),
        )
      })

      // Subscribe to the channel
      await this.presenceChannel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          // Get current user info
          try {
            const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
            this.userId = currentUser.id || null
            this.role = currentUser.role || null

            // Enter the channel with user info
            if (this.userId && this.role) {
              await this.presenceChannel.track({
                user_id: this.userId,
                role: this.role,
                device_id: this.deviceId,
                online_at: new Date().toISOString(),
              })
            }
          } catch (err) {
            console.error("Error getting current user for presence:", err)
          }

          // Dispatch connected event
          window.dispatchEvent(new Event("supabase-connected"))
        }
      })

      this.initialized = true
      return true
    } catch (err) {
      console.error("Error initializing real-time service:", err)
      return false
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isBrowser || !this.initialized) return

    try {
      if (this.presenceChannel) {
        await this.presenceChannel.unsubscribe()
      }
    } catch (err) {
      console.error("Error cleaning up real-time service:", err)
    }
  }

  async broadcastSyncRequest(): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      const userId = currentUser.id || "anonymous"
      const role = currentUser.role || "viewer"

      // Dispatch sync request event
      window.dispatchEvent(
        new CustomEvent("supabase-sync-request", {
          detail: {
            device_id: this.deviceId,
            user_id: userId,
            role: role,
            timestamp: Date.now(),
          },
        }),
      )
    } catch (err) {
      console.error("Error broadcasting sync request:", err)
    }
  }

  async broadcastAdminSync(): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      const isAdmin = currentUser?.role === "admin"

      // Only admins can broadcast admin sync
      if (!isAdmin) {
        console.warn("Non-admin attempted to broadcast admin sync")
        return
      }

      // Dispatch admin sync event
      window.dispatchEvent(
        new CustomEvent("supabase-admin-sync", {
          detail: {
            device_id: this.deviceId,
            user_id: currentUser.id,
            timestamp: Date.now(),
          },
        }),
      )
    } catch (err) {
      console.error("Error broadcasting admin sync:", err)
    }
  }

  async broadcastUserLogin(userId: string, username: string, role: string): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Update local state
      this.userId = userId
      this.role = role

      // Dispatch user login event
      window.dispatchEvent(
        new CustomEvent("supabase-user-login", {
          detail: {
            user_id: userId,
            username,
            role,
            device_id: this.deviceId,
            timestamp: Date.now(),
          },
        }),
      )

      // Update presence if initialized
      if (this.initialized && this.presenceChannel) {
        await this.presenceChannel.track({
          user_id: userId,
          role: role,
          device_id: this.deviceId,
          online_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error("Error broadcasting user login:", err)
    }
  }

  async broadcastUserUpdate(): Promise<void> {
    if (!this.isBrowser) return

    try {
      // Dispatch user update event
      window.dispatchEvent(new Event("supabase-user-update"))
    } catch (err) {
      console.error("Error broadcasting user update:", err)
    }
  }
}

const supabaseRealTimeService = new SupabaseRealTimeService()
export default supabaseRealTimeService
