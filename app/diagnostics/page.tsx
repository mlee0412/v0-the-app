"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Save } from "lucide-react"

export default function DiagnosticsPage() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [envVarsStatus, setEnvVarsStatus] = useState<"checking" | "complete" | "incomplete">("checking")
  const [tablesStatus, setTablesStatus] = useState<"checking" | "exists" | "missing">("checking")
  const [testMessage, setTestMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<
    Array<{ name: string; status: "success" | "error" | "warning"; message: string }>
  >([])

  const { tables, logs, servers, noteTemplates, syncData, offlineMode, useLocalStorage } = useSupabaseData()

  // Check environment variables
  useEffect(() => {
    const checkEnvVars = () => {
      const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_XAI_AVAILABLE"]

      const missingVars = requiredVars.filter((varName) => !process.env[varName])

      if (missingVars.length === 0) {
        setEnvVarsStatus("complete")
      } else {
        setEnvVarsStatus("incomplete")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Environment Variables",
            status: "error",
            message: `Missing variables: ${missingVars.join(", ")}`,
          },
        ])
      }
    }

    checkEnvVars()
  }, [])

  // Check Supabase connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!isSupabaseConfigured()) {
        setConnectionStatus("disconnected")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Supabase Configuration",
            status: "error",
            message: "Supabase is not configured. Check your environment variables.",
          },
        ])
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from("system_settings").select("count")

        if (error) {
          setConnectionStatus("disconnected")
          setTestResults((prev) => [
            ...prev,
            {
              name: "Supabase Connection",
              status: "error",
              message: `Connection failed: ${error.message}`,
            },
          ])
        } else {
          setConnectionStatus("connected")
          setTestResults((prev) => [
            ...prev,
            {
              name: "Supabase Connection",
              status: "success",
              message: "Successfully connected to Supabase",
            },
          ])

          // Check if tables exist
          checkTables()
        }
      } catch (err) {
        setConnectionStatus("disconnected")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Supabase Connection",
            status: "error",
            message: `Connection error: ${(err as Error).message}`,
          },
        ])
      }
    }

    checkConnection()
  }, [])

  // Check if tables exist
  const checkTables = async () => {
    try {
      setTablesStatus("checking")
      const supabase = getSupabaseClient()

      // Check for required tables
      const requiredTables = ["billiard_tables", "session_logs", "system_settings", "servers", "note_templates"]

      const missingTables = []

      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select("count")
        if (error && error.code === "PGRST116") {
          missingTables.push(table)
        }
      }

      if (missingTables.length === 0) {
        setTablesStatus("exists")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Database Tables",
            status: "success",
            message: "All required tables exist",
          },
        ])
      } else {
        setTablesStatus("missing")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Database Tables",
            status: "warning",
            message: `Missing tables: ${missingTables.join(", ")}`,
          },
        ])
      }
    } catch (err) {
      setTablesStatus("missing")
      setTestResults((prev) => [
        ...prev,
        {
          name: "Database Tables",
          status: "error",
          message: `Error checking tables: ${(err as Error).message}`,
        },
      ])
    }
  }

  // Run a test sync
  const runTestSync = async () => {
    setIsLoading(true)
    setTestMessage("Testing data synchronization...")

    try {
      const result = await syncData()

      if (result) {
        setTestMessage("Data synchronization successful!")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Data Synchronization",
            status: "success",
            message: "Successfully synchronized data with Supabase",
          },
        ])
      } else {
        setTestMessage("Data synchronization failed. Check console for details.")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Data Synchronization",
            status: "error",
            message: "Failed to synchronize data with Supabase",
          },
        ])
      }
    } catch (err) {
      setTestMessage(`Error: ${(err as Error).message}`)
      setTestResults((prev) => [
        ...prev,
        {
          name: "Data Synchronization",
          status: "error",
          message: `Sync error: ${(err as Error).message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Create missing tables
  const createMissingTables = async () => {
    setIsLoading(true)
    setTestMessage("Creating missing tables...")

    try {
      const supabase = getSupabaseClient()

      // SQL to create tables
      const createTablesSQL = `
        -- Create billiard_tables table if it doesn't exist
        CREATE TABLE IF NOT EXISTS billiard_tables (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT false,
          start_time BIGINT,
          remaining_time BIGINT NOT NULL,
          initial_time BIGINT NOT NULL,
          guest_count INTEGER DEFAULT 0,
          server_id UUID,
          group_id VARCHAR(255),
          has_notes BOOLEAN DEFAULT false,
          note_id VARCHAR(255),
          note_text TEXT DEFAULT '',
          updated_by_admin BOOLEAN DEFAULT false,
          updated_by VARCHAR(255),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create session_logs table if it doesn't exist
        CREATE TABLE IF NOT EXISTS session_logs (
          id UUID PRIMARY KEY,
          table_id INTEGER NOT NULL,
          table_name VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          details TEXT DEFAULT '',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create system_settings table if it doesn't exist
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY,
          day_started BOOLEAN DEFAULT false,
          group_counter INTEGER DEFAULT 1,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create servers table if it doesn't exist
        CREATE TABLE IF NOT EXISTS servers (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create note_templates table if it doesn't exist
        CREATE TABLE IF NOT EXISTS note_templates (
          id UUID PRIMARY KEY,
          text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      // Execute SQL
      const { error } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

      if (error) {
        setTestMessage(`Error creating tables: ${error.message}`)
        setTestResults((prev) => [
          ...prev,
          {
            name: "Create Tables",
            status: "error",
            message: `Failed to create tables: ${error.message}`,
          },
        ])
      } else {
        setTestMessage("Tables created successfully!")
        setTestResults((prev) => [
          ...prev,
          {
            name: "Create Tables",
            status: "success",
            message: "Successfully created missing tables",
          },
        ])

        // Recheck tables
        await checkTables()
      }
    } catch (err) {
      setTestMessage(`Error: ${(err as Error).message}`)
      setTestResults((prev) => [
        ...prev,
        {
          name: "Create Tables",
          status: "error",
          message: `Error: ${(err as Error).message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Force sync to Supabase
  const forceSyncToSupabase = async () => {
    setIsLoading(true)
    setTestMessage("Forcing sync to Supabase...")

    try {
      // Get data from localStorage
      const tablesData = localStorage.getItem("tables")
      const logsData = localStorage.getItem("logs")
      const serversData = localStorage.getItem("servers")
      const templatesData = localStorage.getItem("noteTemplates")
      const dayStartedData = localStorage.getItem("dayStarted")
      const groupCounterData = localStorage.getItem("groupCounter")

      const supabase = getSupabaseClient()

      // Sync tables
      if (tablesData) {
        const tables = JSON.parse(tablesData)
        if (Array.isArray(tables) && tables.length > 0) {
          const { error } = await supabase.from("billiard_tables").upsert(
            tables.map((table) => ({
              id: table.id,
              name: table.name,
              is_active: table.isActive,
              start_time: table.startTime,
              remaining_time: table.remainingTime,
              initial_time: table.initialTime,
              guest_count: table.guestCount,
              server_id: table.server,
              group_id: table.groupId,
              has_notes: table.hasNotes,
              note_id: table.noteId || "",
              note_text: table.noteText || "",
              updated_by_admin: table.updated_by_admin,
              updated_by: table.updated_by,
              updated_at: table.updatedAt,
            })),
          )

          if (error) {
            setTestResults((prev) => [
              ...prev,
              {
                name: "Sync Tables",
                status: "error",
                message: `Failed to sync tables: ${error.message}`,
              },
            ])
          } else {
            setTestResults((prev) => [
              ...prev,
              {
                name: "Sync Tables",
                status: "success",
                message: `Synced ${tables.length} tables to Supabase`,
              },
            ])
          }
        }
      }

      // Sync logs
      if (logsData) {
        const logs = JSON.parse(logsData)
        if (Array.isArray(logs) && logs.length > 0) {
          const { error } = await supabase.from("session_logs").upsert(
            logs.map((log) => ({
              id: log.id,
              table_id: log.tableId,
              table_name: log.tableName,
              action: log.action,
              timestamp: log.timestamp,
              details: log.details || "",
            })),
          )

          if (error) {
            setTestResults((prev) => [
              ...prev,
              {
                name: "Sync Logs",
                status: "error",
                message: `Failed to sync logs: ${error.message}`,
              },
            ])
          } else {
            setTestResults((prev) => [
              ...prev,
              {
                name: "Sync Logs",
                status: "success",
                message: `Synced ${logs.length} logs to Supabase`,
              },
            ])
          }
        }
      }

      // Sync settings
      if (dayStartedData !== null && groupCounterData) {
        const { error } = await supabase.from("system_settings").upsert({
          id: 1,
          day_started: dayStartedData === "true",
          group_counter: Number.parseInt(groupCounterData, 10),
          last_updated: new Date().toISOString(),
        })

        if (error) {
          setTestResults((prev) => [
            ...prev,
            {
              name: "Sync Settings",
              status: "error",
              message: `Failed to sync settings: ${error.message}`,
            },
          ])
        } else {
          setTestResults((prev) => [
            ...prev,
            {
              name: "Sync Settings",
              status: "success",
              message: "Synced settings to Supabase",
            },
          ])
        }
      }

      setTestMessage("Forced sync completed!")
    } catch (err) {
      setTestMessage(`Error: ${(err as Error).message}`)
      setTestResults((prev) => [
        ...prev,
        {
          name: "Force Sync",
          status: "error",
          message: `Error: ${(err as Error).message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Diagnostics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {connectionStatus === "checking" ? (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Checking...
                </Badge>
              ) : connectionStatus === "connected" ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-500">
                  <CheckCircle className="w-4 h-4 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/20 text-red-500">
                  <XCircle className="w-4 h-4 mr-1" /> Disconnected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {envVarsStatus === "checking" ? (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Checking...
                </Badge>
              ) : envVarsStatus === "complete" ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-500">
                  <CheckCircle className="w-4 h-4 mr-1" /> Complete
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/20 text-red-500">
                  <XCircle className="w-4 h-4 mr-1" /> Incomplete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {tablesStatus === "checking" ? (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Checking...
                </Badge>
              ) : tablesStatus === "exists" ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-500">
                  <CheckCircle className="w-4 h-4 mr-1" /> All Tables Exist
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/20 text-red-500">
                  <XCircle className="w-4 h-4 mr-1" /> Missing Tables
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="mb-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="logs">Test Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current status of your Supabase integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Connection Details</h3>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Supabase URL:</span>
                        <span className="font-mono text-sm">
                          {process.env.NEXT_PUBLIC_SUPABASE_URL
                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...`
                            : "Not set"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Offline Mode:</span>
                        <Badge variant={offlineMode ? "destructive" : "outline"}>
                          {offlineMode ? "Enabled" : "Disabled"}
                        </Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Using Local Storage:</span>
                        <Badge variant={useLocalStorage ? "destructive" : "outline"}>
                          {useLocalStorage ? "Yes" : "No"}
                        </Badge>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Data Status</h3>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Tables:</span>
                        <span>{tables.length}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Logs:</span>
                        <span>{logs.length}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Servers:</span>
                        <span>{servers.length}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Note Templates:</span>
                        <span>{noteTemplates.length}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {connectionStatus === "disconnected" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>
                      Unable to connect to Supabase. Check your environment variables and network connection.
                    </AlertDescription>
                  </Alert>
                )}

                {tablesStatus === "missing" && (
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Missing Tables</AlertTitle>
                    <AlertDescription>
                      Some required tables are missing. Use the Actions tab to create them.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Preview of your current data</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tables">
                <TabsList className="mb-4">
                  <TabsTrigger value="tables">Tables</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="servers">Servers</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="tables">
                  <div className="border rounded-md overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Guests
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tables.map((table) => (
                          <tr key={table.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {table.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Badge variant={table.isActive ? "default" : "outline"}>
                                {table.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {Math.floor(table.remainingTime / 60000)} min
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.guestCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="logs">
                  <div className="border rounded-md overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {logs.slice(0, 10).map((log) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {log.tableName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.action}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="servers">
                  <div className="border rounded-md overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {servers.map((server) => (
                          <tr key={server.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {server.id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{server.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Badge variant={server.enabled ? "default" : "outline"}>
                                {server.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="templates">
                  <div className="border rounded-md overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Text
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {noteTemplates.map((template) => (
                          <tr key={template.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {template.id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Actions</CardTitle>
              <CardDescription>Actions to test and fix your Supabase integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={runTestSync}
                    disabled={isLoading || connectionStatus !== "connected"}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Test Sync
                  </Button>

                  <Button
                    onClick={forceSyncToSupabase}
                    disabled={isLoading || connectionStatus !== "connected"}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" /> Force Sync to Supabase
                  </Button>
                </div>

                {tablesStatus === "missing" && (
                  <Button
                    onClick={createMissingTables}
                    disabled={isLoading || connectionStatus !== "connected"}
                    className="w-full"
                    variant="secondary"
                  >
                    <Database className="w-4 h-4 mr-2" /> Create Missing Tables
                  </Button>
                )}

                {testMessage && (
                  <Alert className={isLoading ? "bg-blue-50" : "bg-green-50"}>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>{isLoading ? "Processing..." : "Result"}</AlertTitle>
                    <AlertDescription>
                      {testMessage}
                      {isLoading && (
                        <div className="mt-2">
                          <div className="w-full bg-blue-100 rounded-full h-2.5">
                            <div className="bg-blue-500 h-2.5 rounded-full animate-pulse w-full"></div>
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Test Logs</CardTitle>
              <CardDescription>Results of diagnostic tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No test results yet</p>
                ) : (
                  <div className="border rounded-md overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Test
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Message
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {testResults.map((result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Badge
                                variant={
                                  result.status === "success"
                                    ? "default"
                                    : result.status === "warning"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {result.status === "success" ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" /> Success
                                  </>
                                ) : result.status === "warning" ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Warning
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" /> Error
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setTestResults([])}
                variant="outline"
                className="w-full"
                disabled={testResults.length === 0}
              >
                Clear Logs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
