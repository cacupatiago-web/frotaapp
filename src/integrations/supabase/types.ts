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
  public: {
    Tables: {
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_fillups: {
        Row: {
          created_at: string
          date: string
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          liters: number
          odometer: number | null
          price_per_liter: number
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          liters: number
          odometer?: number | null
          price_per_liter: number
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          liters?: number
          odometer?: number | null
          price_per_liter?: number
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_fillups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_fillups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          current_stock: number
          id: string
          location: string | null
          minimum_stock: number
          name: string
          notes: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          current_stock?: number
          id?: string
          location?: string | null
          minimum_stock?: number
          name: string
          notes?: string | null
          supplier_id?: string | null
          unit: string
          unit_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          location?: string | null
          minimum_stock?: number
          name?: string
          notes?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_date: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          quantity: number
          reference: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_date?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity: number
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_date?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity?: number
          reference?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          category: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          category: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          destino_label: string | null
          distance_km: number | null
          driver_id: string | null
          driver_name: string
          end_date: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          origem_label: string | null
          start_date: string
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          destino_label?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_name: string
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          origem_label?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          destino_label?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_name?: string
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          origem_label?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_maintenances: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          scheduled_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          supplier_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          scheduled_date: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          supplier_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          scheduled_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          ano: number | null
          bairro: string | null
          combustivel: Database["public"]["Enums"]["fuel_type"] | null
          created_at: string
          driver_id: string | null
          foto_url: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          marca: string
          modelo: string
          municipio: string | null
          next_service_km: number | null
          odometro: number | null
          placa: string
          provincia: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: number | null
          bairro?: string | null
          combustivel?: Database["public"]["Enums"]["fuel_type"] | null
          created_at?: string
          driver_id?: string | null
          foto_url?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          marca: string
          modelo: string
          municipio?: string | null
          next_service_km?: number | null
          odometro?: number | null
          placa: string
          provincia?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number | null
          bairro?: string | null
          combustivel?: Database["public"]["Enums"]["fuel_type"] | null
          created_at?: string
          driver_id?: string | null
          foto_url?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          marca?: string
          modelo?: string
          municipio?: string | null
          next_service_km?: number | null
          odometro?: number | null
          placa?: string
          provincia?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "motorista"
      fuel_type:
        | "gasolina"
        | "diesel"
        | "etanol"
        | "gas_natural"
        | "eletrico"
        | "hibrido"
        | "outro"
      inventory_movement_type: "entrada" | "saida" | "ajuste"
      maintenance_status: "agendado" | "em_progresso" | "concluido"
      maintenance_type:
        | "revisao_geral"
        | "troca_oleo"
        | "pneus"
        | "freios"
        | "suspensao"
        | "motor"
        | "outro"
      transaction_type: "entrada" | "saida"
      trip_status: "planeada" | "em_andamento" | "concluida" | "cancelada"
      vehicle_status: "em_operacao" | "parado" | "em_manutencao"
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
      app_role: ["admin", "motorista"],
      fuel_type: [
        "gasolina",
        "diesel",
        "etanol",
        "gas_natural",
        "eletrico",
        "hibrido",
        "outro",
      ],
      inventory_movement_type: ["entrada", "saida", "ajuste"],
      maintenance_status: ["agendado", "em_progresso", "concluido"],
      maintenance_type: [
        "revisao_geral",
        "troca_oleo",
        "pneus",
        "freios",
        "suspensao",
        "motor",
        "outro",
      ],
      transaction_type: ["entrada", "saida"],
      trip_status: ["planeada", "em_andamento", "concluida", "cancelada"],
      vehicle_status: ["em_operacao", "parado", "em_manutencao"],
    },
  },
} as const
