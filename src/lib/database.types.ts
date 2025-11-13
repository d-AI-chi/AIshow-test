export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          access_code: string
          is_active: boolean
          results_visible: boolean
          created_at: string
          match_threshold: number | null
          ends_at: string
          admin_code: string | null
        }
        Insert: {
          id?: string
          name: string
          access_code: string
          is_active?: boolean
          results_visible?: boolean
          created_at?: string
          ends_at: string
          admin_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          access_code?: string
          is_active?: boolean
          results_visible?: boolean
          created_at?: string
          ends_at?: string
          match_threshold?: number | null
          admin_code?: string | null
        }
      }
      questions: {
        Row: {
          id: string
          event_id: string
          question_text: string
          options: Json
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          question_text: string
          options: Json
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          question_text?: string
          options?: Json
          order_index?: number
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          event_id: string
          name: string
          profile_image_url: string | null
          created_at: string
          gender: string | null
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          profile_image_url?: string | null
          created_at?: string
          gender?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          profile_image_url?: string | null
          created_at?: string
          gender?: string | null
        }
      }
      answers: {
        Row: {
          id: string
          participant_id: string
          question_id: string
          selected_option_index: number
          created_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          question_id: string
          selected_option_index: number
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          question_id?: string
          selected_option_index?: number
          created_at?: string
        }
      }
      match_results: {
        Row: {
          id: string
          event_id: string
          participant_id: string
          matched_participant_id: string
          compatibility_score: number
          calculated_at: string
          is_hidden: boolean
        }
        Insert: {
          id?: string
          event_id: string
          participant_id: string
          matched_participant_id: string
          compatibility_score: number
          calculated_at?: string
          is_hidden?: boolean
        }
        Update: {
          id?: string
          event_id?: string
          participant_id?: string
          matched_participant_id?: string
          compatibility_score?: number
          calculated_at?: string
          is_hidden?: boolean
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
