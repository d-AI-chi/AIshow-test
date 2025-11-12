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
          ends_at: string
        }
        Insert: {
          id?: string
          name: string
          access_code: string
          is_active?: boolean
          results_visible?: boolean
          created_at?: string
          ends_at: string
        }
        Update: {
          id?: string
          name?: string
          access_code?: string
          is_active?: boolean
          results_visible?: boolean
          created_at?: string
          ends_at?: string
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
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          profile_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          profile_image_url?: string | null
          created_at?: string
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
        }
        Insert: {
          id?: string
          event_id: string
          participant_id: string
          matched_participant_id: string
          compatibility_score: number
          calculated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          participant_id?: string
          matched_participant_id?: string
          compatibility_score?: number
          calculated_at?: string
        }
      }
    }
  }
}
