"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"

export function DatabaseConnectionTester() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [results, setResults] = useState<any[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const testConnection = async () => {
    setStatus("loading")
    setResults([])
    setErrorMessage(null)

    try {
      const supabase = getSupabaseClient()
      const testResults = []

      // Test 1: Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      testResults.push({
        name: "Environment Variables",
        status: supabaseUrl && supabaseKey ? "success" : "error",
        message: supabaseUrl && supabaseKey ? "Environment variables are set" : "Missing environment variables",
      })

      // Test 2: Basic connection
      try {
        const { error } = await supabase.from("_test_connection").select("*").limit(1)
        testResults.push({
          name: "Basic Connection",
          status: error && error.code !== "PGRST116" ? "error" : "success",
          message: error && error.code !== "PGRST116" ? `Connection error: ${error.message}` : "Connection successful",
        })
      } catch (err) {
        testResults.push({
          name: "Basic Connection",
          status: "error",
          message: `Exception: ${err}`,
        })
      }

      // Test 3: Check specific tables
      const tables = ["billiard_tables", "servers", "session_logs", "note_templates", "system_settings"]

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select("count").single()

          testResults.push({
            name: `Table: ${table}`,
            status: error ? "error" : "success",
            message: error ? `Error: ${error.message}` : `Found table with ${data?.count || 0} rows`,
          })
        } catch (err) {
          testResults.push({
            name: `Table: ${table}`,
            status: "error",
            message: `Exception: ${err}`,
          })
        }
      }

      setResults(testResults)

      // Overall status
      const hasErrors = testResults.some((result) => result.status === "error")
      setStatus(hasErrors ? "error" : "success")
    } catch (error) {
      setStatus("error")
      setErrorMessage(`Fatal error: ${error}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-black/20 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4">Database Connection Tester</h2>

      <Button onClick={testConnection} disabled={status === "loading"} className="mb-4">
        {status === "loading" ? "Testing..." : "Test Connection"}
      </Button>

      {status !== "idle" && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">
            Results:
            <span
              className={
                status === "loading" ? "text-yellow-400" : status === "success" ? "text-green-400" : "text-red-400"
              }
            >
              {" "}
              {status === "loading" ? "Testing..." : status === "success" ? "Success" : "Error"}
            </span>
          </h3>

          {errorMessage && <div className="p-2 bg-red-900/30 border border-red-500 rounded mb-4">{errorMessage}</div>}

          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  result.status === "success"
                    ? "bg-green-900/30 border border-green-500"
                    : "bg-red-900/30 border border-red-500"
                }`}
              >
                <div className="font-medium">{result.name}</div>
                <div className="text-sm">{result.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
