// filename: scripts/test-ingest.ts
// purpose: Standalone Deno test runner for api-v1-ingest logic. No Docker required.
// usage:   npx deno run --allow-net --allow-env --env-file=supabase/functions/.env scripts/test-ingest.ts
// optional: pass a search query as first argument, e.g.:
//           npx deno run --allow-net --allow-env --env-file=supabase/functions/.env scripts/test-ingest.ts "East Africa cold chain"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: Missing required env vars. Check supabase/functions/.env")
  console.error("  Required: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Read query from CLI args or use default
const userQuery = Deno.args[0] ?? "active food waste reduction interventions in East Africa and South Asia"

console.log(`\n=== api-v1-ingest Test Runner (no Docker) ===`)
console.log(`Search Query: "${userQuery}"`)
console.log(`Supabase:     ${SUPABASE_URL}`)
console.log(`Gemini Key:   ${GEMINI_API_KEY.slice(0, 10)}...`)
console.log("------------------------------------------------\n")

// ---- Step 1: Start Ingest Log ----
console.log("[1/4] Initializing ingest log in database...")
const { data: logRow, error: logStartError } = await supabase
  .from('ingest_logs')
  .insert({
    script_name: 'test-ingest.ts',
    started_at: new Date().toISOString()
  })
  .select()
  .single()

if (logStartError) {
  console.error("WARNING: Could not write ingest log:", logStartError.message)
} else {
  console.log(`  Ingest log started: id=${logRow.id}`)
}

let rowsInsertedCount = 0
let rowsFailedCount = 0

try {
  // ---- Step 2: Call Gemini with Google Search Grounding ----
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

  console.log("[2/4] Calling Gemini 3.5 Flash with Google Search Grounding...")
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json"
        }
      })
    }
  )

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text()
    throw new Error(`Gemini API error (${geminiResponse.status}): ${errText}`)
  }

  const geminiJson = await geminiResponse.json()
  let rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error("Gemini returned no content. Check API key and search grounding availability.")
  }

  // Strip any accidental markdown fencing
  rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  console.log("  Gemini response received. Parsing JSON...")

  const parsedData = JSON.parse(rawText)

  if (!parsedData.interventions || !Array.isArray(parsedData.interventions)) {
    throw new Error("Parsed JSON is missing 'interventions' array.")
  }

  console.log(`  Found ${parsedData.interventions.length} intervention(s), ${parsedData.actuals?.length ?? 0} actuals, ${parsedData.risks?.length ?? 0} risks.\n`)

  // ---- Step 3: Insert Into Supabase ----
  const defaultOperatorId = "00000000-0000-0000-0000-000000000000"

  console.log("[3/4] Inserting into Supabase...")
  for (const item of parsedData.interventions) {
    console.log(`  → Inserting intervention: "${item.name}"`)

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
        target_date: item.target_date || '2026-12-31'
      })
      .select()
      .single()

    if (intError) {
      console.error(`    ERROR inserting intervention: ${intError.message}`)
      rowsFailedCount++
      continue
    }

    console.log(`    ✓ Intervention inserted: id=${dbIntervention.id}`)
    rowsInsertedCount++

    // Insert Actuals
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
        const { error: actError } = await supabase.from('intervention_actuals').insert(matchingActuals)
        if (actError) console.error(`    WARNING: actuals insert failed: ${actError.message}`)
        else {
          console.log(`    ✓ ${matchingActuals.length} actuals inserted`)
          rowsInsertedCount += matchingActuals.length
        }
      }
    }

    // Insert Risks
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
        const { error: riskError } = await supabase.from('risks').insert(matchingRisks)
        if (riskError) console.error(`    WARNING: risks insert failed: ${riskError.message}`)
        else {
          console.log(`    ✓ ${matchingRisks.length} risk(s) inserted`)
          rowsInsertedCount += matchingRisks.length
        }
      }
    }
  }

  // ---- Step 4: Finalise Log ----
  console.log(`\n[4/4] Finalizing ingest log...`)
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

  console.log(`\n=== DONE ===`)
  console.log(`  Rows inserted: ${rowsInsertedCount}`)
  console.log(`  Rows failed:   ${rowsFailedCount}`)
  console.log(`\nCheck your Supabase dashboard:`)
  console.log(`  ${SUPABASE_URL.replace('.supabase.co', '.supabase.com')}/project/blzsyikioefpnigzagxn/editor`)

} catch (error: any) {
  console.error("\nFATAL ERROR:", error.message)
  if (logRow) {
    await supabase
      .from('ingest_logs')
      .update({
        completed_at: new Date().toISOString(),
        rows_failed: 1,
        error_detail: error.message
      })
      .eq('id', logRow.id)
  }
  Deno.exit(1)
}
