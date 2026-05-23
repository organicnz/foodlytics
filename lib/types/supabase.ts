// filename: lib/types/supabase.ts
// purpose: Provide database-wide TypeScript type definitions representing all 13 tables, 4 views, and custom functions
// with full compatibility for Supabase client's GenericSchema constraints

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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      embeddings: {
        Row: {
          id: string
          content: string
          embedding: string
          source_doc: string
          chunk_id: string
          metadata: Json
        }
        Insert: {
          id?: string
          content: string
          embedding: string
          source_doc: string
          chunk_id: string
          metadata?: Json
        }
        Update: {
          id?: string
          content?: string
          embedding?: string
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
        Relationships: []
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
      household_waste_logs: {
        Row: {
          id: string
          food_name: string
          category: string
          weight_lbs: number
          cost_usd: number
          discard_date: string
          reason: string
          co2_impact_lbs: number
          water_impact_gal: number
          created_at: string
        }
        Insert: {
          id?: string
          food_name: string
          category: string
          weight_lbs: number
          cost_usd: number
          discard_date: string
          reason: string
          co2_impact_lbs: number
          water_impact_gal: number
          created_at?: string
        }
        Update: {
          id?: string
          food_name?: string
          category?: string
          weight_lbs?: number
          cost_usd?: number
          discard_date?: string
          reason?: string
          co2_impact_lbs?: number
          water_impact_gal?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_waste_by_stage: {
        Row: {
          region: string | null
          stage: 'farm/harvest' | 'storage' | 'processing' | 'retail' | 'consumer' | null
          total_waste_tonnes: number | null
          stage_percentage: number | null
        }
        Relationships: []
      }
      v_intervention_performance: {
        Row: {
          intervention_id: string | null
          name: string | null
          stage: string | null
          region: string | null
          operator_id: string | null
          total_actual_reduction_tonnes: number | null
          total_projected_reduction_tonnes: number | null
          performance_ratio: number | null
          performance_status: string | null
        }
        Relationships: []
      }
      v_campaign_progress: {
        Row: {
          region: string | null
          baseline_tonnes: number | null
          achieved_savings_tonnes: number | null
          committed_savings_tonnes: number | null
          total_projected_savings_tonnes: number | null
          campaign_reduction_pct: number | null
          gap_to_target_pct: number | null
        }
        Relationships: []
      }
      v_priority_queue: {
        Row: {
          intervention_id: string | null
          name: string | null
          stage: string | null
          region: string | null
          projected_reduction_tonnes: number | null
          effort_level: string | null
          urgency: string | null
          effort_score: number | null
          priority_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          filter_metadata?: Json
        }
        Returns: {
          id: string
          content: string
          source_doc: string
          chunk_id: string
          metadata: Json
          similarity: number
        }[]
      }
      get_vault_secret: {
        Args: {
          secret_name: string
        }
        Returns: string
      }
    }
  }
}
