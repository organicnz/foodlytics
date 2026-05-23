// filename: lib/test_brief_agent.js
// purpose: Diagnostic test to simulate the brief generator agentic loop in Node.js and inspect intermediate turns.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://blzsyikioefpnigzagxn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsenN5aWtpb2VmcG5pZ3phZ3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2MTkwMiwiZXhwIjoyMDk1MTM3OTAyfQ.MfnhoFrxIY7_zdRD_FXBL3v1xtcW1cCAtPwOYGAyVbo";
const GEMINI_API_KEY = "AIzaSyAGU3ymJT05CZkU4hGVCkYDz0c-kob5Pjw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
];

async function toolQueryKnowledgeBase(query) {
  console.log(`[Tool] query_knowledge_base: "${query}"`);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: query }] },
        outputDimensionality: 1536
      })
    }
  );
  if (!response.ok) {
    const err = await response.text();
    return { error: err };
  }
  const json = await response.json();
  const queryEmbedding = json.embedding?.values;
  if (!queryEmbedding) return { error: "No embedding" };

  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.15,
    match_count: 3
  });
  if (error) return { error: error.message };
  return (data || []).map(c => ({ source: c.source_doc, chunk: c.chunk_id, content: c.content }));
}

async function toolFetchSatelliteAnomalies(region, commodity) {
  console.log(`[Tool] fetch_satellite_anomalies: ${region}, ${commodity}`);
  const { data, error } = await supabase
    .from('satellite_anomalies')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .order('captured_at', { ascending: false })
    .limit(3);
  if (error) throw error;
  return data;
}

async function toolFetchDemandSignals(region, commodity) {
  console.log(`[Tool] fetch_demand_signals: ${region}, ${commodity}`);
  const { data, error } = await supabase
    .from('demand_signals')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .order('week_start', { ascending: false })
    .limit(3);
  if (error) throw error;
  return data;
}

async function toolFetchLossRateCoefficients(region, commodity, stage) {
  console.log(`[Tool] fetch_loss_rate_coefficients: ${region}, ${commodity}, ${stage}`);
  const { data, error } = await supabase
    .from('loss_rate_coefficients')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('commodity', `%${commodity}%`)
    .ilike('stage', `%${stage}%`)
    .limit(3);
  if (error) throw error;
  return data;
}

async function toolFetchRecentWasteEvents(region, category) {
  console.log(`[Tool] fetch_recent_waste_events: ${region}, ${category}`);
  const { data, error } = await supabase
    .from('waste_events')
    .select('*')
    .ilike('region', `%${region}%`)
    .ilike('category', `%${category}%`)
    .order('timestamp', { ascending: false })
    .limit(3);
  if (error) throw error;
  return data;
}

async function run() {
  const intervention_id = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";
  console.log("Starting diagnostic run for intervention:", intervention_id);

  const { data: intervention } = await supabase.from('interventions').select('*').eq('id', intervention_id).single();
  const { data: actuals } = await supabase.from('intervention_actuals').select('*').eq('intervention_id', intervention_id).order('period', { ascending: false }).limit(6);
  const { data: risks } = await supabase.from('risks').select('*').eq('intervention_id', intervention_id).eq('status', 'active');

  const performanceSummary = actuals && actuals.length > 0
    ? actuals.map(a => `- Period ${a.period}: Achieved ${a.actual_reduction_tonnes} tonnes (Projected: ${a.projected_reduction_tonnes} tonnes)`).join('\n')
    : "- No historical actuals.";

  const risksSummary = risks && risks.length > 0
    ? risks.map(r => `- [Impact ${r.impact}] ${r.description}`).join('\n')
    : "- No risks.";

  const prompt = `You are a supply chain optimization specialist working on the ZeroWaste Intelligence Platform. Your primary goal is to help operators cut waste by 50% against baseline limits.

We have detected that a critical waste intervention is underperforming.
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
`;

  const systemInstruction = `You are an expert ZeroWaste supply chain investigator. Your objective is to formulate a highly targeted, grounded operational corrective brief for an underperforming intervention.
You have access to deep database telemetry through functions. Always query satellite anomalies, demand signals, and relevant RAG document chunks for the commodity/region before writing your brief to ground it in the best possible data!
First, call the functions to gather the necessary data. Gather all necessary telemetry (satellite anomalies, demand signals, loss rate coefficients, waste events, knowledge base chunks) in parallel during your first 1-2 turns. Avoid calling tools in serial chains.
Once you have gathered the data, synthesize it and generate the final operational brief immediately. You must complete your data gathering and generate the final markdown brief within 4 turns.

Do not make up hypothetical operational metrics or telemetry. Rely strictly on the telemetry returned by your tools!
Your final brief must be in Markdown.
`;

  let loopCount = 0;
  const maxLoops = 10;
  let briefContent = "";

  const contents = [
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  while (loopCount < maxLoops) {
    console.log(`\n--- TURN ${loopCount + 1} ---`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: tools,
          generationConfig: { temperature: 0.15, maxOutputTokens: 8192 }
        })
      }
    );

    if (!response.ok) {
      console.error(await response.text());
      break;
    }

    const json = await response.json();
    console.log("API JSON Response Candidates:", JSON.stringify(json.candidates, null, 2));

    const candidate = json.candidates?.[0];
    const modelContent = candidate?.content;
    if (!modelContent) {
      console.log("No content returned.");
      break;
    }

    contents.push(modelContent);
    const modelParts = modelContent.parts || [];
    const functionCalls = modelParts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      briefContent = modelParts.find(p => p.text)?.text || "";
      console.log("\n>>> FINAL SYNTHESIS SUCCESS:\n", briefContent);
      break;
    }

    const responseParts = [];
    for (const part of functionCalls) {
      const call = part.functionCall;
      const name = call.name;
      const args = call.args;
      const id = call.id;

      let result = null;
      if (name === "query_knowledge_base") {
        result = await toolQueryKnowledgeBase(args.query);
      } else if (name === "fetch_satellite_anomalies") {
        result = await toolFetchSatelliteAnomalies(args.region, args.commodity);
      } else if (name === "fetch_demand_signals") {
        result = await toolFetchDemandSignals(args.region, args.commodity);
      } else if (name === "fetch_loss_rate_coefficients") {
        result = await toolFetchLossRateCoefficients(args.region, args.commodity, args.stage);
      } else if (name === "fetch_recent_waste_events") {
        result = await toolFetchRecentWasteEvents(args.region, args.category);
      }

      responseParts.push({
        functionResponse: {
          name: name,
          response: { result: result },
          id: id
        }
      });
    }

    contents.push({
      role: "user",
      parts: responseParts
    });

    loopCount++;
  }
}

run();
