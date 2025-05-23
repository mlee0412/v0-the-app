export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          name: string
          role: "admin" | "server" | "viewer"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          name: string
          role: "admin" | "server" | "viewer"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          name?: string
          role?: "admin" | "server" | "viewer"
          created_at?: string
          updated_at?: string
        }
      }
      user_permissions: {
        Row: {
          user_id: string
          can_start_session: boolean
          can_end_session: boolean
          can_add_time: boolean
          can_subtract_time: boolean
          can_update_guests: boolean
          can_assign_server: boolean
          can_group_tables: boolean
          can_ungroup_table: boolean
          can_move_table: boolean
          can_update_notes: boolean
          can_view_logs: boolean
          can_manage_users: boolean
          can_manage_settings: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          can_start_session?: boolean
          can_end_session?: boolean
          can_add_time?: boolean
          can_subtract_time?: boolean
          can_update_guests?: boolean
          can_assign_server?: boolean
          can_group_tables?: boolean
          can_ungroup_table?: boolean
          can_move_table?: boolean
          can_update_notes?: boolean
          can_view_logs?: boolean
          can_manage_users?: boolean
          can_manage_settings?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          can_start_session?: boolean
          can_end_session?: boolean
          can_add_time?: boolean
          can_subtract_time?: boolean
          can_update_guests?: boolean
          can_assign_server?: boolean
          can_group_tables?: boolean
          can_ungroup_table?: boolean
          can_move_table?: boolean
          can_update_notes?: boolean
          can_view_logs?: boolean
          can_manage_users?: boolean
          can_manage_settings?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      servers: {
        Row: {
          id: string
          name: string
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      note_templates: {
        Row: {
          id: string
          text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          text: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          text?: string
          created_at?: string
          updated_at?: string
        }
      }
      billiard_tables: {
        Row: {
          id: number
          name: string
          is_active: boolean
          start_time: number | null
          remaining_time: number
          initial_time: number
          guest_count: number
          server_id: string | null
          group_id: string | null
          has_notes: boolean
          note_id: string | null
          note_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          is_active?: boolean
          start_time?: number | null
          remaining_time?: number
          initial_time?: number
          guest_count?: number
          server_id?: string | null
          group_id?: string | null
          has_notes?: boolean
          note_id?: string | null
          note_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          is_active?: boolean
          start_time?: number | null
          remaining_time?: number
          initial_time?: number
          guest_count?: number
          server_id?: string | null
          group_id?: string | null
          has_notes?: boolean
          note_id?: string | null
          note_text?: string
          created_at?: string
          updated_at?: string
        }
      }
      session_logs: {
        Row: {
          id: string
          table_id: number
          table_name: string
          action: string
          timestamp: number
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          table_id: number
          table_name: string
          action: string
          timestamp: number
          details?: string
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: number
          table_name?: string
          action?: string
          timestamp?: number
          details?: string
          created_at?: string
        }
      }
      session_feedback: {
        Row: {
          id: string
          table_id: number
          rating: "good" | "bad"
          comment: string
          timestamp: number
          created_at: string
        }
        Insert: {
          id?: string
          table_id: number
          rating: "good" | "bad"
          comment?: string
          timestamp: number
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: number
          rating?: "good" | "bad"
          comment?: string
          timestamp?: number
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: number
          day_started: boolean
          group_counter: number
          last_updated: string
        }
        Insert: {
          id?: number
          day_started?: boolean
          group_counter?: number
          last_updated?: string
        }
        Update: {
          id?: number
          day_started?: boolean
          group_counter?: number
          last_updated?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
