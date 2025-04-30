// Add a deprecation notice to this service as it's being replaced by individual services

/**
 * @deprecated This monolithic service has been replaced by individual services:
 * - supabase-auth-service.ts
 * - supabase-tables-service.ts
 * - supabase-logs-service.ts
 * - supabase-settings-service.ts
 *
 * Please use the specific service for your needs instead of this combined service.
 */

import { createClient } from "@supabase/supabase-js"
import type { Table, LogEntry, Server, NoteTemplate } from "@/components/billiards-timer-dashboard"
import supabaseAuthService from "./supabase-auth-service"
import supabaseTablesService from "./supabase-tables-service"
import supabaseLogsService from "./supabase-logs-service"
import supabaseSettingsService from "./supabase-settings-service"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tables interface for Supabase
interface TablesRecord {
  id: number
  name: string
  is_active: boolean
  start_time: number | null
  remaining_time: number
  initial_time: number
  guest_count: number
  server: string | null
  group_id: string | null
  has_notes: boolean
  note_id: string
  note_text: string
  updated_by_admin: boolean
  updated_by: string | null
  updated_at: string
}

// Logs interface for Supabase
interface LogsRecord {
  id: string
  table_id: number
  table_name: string
  action: string
  timestamp: number
  details: string
}

// Servers interface for Supabase
interface ServersRecord {
  id: string
  name: string
  enabled: boolean
}

// Note templates interface for Supabase
interface NoteTemplatesRecord {
  id: string
  text: string
}

// Settings interface for Supabase
interface SettingsRecord {
  id: string
  day_started: boolean
  group_counter: number
}

// Convert from Supabase format to app format
function convertTableFromDB(record: TablesRecord): Table {
  return {
    id: record.id,
    name: record.name,
    isActive: record.is_active,
    startTime: record.start_time,
    remainingTime: record.remaining_time,
    initialTime: record.initial_time,
    guestCount: record.guest_count,
    server: record.server,
    groupId: record.group_id,
    hasNotes: record.has_notes,
    noteId: record.note_id,
    noteText: record.note_text,
    updated_by_admin: record.updated_by_admin,
    updated_by: record.updated_by,
    updatedAt: record.updated_at,
  }
}

// Convert from app format to Supabase format
function convertTableToDB(table: Table): TablesRecord {
  return {
    id: table.id,
    name: table.name,
    is_active: table.isActive,
    start_time: table.startTime,
    remaining_time: table.remainingTime,
    initial_time: table.initialTime,
    guest_count: table.guestCount,
    server: table.server,
    group_id: table.groupId,
    has_notes: table.hasNotes,
    note_id: table.noteId,
    note_text: table.noteText,
    updated_by_admin: table.updated_by_admin,
    updated_by: table.updated_by,
    updated_at: table.updatedAt,
  }
}

// Convert log from Supabase format to app format
function convertLogFromDB(record: LogsRecord): LogEntry {
  return {
    id: record.id,
    tableId: record.table_id,
    tableName: record.table_name,
    action: record.action,
    timestamp: record.timestamp,
    details: record.details,
  }
}

// Convert log from app format to Supabase format
function convertLogToDB(log: LogEntry): LogsRecord {
  return {
    id: log.id,
    table_id: log.tableId,
    table_name: log.tableName,
    action: log.action,
    timestamp: log.timestamp,
    details: log.details,
  }
}

// Convert server from Supabase format to app format
function convertServerFromDB(record: ServersRecord): Server {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
  }
}

// Convert server from app format to Supabase format
function convertServerToDB(server: Server): ServersRecord {
  return {
    id: server.id,
    name: server.name,
    enabled: server.enabled ?? true,
  }
}

// Convert note template from Supabase format to app format
function convertNoteTemplateFromDB(record: NoteTemplatesRecord): NoteTemplate {
  return {
    id: record.id,
    text: record.text,
  }
}

// Convert note template from app format to Supabase format
function convertNoteTemplateToDB(template: NoteTemplate): NoteTemplatesRecord {
  return {
    id: template.id,
    text: template.text,
  }
}

// Tables operations
export async function getTables(): Promise<Table[]> {
  const { data, error } = await supabase.from("tables").select("*")

  if (error) {
    console.error("Error fetching tables:", error)
    throw error
  }

  return data ? data.map(convertTableFromDB) : []
}

export async function updateTable(table: Table): Promise<void> {
  const { error } = await supabase.from("tables").upsert(convertTableToDB(table), { onConflict: "id" })

  if (error) {
    console.error("Error updating table:", error)
    throw error
  }
}

export async function updateTables(tables: Table[]): Promise<void> {
  const { error } = await supabase.from("tables").upsert(tables.map(convertTableToDB), { onConflict: "id" })

  if (error) {
    console.error("Error updating tables:", error)
    throw error
  }
}

// Logs operations
export async function getLogs(): Promise<LogEntry[]> {
  const { data, error } = await supabase.from("logs").select("*").order("timestamp", { ascending: false })

  if (error) {
    console.error("Error fetching logs:", error)
    throw error
  }

  return data ? data.map(convertLogFromDB) : []
}

export async function addLog(log: LogEntry): Promise<void> {
  const { error } = await supabase.from("logs").insert(convertLogToDB(log))

  if (error) {
    console.error("Error adding log:", error)
    throw error
  }
}

// Servers operations
export async function getServers(): Promise<Server[]> {
  const { data, error } = await supabase.from("servers").select("*")

  if (error) {
    console.error("Error fetching servers:", error)
    throw error
  }

  return data ? data.map(convertServerFromDB) : []
}

export async function updateServers(servers: Server[]): Promise<void> {
  const { error } = await supabase.from("servers").upsert(servers.map(convertServerToDB), { onConflict: "id" })

  if (error) {
    console.error("Error updating servers:", error)
    throw error
  }
}

// Note templates operations
export async function getNoteTemplates(): Promise<NoteTemplate[]> {
  const { data, error } = await supabase.from("note_templates").select("*")

  if (error) {
    console.error("Error fetching note templates:", error)
    throw error
  }

  return data ? data.map(convertNoteTemplateFromDB) : []
}

export async function updateNoteTemplates(templates: NoteTemplate[]): Promise<void> {
  const { error } = await supabase
    .from("note_templates")
    .upsert(templates.map(convertNoteTemplateToDB), { onConflict: "id" })

  if (error) {
    console.error("Error updating note templates:", error)
    throw error
  }
}

// Settings operations
export async function getSettings(): Promise<{ dayStarted: boolean; groupCounter: number }> {
  const { data, error } = await supabase.from("settings").select("*").eq("id", "system_settings").single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching settings:", error)
    throw error
  }

  return data
    ? { dayStarted: data.day_started, groupCounter: data.group_counter }
    : { dayStarted: false, groupCounter: 1 }
}

export async function updateSettings(dayStarted: boolean, groupCounter: number): Promise<void> {
  const { error } = await supabase.from("settings").upsert(
    {
      id: "system_settings",
      day_started: dayStarted,
      group_counter: groupCounter,
    },
    { onConflict: "id" },
  )

  if (error) {
    console.error("Error updating settings:", error)
    throw error
  }
}

// Subscribe to real-time changes
export function subscribeToTables(callback: (tables: Table[]) => void): () => void {
  const subscription = supabase
    .channel("tables-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
      getTables().then(callback)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export function subscribeToLogs(callback: (logs: LogEntry[]) => void): () => void {
  const subscription = supabase
    .channel("logs-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => {
      getLogs().then(callback)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export function subscribeToServers(callback: (servers: Server[]) => void): () => void {
  const subscription = supabase
    .channel("servers-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => {
      getServers().then(callback)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export function subscribeToNoteTemplates(callback: (templates: NoteTemplate[]) => void): () => void {
  const subscription = supabase
    .channel("note-templates-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "note_templates" }, () => {
      getNoteTemplates().then(callback)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export function subscribeToSettings(
  callback: (settings: { dayStarted: boolean; groupCounter: number }) => void,
): () => void {
  const subscription = supabase
    .channel("settings-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
      getSettings().then(callback)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

// Initialize database tables if they don't exist
export async function initializeTables(): Promise<void> {
  // Check if tables exist by trying to fetch data
  const { data: tablesData, error: tablesError } = await supabase.from("tables").select("count").single()

  if (tablesError && tablesError.code === "PGRST116") {
    // Table doesn't exist, create it
    console.log("Creating tables table")
    await supabase.rpc("create_tables_table")
  }

  // Check if logs table exists
  const { data: logsData, error: logsError } = await supabase.from("logs").select("count").single()

  if (logsError && logsError.code === "PGRST116") {
    // Table doesn't exist, create it
    console.log("Creating logs table")
    await supabase.rpc("create_logs_table")
  }

  // Check if servers table exists
  const { data: serversData, error: serversError } = await supabase.from("servers").select("count").single()

  if (serversError && serversError.code === "PGRST116") {
    // Table doesn't exist, create it
    console.log("Creating servers table")
    await supabase.rpc("create_servers_table")
  }

  // Check if note_templates table exists
  const { data: templatesData, error: templatesError } = await supabase.from("note_templates").select("count").single()

  if (templatesError && templatesError.code === "PGRST116") {
    // Table doesn't exist, create it
    console.log("Creating note_templates table")
    await supabase.rpc("create_note_templates_table")
  }

  // Check if settings table exists
  const { data: settingsData, error: settingsError } = await supabase.from("settings").select("count").single()

  if (settingsError && settingsError.code === "PGRST116") {
    // Table doesn't exist, create it
    console.log("Creating settings table")
    await supabase.rpc("create_settings_table")
  }
}

// Initialize default data
export async function initializeDefaultData(): Promise<void> {
  // Initialize default tables if none exist
  const { data: tablesData } = await supabase.from("tables").select("count")

  if (!tablesData || tablesData.length === 0) {
    console.log("Initializing default tables")
    const DEFAULT_TIME = 60 * 60 * 1000

    const initialTables: Table[] = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      name: `T${i + 1}`,
      isActive: false,
      startTime: null,
      remainingTime: DEFAULT_TIME,
      initialTime: DEFAULT_TIME,
      guestCount: 0,
      server: null,
      groupId: null,
      hasNotes: false,
      noteId: "",
      noteText: "",
      updated_by_admin: false,
      updated_by: null,
      updatedAt: new Date().toISOString(),
    }))

    await updateTables(initialTables)
  }

  // Initialize default servers if none exist
  const { data: serversData } = await supabase.from("servers").select("count")

  if (!serversData || serversData.length === 0) {
    console.log("Initializing default servers")
    const defaultServers: Server[] = [
      { id: "server-1", name: "Mike", enabled: true },
      { id: "server-2", name: "Ji", enabled: true },
      { id: "server-3", name: "Gun", enabled: true },
      { id: "server-4", name: "Alex", enabled: true },
      { id: "server-5", name: "Lucy", enabled: true },
      { id: "server-6", name: "Tanya", enabled: true },
      { id: "server-7", name: "Ian", enabled: true },
      { id: "server-8", name: "Rolando", enabled: true },
      { id: "server-9", name: "Alexa", enabled: true },
      { id: "server-10", name: "Diego", enabled: true },
      { id: "server-11", name: "BB", enabled: true },
    ]

    await updateServers(defaultServers)
  }

  // Initialize default note templates if none exist
  const { data: templatesData } = await supabase.from("note_templates").select("count")

  if (!templatesData || templatesData.length === 0) {
    console.log("Initializing default note templates")
    const defaultNoteTemplates: NoteTemplate[] = [
      { id: "1", text: "VIP guest" },
      { id: "2", text: "Pay at front" },
      { id: "3", text: "Prepaid" },
      { id: "4", text: "Underage" },
      { id: "5", text: "Reservation" },
    ]

    await updateNoteTemplates(defaultNoteTemplates)
  }

  // Initialize settings if they don't exist
  const { data: settingsData } = await supabase.from("settings").select("*").eq("id", "system_settings")

  if (!settingsData || settingsData.length === 0) {
    console.log("Initializing default settings")
    await updateSettings(false, 1)
  }
}

// Main initialization function
// export async function initialize(): Promise<void> {
//   try {
//     await initializeTables()
//     await initializeDefaultData()
//     console.log('Supabase service initialized successfully')
//   } catch (error) {
//     console.error('Error initializing Supabase service:', error)
//     throw error
//   }
// }

// Clean up function
// export function cleanup(): void {
//   // Close any open subscriptions or connections
//   supabase.removeAllChannels()
// }

class SupabaseService {
  // Initialize all services
  async initialize() {
    try {
      // Initialize tables
      await supabaseTablesService.initializeTables()

      // Initialize default servers and note templates
      await supabaseSettingsService.initializeDefaults()

      return { success: true }
    } catch (error) {
      console.error("Error initializing Supabase services:", error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Clean up all subscriptions
  cleanup() {
    supabaseTablesService.cleanup()
    supabaseLogsService.cleanup()
    supabaseSettingsService.cleanup()
  }

  // Get all services
  getServices() {
    return {
      auth: supabaseAuthService,
      tables: supabaseTablesService,
      logs: supabaseLogsService,
      settings: supabaseSettingsService,
    }
  }
}

const supabaseService = new SupabaseService()
export default supabaseService
