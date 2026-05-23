// filename: supabase/functions/api-v1-ingest/index.ts
// purpose: Ingest live food waste interventions, actual reductions, and risks using Gemini 3.5 Flash Search Grounding
// dependencies: Supabase JS SDK, Deno std/http

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

  // 1. Initialize Supabase and Gemini Config
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment configuration server-side." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // 2. Start Ingest Log
  const { data: logRow, error: logStartError } = await supabase
    .from('ingest_logs')
    .insert({
      script_name: 'api-v1-ingest',
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (logStartError) {
    console.error("Failed to initialize ingest log in DB:", logStartError.message)
  }

  let rowsInsertedCount = 0
  let rowsFailedCount = 0

  try {
    // Read request body options
    let userQuery = "general food waste interventions and initiatives"
    try {
      const body = await req.json()
      if (body.query) {
        userQuery = body.query
      }
    } catch {
      // Default query remains
    }

    // 3. Construct prompt for Gemini 3.5 Flash Search Grounding
    const promptText = `
You are a research bot for the ZeroWaste Intelligence Platform. 
Search the web for real-world active food waste interventions, reduction initiatives, or programs matching this search scope: "${userQuery}".

Find at least 3 genuine projects/initiatives. For each project, extract:
1. The project name, supply chain stage (must be one of: 'farm/harvest', 'storage', 'processing', 'retail', 'consumer'), and region/country.
2. The projected reduction percentage (0 to 100) and estimated reduction capacity in tonnes.
3. Historical performance records (at least 2 distinct periods in format YYYY-MM, listing the actual reduction tonnes and projected reduction tonnes).
4. One active risk factor (description, probability from 0.0 to 1.0, impact from 0.0 to 1.0, and mitigation action).

Format the output strictly as a single JSON object. Do not wrap it in markdown block tags, backticks, or write conversational text around it. Follow this schema exactly:
{
  "interventions": [
    {
      "name": "string (project name)",
      "stage": "farm/harvest|storage|processing|retail|consumer",
      "region": "string",
      "projected_reduction_pct": number,
      "projected_reduction_tonnes": number,
      "effort_level": "Low|Medium|High",
      "urgency": "Low|Medium|High",
      "status": "live",
      "target_date": "YYYY-MM-DD"
    }
  ],
  "actuals": [
    {
      "intervention_name": "string (must match name above exactly)",
      "period": "YYYY-MM",
      "actual_reduction_tonnes": number,
      "projected_reduction_tonnes": number
    }
  ],
  "risks": [
    {
      "intervention_name": "string (must match name above exactly)",
      "description": "string",
      "probability": number,
      "impact": number,
      "mitigation": "string"
    }
  ]
}
`

    // 4. Request generation with Google Search Grounding enabled
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          tools: [{ googleSearch: {} }], // Enable live web search grounding
          generationConfig: {
            temperature: 0.15,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorMsg = await geminiResponse.text()
      throw new Error(`Gemini API error: ${errorMsg}`)
    }

    const geminiJson = await geminiResponse.json()
    let rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error("No content candidate returned from Gemini 3.5 Flash.")
    }

    // Sanitize any accidental markdown formatting
    rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
    const parsedData = JSON.parse(rawText)

    if (!parsedData.interventions || !Array.isArray(parsedData.interventions)) {
      throw new Error("Invalid output format: 'interventions' must be a JSON array.")
    }

    // 5. Ingest into Supabase database
    const defaultOperatorId = "00000000-0000-0000-0000-000000000000"

    for (const item of parsedData.interventions) {
      try {
        // Insert Intervention
        const { data: dbIntervention, error: intError } = await supabase
          .from('interventions')
          .insert({
            name: item.name,
            stage: item.stage,
            region: item.region,
            operator_id: defaultOperatorId,
            projected_reduction_pct: item.projected_reduction_pct || 10,
            projected_reduction_tonnes: item.projected_reduction_tonnes || 50,
            effort_level: item.effort_level || 'Medium',
            urgency: item.urgency || 'Medium',
            status: item.status || 'live',
            target_date: item.target_date || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .select()
          .single()

        if (intError) {
          throw new Error(`Failed to insert intervention ${item.name}: ${intError.message}`)
        }

        rowsInsertedCount++

        // Filter and Insert Actuals
        if (Array.isArray(parsedData.actuals)) {
          const matchingActuals = parsedData.actuals
            .filter((act: any) => act.intervention_name === item.name)
            .map((act: any) => ({
              intervention_id: dbIntervention.id,
              period: act.period,
              actual_reduction_tonnes: act.actual_reduction_tonnes,
              projected_reduction_tonnes: act.projected_reduction_tonnes
            }))

          if (matchingActuals.length > 0) {
            const { error: actError } = await supabase
              .from('intervention_actuals')
              .insert(matchingActuals)
            
            if (actError) {
              console.error(`Failed to insert actuals for ${item.name}:`, actError.message)
            } else {
              rowsInsertedCount += matchingActuals.length
            }
          }
        }

        // Filter and Insert Risks
        if (Array.isArray(parsedData.risks)) {
          const matchingRisks = parsedData.risks
            .filter((risk: any) => risk.intervention_name === item.name)
            .map((risk: any) => ({
              intervention_id: dbIntervention.id,
              description: risk.description,
              probability: risk.probability ?? 0.5,
              impact: risk.impact ?? 0.5,
              mitigation: risk.mitigation ?? 'Monitor operational workflow',
              status: 'active'
            }))

          if (matchingRisks.length > 0) {
            const { error: riskError } = await supabase
              .from('risks')
              .insert(matchingRisks)

            if (riskError) {
              console.error(`Failed to insert risks for ${item.name}:`, riskError.message)
            } else {
              rowsInsertedCount += matchingRisks.length
            }
          }
        }

      } catch (err: any) {
        console.error("Failed to ingest row item:", err.message)
        rowsFailedCount++
      }
    }

    // 6. Complete Ingest Log with success metrics
    if (logRow) {
      await supabase
        .from('ingest_logs')
        .update({
          completed_at: new Date().toISOString(),
          rows_inserted: rowsInsertedCount,
          rows_failed: rowsFailedCount
        })
        .eq('id', logRow.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: rowsInsertedCount,
        failed: rowsFailedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("api-v1-ingest Edge Function error:", error)
    
    // Update ingest log with failure
    if (logRow) {
      await supabase
        .from('ingest_logs')
        .update({
          completed_at: new Date().toISOString(),
          rows_failed: 1,
          error_detail: error.message || "Unknown execution error."
        })
        .eq('id', logRow.id)
    }

    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during search ingestion." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
