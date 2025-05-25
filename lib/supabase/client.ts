import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

let supabaseBrowserClient: SupabaseClient<Database> | null = null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

console.log("SupabaseClient: Initializing. URL defined:", !!supabaseUrl, "Anon Key defined:", !!supabaseAnonKey)
if (supabaseUrl) {
  console.log("SupabaseClient: NEXT_PUBLIC_SUPABASE_URL (first 20 chars):", supabaseUrl.substring(0, 20))
}

function createSupabaseClientInstance(): SupabaseClient<Database> {
  // Renamed to avoid conflict if createSupabaseClient is used elsewhere
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "SupabaseClient: createSupabaseClientInstance - Supabase URL or Anon Key is missing. Client may not be fully functional.",
    )
  }
  console.log("SupabaseClient: createSupabaseClientInstance called.")
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
    global: {
      fetch: async (url, options = {}, ...rest) => {
        const controller = new AbortController()
        const { signal } = controller
        console.log(`SupabaseClient: Fetching ${url} with 20s timeout.`)
        const timeoutId = setTimeout(() => {
          console.warn(`SupabaseClient: Fetch request to ${url} aborted due to 20s timeout.`)
          controller.abort()
        }, 20000) // Increased general fetch timeout to 20 seconds

        try {
          // @ts-ignore
          const response = await fetch(url, { ...options, signal }, ...rest)
          clearTimeout(timeoutId)
          console.log(`SupabaseClient: Fetch to ${url} completed with status ${response.status}.`)
          return response
        } catch (error) {
          clearTimeout(timeoutId)
          if ((error as Error).name === "AbortError") {
            console.warn(`SupabaseClient: Fetch request to ${url} was aborted.`)
          } else {
            console.error(`SupabaseClient: Fetch error for ${url}:`, error)
          }
          throw error
        }
      },
      headers: {
        "X-Client-Info": "billiards-timer-app/v2.2", // Updated version
      },
    },
  })
}

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (typeof window === "undefined") {
    console.log("SupabaseClient: getSupabaseClient - Creating new client for server-side.")
    return createSupabaseClientInstance()
  }
  if (!supabaseBrowserClient) {
    console.log("SupabaseClient: getSupabaseClient - Initializing Supabase client for browser.")
    supabaseBrowserClient = createSupabaseClientInstance()
    if (isSupabaseConfigured()) {
      // Check config before attempting connection test
      console.log("SupabaseClient: getSupabaseClient - Supabase is configured, attempting initial connection check.")
      checkSupabaseConnection(supabaseBrowserClient)
        .then(({ connected, error }) => {
          if (connected) {
            console.info("SupabaseClient: getSupabaseClient - Initial connection check successful.")
            window.dispatchEvent(new CustomEvent("supabase-connected"))
          } else {
            console.error("SupabaseClient: getSupabaseClient - Initial connection check failed:", error)
            window.dispatchEvent(new CustomEvent("supabase-disconnected"))
          }
        })
        .catch((err) => {
          console.error("SupabaseClient: getSupabaseClient - Exception during initial connection check:", err)
          window.dispatchEvent(new CustomEvent("supabase-disconnected"))
        })
    } else {
      console.warn("SupabaseClient: getSupabaseClient - Supabase not configured, skipping initial connection check.")
    }
  }
  return supabaseBrowserClient
}

export const isSupabaseConfigured = (): boolean => {
  const urlDefined = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const keyDefined = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const configured = urlDefined && keyDefined
  if (!configured) {
    console.warn(
      "SupabaseClient: isSupabaseConfigured - Supabase is NOT configured. URL defined:",
      urlDefined,
      "Key defined:",
      keyDefined,
    )
  }
  return configured
}

export const checkSupabaseConnection = async (
  client?: SupabaseClient<Database>,
): Promise<{ connected: boolean; error: string | null }> => {
  console.log("SupabaseClient: checkSupabaseConnection - Starting connection check.")

  try {
    if (!isSupabaseConfigured()) {
      console.warn("SupabaseClient: checkSupabaseConnection - Supabase not configured. Aborting check.")
      return { connected: false, error: "Supabase not configured" }
    }

    const supabase = client || getSupabaseClient()
    let timeoutId: NodeJS.Timeout | null = null

    const queryPromise = supabase.auth.getUser()

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        console.warn("SupabaseClient: checkSupabaseConnection - supabase.auth.getUser() timed out after 12 seconds.")
        reject(new Error("Connection check timed out after 12 seconds"))
      }, 12000)
    })

    try {
      // @ts-ignore
      const { data: userData, error: authError } = await Promise.race([queryPromise, timeoutPromise])

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = null

      if (
        !authError ||
        (authError && (authError.message === "Auth session missing!" || authError.message === "invalid_session"))
      ) {
        console.info(
          "SupabaseClient: checkSupabaseConnection - supabase.auth.getUser() successful (service reachable). User data:",
          !!userData,
        )
        return { connected: true, error: null }
      } else {
        console.error("SupabaseClient: checkSupabaseConnection - supabase.auth.getUser() failed:", authError.message)
        return { connected: false, error: authError.message }
      }
    } catch (innerError: any) {
      if (timeoutId) clearTimeout(timeoutId)
      console.error("SupabaseClient: checkSupabaseConnection - Inner exception:", innerError.message)
      return { connected: false, error: innerError.message || "Unknown error during connection check" }
    }
  } catch (err: any) {
    console.error("SupabaseClient: checkSupabaseConnection - Outer exception:", err.message)
    return { connected: false, error: err.message || "Failed to check connection" }
  }
}

export const resetSupabaseClient = (): void => {
  supabaseBrowserClient = null
  console.info("SupabaseClient: Supabase browser client has been reset.")
}

export const pingSupabase = async (client?: SupabaseClient<Database>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  const supabase = client || getSupabaseClient()
  let timeoutId: NodeJS.Timeout | null = null

  try {
    const pingPromise = supabase.auth.getUser() // Using auth.getUser() as a lightweight ping
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Ping timeout after 7 seconds")), 7000) // 7s timeout for ping
    })
    // @ts-ignore
    await Promise.race([pingPromise, timeoutPromise])
    if (timeoutId) clearTimeout(timeoutId)
    return true
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId)
    console.warn("SupabaseClient: Ping failed:", err.message)
    return false
  }
}
