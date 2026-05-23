-- filename: supabase/migrations/004_fix_rls_policies.sql
-- purpose: Align RLS policies with public/anonymous frontend implementation and add update permissions for briefs
-- brief_section: Section 5 & Section 12 - Supabase Schema Design and Hackathon Alignment

-- 1. interventions: Permit public SELECT so the anonymous dashboard can fetch active and candidate interventions
DROP POLICY IF EXISTS interventions_select ON interventions;
CREATE POLICY interventions_select ON interventions
  FOR SELECT TO public USING (true);

-- 2. intervention_actuals: Permit public SELECT so the campaign tracker can calculate savings metrics
DROP POLICY IF EXISTS intervention_actuals_select ON intervention_actuals;
CREATE POLICY intervention_actuals_select ON intervention_actuals
  FOR SELECT TO public USING (true);

-- 3. risks: Permit public SELECT so the operational risk panel can display active threats
DROP POLICY IF EXISTS risks_select ON risks;
CREATE POLICY risks_select ON risks
  FOR SELECT TO public USING (true);

-- 4. briefs: Permit public SELECT and UPDATE so the operator queue can view and acknowledge AI corrective briefs anonymously
DROP POLICY IF EXISTS briefs_select ON briefs;
CREATE POLICY briefs_select ON briefs
  FOR SELECT TO public USING (true);

CREATE POLICY briefs_update ON briefs
  FOR UPDATE TO public USING (true) WITH CHECK (true);
