-- filename: supabase/migrations/002_household_logs.sql
-- purpose: Define table for household food waste logs with RLS policies
-- brief_section: Supabase Integration & persistent log storage

-- Table: household_waste_logs
CREATE TABLE IF NOT EXISTS household_waste_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name varchar NOT NULL,
  category varchar NOT NULL,
  weight_lbs numeric NOT NULL CHECK (weight_lbs >= 0),
  cost_usd numeric NOT NULL CHECK (cost_usd >= 0),
  discard_date date NOT NULL,
  reason varchar NOT NULL,
  co2_impact_lbs numeric NOT NULL,
  water_impact_gal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for optimized list query
CREATE INDEX IF NOT EXISTS household_waste_logs_discard_date_idx ON household_waste_logs(discard_date DESC);

-- Enable RLS
ALTER TABLE household_waste_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read and write operations for local/dev hackathon simplicity
CREATE POLICY household_waste_logs_public_access ON household_waste_logs
  FOR ALL TO public USING (true) WITH CHECK (true);
