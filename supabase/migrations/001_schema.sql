-- filename: supabase/migrations/001_schema.sql
-- purpose: ZeroWaste Core Database Schema with Satellite & Real-time Extensions
-- dependencies: none (enables pgvector extension)
-- brief_section: Section 5 & Section 9 - Supabase Schema Design with Satellite and Unconventional Signals

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =========================================================================
-- 1. TABLES DEFINITIONS
-- =========================================================================

-- Table 1: loss_rate_coefficients
CREATE TABLE IF NOT EXISTS loss_rate_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage varchar NOT NULL CHECK (stage IN ('farm/harvest', 'storage', 'processing', 'retail', 'consumer')),
  commodity varchar NOT NULL,
  region varchar NOT NULL,
  country varchar,
  rate_pct numeric NOT NULL CHECK (rate_pct >= 0 AND rate_pct <= 100),
  source_study text NOT NULL,
  confidence varchar CHECK (confidence IN ('High', 'Medium', 'Low')),
  year integer NOT NULL,
  source_type varchar NOT NULL DEFAULT 'published' CHECK (source_type IN ('published', 'satellite', 'realtime'))
);

-- Table 2: baselines
CREATE TABLE IF NOT EXISTS baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region varchar NOT NULL,
  commodity varchar NOT NULL,
  year integer NOT NULL,
  total_tonnes numeric NOT NULL CHECK (total_tonnes >= 0),
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid NOT NULL,
  CONSTRAINT unique_region_commodity_year UNIQUE (region, commodity, year)
);

-- Table 3: waste_events
CREATE TABLE IF NOT EXISTS waste_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage varchar NOT NULL CHECK (stage IN ('farm/harvest', 'storage', 'processing', 'retail', 'consumer')),
  category varchar NOT NULL,
  quantity_tonnes numeric NOT NULL CHECK (quantity_tonnes >= 0),
  region varchar NOT NULL,
  country varchar NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  source varchar NOT NULL,
  operator_id uuid
);

-- Table 4: interventions
CREATE TABLE IF NOT EXISTS interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  stage varchar NOT NULL CHECK (stage IN ('farm/harvest', 'storage', 'processing', 'retail', 'consumer')),
  region varchar NOT NULL,
  operator_id uuid NOT NULL,
  projected_reduction_pct numeric NOT NULL CHECK (projected_reduction_pct >= 0 AND projected_reduction_pct <= 100),
  projected_reduction_tonnes numeric NOT NULL CHECK (projected_reduction_tonnes >= 0),
  effort_level varchar NOT NULL CHECK (effort_level IN ('Low', 'Medium', 'High')),
  urgency varchar NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High')),
  status varchar NOT NULL DEFAULT 'candidate' CHECK (status IN ('live', 'committed', 'candidate', 'unaddressed')),
  deployed_at timestamptz,
  target_date date NOT NULL
);

-- Table 5: intervention_actuals
CREATE TABLE IF NOT EXISTS intervention_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  period varchar NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'), -- Format: YYYY-MM
  actual_reduction_tonnes numeric NOT NULL CHECK (actual_reduction_tonnes >= 0),
  projected_reduction_tonnes numeric NOT NULL CHECK (projected_reduction_tonnes >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_intervention_period UNIQUE (intervention_id, period)
);

-- Table 6: risks
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  description text NOT NULL,
  probability numeric NOT NULL CHECK (probability >= 0.0 AND probability <= 1.0),
  impact numeric NOT NULL CHECK (impact >= 0.0 AND impact <= 1.0),
  mitigation text NOT NULL,
  status varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'retired'))
);

-- Table 7: briefs
CREATE TABLE IF NOT EXISTS briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  content text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_reason text NOT NULL,
  acknowledged_at timestamptz,
  operator_id uuid NOT NULL
);

-- Table 8: embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  source_doc text NOT NULL,
  chunk_id varchar NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Table 9: fridge_scans
CREATE TABLE IF NOT EXISTS fridge_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  items jsonb NOT NULL,
  total_waste_risk_kg numeric NOT NULL CHECK (total_waste_risk_kg >= 0),
  total_co2_impact_kg numeric NOT NULL CHECK (total_co2_impact_kg >= 0),
  image_path text
);

-- Table 10: demand_signals (New Real-time Signal Table)
CREATE TABLE IF NOT EXISTS demand_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity varchar NOT NULL,
  region varchar NOT NULL,
  search_velocity_index numeric NOT NULL CHECK (search_velocity_index >= 0),
  week_start date NOT NULL,
  source varchar NOT NULL, -- e.g., 'google_trends'
  pct_change_wow numeric NOT NULL
);

-- Table 11: satellite_anomalies (New Satellite Observation Table)
CREATE TABLE IF NOT EXISTS satellite_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region varchar NOT NULL,
  commodity varchar NOT NULL,
  ndvi_score numeric NOT NULL,
  anomaly_zscore numeric NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  sensor varchar NOT NULL, -- e.g., 'Sentinel-2', 'Planet'
  affected_area_ha numeric NOT NULL CHECK (affected_area_ha >= 0)
);

-- Table 12: ingest_logs (New Pipeline Monitoring Table)
CREATE TABLE IF NOT EXISTS ingest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_name varchar NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  rows_inserted integer NOT NULL DEFAULT 0 CHECK (rows_inserted >= 0),
  rows_failed integer NOT NULL DEFAULT 0 CHECK (rows_failed >= 0),
  error_detail text
);

-- =========================================================================
-- 2. INDEXES DEFINITIONS
-- =========================================================================

-- Core table foreign key indexes
CREATE INDEX IF NOT EXISTS waste_events_operator_id_idx ON waste_events(operator_id);
CREATE INDEX IF NOT EXISTS interventions_operator_id_idx ON interventions(operator_id);
CREATE INDEX IF NOT EXISTS intervention_actuals_intervention_id_idx ON intervention_actuals(intervention_id);
CREATE INDEX IF NOT EXISTS risks_intervention_id_idx ON risks(intervention_id);
CREATE INDEX IF NOT EXISTS briefs_intervention_id_idx ON briefs(intervention_id);
CREATE INDEX IF NOT EXISTS briefs_operator_id_idx ON briefs(operator_id);
CREATE INDEX IF NOT EXISTS fridge_scans_user_id_idx ON fridge_scans(user_id);

-- Ingestion and real-time lookup indexes
CREATE INDEX IF NOT EXISTS demand_signals_lookup_idx ON demand_signals(commodity, region, week_start);
CREATE INDEX IF NOT EXISTS satellite_anomalies_lookup_idx ON satellite_anomalies(region, commodity, captured_at);
CREATE INDEX IF NOT EXISTS ingest_logs_script_idx ON ingest_logs(script_name, started_at);

-- Optimized text search indexes
CREATE INDEX IF NOT EXISTS loss_rate_coefficients_lookup_idx ON loss_rate_coefficients(region, commodity, stage);
CREATE INDEX IF NOT EXISTS baselines_lookup_idx ON baselines(region, commodity, year);

-- HNSW Vector index for fast RAG search (using Cosine distance)
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON embeddings USING hnsw (embedding vector_cosine_ops);

-- =========================================================================
-- 3. VIEWS DEFINITIONS (Analytics Engine)
-- =========================================================================

-- View 1: v_waste_by_stage
CREATE OR REPLACE VIEW v_waste_by_stage AS
SELECT
  region,
  stage,
  SUM(quantity_tonnes) as total_waste_tonnes,
  ROUND(
    (SUM(quantity_tonnes) / SUM(SUM(quantity_tonnes)) OVER (PARTITION BY region)) * 100, 
    2
  ) as stage_percentage
FROM waste_events
GROUP BY region, stage;

-- View 2: v_intervention_performance
CREATE OR REPLACE VIEW v_intervention_performance AS
SELECT 
  i.id AS intervention_id,
  i.name,
  i.stage,
  i.region,
  i.operator_id,
  COALESCE(SUM(a.actual_reduction_tonnes), 0) AS total_actual_reduction_tonnes,
  COALESCE(SUM(a.projected_reduction_tonnes), 0) AS total_projected_reduction_tonnes,
  CASE 
    WHEN COALESCE(SUM(a.projected_reduction_tonnes), 0) > 0 
    THEN ROUND(COALESCE(SUM(a.actual_reduction_tonnes), 0) / COALESCE(SUM(a.projected_reduction_tonnes), 0), 2)
    ELSE 0.0
  END AS performance_ratio,
  CASE
    WHEN COALESCE(SUM(a.projected_reduction_tonnes), 0) = 0 THEN 'no_data'
    WHEN (COALESCE(SUM(a.actual_reduction_tonnes), 0) / COALESCE(SUM(a.projected_reduction_tonnes), 0)) < 0.80 THEN 'underperforming'
    ELSE 'performing'
  END AS performance_status
FROM interventions i
LEFT JOIN intervention_actuals a ON i.id = a.intervention_id
WHERE i.status = 'live'
GROUP BY i.id, i.name, i.stage, i.region, i.operator_id;

-- View 3: v_campaign_progress
CREATE OR REPLACE VIEW v_campaign_progress AS
WITH regional_achieved AS (
  SELECT 
    region,
    COALESCE(SUM(actual_reduction_tonnes), 0) AS achieved_savings
  FROM interventions i
  JOIN intervention_actuals a ON i.id = a.intervention_id
  WHERE i.status = 'live'
  GROUP BY region
),
regional_committed AS (
  SELECT 
    region,
    COALESCE(SUM(projected_reduction_tonnes), 0) AS committed_savings
  FROM interventions
  WHERE status = 'committed'
  GROUP BY region
),
regional_baselines AS (
  SELECT 
    region,
    SUM(total_tonnes) AS baseline_tonnes
  FROM baselines
  WHERE year = 2026
  GROUP BY region
)
SELECT 
  b.region,
  b.baseline_tonnes,
  COALESCE(a.achieved_savings, 0) AS achieved_savings_tonnes,
  COALESCE(c.committed_savings, 0) AS committed_savings_tonnes,
  (COALESCE(a.achieved_savings, 0) + COALESCE(c.committed_savings, 0)) AS total_projected_savings_tonnes,
  ROUND(((COALESCE(a.achieved_savings, 0) + COALESCE(c.committed_savings, 0)) / b.baseline_tonnes) * 100, 2) AS campaign_reduction_pct,
  GREATEST(0, ROUND(50.00 - (((COALESCE(a.achieved_savings, 0) + COALESCE(c.committed_savings, 0)) / b.baseline_tonnes) * 100), 2)) AS gap_to_target_pct
FROM regional_baselines b
LEFT JOIN regional_achieved a ON b.region = a.region
LEFT JOIN regional_committed c ON b.region = c.region;

-- View 4: v_priority_queue
CREATE OR REPLACE VIEW v_priority_queue AS
SELECT 
  id AS intervention_id,
  name,
  stage,
  region,
  projected_reduction_tonnes,
  effort_level,
  urgency,
  CASE effort_level
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
  END AS effort_score,
  ROUND(
    projected_reduction_tonnes / 
    CASE effort_level
      WHEN 'Low' THEN 1.0
      WHEN 'Medium' THEN 2.0
      WHEN 'High' THEN 3.0
    END, 2
  ) AS priority_score
FROM interventions
WHERE status = 'candidate'
ORDER BY priority_score DESC;

-- =========================================================================
-- 3.5 RPC FUNCTIONS (Vector Match for RAG)
-- =========================================================================

-- RPC 1: match_embeddings (Cosine Similarity Search on pgvector)
CREATE OR REPLACE FUNCTION match_embeddings (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  content text,
  source_doc text,
  chunk_id varchar,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.source_doc,
    e.chunk_id,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE 
    (1 - (e.embedding <=> query_embedding) > match_threshold)
    AND (
      filter_metadata = '{}'::jsonb 
      OR e.metadata @> filter_metadata
    )
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable Row Level Security on all core and pipeline tables
ALTER TABLE loss_rate_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 loss_rate_coefficients policies (Public read-only)
CREATE POLICY loss_rate_coefficients_select ON loss_rate_coefficients
  FOR SELECT TO public USING (true);

-- 4.2 baselines policies (Public read-only, authenticated edit)
CREATE POLICY baselines_select ON baselines
  FOR SELECT TO public USING (true);

CREATE POLICY baselines_insert ON baselines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = locked_by);

-- 4.3 waste_events policies (Public read, authenticated insert)
CREATE POLICY waste_events_select ON waste_events
  FOR SELECT TO public USING (true);

CREATE POLICY waste_events_insert ON waste_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4.4 interventions policies (Tenant operators only)
CREATE POLICY interventions_select ON interventions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY interventions_insert ON interventions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = operator_id);

CREATE POLICY interventions_update ON interventions
  FOR UPDATE TO authenticated USING (auth.uid() = operator_id);

CREATE POLICY interventions_delete ON interventions
  FOR DELETE TO authenticated USING (auth.uid() = operator_id);

-- 4.5 intervention_actuals policies (Tenant operators of corresponding interventions)
CREATE POLICY intervention_actuals_select ON intervention_actuals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY intervention_actuals_modify ON intervention_actuals
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM interventions i 
      WHERE i.id = intervention_actuals.intervention_id AND i.operator_id = auth.uid()
    )
  );

-- 4.6 risks policies (Tenant operators of corresponding interventions)
CREATE POLICY risks_select ON risks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY risks_modify ON risks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM interventions i 
      WHERE i.id = risks.intervention_id AND i.operator_id = auth.uid()
    )
  );

-- 4.7 briefs policies (Operators and targeted operators)
CREATE POLICY briefs_select ON briefs
  FOR SELECT TO authenticated USING (
    auth.uid() = operator_id OR 
    EXISTS (
      SELECT 1 FROM interventions i 
      WHERE i.id = briefs.intervention_id AND i.operator_id = auth.uid()
    )
  );

CREATE POLICY briefs_insert ON briefs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4.8 embeddings policies (Public read-only for search routing)
CREATE POLICY embeddings_select ON embeddings
  FOR SELECT TO public USING (true);

-- 4.9 fridge_scans policies (Private scan history by user_id)
CREATE POLICY fridge_scans_owner_access ON fridge_scans
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 4.10 demand_signals policies (Public read-only)
CREATE POLICY demand_signals_select ON demand_signals
  FOR SELECT TO public USING (true);

-- 4.11 satellite_anomalies policies (Public read-only)
CREATE POLICY satellite_anomalies_select ON satellite_anomalies
  FOR SELECT TO public USING (true);

-- 4.12 ingest_logs policies (Authenticated operators/analysts read-only)
CREATE POLICY ingest_logs_select ON ingest_logs
  FOR SELECT TO authenticated USING (true);
