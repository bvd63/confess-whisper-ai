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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          language: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          language?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          language?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_state: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      auth_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_refreshed_at: string | null
          revoked_at: string | null
          stay_connected: boolean | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_refreshed_at?: string | null
          revoked_at?: string | null
          stay_connected?: boolean | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_refreshed_at?: string | null
          revoked_at?: string | null
          stay_connected?: boolean | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          confession_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      captcha_requirements: {
        Row: {
          created_at: string | null
          email: string
          id: string
          reason: string | null
          required_until: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
          required_until: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
          required_until?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          coins: number
          created_at: string
          discount_percentage: number
          display_order: number
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_usd: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          coins: number
          created_at?: string
          discount_percentage?: number
          display_order: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_usd: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          coins?: number
          created_at?: string
          discount_percentage?: number
          display_order?: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_usd?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          confession_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confession_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confession_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_private: boolean | null
          member_count: number | null
          name: string
          post_count: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_private?: boolean | null
          member_count?: number | null
          name: string
          post_count?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_private?: boolean | null
          member_count?: number | null
          name?: string
          post_count?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_boosts: {
        Row: {
          boost_until: string
          coins_spent: number | null
          confession_id: string
          created_at: string
          ends_at: string
          id: string
          purchase_scope: string | null
          starts_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          boost_until: string
          coins_spent?: number | null
          confession_id: string
          created_at?: string
          ends_at: string
          id?: string
          purchase_scope?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          boost_until?: string
          coins_spent?: number | null
          confession_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          purchase_scope?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_boosts_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_boosts_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_boosts_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_drafts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          mood: string | null
          mood_intensity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          mood?: string | null
          mood_intensity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mood?: string | null
          mood_intensity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      confession_insights: {
        Row: {
          confession_id: string
          created_at: string | null
          extra_prompt: string | null
          id: string
          insight_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string | null
          extra_prompt?: string | null
          id?: string
          insight_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string | null
          extra_prompt?: string | null
          id?: string
          insight_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_insights_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_insights_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_insights_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_reactions: {
        Row: {
          confession_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_reports: {
        Row: {
          confession_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          confession_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          confession_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confession_reports_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_reports_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confession_reports_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confessions: {
        Row: {
          ai_deep_insight: string | null
          ai_response: string | null
          author_nickname_snapshot: string | null
          author_visibility_snapshot: string | null
          category: string
          comments_count: number
          community_id: string | null
          content: string
          created_at: string
          id: string
          image_blurred: boolean | null
          image_url: string | null
          is_draft: boolean | null
          is_private: boolean | null
          is_reported: boolean | null
          likes_count: number | null
          location_city: string | null
          location_country: string | null
          location_enabled: boolean | null
          location_lat: number | null
          location_lng: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: string | null
          shared_count: number | null
          updated_at: string
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          ai_deep_insight?: string | null
          ai_response?: string | null
          author_nickname_snapshot?: string | null
          author_visibility_snapshot?: string | null
          category?: string
          comments_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_blurred?: boolean | null
          image_url?: string | null
          is_draft?: boolean | null
          is_private?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          location_city?: string | null
          location_country?: string | null
          location_enabled?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          shared_count?: number | null
          updated_at?: string
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          ai_deep_insight?: string | null
          ai_response?: string | null
          author_nickname_snapshot?: string | null
          author_visibility_snapshot?: string | null
          category?: string
          comments_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_blurred?: boolean | null
          image_url?: string | null
          is_draft?: boolean | null
          is_private?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          location_city?: string | null
          location_country?: string | null
          location_enabled?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          shared_count?: number | null
          updated_at?: string
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "confessions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_blocked: boolean | null
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          deleted_for: Json | null
          deleted_for_user_a: boolean | null
          deleted_for_user_b: boolean | null
          id: string
          updated_at: string
          user_a_id: string | null
          user_b_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_for?: Json | null
          deleted_for_user_a?: boolean | null
          deleted_for_user_b?: boolean | null
          id?: string
          updated_at?: string
          user_a_id?: string | null
          user_b_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_for?: Json | null
          deleted_for_user_a?: boolean | null
          deleted_for_user_b?: boolean | null
          id?: string
          updated_at?: string
          user_a_id?: string | null
          user_b_id?: string | null
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          executed_at: string | null
          id: string
          job_name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          job_name: string
          status: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      daily_confession_counts: {
        Row: {
          count: number
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_prompts: {
        Row: {
          active_date: string
          category: string
          created_at: string | null
          id: string
          prompt_text_de: string | null
          prompt_text_en: string
          prompt_text_es: string | null
        }
        Insert: {
          active_date: string
          category: string
          created_at?: string | null
          id?: string
          prompt_text_de?: string | null
          prompt_text_en: string
          prompt_text_es?: string | null
        }
        Update: {
          active_date?: string
          category?: string
          created_at?: string | null
          id?: string
          prompt_text_de?: string | null
          prompt_text_en?: string
          prompt_text_es?: string | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      message_typing_status: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_message_id: string | null
          content: string
          conversation_id: string
          created_at: string
          deleted_for_recipient: boolean | null
          deleted_for_sender: boolean | null
          delivered_at: string | null
          edited_at: string | null
          id: string
          is_read: boolean
          reactions: Json | null
          read_at: string | null
          seen_at: string | null
          sender_id: string
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          client_message_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean
          reactions?: Json | null
          read_at?: string | null
          seen_at?: string | null
          sender_id: string
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          client_message_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean
          reactions?: Json | null
          read_at?: string | null
          seen_at?: string | null
          sender_id?: string
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          confession_id: string | null
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
        }
        Insert: {
          action: string
          confession_id?: string | null
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          confession_id?: string | null
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_logs_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_logs_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          ai_reason: string | null
          confession_id: string | null
          content: string
          created_at: string | null
          id: string
          moderation_level: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          ai_reason?: string | null
          confession_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          moderation_level: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          ai_reason?: string | null
          confession_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          moderation_level?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          confession_id: string | null
          created_at: string | null
          id: string
          intensity: number | null
          mood: string
          user_id: string
        }
        Insert: {
          confession_id?: string | null
          created_at?: string | null
          id?: string
          intensity?: number | null
          mood: string
          user_id: string
        }
        Update: {
          confession_id?: string | null
          created_at?: string | null
          id?: string
          intensity?: number | null
          mood?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_entries_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_entries_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_content: string | null
          confession_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_for: Json | null
          id: string
          is_read: boolean
          triggered_by: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          comment_content?: string | null
          confession_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_for?: Json | null
          id?: string
          is_read?: boolean
          triggered_by?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          comment_content?: string | null
          confession_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_for?: Json | null
          id?: string
          is_read?: boolean
          triggered_by?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          stripe_payment_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          status: string
          stripe_payment_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_payment_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_flairs: {
        Row: {
          cost: number
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name_key: string
          rarity: string
          required_plan: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name_key: string
          rarity?: string
          required_plan?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_key?: string
          rarity?: string
          required_plan?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          followers_count: number | null
          following_count: number | null
          handle: string | null
          id: string
          is_nickname_public: boolean | null
          is_premium: boolean | null
          is_shadow_banned: boolean | null
          last_daily_reward: string | null
          nickname: string | null
          nickname_lower: string | null
          nickname_updated_at: string | null
          nickname_visibility:
            | Database["public"]["Enums"]["nickname_visibility_enum"]
            | null
          password_changed_at: string | null
          posts_count: number | null
          privacy_mode: string | null
          referral_code: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          total_referrals: number | null
          trial_active: boolean | null
          trial_end_date: string | null
          trial_premium_ends_at: string | null
          trial_premium_started_at: string | null
          trial_premium_used: boolean | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          handle?: string | null
          id?: string
          is_nickname_public?: boolean | null
          is_premium?: boolean | null
          is_shadow_banned?: boolean | null
          last_daily_reward?: string | null
          nickname?: string | null
          nickname_lower?: string | null
          nickname_updated_at?: string | null
          nickname_visibility?:
            | Database["public"]["Enums"]["nickname_visibility_enum"]
            | null
          password_changed_at?: string | null
          posts_count?: number | null
          privacy_mode?: string | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_referrals?: number | null
          trial_active?: boolean | null
          trial_end_date?: string | null
          trial_premium_ends_at?: string | null
          trial_premium_started_at?: string | null
          trial_premium_used?: boolean | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          handle?: string | null
          id?: string
          is_nickname_public?: boolean | null
          is_premium?: boolean | null
          is_shadow_banned?: boolean | null
          last_daily_reward?: string | null
          nickname?: string | null
          nickname_lower?: string | null
          nickname_updated_at?: string | null
          nickname_visibility?:
            | Database["public"]["Enums"]["nickname_visibility_enum"]
            | null
          password_changed_at?: string | null
          posts_count?: number | null
          privacy_mode?: string | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_referrals?: number | null
          trial_active?: boolean | null
          trial_end_date?: string | null
          trial_premium_ends_at?: string | null
          trial_premium_started_at?: string | null
          trial_premium_used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          category: string | null
          created_at: string
          id: string
          text_de: string
          text_en: string
          text_es: string
          used_count: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string
          id?: string
          text_de: string
          text_en: string
          text_es: string
          used_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string
          id?: string
          text_de?: string
          text_en?: string
          text_es?: string
          used_count?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          created_at?: string
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          claimed_at: string
          id: string
          referral_id: string
          reward_type: string
          reward_value: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          referral_id: string
          reward_type: string
          reward_value: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          referral_id?: string
          reward_type?: string
          reward_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_first_confession_at: string | null
          referred_rewarded_at: string | null
          referred_user_id: string | null
          referrer_rewarded_at: string | null
          referrer_user_id: string
          reward_claimed: boolean | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_first_confession_at?: string | null
          referred_rewarded_at?: string | null
          referred_user_id?: string | null
          referrer_rewarded_at?: string | null
          referrer_user_id: string
          reward_claimed?: boolean | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_first_confession_at?: string | null
          referred_rewarded_at?: string | null
          referred_user_id?: string | null
          referrer_rewarded_at?: string | null
          referrer_user_id?: string
          reward_claimed?: boolean | null
          status?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_entitlements: {
        Row: {
          ai_insights_quota: number | null
          ai_insights_used: number | null
          created_at: string | null
          features: Json | null
          id: string
          stripe_subscription_id: string | null
          tier: string | null
          updated_at: string | null
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          ai_insights_quota?: number | null
          ai_insights_used?: number | null
          created_at?: string | null
          features?: Json | null
          id?: string
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          ai_insights_quota?: number | null
          ai_insights_used?: number | null
          created_at?: string | null
          features?: Json | null
          id?: string
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          acquired_at: string | null
          badge_id: string
          earned_at: string | null
          expires_at: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          badge_id: string
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          badge_id?: string
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          consented_at: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          consented_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_type?: string
          consented_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_flairs: {
        Row: {
          acquired_at: string | null
          expires_at: string | null
          flair_id: string
          id: string
          is_equipped: boolean
          is_featured: boolean | null
          is_public: boolean | null
          purchase_scope: string | null
          purchased_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          expires_at?: string | null
          flair_id: string
          id?: string
          is_equipped?: boolean
          is_featured?: boolean | null
          is_public?: boolean | null
          purchase_scope?: string | null
          purchased_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          expires_at?: string | null
          flair_id?: string
          id?: string
          is_equipped?: boolean
          is_featured?: boolean | null
          is_public?: boolean | null
          purchase_scope?: string | null
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flairs_flair_id_fkey"
            columns: ["flair_id"]
            isOneToOne: false
            referencedRelation: "profile_flairs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_likes: {
        Row: {
          confession_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_likes_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "hot_confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "trending_confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avatar_seed: string | null
          created_at: string | null
          custom_color: string | null
          font_size: string | null
          id: string
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_seed?: string | null
          created_at?: string | null
          custom_color?: string | null
          font_size?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_seed?: string | null
          created_at?: string | null
          custom_color?: string | null
          font_size?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_confession_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_confession_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_confession_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      hot_confessions: {
        Row: {
          ai_deep_insight: string | null
          ai_response: string | null
          category: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          hot_score: number | null
          id: string | null
          image_blurred: boolean | null
          image_url: string | null
          is_draft: boolean | null
          is_private: boolean | null
          is_reported: boolean | null
          likes_count: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: string | null
          shared_count: number | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
        }
        Relationships: []
      }
      trending_confessions: {
        Row: {
          ai_deep_insight: string | null
          ai_response: string | null
          category: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          id: string | null
          image_blurred: boolean | null
          image_url: string | null
          is_draft: boolean | null
          is_private: boolean | null
          is_reported: boolean | null
          likes_count: number | null
          shared_count: number | null
          trending_score: number | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          ai_deep_insight?: string | null
          ai_response?: string | null
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          image_blurred?: boolean | null
          image_url?: string | null
          is_draft?: boolean | null
          is_private?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          shared_count?: number | null
          trending_score?: never
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          ai_deep_insight?: string | null
          ai_response?: string | null
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          image_blurred?: boolean | null
          image_url?: string | null
          is_draft?: boolean | null
          is_private?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          shared_count?: number | null
          trending_score?: never
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      user_post_counts: {
        Row: {
          post_count: number | null
          posts_this_month: number | null
          posts_this_week: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_coins: {
        Args: {
          _amount: number
          _description?: string
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      calculate_trending_score: {
        Args: {
          comments: number
          created_at: string
          likes: number
          shares: number
          views: number
        }
        Returns: number
      }
      can_user_post_confession: { Args: { _user_id: string }; Returns: Json }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_failed_attempts: { Args: never; Returns: undefined }
      deactivate_expired_flairs: { Args: never; Returns: undefined }
      deactivate_expired_perks: { Args: never; Returns: undefined }
      deduct_coins: {
        Args: {
          _amount: number
          _description?: string
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: boolean
      }
      delete_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      expire_active_boosts: { Args: never; Returns: undefined }
      generate_unique_handle: {
        Args: { base_nickname: string }
        Returns: string
      }
      get_conversation_partner: {
        Args: { conv_id: string; current_user_id: string }
        Returns: string
      }
      get_daily_confession_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_failed_login_count: {
        Args: { _email: string; _minutes?: number }
        Returns: number
      }
      get_hot_confessions: {
        Args: { limit_count?: number }
        Returns: {
          ai_deep_insight: string
          ai_response: string
          category: string
          comments_count: number
          content: string
          created_at: string
          hot_score: number
          id: string
          likes_count: number
          user_id: string
        }[]
      }
      get_or_create_conversation: {
        Args: { _user1: string; _user2: string }
        Returns: string
      }
      get_user_nickname: { Args: { _target_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_consent: {
        Args: { _consent_type: string; _min_version?: string; _user_id: string }
        Returns: boolean
      }
      increment_daily_confession_count: {
        Args: { _user_id: string }
        Returns: number
      }
      increment_share_count: {
        Args: { confession_id: string }
        Returns: undefined
      }
      is_badge_active: {
        Args: { acquired_at: string; expires_at: string }
        Returns: boolean
      }
      is_captcha_required: { Args: { _email: string }; Returns: boolean }
      is_community_admin: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_confession_owner: {
        Args: { _confession_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_deleted_for_user: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conversation_uuid: string; user_uuid: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _event_data?: Json
          _event_type: string
          _ip_address?: string
          _user_agent?: string
          _user_id: string
        }
        Returns: undefined
      }
      mark_messages_delivered: {
        Args: { thread_id: string; user_id: string }
        Returns: undefined
      }
      mark_messages_seen: {
        Args: { message_ids: string[]; thread_id: string; user_id: string }
        Returns: undefined
      }
      refresh_hot_confessions: { Args: never; Returns: undefined }
      revoke_all_user_sessions: {
        Args: { _user_id: string }
        Returns: undefined
      }
      revoke_trial_purchases: { Args: { _user_id: string }; Returns: undefined }
      soft_delete_conversation: {
        Args: { conv_id: string; user_id: string }
        Returns: undefined
      }
      trigger_auth_cleanup: { Args: never; Returns: Json }
      validate_nickname: { Args: { nick: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      nickname_visibility_enum: "PUBLIC" | "ANON_ON_POSTS"
      notification_type:
        | "like"
        | "comment"
        | "deep_insight"
        | "follow"
        | "badge_earned"
        | "streak_milestone"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      nickname_visibility_enum: ["PUBLIC", "ANON_ON_POSTS"],
      notification_type: [
        "like",
        "comment",
        "deep_insight",
        "follow",
        "badge_earned",
        "streak_milestone",
      ],
    },
  },
} as const
