export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      current_daily_choice: {
        Row: {
          daily_choice_id: number
          game_date: string
        }
        Insert: {
          daily_choice_id: number
          game_date: string
        }
        Update: {
          daily_choice_id?: number
          game_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_daily_choice_daily_choice_id_fkey"
            columns: ["daily_choice_id"]
            isOneToOne: true
            referencedRelation: "daily_choices"
            referencedColumns: ["id"]
          },
        ]
      }
      cybergrind_guesses: {
        Row: {
          created_at: string
          guess_enemy_id: number
          hint_data: Json
          id: number
          is_blessed: boolean
          is_penance: boolean
          round_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          guess_enemy_id: number
          hint_data?: Json
          id?: never
          is_blessed?: boolean
          is_penance?: boolean
          round_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          guess_enemy_id?: number
          hint_data?: Json
          id?: never
          is_blessed?: boolean
          is_penance?: boolean
          round_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cybergrind_guesses_guess_enemy_id_fkey"
            columns: ["guess_enemy_id"]
            isOneToOne: false
            referencedRelation: "ultrakill_enemies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cybergrind_guesses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "cybergrind_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      cybergrind_records: {
        Row: {
          achieved_at: string | null
          avg_accuracy: number
          best_wave: number
          client_version: string
          hint_accuracy: number
          run_id: number | null
          total_guesses: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          avg_accuracy?: number
          best_wave?: number
          client_version?: string
          hint_accuracy?: number
          run_id?: number | null
          total_guesses?: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          avg_accuracy?: number
          best_wave?: number
          client_version?: string
          hint_accuracy?: number
          run_id?: number | null
          total_guesses?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cybergrind_records_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cybergrind_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cybergrind_rounds: {
        Row: {
          blessed_enemy_ids: number[] | null
          created_at: string | null
          eclipsed_column: number | null
          enemy_id: number
          id: number
          modifiers: Database["public"]["Enums"]["cybergrind_modifier_enum"][]
          penance_enemy_ids: number[] | null
          radiance_targets:
            | Database["public"]["Enums"]["cybergrind_modifier_enum"][]
            | null
          round_number: number
          run_id: number
        }
        Insert: {
          blessed_enemy_ids?: number[] | null
          created_at?: string | null
          eclipsed_column?: number | null
          enemy_id: number
          id?: never
          modifiers?: Database["public"]["Enums"]["cybergrind_modifier_enum"][]
          penance_enemy_ids?: number[] | null
          radiance_targets?:
            | Database["public"]["Enums"]["cybergrind_modifier_enum"][]
            | null
          round_number: number
          run_id: number
        }
        Update: {
          blessed_enemy_ids?: number[] | null
          created_at?: string | null
          eclipsed_column?: number | null
          enemy_id?: number
          id?: never
          modifiers?: Database["public"]["Enums"]["cybergrind_modifier_enum"][]
          penance_enemy_ids?: number[] | null
          radiance_targets?:
            | Database["public"]["Enums"]["cybergrind_modifier_enum"][]
            | null
          round_number?: number
          run_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cybergrind_rounds_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "ultrakill_enemies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cybergrind_rounds_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cybergrind_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cybergrind_runs: {
        Row: {
          client_version: string
          current_wave: number
          ended_at: string | null
          hint_accuracy: number
          id: number
          started_at: string
          status: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_guesses: number
          user_id: string
        }
        Insert: {
          client_version?: string
          current_wave?: number
          ended_at?: string | null
          hint_accuracy?: number
          id?: never
          started_at?: string
          status?: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_guesses?: number
          user_id: string
        }
        Update: {
          client_version?: string
          current_wave?: number
          ended_at?: string | null
          hint_accuracy?: number
          id?: never
          started_at?: string
          status?: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_guesses?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_choices: {
        Row: {
          chosen_at: string
          enemy_id: number
          id: number
        }
        Insert: {
          chosen_at?: string
          enemy_id: number
          id?: never
        }
        Update: {
          chosen_at?: string
          enemy_id?: number
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "daily_choices_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "ultrakill_enemies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notification_channels: {
        Row: {
          channel_id: string
          configured_by: string
          created_at: string | null
          guild_id: string
        }
        Insert: {
          channel_id: string
          configured_by: string
          created_at?: string | null
          guild_id: string
        }
        Update: {
          channel_id?: string
          configured_by?: string
          created_at?: string | null
          guild_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notification_channels_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: true
            referencedRelation: "guilds"
            referencedColumns: ["guild_id"]
          },
        ]
      }
      daily_stats_cache: {
        Row: {
          daily_choice_id: number
          total_losses: number
          total_wins: number
          updated_at: string | null
        }
        Insert: {
          daily_choice_id: number
          total_losses?: number
          total_wins?: number
          updated_at?: string | null
        }
        Update: {
          daily_choice_id?: number
          total_losses?: number
          total_wins?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_cache_daily_choice_id_fkey"
            columns: ["daily_choice_id"]
            isOneToOne: true
            referencedRelation: "daily_choices"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_colors: {
        Row: {
          colors: Database["public"]["Enums"]["hint_color"][]
          created_at: string | null
          daily_choice_id: number
          guess_number: number
          id: number
          user_id: string
        }
        Insert: {
          colors: Database["public"]["Enums"]["hint_color"][]
          created_at?: string | null
          daily_choice_id: number
          guess_number: number
          id?: never
          user_id: string
        }
        Update: {
          colors?: Database["public"]["Enums"]["hint_color"][]
          created_at?: string | null
          daily_choice_id?: number
          guess_number?: number
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guess_colors_daily_choice_id_fkey"
            columns: ["daily_choice_id"]
            isOneToOne: false
            referencedRelation: "daily_choices"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          created_at: string
          guild_id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          guild_id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          guild_id?: string
          name?: string | null
        }
        Relationships: []
      }
      ig_cybergrind_records: {
        Row: {
          achieved_at: string
          avg_accuracy: number
          best_wave: number
          client_version: string
          run_id: number | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          avg_accuracy: number
          best_wave: number
          client_version?: string
          run_id?: number | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          avg_accuracy?: number
          best_wave?: number
          client_version?: string
          run_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_cybergrind_records_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ig_cybergrind_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_cybergrind_rounds: {
        Row: {
          completed_at: string | null
          correct_level_id: number | null
          distance: number | null
          guessed_level_id: number | null
          id: number
          image_submission_id: number | null
          public_image_url: string | null
          round_number: number
          run_id: number
          score: number | null
          started_at: string | null
          submitter_id: number | null
          time_spent_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          correct_level_id?: number | null
          distance?: number | null
          guessed_level_id?: number | null
          id?: number
          image_submission_id?: number | null
          public_image_url?: string | null
          round_number?: number
          run_id: number
          score?: number | null
          started_at?: string | null
          submitter_id?: number | null
          time_spent_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          correct_level_id?: number | null
          distance?: number | null
          guessed_level_id?: number | null
          id?: number
          image_submission_id?: number | null
          public_image_url?: string | null
          round_number?: number
          run_id?: number
          score?: number | null
          started_at?: string | null
          submitter_id?: number | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_cybergrind_rounds_correct_level_id_fkey"
            columns: ["correct_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_cybergrind_rounds_guessed_level_id_fkey"
            columns: ["guessed_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_cybergrind_rounds_image_submission_id_fkey"
            columns: ["image_submission_id"]
            isOneToOne: false
            referencedRelation: "image_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_cybergrind_rounds_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ig_cybergrind_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_cybergrind_rounds_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "approved_submitters_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_cybergrind_rounds_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "submitter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_cybergrind_runs: {
        Row: {
          cleaned_at: string | null
          client_version: string
          created_at: string
          current_wave: number
          ended_at: string | null
          health: number
          id: number
          seed: string
          status: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_time_ms: number
          user_id: string
        }
        Insert: {
          cleaned_at?: string | null
          client_version?: string
          created_at?: string
          current_wave?: number
          ended_at?: string | null
          health?: number
          id?: number
          seed?: string
          status?: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_time_ms?: number
          user_id: string
        }
        Update: {
          cleaned_at?: string | null
          client_version?: string
          created_at?: string
          current_wave?: number
          ended_at?: string | null
          health?: number
          id?: number
          seed?: string
          status?: Database["public"]["Enums"]["cybergrind_run_status_enum"]
          total_time_ms?: number
          user_id?: string
        }
        Relationships: []
      }
      image_submissions: {
        Row: {
          avg_score: number | null
          avg_time: number | null
          channel_id: string
          created_at: string | null
          guild_id: string
          id: number
          image_url: string
          level_id: number
          message_id: string
          resolved_at: string | null
          status: string
          storage_path: string | null
          submitter_id: number
          thumbs_down: number | null
          thumbs_up: number | null
          times_picked: number
        }
        Insert: {
          avg_score?: number | null
          avg_time?: number | null
          channel_id: string
          created_at?: string | null
          guild_id: string
          id?: never
          image_url: string
          level_id: number
          message_id: string
          resolved_at?: string | null
          status?: string
          storage_path?: string | null
          submitter_id: number
          thumbs_down?: number | null
          thumbs_up?: number | null
          times_picked?: number
        }
        Update: {
          avg_score?: number | null
          avg_time?: number | null
          channel_id?: string
          created_at?: string | null
          guild_id?: string
          id?: never
          image_url?: string
          level_id?: number
          message_id?: string
          resolved_at?: string | null
          status?: string
          storage_path?: string | null
          submitter_id?: number
          thumbs_down?: number | null
          thumbs_up?: number | null
          times_picked?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_submissions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["guild_id"]
          },
          {
            foreignKeyName: "image_submissions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "approved_submitters_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "submitter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_daily_rounds: {
        Row: {
          correct_level_id: number
          id: number
          image_submission_id: number
          public_image_url: string
          round_number: number
          set_id: number
          submitter_id: number
        }
        Insert: {
          correct_level_id: number
          id?: never
          image_submission_id: number
          public_image_url: string
          round_number: number
          set_id: number
          submitter_id: number
        }
        Update: {
          correct_level_id?: number
          id?: never
          image_submission_id?: number
          public_image_url?: string
          round_number?: number
          set_id?: number
          submitter_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "inferno_daily_rounds_correct_level_id_fkey"
            columns: ["correct_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_daily_rounds_image_submission_id_fkey"
            columns: ["image_submission_id"]
            isOneToOne: false
            referencedRelation: "image_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_daily_rounds_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "inferno_daily_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_daily_rounds_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "approved_submitters_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_daily_rounds_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "submitter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_daily_sets: {
        Row: {
          created_at: string | null
          game_date: string
          id: number
        }
        Insert: {
          created_at?: string | null
          game_date: string
          id?: never
        }
        Update: {
          created_at?: string | null
          game_date?: string
          id?: never
        }
        Relationships: []
      }
      inferno_daily_stats_cache: {
        Row: {
          set_id: number
          total_completed: number
          total_score_sum: number
          updated_at: string | null
        }
        Insert: {
          set_id: number
          total_completed?: number
          total_score_sum?: number
          updated_at?: string | null
        }
        Update: {
          set_id?: number
          total_completed?: number
          total_score_sum?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inferno_daily_stats_cache_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: true
            referencedRelation: "inferno_daily_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_guesses: {
        Row: {
          created_at: string | null
          distance: number
          guessed_level_id: number
          id: number
          round_id: number
          score: number
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distance: number
          guessed_level_id: number
          id?: never
          round_id: number
          score: number
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          distance?: number
          guessed_level_id?: number
          id?: never
          round_id?: number
          score?: number
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inferno_guesses_guessed_level_id_fkey"
            columns: ["guessed_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_guesses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "inferno_daily_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_image_guesses: {
        Row: {
          amount: number
          id_image_submit: number
          id_level: number
        }
        Insert: {
          amount?: number
          id_image_submit: number
          id_level: number
        }
        Update: {
          amount?: number
          id_image_submit?: number
          id_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "inferno_image_guesses_id_image_submit_fkey"
            columns: ["id_image_submit"]
            isOneToOne: false
            referencedRelation: "image_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferno_image_guesses_id_level_fkey"
            columns: ["id_level"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_results: {
        Row: {
          completed_at: string | null
          distance_history: number[] | null
          id: number
          score_history: number[] | null
          set_id: number
          total_score: number | null
          total_time_seconds: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          distance_history?: number[] | null
          id?: never
          score_history?: number[] | null
          set_id: number
          total_score?: number | null
          total_time_seconds?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          distance_history?: number[] | null
          id?: never
          score_history?: number[] | null
          set_id?: number
          total_score?: number | null
          total_time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inferno_results_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "inferno_daily_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_round_views: {
        Row: {
          round_number: number
          set_id: number
          user_id: string
          viewed_at: string
        }
        Insert: {
          round_number: number
          set_id: number
          user_id: string
          viewed_at?: string
        }
        Update: {
          round_number?: number
          set_id?: number
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inferno_round_views_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "inferno_daily_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      inferno_user_stats_cache: {
        Row: {
          games_played: number
          total_score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          games_played?: number
          total_score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          games_played?: number
          total_score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      level_enemies: {
        Row: {
          enemy_id: number
          level_id: number
        }
        Insert: {
          enemy_id: number
          level_id: number
        }
        Update: {
          enemy_id?: number
          level_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_enemies_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "ultrakill_enemies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_enemies_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          id: number
          level_name: string
          level_number: string
          order_index: number | null
          thumbnail_url: string | null
          wiki_url: string | null
        }
        Insert: {
          id?: never
          level_name: string
          level_number: string
          order_index?: number | null
          thumbnail_url?: string | null
          wiki_url?: string | null
        }
        Update: {
          id?: never
          level_name?: string
          level_number?: string
          order_index?: number | null
          thumbnail_url?: string | null
          wiki_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          channel_id: string | null
          discord_id: string | null
          discord_name: string
          id: string
          pings_opted_in: boolean
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          channel_id?: string | null
          discord_id?: string | null
          discord_name: string
          id: string
          pings_opted_in?: boolean
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          channel_id?: string | null
          discord_id?: string | null
          discord_name?: string
          id?: string
          pings_opted_in?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      read_messages: {
        Row: {
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rejected_threads: {
        Row: {
          created_at: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string | null
          thread_id?: string
        }
        Relationships: []
      }
      streak_cache: {
        Row: {
          current_streak: number
          last_win_daily_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_win_daily_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number
          last_win_daily_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      submission_forums: {
        Row: {
          channel_id: string
          created_at: string | null
          guild_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          guild_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          guild_id?: string
        }
        Relationships: []
      }
      submitter_profiles: {
        Row: {
          discord_avatar_url: string | null
          discord_name: string
          discord_user_id: string
          id: number
          updated_at: string | null
        }
        Insert: {
          discord_avatar_url?: string | null
          discord_name: string
          discord_user_id: string
          id?: never
          updated_at?: string | null
        }
        Update: {
          discord_avatar_url?: string | null
          discord_name?: string
          discord_user_id?: string
          id?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      supporters: {
        Row: {
          amount: number | null
          board_expiry: string | null
          created_at: string | null
          currency: string | null
          email_hash: string | null
          id: string
          is_subscription: boolean | null
          kofi_id: string | null
          kofi_transaction_id: string
          message: string | null
          name: string | null
          payment_provider: string | null
          shipping_address: string | null
          subscription_expiry: string | null
          transaction_type: string | null
        }
        Insert: {
          amount?: number | null
          board_expiry?: string | null
          created_at?: string | null
          currency?: string | null
          email_hash?: string | null
          id?: string
          is_subscription?: boolean | null
          kofi_id?: string | null
          kofi_transaction_id: string
          message?: string | null
          name?: string | null
          payment_provider?: string | null
          shipping_address?: string | null
          subscription_expiry?: string | null
          transaction_type?: string | null
        }
        Update: {
          amount?: number | null
          board_expiry?: string | null
          created_at?: string | null
          currency?: string | null
          email_hash?: string | null
          id?: string
          is_subscription?: boolean | null
          kofi_id?: string | null
          kofi_transaction_id?: string
          message?: string | null
          name?: string | null
          payment_provider?: string | null
          shipping_address?: string | null
          subscription_expiry?: string | null
          transaction_type?: string | null
        }
        Relationships: []
      }
      ultrakill_enemies: {
        Row: {
          active: boolean
          can_spawn_in_grind: boolean | null
          debut_level_id: number | null
          enemy_type: Database["public"]["Enums"]["enemy_type_enum"] | null
          first_appearance: string | null
          full_body_url: string | null
          has_head_hitzone: boolean | null
          has_limb_hitzone: boolean | null
          health: number | null
          icon_urls: string[] | null
          id: number
          is_boss: boolean | null
          is_flammable: boolean | null
          name: string
          weight_class: Database["public"]["Enums"]["weight_class_enum"] | null
          wiki_link: string | null
        }
        Insert: {
          active?: boolean
          can_spawn_in_grind?: boolean | null
          debut_level_id?: number | null
          enemy_type?: Database["public"]["Enums"]["enemy_type_enum"] | null
          first_appearance?: string | null
          full_body_url?: string | null
          has_head_hitzone?: boolean | null
          has_limb_hitzone?: boolean | null
          health?: number | null
          icon_urls?: string[] | null
          id?: never
          is_boss?: boolean | null
          is_flammable?: boolean | null
          name: string
          weight_class?: Database["public"]["Enums"]["weight_class_enum"] | null
          wiki_link?: string | null
        }
        Update: {
          active?: boolean
          can_spawn_in_grind?: boolean | null
          debut_level_id?: number | null
          enemy_type?: Database["public"]["Enums"]["enemy_type_enum"] | null
          first_appearance?: string | null
          full_body_url?: string | null
          has_head_hitzone?: boolean | null
          has_limb_hitzone?: boolean | null
          health?: number | null
          icon_urls?: string[] | null
          id?: never
          is_boss?: boolean | null
          is_flammable?: boolean | null
          name?: string
          weight_class?: Database["public"]["Enums"]["weight_class_enum"] | null
          wiki_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ultrakill_enemies_debut_level_id_fkey"
            columns: ["debut_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guesses: {
        Row: {
          created_at: string
          daily_choice_id: number
          guess_enemy_id: number
          hint_data: Json
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_choice_id: number
          guess_enemy_id: number
          hint_data?: Json
          id?: never
          user_id?: string
        }
        Update: {
          created_at?: string
          daily_choice_id?: number
          guess_enemy_id?: number
          hint_data?: Json
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guesses_daily_choice_id_fkey"
            columns: ["daily_choice_id"]
            isOneToOne: false
            referencedRelation: "daily_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_guesses_guess_enemy_id_fkey"
            columns: ["guess_enemy_id"]
            isOneToOne: false
            referencedRelation: "ultrakill_enemies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guilds: {
        Row: {
          guild_id: string
          last_seen_at: string | null
          user_id: string
        }
        Insert: {
          guild_id: string
          last_seen_at?: string | null
          user_id: string
        }
        Update: {
          guild_id?: string
          last_seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guilds_guild_id_fkey_guilds"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["guild_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          settings: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          settings?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          settings?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_wins: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          daily_choice_id: number
          id: number
          is_win: boolean
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          daily_choice_id: number
          id?: never
          is_win?: boolean
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          daily_choice_id?: number
          id?: never
          is_win?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wins_daily_choice_id_fkey"
            columns: ["daily_choice_id"]
            isOneToOne: false
            referencedRelation: "daily_choices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approved_submitters_v: {
        Row: {
          discord_avatar_url: string | null
          discord_name: string | null
          id: number | null
          submissions_count: number | null
        }
        Relationships: []
      }
      cybergrind_leaderboard: {
        Row: {
          achieved_at: string | null
          avatar_url: string | null
          avg_accuracy: number | null
          best_wave: number | null
          client_version: string | null
          discord_name: string | null
          hint_accuracy: number | null
          rank: number | null
          total_guesses: number | null
          user_id: string | null
        }
        Relationships: []
      }
      ig_cybergrind_leaderboard: {
        Row: {
          achieved_at: string | null
          avatar_url: string | null
          avg_accuracy: number | null
          best_wave: number | null
          client_version: string | null
          discord_name: string | null
          rank: number | null
          user_id: string | null
        }
        Relationships: []
      }
      level_submission_counts: {
        Row: {
          approved_count: number | null
          level_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_submissions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abandon_cybergrind_run: { Args: { version?: string }; Returns: Json }
      abandon_ig_cybergrind_run: { Args: never; Returns: Json }
      advance_ig_cybergrind_setup: {
        Args: { caller_id: string; version: string }
        Returns: Json
      }
      advance_ig_cybergrind_setup_bucketless: {
        Args: { caller_id: string; version: string }
        Returns: Json
      }
      apply_hint_modifiers: {
        Args: {
          p_eclipsed_column: number
          p_hint: Json
          p_modifiers: Database["public"]["Enums"]["cybergrind_modifier_enum"][]
          p_radiance_targets: Database["public"]["Enums"]["cybergrind_modifier_enum"][]
        }
        Returns: Json
      }
      assert_guild_member: { Args: { p_guild_id: string }; Returns: undefined }
      calculate_ig_cybergrind_drain: {
        Args: {
          p_apply_grace_period?: boolean
          p_round_number: number
          p_run_id: number
          p_time_spent_seconds: number
        }
        Returns: number
      }
      compute_enemy_hint: {
        Args: { p_guess_id: number; p_target_id: number }
        Returns: Json
      }
      compute_hint_accuracy: { Args: { p_hint: Json }; Returns: number }
      end_cybergrind_run: {
        Args: {
          p_status: Database["public"]["Enums"]["cybergrind_run_status_enum"]
        }
        Returns: Json
      }
      end_ig_cybergrind_run: {
        Args: {
          p_run_id: number
          p_status: Database["public"]["Enums"]["cybergrind_run_status_enum"]
        }
        Returns: Json
      }
      get_classic_init: { Args: { version?: string }; Returns: Json }
      get_cybergrind_start_waves: { Args: never; Returns: number[] }
      get_cybergrind_state: { Args: { p_version?: string }; Returns: Json }
      get_daily_guesses: { Args: never; Returns: Json }
      get_daily_inferno_share: { Args: { p_discord_id: string }; Returns: Json }
      get_daily_share: { Args: { p_discord_id: string }; Returns: Json }
      get_daily_stats: { Args: never; Returns: Json }
      get_guild_combined_summary: {
        Args: { p_guild_id: string }
        Returns: Json
      }
      get_guild_inferno_summary: { Args: { p_guild_id: string }; Returns: Json }
      get_guild_streaks: {
        Args: { p_guild_id: string }
        Returns: {
          streak: number
          user_id: string
        }[]
      }
      get_ig_cybergrind_start_waves: { Args: never; Returns: number[] }
      get_ig_cybergrind_state: { Args: never; Returns: Json }
      get_inferno_round: { Args: { version?: string }; Returns: Json }
      get_min_client_version: { Args: never; Returns: string }
      get_server_time: { Args: never; Returns: number }
      get_submission_stats:
        | { Args: never; Returns: Json }
        | { Args: { p_submission_ids: number[] }; Returns: Json }
      get_user_longest_streak: { Args: { p_user_id: string }; Returns: number }
      get_user_streak_by_id: { Args: { p_user_id: string }; Returns: number }
      has_never_played: { Args: never; Returns: boolean }
      init_game: { Args: never; Returns: Json }
      is_member_of_guild: { Args: { p_guild_id: string }; Returns: boolean }
      pick_daily_enemy: { Args: never; Returns: undefined }
      reset_user_daily: { Args: { p_user_id: string }; Returns: undefined }
      run_daily_rotation: { Args: never; Returns: undefined }
      shares_guild_with: { Args: { p_user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_cybergrind_run: {
        Args: { start_wave?: number; version?: string }
        Returns: Json
      }
      start_ig_cybergrind_run: {
        Args: { caller_id: string; start_wave: number; version: string }
        Returns: Json
      }
      start_ig_cybergrind_run_bucketless: {
        Args: { caller_id: string; start_wave: number; version: string }
        Returns: Json
      }
      submit_cybergrind_guess: {
        Args: { guess_id: number; version?: string }
        Returns: Json
      }
      submit_daily_guess: {
        Args: { guess_id: number; version?: string }
        Returns: Json
      }
      submit_ig_cybergrind_guess: {
        Args: {
          p_guessed_level_id: number
          p_round_id: number
          version?: string
        }
        Returns: Json
      }
      submit_inferno_guess: {
        Args: {
          p_guessed_level_id: number
          p_round_id: number
          version?: string
        }
        Returns: Json
      }
      terminate_ig_cybergrind_run: { Args: never; Returns: Json }
      trigger_dispatch_submissions: { Args: never; Returns: undefined }
      trigger_ig_cleanup: { Args: never; Returns: undefined }
      trigger_poll_submissions: { Args: never; Returns: undefined }
      vacuum_clean_maintenance: { Args: never; Returns: undefined }
      wipe_user_data: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      cybergrind_modifier_enum:
        | "PENANCE"
        | "FALSIFIER"
        | "LETHE"
        | "ECLIPSE"
        | "RADIANCE"
        | "IDOL"
      cybergrind_run_status_enum: "active" | "failed" | "abandoned"
      enemy_type_enum:
        | "???"
        | "DEMON"
        | "MACHINE"
        | "HUSK"
        | "ANGEL"
        | "PRIME SOUL"
      hint_color: "RED" | "GREEN" | "YELLOW"
      weight_class_enum: "LIGHT" | "MEDIUM" | "HEAVY" | "SUPERHEAVY"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cybergrind_modifier_enum: [
        "PENANCE",
        "FALSIFIER",
        "LETHE",
        "ECLIPSE",
        "RADIANCE",
        "IDOL",
      ],
      cybergrind_run_status_enum: ["active", "failed", "abandoned"],
      enemy_type_enum: [
        "???",
        "DEMON",
        "MACHINE",
        "HUSK",
        "ANGEL",
        "PRIME SOUL",
      ],
      hint_color: ["RED", "GREEN", "YELLOW"],
      weight_class_enum: ["LIGHT", "MEDIUM", "HEAVY", "SUPERHEAVY"],
    },
  },
} as const
