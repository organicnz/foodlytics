// filename: supabase/functions/api-v1-brief/index.ts
// purpose: Autonomous structured corrective brief generator using Gemini 3.5 Flash with database-backed function tools
// dependencies: Supabase JS SDK, Deno std/http
// brief_section: Section 14 - Gap-Closing Addition 2 - Antigravity 2.0 Two-Agent Monitoring Loop

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// =========================================================================
// 1. TOOL DECLARATIONS FOR GEMINI 3.5 FLASH
// =========================================================================
const tools = [
  {
    function_declarations: [
      {
        name: "query_knowledge_base",
        description: "Queries the ZeroWaste reference manual and policy handbook using semantic vector search. Use this to find specific supply-chain interventions, grain storage guidelines, cooling protocols, or cold-chain logistics recommendations.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "The natural language search query, e.g., 'rice storage cold chain solutions' or 'how to reduce harvest losses in East Africa'."
            }
          },
          required: ["query"]
        }
      },
      {
        name: "fetch_satellite_anomalies",
        description: "Queries regional Sentinel-2 satellite sensor NDVI anomalies for a given region and commodity to detect crop health issues or harvest yield anomalies.",
        parameters: {
          type: "OBJECT",
          properties: {
            region: {
              type: "STRING",
              description: "The target region (e.g. South Asia Delta, East Africa Corridor, Latin America Sub-basin)"
            },
            commodity: {
              type: "STRING",
              description: "The food commodity (e.g. Rice, Maize, Avocado)"
            }
          },
          required: ["region", "commodity"]
        }
      },
      {
        name: "fetch_demand_signals",
        description: "Queries Google Trends search volume trends for the crop. A drop in search_velocity_index or negative week-over-week pct_change_wow indicates high supply surplus/waste risk due to consumer market bottlenecks.",
        parameters: {
          type: "OBJECT",
          properties: {
            region: {
              type: "STRING",
              description: "The consumer market region (e.g. South Asia Delta, East Africa Corridor, Latin America Sub-basin)"
            },
            commodity: {
              type: "STRING",
              description: "The food commodity name (e.g. Rice, Maize, Avocado)"
            }
          },
          required: ["region", "commodity"]
        }
      },
      {
        name: "fetch_loss_rate_coefficients",
        description: "Retrieves standard FAO food loss rate coefficients and confidence metrics for a given region, commodity, and supply chain stage.",
        parameters: {
          type: "OBJECT",
          properties: {
            region: {
              type: "STRING",
              description: "The region of interest"
            },
            commodity: {
              type: "STRING",
              description: "The crop/commodity"
            },
            stage: {
              type: "STRING",
              description: "The supply chain stage ('farm/harvest', 'storage', 'processing', 'retail', 'consumer')"
            }
          },
          required: ["region", "commodity", "stage"]
        }
      },
      {
        name: "fetch_recent_waste_events",
        description: "Queries the database for historical and real-time agricultural waste events reported in the region for a given category of food.",
        parameters: {
          type: "OBJECT",
          properties: {
            region: {
              type: "STRING",
              description: "The region of interest"
            },
            category: {
              type: "STRING",
              description: "The food category name (e.g. Produce, Dairy, Grains, Bakery)"
            }
          },
          required: ["region", "category"]
        }
      }
    ]
  }
]

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

    // 5. Build rich starting context for the Agentic Investigator
    const performanceSummary = actuals && actuals.length > 0
      ? actuals.map(a => `- Period ${a.period}: Achieved ${a.actual_reduction_tonnes} tonnes (Projected: ${a.projected_reduction_tonnes} tonnes)`).join('\n')
      : "- No historical periodic actual logs recorded yet."

    const risksSummary = risks && risks.length > 0
      ? risks.map(r => `- [Impact ${r.impact}, Prob ${r.probability}] ${r.description} (Mitigation: ${r.mitigation})`).join('\n')
      : "- No active risks registered for this intervention."

    const initialContextPrompt = `You are a supply chain optimization specialist working on the ZeroWaste Intelligence Platform. Your primary goal is to help operators cut waste by 50% against baseline limits.

We have detected that a critical waste intervention is underperforming or requires a review.
Analyze the initial operational details below:

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
`

    const systemInstruction = `You are an expert ZeroWaste supply chain investigator. Your objective is to formulate a highly targeted, grounded operational corrective brief for an underperforming intervention.
You have access to deep database telemetry through functions. Always query satellite anomalies, demand signals, and relevant RAG document chunks for the commodity/region before writing your brief to ground it in the best possible data!
First, call the functions to gather the necessary data. Gather all necessary telemetry (satellite anomalies, demand signals, loss rate coefficients, waste events, knowledge base chunks) in parallel during your first 1-2 turns. Avoid calling tools in serial chains.
Once you have gathered the data, synthesize it and generate the final operational brief immediately. You must complete your data gathering and generate the final markdown brief within 4 turns.

Do not make up hypothetical operational metrics or telemetry. Rely strictly on the telemetry returned by your tools!
Your final brief must be a highly professional, action-oriented correction brief in Markdown. Organize it exactly as follows:

# Operational Corrective Brief: [Intervention Name]

## 1. Performance Diagnostic & Gap Analysis
[Provide a highly precise 2-3 sentence root cause hypothesis linking underperformance to the active risks, historical periods, and the gathered real-time telemetry (NDVI anomalies, search drop indices, FAO coefficients).]

## 2. Ranked Corrective Interventions
[Formulate exactly three immediate field actions, ranked from highest to lowest impact. Each action must be concrete, directly relate to mitigating the active risks, and align with ZeroWaste guidelines queried from the knowledge base.]

## 3. Operational Leading Indicator (Next 30 Days)
[Define one specific, measurable leading indicator that the operator can track daily to confirm that the intervention is recovering.]

Include an amber warning alert block if the overall ratio of cumulative actuals to cumulative projectives is less than 0.80.
`

    // =========================================================================
    // 2. TURN-BASED AGENTIC LOOP WITH FUNCTION CALLING
    // =========================================================================
    let loopCount = 0;
    const maxLoops = 10;
    let briefContent = "";

    const contents = [
      {
        role: "user",
        parts: [{ text: initialContextPrompt }]
      }
    ];

    while (loopCount < maxLoops) {
      console.log(`[Agentic Loop] Turn ${loopCount + 1}...`);
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            tools: tools,
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 8192
            }
          })
        }
      )

      if (!geminiResponse.ok) {
        const geminiErr = await geminiResponse.text()
        throw new Error(`Gemini API Call failed in turn ${loopCount + 1}: ${geminiErr}`)
      }

      const geminiJson = await geminiResponse.json()
      const candidate = geminiJson.candidates?.[0]
      const modelContent = candidate?.content
      const modelParts = modelContent?.parts || []
      
      if (!modelContent) {
        throw new Error("No output candidate returned from Gemini 3.5 Flash.")
      }

      // Add the model's response to the conversation history
      contents.push(modelContent)

      // Check if there are function calls requested
      const functionCalls = modelParts.filter((part: any) => part.functionCall)

      if (functionCalls.length === 0) {
        // No function calls, Gemini is satisfied! Extract text content
        briefContent = modelParts.find((part: any) => part.text)?.text || ""
        console.log("[Agentic Loop] Brief successfully synthesized by Gemini.");
        break;
      }

      console.log(`[Agentic Loop] Model requested ${functionCalls.length} function calls.`);

      // We have function calls, execute them and build the response parts
      const responseParts = []
      
      for (const part of functionCalls) {
        const call = part.functionCall
        const name = call.name
        const args = call.args
        const id = call.id // Unique call ID

        console.log(`[Agentic Loop] Tool Call: ${name}`, args);
        let result: any = null

        try {
          if (name === "query_knowledge_base") {
            result = await toolQueryKnowledgeBase(args.query, supabase, GEMINI_API_KEY)
          } else if (name === "fetch_satellite_anomalies") {
            result = await toolFetchSatelliteAnomalies(args.region, args.commodity, supabase)
          } else if (name === "fetch_demand_signals") {
            result = await toolFetchDemandSignals(args.region, args.commodity, supabase)
          } else if (name === "fetch_loss_rate_coefficients") {
            result = await toolFetchLossRateCoefficients(args.region, args.commodity, args.stage, supabase)
          } else if (name === "fetch_recent_waste_events") {
            result = await toolFetchRecentWasteEvents(args.region, args.category, supabase)
          } else {
            result = { error: `Unknown tool: ${name}` }
          }
        } catch (err: any) {
          console.error(`[Agentic Loop] Tool error '${name}':`, err)
          result = { error: err.message || "Execution error" }
        }

        responseParts.push({
          functionResponse: {
            name: name,
            response: { result: result },
            id: id // matching call ID
          }
        })
      }

      // Add user's tool results message
      contents.push({
        role: "user",
        parts: responseParts
      })

      loopCount++
    }

    if (!briefContent) {
      throw new Error("Failed to generate brief content within agent loop limits.")
    }

    // 6. Write generated brief into briefs table
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

    // 7. Return response
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
    console.error("api-v1-brief edge function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during brief generation." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// =========================================================================
// 3. TELEMETRY DATABASE TOOL HELPERS
// =========================================================================

async function toolQueryKnowledgeBase(query: string, supabase: any, GEMINI_API_KEY: string) {
  console.log(`[Tool: query_knowledge_base] Querying semantic vector: "${query}"`);
  
  const embedResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{ text: query }]
        },
        outputDimensionality: 1536
      })
    }
  )

  if (!embedResponse.ok) {
    const err = await embedResponse.text()
    return { error: `Failed to embed query: ${err}` }
  }

  const embedJson = await embedResponse.json()
  const queryEmbedding = embedJson.embedding?.values

  if (!queryEmbedding) {
    return { error: "Invalid vector response from embedding api." }
  }

  const { data: matchData, error: matchError } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.15,
    match_count: 3
  })

  if (matchError) {
    return { error: `Semantic search error: ${matchError.message}` }
  }

  return (matchData || []).map((chunk: any) => ({
    source: chunk.source_doc,
    chunk: chunk.chunk_id,
    content: chunk.content
  }))
}

async function toolFetchSatelliteAnomalies(region: string, commodity: string, supabase: any) {
  console.log(`[Tool: fetch_satellite_anomalies] Region: ${region}, Commodity: ${commodity}`);
  
  const { data, error } = await supabase
    .from('satellite_anomalies')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .order('captured_at', { ascending: false })
    .limit(3)

  if (error) throw error
  return data
}

async function toolFetchDemandSignals(region: string, commodity: string, supabase: any) {
  console.log(`[Tool: fetch_demand_signals] Region: ${region}, Commodity: ${commodity}`);
  
  const { data, error } = await supabase
    .from('demand_signals')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .order('week_start', { ascending: false })
    .limit(3)

  if (error) throw error
  return data
}

async function toolFetchLossRateCoefficients(region: string, commodity: string, stage: string, supabase: any) {
  console.log(`[Tool: fetch_loss_rate_coefficients] Region: ${region}, Commodity: ${commodity}, Stage: ${stage}`);
  
  const { data, error } = await supabase
    .from('loss_rate_coefficients')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .ilike('stage', `%${stage}%`)
    .limit(3)

  if (error) throw error
  return data
}

async function toolFetchRecentWasteEvents(region: string, category: string, supabase: any) {
  console.log(`[Tool: fetch_recent_waste_events] Region: ${region}, Category: ${category}`);
  
  const { data, error } = await supabase
    .from('waste_events')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('category', `%${category}%`)
    .order('timestamp', { ascending: false })
    .limit(3)

  if (error) throw error
  return data
}
