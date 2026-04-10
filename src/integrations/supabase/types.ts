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
      associations: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          short_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          short_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          background_color: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          association_id: string
          created_at: string
          id: string
          message: string
          sender_email: string
          sender_name: string
          status: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Insert: {
          association_id: string
          created_at?: string
          id?: string
          message: string
          sender_email: string
          sender_name: string
          status?: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Update: {
          association_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_email?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          association_id: string
          category: string | null
          created_at: string
          description: string | null
          end_datetime: string
          id: string
          is_registration_open: boolean
          location: string | null
          max_participants: number | null
          start_datetime: string
          title: string
        }
        Insert: {
          association_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          end_datetime: string
          id?: string
          is_registration_open?: boolean
          location?: string | null
          max_participants?: number | null
          start_datetime: string
          title: string
        }
        Update: {
          association_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          end_datetime?: string
          id?: string
          is_registration_open?: boolean
          location?: string | null
          max_participants?: number | null
          start_datetime?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          delivered_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          delivered_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          association_id: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          send_push: boolean
          status: Database["public"]["Enums"]["notification_status"]
          target_id: string
          target_type: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          association_id?: string | null
          body: string
          created_at?: string
          created_by: string
          id?: string
          send_push?: boolean
          status?: Database["public"]["Enums"]["notification_status"]
          target_id: string
          target_type: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          association_id?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          send_push?: boolean
          status?: Database["public"]["Enums"]["notification_status"]
          target_id?: string
          target_type?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          order_index: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          order_index?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          association_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_published: boolean
          title: string
        }
        Insert: {
          association_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          title: string
        }
        Update: {
          association_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          association_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          association_id?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          association_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      splash_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          order_index: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          order_index?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          order_index?: number
          title?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "etudiant" | "bds_staff" | "admin"
      message_status: "unread" | "read" | "archived"
      notification_status: "draft" | "scheduled" | "sent"
      notification_type:
        | "post_published"
        | "event_published"
        | "event_update"
        | "event_reminder"
      registration_status: "pending" | "confirmed" | "cancelled"
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
      app_role: ["etudiant", "bds_staff", "admin"],
      message_status: ["unread", "read", "archived"],
      notification_status: ["draft", "scheduled", "sent"],
      notification_type: [
        "post_published",
        "event_published",
        "event_update",
        "event_reminder",
      ],
      registration_status: ["pending", "confirmed", "cancelled"],
    },
  },
} as const
