"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { isSupabaseConfigured as isSupabaseConfiguredLib } from "@/lib/supabase/client"
import supabaseTablesService from "@/services/supabase-tables-service"
import supabaseLogsService from "@/services/supabase-logs-service"
import supabaseSettingsService from "@/services/supabase-settings-service"
import supabaseRealTimeService from "@/services/supabase-real-time-service"

interface SupabaseInitializerProps {
  children: React.ReactNode
}

export function SupabaseInitializer({ children }: SupabaseInitializerProps) {
  // Check if Supabase is properly configured
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        console.log("Initializing Supabase services...")

        // Skip initialization if Supabase is not configured
        if (!isSupabaseConfiguredLib()) {
          console.warn("Supabase is not configured. Skipping initialization.")
          setIsInitialized(true)
          return
        }

        // Initialize tables first
        await supabaseTablesService.initializeTables().catch((err) => {
          console.error("Error initializing tables:", err)
          // Continue with other initializations
        })

        // Initialize logs
        await supabaseLogsService.initializeLogs().catch((err) => {
          console.error("Error initializing logs:", err)
          // Continue with other initializations
        })

        // Initialize settings
        await supabaseSettingsService.initializeSettings().catch((err) => {
          console.error("Error initializing settings:", err)
          // Continue with other initializations
        })

        // Initialize real-time service
        await supabaseRealTimeService.initialize().catch((err) => {
          console.error("Error initializing real-time service:", err)
          // Continue with other initializations
        })

        console.log("Supabase services initialized successfully")
        setIsInitialized(true)
      } catch (err) {
        console.error("Error initializing Supabase:", err)
        setError((err as Error).message)
        // Still set initialized to true to allow the app to render
        setIsInitialized(true)
      }
    }

    initializeSupabase()

    // Clean up on unmount
    return () => {
      if (isSupabaseConfiguredLib()) {
        supabaseTablesService.cleanup()
        supabaseLogsService.cleanup()
        supabaseSettingsService.cleanup()
        supabaseRealTimeService.cleanup()
      }
    }
  }, [])

  // If Supabase is not configured, show a warning
  if (!isSupabaseConfigured) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center z-50">
        ⚠️ Supabase environment variables are missing. Some features may not work correctly.
      </div>
    )
  }

  if (error) {
    console.warn("Supabase initialization error:", error)
    // Just show a warning instead of blocking the UI
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-red-900/70 text-white p-2 text-sm z-50">
          <p>Database connection error: {error}</p>
        </div>
        {children}
      </>
    )
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-500 text-lg">Initializing application...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
