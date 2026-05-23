-- filename: supabase/migrations/005_seed_candidates.sql
-- purpose:  Seed 3 candidate interventions with actuals + risks so that:
--           1. The Priority Queue FE component (priority-queue.tsx) has data to render
--           2. Scenario 6 (api-v1-brief live invocation) can run end-to-end
--           3. Scenario 2 (campaign-tracker) returns non-zero counts for interventions/actuals/risks
-- NOTE:     Uses fixed UUIDs so the migration is idempotent (ON CONFLICT DO NOTHING)

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Shared operator UUID (placeholder — no FK constraint on operators table)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  op_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;

  -- Intervention UUIDs
  int_id_1 uuid := 'bbbbbbbb-0001-0000-0000-000000000001'::uuid;
  int_id_2 uuid := 'bbbbbbbb-0002-0000-0000-000000000001'::uuid;
  int_id_3 uuid := 'bbbbbbbb-0003-0000-0000-000000000001'::uuid;

BEGIN

  -- ─────────────────────────────────────────────────────────────────────────
  -- 1. Candidate Interventions
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO interventions (id, name, stage, region, operator_id, projected_reduction_pct,
                             projected_reduction_tonnes, effort_level, urgency, status, target_date)
  VALUES
    (int_id_1,
     'Cold-Chain Optimisation — East Africa Leafy Greens',
     'storage',
     'East Africa',
     op_id,
     18.5,
     9200,
     'Medium',
     'High',
     'candidate',
     '2026-09-30'),

    (int_id_2,
     'Retail Pack-Size Reduction — South Asia Staple Grains',
     'retail',
     'South Asia',
     op_id,
     12.0,
     6400,
     'Low',
     'Medium',
     'candidate',
     '2026-12-31'),

    (int_id_3,
     'Farm-Gate Surplus Redistribution — Latin America Fruits',
     'farm/harvest',
     'Latin America',
     op_id,
     22.0,
     14500,
     'High',
     'High',
     'candidate',
     '2026-08-15')
  ON CONFLICT (id) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 2. Intervention Actuals (last 3 periods per intervention)
  --    Deliberately underperforming so api-v1-brief triggers the amber alert
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO intervention_actuals (intervention_id, period, actual_reduction_tonnes, projected_reduction_tonnes)
  VALUES
    -- Intervention 1 actuals
    (int_id_1, '2026-02', 1240, 2300),
    (int_id_1, '2026-03', 1580, 2300),
    (int_id_1, '2026-04', 1720, 2300),

    -- Intervention 2 actuals
    (int_id_2, '2026-02',  820, 1600),
    (int_id_2, '2026-03',  950, 1600),
    (int_id_2, '2026-04', 1100, 1600),

    -- Intervention 3 actuals
    (int_id_3, '2026-02', 2100, 3625),
    (int_id_3, '2026-03', 2450, 3625),
    (int_id_3, '2026-04', 2890, 3625)
  ON CONFLICT ON CONSTRAINT unique_intervention_period DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 3. Active Risks (2 per intervention)
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO risks (intervention_id, description, probability, impact, mitigation, status)
  VALUES
    -- Intervention 1 risks
    (int_id_1,
     'Refrigerated transport unavailability during peak harvest season.',
     0.65,
     0.80,
     'Pre-book refrigerated logistics capacity 8 weeks ahead of harvest window.',
     'active'),
    (int_id_1,
     'Power grid instability at cold-storage nodes causing temperature excursions.',
     0.50,
     0.75,
     'Install diesel backup generators at the 3 highest-throughput storage hubs.',
     'active'),

    -- Intervention 2 risks
    (int_id_2,
     'Retailer resistance to smaller SKU formats due to higher per-unit handling costs.',
     0.55,
     0.60,
     'Negotiate a 6-month handling-cost subsidy pilot with top 5 retail chains.',
     'active'),
    (int_id_2,
     'Consumer perception that smaller packs represent lower value.',
     0.40,
     0.45,
     'Launch in-store "Right Size, Zero Waste" marketing campaign alongside rollout.',
     'active'),

    -- Intervention 3 risks
    (int_id_3,
     'Road infrastructure limitations preventing timely farm-to-hub transport.',
     0.70,
     0.85,
     'Partner with local cooperative trucking networks and pre-identify alternate routes.',
     'active'),
    (int_id_3,
     'Surplus volume fluctuations making redistribution scheduling unpredictable.',
     0.60,
     0.70,
     'Deploy a lightweight digital surplus-reporting tool to all registered farm cooperatives.',
     'active')
  ON CONFLICT DO NOTHING;

END $$;
