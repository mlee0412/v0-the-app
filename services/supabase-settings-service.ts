import { getSupabaseClient } from "@/lib/supabase/client"
import type { Server, NoteTemplate } from "@/components/billiards-timer-dashboard"

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

class SupabaseSettingsService {
  private subscriptions: (() => void)[] = []

  // Initialize settings tables
  async initializeSettings(): Promise<void> {
    try {
      // Check if servers table exists
      const { data: serversData, error: serversError } = await getSupabaseClient().from("servers").select("count")

      if (serversError) {
        console.error("Error checking servers table:", serversError)
        // If table doesn't exist, create it using SQL
        if (serversError.code === "PGRST116") {
          console.log("Servers table does not exist, creating...")
          await this.createServersTable()
        } else {
          throw serversError
        }
      }

      // Check if note_templates table exists
      const { data: templatesData, error: templatesError } = await getSupabaseClient()
        .from("note_templates")
        .select("count")

      if (templatesError) {
        console.error("Error checking note_templates table:", templatesError)
        // If table doesn't exist, create it using SQL
        if (templatesError.code === "PGRST116") {
          console.log("Note templates table does not exist, creating...")
          await this.createNoteTemplatesTable()
        } else {
          throw templatesError
        }
      }

      // Initialize defaults
      await this.initializeDefaults()
    } catch (error) {
      console.error("Error initializing settings:", error)
      throw error
    }
  }

  // Create servers table using SQL
  private async createServersTable(): Promise<void> {
    try {
      const { error } = await getSupabaseClient().rpc("create_servers_table")
      if (error) throw error
    } catch (error) {
      console.error("Error creating servers table:", error)
      throw error
    }
  }

  // Create note templates table using SQL
  private async createNoteTemplatesTable(): Promise<void> {
    try {
      const { error } = await getSupabaseClient().rpc("create_note_templates_table")
      if (error) throw error
    } catch (error) {
      console.error("Error creating note templates table:", error)
      throw error
    }
  }

  // Initialize default data
  async initializeDefaults(): Promise<void> {
    try {
      // Check if servers exist before initializing defaults
      const { data: serversData, error: serversError } = await getSupabaseClient().from("servers").select("*")

      if (serversError) throw serversError

      // Only initialize servers from staff if none exist
      if (!serversData || serversData.length === 0) {
        console.log("No servers found, initializing from staff members")
        await this.initializeServersFromStaff()
      }

      // Check if note templates exist before initializing defaults
      const { data: templatesData, error: templatesError } = await getSupabaseClient()
        .from("note_templates")
        .select("*")

      if (templatesError) throw templatesError

      // Only initialize default note templates if none exist
      if (!templatesData || templatesData.length === 0) {
        console.log("No note templates found, initializing default templates")
        await this.initializeDefaultNoteTemplates()
      }
    } catch (error) {
      console.error("Error initializing defaults:", error)
      throw error
    }
  }

  // Initialize servers based on existing staff members
  private async initializeServersFromStaff(): Promise<void> {
    try {
      const { data, error } = await getSupabaseClient()
        .from("staff_members")
        .select("id, display_name, first_name")
        .order("first_name")

      if (error) throw error

      const staffServers: Server[] = (data || []).map((member: any) => ({
        id: member.id,
        name: member.display_name || member.first_name,
        enabled: true,
      }))

      if (staffServers.length > 0) {
        await this.updateServers(staffServers)
      }
    } catch (error) {
      console.error("Error initializing servers from staff:", error)
      throw error
    }
  }

  // Initialize default note templates
  private async initializeDefaultNoteTemplates(): Promise<void> {
    try {
      const defaultNoteTemplates: NoteTemplate[] = [
        { id: "1", text: "VIP guest" },
        { id: "2", text: "Pay at front" },
        { id: "3", text: "Prepaid" },
        { id: "4", text: "Underage" },
        { id: "5", text: "Reservation" },
      ]

      await this.updateNoteTemplates(defaultNoteTemplates)
    } catch (error) {
      console.error("Error initializing default note templates:", error)
      throw error
    }
  }

  // Get all servers
  async getServers(): Promise<Server[]> {
    try {
      const { data, error } = await getSupabaseClient().from("servers").select("*")

      if (error) throw error

      return data ? data.map(convertServerFromDB) : []
    } catch (error) {
      console.error("Error fetching servers:", error)
      return []
    }
  }

  // Update servers
  async updateServers(servers: Server[]): Promise<void> {
    try {
      const client = getSupabaseClient()
      const { data: existingServers, error: fetchError } = await client.from("servers").select("id")

      if (fetchError) throw fetchError

      const incomingIds = new Set(servers.map((s) => s.id))
      const idsToDelete = (existingServers || [])
        .map((s: any) => s.id)
        .filter((id: string) => !incomingIds.has(id))

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await client.from("servers").delete().in("id", idsToDelete)
        if (deleteError) throw deleteError
      }

      if (servers.length > 0) {
        const { error: upsertError } = await client
          .from("servers")
          .upsert(servers.map(convertServerToDB), { onConflict: "id" })
        if (upsertError) throw upsertError
      }

      window.dispatchEvent(
        new CustomEvent("supabase-servers-update", {
          detail: { servers: servers.map(convertServerToDB) },
        }),
      )
    } catch (error) {
      console.error("Error updating servers:", error)
      throw error
    }
  }

  // Get all note templates
  async getNoteTemplates(): Promise<NoteTemplate[]> {
    try {
      const { data, error } = await getSupabaseClient().from("note_templates").select("*")

      if (error) throw error

      return data ? data.map(convertNoteTemplateFromDB) : []
    } catch (error) {
      console.error("Error fetching note templates:", error)
      return []
    }
  }

  // Update note templates
  async updateNoteTemplates(templates: NoteTemplate[]): Promise<void> {
    try {
      // First, get existing templates to check for duplicates
      const { data: existingTemplates, error: fetchError } = await getSupabaseClient()
        .from("note_templates")
        .select("id, text")

      if (fetchError) throw fetchError

      // Filter out templates that would create duplicates by text
      const existingTexts = new Set((existingTemplates || []).map((t) => t.text.toLowerCase()))
      const templatesToUpsert = templates.filter((template) => {
        // Keep templates with existing IDs or unique text
        return existingTemplates?.some((et) => et.id === template.id) || !existingTexts.has(template.text.toLowerCase())
      })

      if (templatesToUpsert.length > 0) {
        const { error } = await getSupabaseClient()
          .from("note_templates")
          .upsert(templatesToUpsert.map(convertNoteTemplateToDB), { onConflict: "id" })

        if (error) throw error
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent("supabase-templates-update", {
          detail: { templates: templates.map(convertNoteTemplateToDB) },
        }),
      )
    } catch (error) {
      console.error("Error updating note templates:", error)
      throw error
    }
  }

  // Subscribe to servers changes
  subscribeToServers(callback: (servers: Server[]) => void): () => void {
    try {
      const channel = getSupabaseClient()
        .channel("servers-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, (payload) => {
          console.log("Servers change received:", payload)
          this.getServers().then(callback)
        })
        .subscribe()

      const unsubscribe = () => {
        channel.unsubscribe()
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to servers:", error)
      return () => {}
    }
  }

  // Subscribe to note templates changes
  subscribeToNoteTemplates(callback: (templates: NoteTemplate[]) => void): () => void {
    try {
      const channel = getSupabaseClient()
        .channel("note-templates-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "note_templates" }, (payload) => {
          console.log("Note templates change received:", payload)
          this.getNoteTemplates().then(callback)
        })
        .subscribe()

      const unsubscribe = () => {
        channel.unsubscribe()
      }

      this.subscriptions.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to note templates:", error)
      return () => {}
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.subscriptions = []
  }
}

const supabaseSettingsService = new SupabaseSettingsService()
export default supabaseSettingsService
