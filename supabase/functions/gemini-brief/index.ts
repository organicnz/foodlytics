// filename: supabase/functions/gemini-brief/index.ts
// purpose: Structured corrective brief generator using Gemini 3.5 Flash for underperforming interventions
// dependencies: Supabase JS SDK, Deno std/http
// brief_section: Section 14 - Gap-Closing Addition 2 - Antigravity 2.0 Two-Agent Monitoring Loop

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing required environment configuration server-side." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { intervention_id, trigger_reason } = await req.json()

    if (!intervention_id) {
      return new Response(
        JSON.stringify({ error: "Intervention ID is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reason = trigger_reason ?? "Manual performance check request"

    // 1. Initialize Supabase Service Role Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Fetch intervention metadata
    const { data: intervention, error: intError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', intervention_id)
      .single()

    if (intError || !intervention) {
      throw new Error(`Failed to fetch intervention record: ${intError?.message || "Not found"}`)
    }

    // 3. Fetch performance history (actuals)
    const { data: actuals, error: actError } = await supabase
      .from('intervention_actuals')
      .select('*')
      .eq('intervention_id', intervention_id)
      .order('period', { ascending: false })
      .limit(6)

    if (actError) {
      throw new Error(`Failed to fetch intervention performance data: ${actError.message}`)
    }

    // 4. Fetch risk logs
    const { data: risks, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('intervention_id', intervention_id)
      .eq('status', 'active')

    if (riskError) {
      throw new Error(`Failed to fetch intervention risk records: ${riskError.message}`)
    }

    // 5. Build rich context for Gemini 3.5 Flash
    const performanceSummary = actuals && actuals.length > 0
      ? actuals.map(a => `- Period ${a.period}: Achieved ${a.actual_reduction_tonnes} tonnes (Projected: ${a.projected_reduction_tonnes} tonnes)`).join('\n')
      : "- No historical periodic actual logs recorded yet."

    const risksSummary = risks && risks.length > 0
      ? risks.map(r => `- [Impact ${r.impact}, Prob ${r.probability}] ${r.description} (Mitigation: ${r.mitigation})`).join('\n')
      : "- No active risks registered for this intervention."

    const prompt = `You are a supply chain optimization specialist working on the ZeroWaste Intelligence Platform. Your primary goal is to help operators cut waste by 50% against baseline limits.

We have detected that a critical waste intervention is underperforming or requires a review. 
Analyze the operational data below and generate a structured corrective brief to guide field operators.

INTERVENTION METADATA
- Name: ${intervention.name}
- Supply Chain Stage: ${intervention.stage}
- Region: ${intervention.region}
- Current Project Status: ${intervention.status}
- Target Date: ${intervention.target_date}
- Target Projected Reduction: ${intervention.projected_reduction_pct}% (~${intervention.projected_reduction_tonnes} tonnes)

PERFORMANCE AUDIT TRAIL (Last 6 Periods)
${performanceSummary}

ACTIVE RISK FACTORS
${risksSummary}

Trigger Context: ${reason}

Produce a highly professional, action-oriented correction brief in Markdown. Rely strictly on the provided context details. Never make up hypothetical operational metrics. Organize the brief as follows:
# Operational Corrective Brief: ${intervention.name}

## 1. Performance Diagnostic & Gap Analysis
[Provide a highly precise 2-3 sentence root cause hypothesis linking underperformance to the active risks and the recorded periods data.]

## 2. Ranked Corrective Interventions
[Formulate exactly three immediate field actions, ranked from highest to lowest impact. Each action must be concrete and directly relate to mitigating the active risks.]

## 3. Operational Leading Indicator (Next 30 Days)
[Define one specific, measurable leading indicator that the operator can track daily to confirm that the intervention is recovering.]

Include an amber warning alert block if the overall ratio of cumulative actuals to cumulative projectives is less than 0.80.
`

    // 6. Request brief generation from Gemini 3.5 Flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 1536
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const geminiErr = await geminiResponse.text()
      throw new Error(`Gemini Brief Generation failed: ${geminiErr}`)
    }

    const geminiJson = await geminiResponse.json()
    const briefContent = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text

    if (!briefContent) {
      throw new Error("No brief content candidate returned from Gemini 3.5 Flash.")
    }

    // 7. Write generated brief into briefs table
    const { data: briefRow, error: briefError } = await supabase
      .from('briefs')
      .insert({
        intervention_id,
        content: briefContent,
        trigger_reason: reason,
        operator_id: intervention.operator_id
      })
      .select()
      .single()

    if (briefError) {
      throw new Error(`Database error saving operational brief: ${briefError.message}`)
    }

    // 8. Return response
    return new Response(
      JSON.stringify({
        success: true,
        brief_id: briefRow.id,
        content: briefRow.content,
        triggered_at: briefRow.triggered_at,
        operator_id: briefRow.operator_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("gemini-brief edge function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during brief generation." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
