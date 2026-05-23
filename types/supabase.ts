// filename: types/supabase.ts
// purpose: Full TypeScript type definitions matching the ZeroWaste Supabase Schema
// dependencies: none
// brief_section: Section 5 & Section 9 - Supabase Schema Design with Satellite and Ingestion Extensions

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
      loss_rate_coefficients: {
        Row: {
          id: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          commodity: string
          region: string
          country: string | null
          rate_pct: number
          source_study: string
          confidence: 'High' | 'Medium' | 'Low' | null
          year: number
          source_type: 'published' | 'satellite' | 'realtime'
        }
        Insert: {
          id?: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          commodity: string
          region: string
          country?: string | null
          rate_pct: number
          source_study: string
          confidence?: 'High' | 'Medium' | 'Low' | null
          year: number
          source_type?: 'published' | 'satellite' | 'realtime'
        }
        Update: {
          id?: string
          stage?: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          commodity?: string
          region?: string
          country?: string | null
          rate_pct?: number
          source_study?: string
          confidence?: 'High' | 'Medium' | 'Low' | null
          year?: number
          source_type?: 'published' | 'satellite' | 'realtime'
        }
        Relationships: []
      }
      baselines: {
        Row: {
          id: string
          region: string
          commodity: string
          year: number
          total_tonnes: number
          locked_at: string
          locked_by: string
        }
        Insert: {
          id?: string
          region: string
          commodity: string
          year: number
          total_tonnes: number
          locked_at?: string
          locked_by: string
        }
        Update: {
          id?: string
          region?: string
          commodity?: string
          year?: number
          total_tonnes?: number
          locked_at?: string
          locked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "baselines_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      waste_events: {
        Row: {
          id: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          category: string
          quantity_tonnes: number
          region: string
          country: string
          timestamp: string
          source: string
          operator_id: string | null
        }
        Insert: {
          id?: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          category: string
          quantity_tonnes: number
          region: string
          country: string
          timestamp?: string
          source: string
          operator_id?: string | null
        }
        Update: {
          id?: string
          stage?: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          category?: string
          quantity_tonnes?: number
          region?: string
          country?: string
          timestamp?: string
          source?: string
          operator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_events_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      interventions: {
        Row: {
          id: string
          name: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          region: string
          operator_id: string
          projected_reduction_pct: number
          projected_reduction_tonnes: number
          effort_level: 'Low' | 'Medium' | 'High'
          urgency: 'Low' | 'Medium' | 'High'
          status: 'live' | 'committed' | 'candidate' | 'unaddressed'
          deployed_at: string | null
          target_date: string
        }
        Insert: {
          id?: string
          name: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          region: string
          operator_id: string
          projected_reduction_pct: number
          projected_reduction_tonnes: number
          effort_level: 'Low' | 'Medium' | 'High'
          urgency: 'Low' | 'Medium' | 'High'
          status?: 'live' | 'committed' | 'candidate' | 'unaddressed'
          deployed_at?: string | null
          target_date: string
        }
        Update: {
          id?: string
          name?: string
          stage?: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          region?: string
          operator_id?: string
          projected_reduction_pct?: number
          projected_reduction_tonnes?: number
          effort_level?: 'Low' | 'Medium' | 'High'
          urgency?: 'Low' | 'Medium' | 'High'
          status?: 'live' | 'committed' | 'candidate' | 'unaddressed'
          deployed_at?: string | null
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      intervention_actuals: {
        Row: {
          id: string
          intervention_id: string
          period: string
          actual_reduction_tonnes: number
          projected_reduction_tonnes: number
          recorded_at: string
        }
        Insert: {
          id?: string
          intervention_id: string
          period: string
          actual_reduction_tonnes: number
          projected_reduction_tonnes: number
          recorded_at?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          period?: string
          actual_reduction_tonnes?: number
          projected_reduction_tonnes?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_actuals_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          }
        ]
      }
      risks: {
        Row: {
          id: string
          intervention_id: string
          description: string
          probability: number
          impact: number
          mitigation: string
          status: 'active' | 'mitigated' | 'retired'
        }
        Insert: {
          id?: string
          intervention_id: string
          description: string
          probability: number
          impact: number
          mitigation: string
          status?: 'active' | 'mitigated' | 'retired'
        }
        Update: {
          id?: string
          intervention_id?: string
          description?: string
          probability?: number
          impact?: number
          mitigation?: string
          status?: 'active' | 'mitigated' | 'retired'
        }
        Relationships: [
          {
            foreignKeyName: "risks_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          }
        ]
      }
      briefs: {
        Row: {
          id: string
          intervention_id: string
          content: string
          triggered_at: string
          trigger_reason: string
          acknowledged_at: string | null
          operator_id: string
        }
        Insert: {
          id?: string
          intervention_id: string
          content: string
          triggered_at?: string
          trigger_reason: string
          acknowledged_at?: string | null
          operator_id: string
        }
        Update: {
          id?: string
          intervention_id?: string
          content?: string
          triggered_at?: string
          trigger_reason?: string
          acknowledged_at?: string | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      embeddings: {
        Row: {
          id: string
          content: string
          embedding: number[]
          source_doc: string
          chunk_id: string
          metadata: Json
        }
        Insert: {
          id?: string
          content: string
          embedding: number[]
          source_doc: string
          chunk_id: string
          metadata?: Json
        }
        Update: {
          id?: string
          content?: string
          embedding?: number[]
          source_doc?: string
          chunk_id?: string
          metadata?: Json
        }
        Relationships: []
      }
      fridge_scans: {
        Row: {
          id: string
          user_id: string
          scanned_at: string
          items: Json
          total_waste_risk_kg: number
          total_co2_impact_kg: number
          image_path: string | null
        }
        Insert: {
          id?: string
          user_id: string
          scanned_at?: string
          items: Json
          total_waste_risk_kg: number
          total_co2_impact_kg: number
          image_path?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          scanned_at?: string
          items?: Json
          total_waste_risk_kg?: number
          total_co2_impact_kg?: number
          image_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fridge_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      demand_signals: {
        Row: {
          id: string
          commodity: string
          region: string
          search_velocity_index: number
          week_start: string
          source: string
          pct_change_wow: number
        }
        Insert: {
          id?: string
          commodity: string
          region: string
          search_velocity_index: number
          week_start: string
          source: string
          pct_change_wow: number
        }
        Update: {
          id?: string
          commodity?: string
          region?: string
          search_velocity_index?: number
          week_start?: string
          source?: string
          pct_change_wow?: number
        }
        Relationships: []
      }
      satellite_anomalies: {
        Row: {
          id: string
          region: string
          commodity: string
          ndvi_score: number
          anomaly_zscore: number
          captured_at: string
          sensor: string
          affected_area_ha: number
        }
        Insert: {
          id?: string
          region: string
          commodity: string
          ndvi_score: number
          anomaly_zscore: number
          captured_at?: string
          sensor: string
          affected_area_ha: number
        }
        Update: {
          id?: string
          region?: string
          commodity?: string
          ndvi_score?: number
          anomaly_zscore?: number
          captured_at?: string
          sensor?: string
          affected_area_ha?: number
        }
        Relationships: []
      }
      ingest_logs: {
        Row: {
          id: string
          script_name: string
          started_at: string
          completed_at: string | null
          rows_inserted: number
          rows_failed: number
          error_detail: string | null
        }
        Insert: {
          id?: string
          script_name: string
          started_at?: string
          completed_at?: string | null
          rows_inserted?: number
          rows_failed?: number
          error_detail?: string | null
        }
        Update: {
          id?: string
          script_name?: string
          started_at?: string
          completed_at?: string | null
          rows_inserted?: number
          rows_failed?: number
          error_detail?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_waste_by_stage: {
        Row: {
          region: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          total_waste_tonnes: number
          stage_percentage: number
        }
        Relationships: []
      }
      v_intervention_performance: {
        Row: {
          intervention_id: string
          name: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          region: string
          operator_id: string
          total_actual_reduction_tonnes: number
          total_projected_reduction_tonnes: number
          performance_ratio: number
          performance_status: 'no_data' | 'underperforming' | 'performing'
        }
        Relationships: []
      }
      v_campaign_progress: {
        Row: {
          region: string
          baseline_tonnes: number
          achieved_savings_tonnes: number
          committed_savings_tonnes: number
          total_projected_savings_tonnes: number
          campaign_reduction_pct: number
          gap_to_target_pct: number
        }
        Relationships: []
      }
      v_priority_queue: {
        Row: {
          intervention_id: string
          name: string
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer'
          region: string
          projected_reduction_tonnes: number
          effort_level: 'Low' | 'Medium' | 'High'
          urgency: 'Low' | 'Medium' | 'High'
          effort_score: number
          priority_score: number
        }
        Relationships: []
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
