-- Migration: 004_us_foodwaste.sql
-- Create table to cache US nationwide food waste categories in descending order of waste tonnage.

CREATE TABLE IF NOT EXISTS public.us_foodwaste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR NOT NULL UNIQUE,
  waste_tonnes NUMERIC NOT NULL,
  waste_pct NUMERIC NOT NULL,
  cost_usd_billions NUMERIC,
  co2_impact_million_tonnes NUMERIC,
  source VARCHAR DEFAULT 'ReFED',
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.us_foodwaste_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read-only access (unauthenticated)
DROP POLICY IF EXISTS "Allow public read access for us_foodwaste_categories" ON public.us_foodwaste_categories;
CREATE POLICY "Allow public read access for us_foodwaste_categories" 
ON public.us_foodwaste_categories FOR SELECT 
TO public 
USING (true);

-- Allow service_role full access (for edge functions and scripts)
DROP POLICY IF EXISTS "Allow service_role full access for us_foodwaste_categories" ON public.us_foodwaste_categories;
CREATE POLICY "Allow service_role full access for us_foodwaste_categories" 
ON public.us_foodwaste_categories FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Seed initial ReFED baseline stats
INSERT INTO public.us_foodwaste_categories (category, waste_tonnes, waste_pct, cost_usd_billions, co2_impact_million_tonnes, source)
VALUES
  ('Produce (Fruits & Vegetables)', 24100000, 28.45, 48.2, 18.5, 'ReFED 2026'),
  ('Prepared Foods & Mixed Dishes', 17500000, 20.66, 35.0, 15.0, 'ReFED 2026'),
  ('Dairy & Eggs', 12200000, 14.40, 24.4, 22.8, 'ReFED 2026'),
  ('Beverages', 9800000, 11.57, 19.6, 8.5, 'ReFED 2026'),
  ('Bakery Products', 8400000, 9.92, 16.8, 9.2, 'ReFED 2026'),
  ('Grains (Rice, Pasta, etc.)', 6200000, 7.32, 12.4, 5.4, 'ReFED 2026'),
  ('Meat & Poultry', 5300000, 6.26, 10.6, 25.5, 'ReFED 2026'),
  ('Seafood & Fish', 1200000, 1.42, 2.4, 3.8, 'ReFED 2026')
ON CONFLICT (category) DO UPDATE 
SET 
  waste_tonnes = EXCLUDED.waste_tonnes,
  waste_pct = EXCLUDED.waste_pct,
  cost_usd_billions = EXCLUDED.cost_usd_billions,
  co2_impact_million_tonnes = EXCLUDED.co2_impact_million_tonnes,
  source = EXCLUDED.source,
  last_updated_at = now();
