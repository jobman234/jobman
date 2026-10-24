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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artisan_profiles: {
        Row: {
          approved_at: string | null
          bio: string | null
          created_at: string
          current_address_house: string | null
          current_address_landmark: string | null
          current_address_lga: string | null
          current_address_state: string | null
          current_address_street: string | null
          date_of_birth: string | null
          government_id_back_url: string | null
          government_id_front_url: string | null
          government_id_type: string | null
          id: string
          is_public: boolean | null
          job_photos: string[] | null
          job_videos: string[] | null
          nin: string | null
          portrait_url: string | null
          previous_address_house: string | null
          previous_address_landmark: string | null
          previous_address_lga: string | null
          previous_address_state: string | null
          previous_address_street: string | null
          primary_trade: string
          proof_of_address_url: string | null
          reference1_job_type: string | null
          reference1_location: string | null
          reference1_name: string | null
          reference1_phone: string | null
          reference2_job_type: string | null
          reference2_location: string | null
          reference2_name: string | null
          reference2_phone: string | null
          rejection_note: string | null
          selfie_match_score: number | null
          selfie_url: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          work_photo_url: string | null
          years_experience: number | null
        }
        Insert: {
          approved_at?: string | null
          bio?: string | null
          created_at?: string
          current_address_house?: string | null
          current_address_landmark?: string | null
          current_address_lga?: string | null
          current_address_state?: string | null
          current_address_street?: string | null
          date_of_birth?: string | null
          government_id_back_url?: string | null
          government_id_front_url?: string | null
          government_id_type?: string | null
          id?: string
          is_public?: boolean | null
          job_photos?: string[] | null
          job_videos?: string[] | null
          nin?: string | null
          portrait_url?: string | null
          previous_address_house?: string | null
          previous_address_landmark?: string | null
          previous_address_lga?: string | null
          previous_address_state?: string | null
          previous_address_street?: string | null
          primary_trade: string
          proof_of_address_url?: string | null
          reference1_job_type?: string | null
          reference1_location?: string | null
          reference1_name?: string | null
          reference1_phone?: string | null
          reference2_job_type?: string | null
          reference2_location?: string | null
          reference2_name?: string | null
          reference2_phone?: string | null
          rejection_note?: string | null
          selfie_match_score?: number | null
          selfie_url?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          work_photo_url?: string | null
          years_experience?: number | null
        }
        Update: {
          approved_at?: string | null
          bio?: string | null
          created_at?: string
          current_address_house?: string | null
          current_address_landmark?: string | null
          current_address_lga?: string | null
          current_address_state?: string | null
          current_address_street?: string | null
          date_of_birth?: string | null
          government_id_back_url?: string | null
          government_id_front_url?: string | null
          government_id_type?: string | null
          id?: string
          is_public?: boolean | null
          job_photos?: string[] | null
          job_videos?: string[] | null
          nin?: string | null
          portrait_url?: string | null
          previous_address_house?: string | null
          previous_address_landmark?: string | null
          previous_address_lga?: string | null
          previous_address_state?: string | null
          previous_address_street?: string | null
          primary_trade?: string
          proof_of_address_url?: string | null
          reference1_job_type?: string | null
          reference1_location?: string | null
          reference1_name?: string | null
          reference1_phone?: string | null
          reference2_job_type?: string | null
          reference2_location?: string | null
          reference2_name?: string | null
          reference2_phone?: string | null
          rejection_note?: string | null
          selfie_match_score?: number | null
          selfie_url?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          work_photo_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      artisan_requests: {
        Row: {
          admin_note: string | null
          agreed_price: number | null
          agreed_timeline: string | null
          assigned_artisan_id: string | null
          budget_max: number | null
          budget_min: number | null
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          job_id: string | null
          location_address: string | null
          location_lga: string | null
          location_state: string | null
          preferred_start: string | null
          status: Database["public"]["Enums"]["artisan_request_status"]
          trade_category: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          agreed_price?: number | null
          agreed_timeline?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          job_id?: string | null
          location_address?: string | null
          location_lga?: string | null
          location_state?: string | null
          preferred_start?: string | null
          status?: Database["public"]["Enums"]["artisan_request_status"]
          trade_category: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          agreed_price?: number | null
          agreed_timeline?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          job_id?: string | null
          location_address?: string | null
          location_lga?: string | null
          location_state?: string | null
          preferred_start?: string | null
          status?: Database["public"]["Enums"]["artisan_request_status"]
          trade_category?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artisan_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisan_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisan_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          admin_unread: boolean
          created_at: string
          id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_unread?: boolean
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_unread?: boolean
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          request_id: string | null
          role: string
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          request_id?: string | null
          role: string
          sender_role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          request_id?: string | null
          role?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "artisan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_replies: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          message: string
          submission_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          message: string
          submission_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          message?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_replies_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_decision: string | null
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          escrow_id: string
          evidence_urls: string[] | null
          id: string
          job_id: string
          raised_against: string
          raised_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_decision?: string | null
          admin_notes?: string | null
          category: string
          created_at?: string
          description: string
          escrow_id: string
          evidence_urls?: string[] | null
          id?: string
          job_id: string
          raised_against: string
          raised_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_decision?: string | null
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          escrow_id?: string
          evidence_urls?: string[] | null
          id?: string
          job_id?: string
          raised_against?: string
          raised_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      escrows: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string
          payee_id: string
          payer_id: string
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id: string
          payee_id: string
          payer_id: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string
          payee_id?: string
          payer_id?: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          agreed_at: string | null
          agreed_price: number | null
          agreed_scope: string | null
          agreed_timeline: string | null
          artisan_completed_at: string | null
          assigned_artisan_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          customer_id: string
          description: string
          duration_days: number | null
          escrow_release_deadline: string | null
          id: string
          location_address: string | null
          location_lga: string | null
          location_state: string | null
          photos: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          trade_category: string
          updated_at: string
        }
        Insert: {
          agreed_at?: string | null
          agreed_price?: number | null
          agreed_scope?: string | null
          agreed_timeline?: string | null
          artisan_completed_at?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_id: string
          description: string
          duration_days?: number | null
          escrow_release_deadline?: string | null
          id?: string
          location_address?: string | null
          location_lga?: string | null
          location_state?: string | null
          photos?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          trade_category: string
          updated_at?: string
        }
        Update: {
          agreed_at?: string | null
          agreed_price?: number | null
          agreed_scope?: string | null
          agreed_timeline?: string | null
          artisan_completed_at?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_id?: string
          description?: string
          duration_days?: number | null
          escrow_release_deadline?: string | null
          id?: string
          location_address?: string | null
          location_lga?: string | null
          location_state?: string | null
          photos?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          trade_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          job_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          job_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          job_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          artisan_id: string
          created_at: string
          id: string
          job_id: string
          message: string | null
          parent_id: string | null
          proposed_price: number
          proposed_timeline: string | null
          sender_role: string
          status: Database["public"]["Enums"]["negotiation_status"]
        }
        Insert: {
          artisan_id: string
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          parent_id?: string | null
          proposed_price: number
          proposed_timeline?: string | null
          sender_role: string
          status?: Database["public"]["Enums"]["negotiation_status"]
        }
        Update: {
          artisan_id?: string
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          parent_id?: string | null
          proposed_price?: number
          proposed_timeline?: string | null
          sender_role?: string
          status?: Database["public"]["Enums"]["negotiation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      profile_boosts: {
        Row: {
          amount_paid: number
          boost_type: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          starts_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          boost_type?: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          starts_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          boost_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string
          id: string
          lga: string | null
          onboarding_completed: boolean
          phone: string | null
          phone_verified: boolean | null
          referral_code: string | null
          referred_by: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name: string
          id?: string
          lga?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string
          id?: string
          lga?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          id: string
          referral_credited: boolean
          referred_user_id: string
          referrer_id: string
          reward_amount: number
          rewarded_at: string
        }
        Insert: {
          id?: string
          referral_credited?: boolean
          referred_user_id: string
          referrer_id: string
          reward_amount?: number
          rewarded_at?: string
        }
        Update: {
          id?: string
          referral_credited?: boolean
          referred_user_id?: string
          referrer_id?: string
          reward_amount?: number
          rewarded_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          referral_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          referral_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          referral_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      artisan_profiles_public: {
        Row: {
          bio: string | null
          created_at: string | null
          current_address_lga: string | null
          current_address_state: string | null
          has_verification_docs: boolean | null
          id: string | null
          is_public: boolean | null
          job_photos: string[] | null
          job_videos: string[] | null
          portrait_url: string | null
          primary_trade: string | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          work_photo_url: string | null
          years_experience: number | null
        }
        Relationships: []
      }
      jobs_safe: {
        Row: {
          agreed_at: string | null
          agreed_price: number | null
          agreed_scope: string | null
          agreed_timeline: string | null
          artisan_completed_at: string | null
          assigned_artisan_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          duration_days: number | null
          escrow_release_deadline: string | null
          id: string | null
          location_address: string | null
          location_lga: string | null
          location_state: string | null
          photos: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string | null
          trade_category: string | null
          updated_at: string | null
        }
        Insert: {
          agreed_at?: string | null
          agreed_price?: number | null
          agreed_scope?: string | null
          agreed_timeline?: string | null
          artisan_completed_at?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          duration_days?: number | null
          escrow_release_deadline?: string | null
          id?: string | null
          location_address?: never
          location_lga?: string | null
          location_state?: string | null
          photos?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string | null
          trade_category?: string | null
          updated_at?: string | null
        }
        Update: {
          agreed_at?: string | null
          agreed_price?: number | null
          agreed_scope?: string | null
          agreed_timeline?: string | null
          artisan_completed_at?: string | null
          assigned_artisan_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          duration_days?: number | null
          escrow_release_deadline?: string | null
          id?: string | null
          location_address?: never
          location_lga?: string | null
          location_state?: string | null
          photos?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string | null
          trade_category?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          lga: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          lga?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          lga?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_request: {
        Args: {
          _artisan_id: string
          _note?: string
          _price: number
          _request_id: string
          _timeline: string
        }
        Returns: string
      }
      artisan_mark_complete: { Args: { _job_id: string }; Returns: undefined }
      auto_release_expired_escrows: { Args: never; Returns: number }
      calculate_trust_score: { Args: { _user_id: string }; Returns: number }
      check_and_credit_referral: {
        Args: { _referred_user_id: string }
        Returns: undefined
      }
      complete_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          _link?: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fund_escrow: {
        Args: {
          _amount: number
          _job_id: string
          _payee_id: string
          _payer_id: string
        }
        Returns: string
      }
      generate_phone_otp: { Args: { _user_id: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_nin: { Args: { _nin: string }; Returns: string }
      is_public_artisan: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purchase_profile_boost: {
        Args: { _boost_type: string; _days: number; _price: number }
        Returns: undefined
      }
      raise_dispute: {
        Args: {
          _category: string
          _description: string
          _escrow_id: string
          _evidence_urls?: string[]
          _job_id: string
          _raised_against: string
          _raised_by: string
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      release_escrow: { Args: { _escrow_id: string }; Returns: undefined }
      start_job: { Args: { _job_id: string }; Returns: undefined }
      transfer_referral_to_wallet: {
        Args: { _amount: number }
        Returns: undefined
      }
      verify_phone_otp: {
        Args: { _otp_code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "artisan" | "admin" | "super_admin"
      artisan_request_status:
        | "new"
        | "admin_review"
        | "matched"
        | "assigned"
        | "completed"
        | "cancelled"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved_artisan"
        | "resolved_customer"
        | "resolved_split"
        | "closed"
      escrow_status: "held" | "released" | "refunded" | "disputed"
      job_status:
        | "open"
        | "in_negotiation"
        | "agreed"
        | "in_progress"
        | "completed"
        | "cancelled"
      negotiation_status:
        | "pending"
        | "countered"
        | "accepted"
        | "rejected"
        | "withdrawn"
      transaction_status: "pending" | "completed" | "failed" | "reversed"
      transaction_type: "credit" | "debit"
      verification_status: "unverified" | "pending" | "approved" | "rejected"
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
  public: {
    Enums: {
      app_role: ["customer", "artisan", "admin", "super_admin"],
      artisan_request_status: [
        "new",
        "admin_review",
        "matched",
        "assigned",
        "completed",
        "cancelled",
      ],
      dispute_status: [
        "open",
        "under_review",
        "resolved_artisan",
        "resolved_customer",
        "resolved_split",
        "closed",
      ],
      escrow_status: ["held", "released", "refunded", "disputed"],
      job_status: [
        "open",
        "in_negotiation",
        "agreed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      negotiation_status: [
        "pending",
        "countered",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      transaction_status: ["pending", "completed", "failed", "reversed"],
      transaction_type: ["credit", "debit"],
      verification_status: ["unverified", "pending", "approved", "rejected"],
    },
  },
} as const
