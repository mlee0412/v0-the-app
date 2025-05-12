import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Ensure we don't recreate the client on every import in a browser environment
let supabaseClient: ReturnType<typeof createClient> | null = null
let lastConnectionAttempt = 0
const CONNECTION_RETRY_DELAY = 5000 // 5 seconds between connection attempts

// Update the getSupabaseClient function to handle connection failures gracefully
export const getSupabaseClient = () => {
  const now = Date.now()

  // Always create a new client in a server context to avoid sharing between requests
  if (typeof window === "undefined") {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: false,
        },
        // Add more resilient fetch options
        global: {
          fetch: (...args) => {
            return fetch(...args).catch((err) => {
              console.warn("Supabase fetch error (server):", err)
              // Return a mock response to prevent crashes
              return new Response(JSON.stringify({ error: "Failed to connect" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            })
          },
          headers: {
            "X-Client-Info": "billiards-timer-app",
          },
        },
      },
    )
  }

  // In the browser, reuse the client instance but with connection throttling
  if (!supabaseClient || now - lastConnectionAttempt > CONNECTION_RETRY_DELAY) {
    lastConnectionAttempt = now

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase URL or key is missing. Some features may not work correctly.")
    }

    // Create client with more resilient options
    supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      // Add more resilient fetch options
      global: {
        fetch: (...args) => {
          const controller = new AbortController()
          const { signal } = controller

          // Set a timeout to abort the request if it takes too long
          const timeout = setTimeout(() => {
            controller.abort()
          }, 10000) // 10 second timeout

          return fetch(...args, { signal })
            .then((response) => {
              clearTimeout(timeout)
              return response
            })
            .catch((error) => {
              clearTimeout(timeout)
              console.warn("Supabase fetch error (client):", error)
              // Return a mock response to prevent crashes
              return new Response(JSON.stringify({ error: "Failed to connect" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            })
        },
        headers: {
          "X-Client-Info": "billiards-timer-app",
        },
      },
    })

    // Add a property to check if properly configured
    Object.defineProperty(supabaseClient, "isProperlyConfigured", {
      value: !!(supabaseUrl && supabaseKey),
      writable: false,
    })

    // Only validate connection if we have credentials
    if (supabaseUrl && supabaseKey) {
      supabaseClient.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            console.error("Supabase connection error:", error.message)
            window.dispatchEvent(new CustomEvent("supabase-disconnected"))
          } else {
            console.log("Supabase connection established")
            window.dispatchEvent(new CustomEvent("supabase-connected"))
          }
        })
        .catch((err) => {
          console.error("Failed to check Supabase session:", err)
          window.dispatchEvent(new CustomEvent("supabase-disconnected"))
        })
    }
  }

  return supabaseClient
}

// Helper method to check if environment variables are configured
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Helper to check if Supabase is actually connected with timeout
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    return { connected: false, error: "Supabase not configured" }
  }

  try {
    // Create a promise that rejects after a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout")), 5000)
    })

    // Create the actual query promise
    const queryPromise = async () => {
      const supabase = getSupabaseClient()
      // Try a simple query to check connection
      const { error } = await supabase.from("system_settings").select("count").limit(1).maybeSingle()
      return { connected: !error, error: error?.message }
    }

    // Race the query against the timeout
    return (await Promise.race([queryPromise(), timeoutPromise])) as { connected: boolean; error?: string }
  } catch (err) {
    console.error("Error checking Supabase connection:", err)
    return { connected: false, error: (err as Error).message }
  }
}

// Helper to reset the client (useful for testing and after logout)
export const resetSupabaseClient = () => {
  supabaseClient = null
}

// Helper to ping Supabase to keep connection alive with timeout
export const pingSupabase = async () => {
  if (!isSupabaseConfigured()) return false

  try {
    // Create a promise that rejects after a timeout
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("Ping timeout")), 3000)
    })

    // Create the actual ping promise
    const pingPromise = async () => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("system_settings").select("count").limit(1).maybeSingle()
      return !error
    }

    // Race the ping against the timeout
    return await Promise.race([pingPromise(), timeoutPromise])
  } catch (err) {
    console.error("Error pinging Supabase:", err)
    return false
  }
}
