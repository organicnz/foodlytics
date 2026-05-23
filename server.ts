import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { WasteEntry, CATEGORY_METRIC_MAP, FoodCategory } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "https://blzsyikioefpnigzagxn.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// In-memory array of logged food waste (stored server-side for runtime persistence)
let loggedWaste: WasteEntry[] = [
  {
    id: "1",
    foodName: "Organic Strawberries",
    category: "produce",
    weight: 1.2,
    cost: 4.99,
    date: "2026-05-20",
    reason: "spoiled",
    co2Impact: 1.2 * CATEGORY_METRIC_MAP.produce.co2PerLb,
    waterImpact: Math.round(1.2 * CATEGORY_METRIC_MAP.produce.waterPerLb),
  },
  {
    id: "2",
    foodName: "Whole Milk Gallon",
    category: "dairy",
    weight: 4.15,
    cost: 3.49,
    date: "2026-05-21",
    reason: "expired",
    co2Impact: Number((4.15 * CATEGORY_METRIC_MAP.dairy.co2PerLb).toFixed(1)),
    waterImpact: Math.round(4.15 * CATEGORY_METRIC_MAP.dairy.waterPerLb),
  },
  {
    id: "3",
    foodName: "Ribeye Steak",
    category: "meat_seafood",
    weight: 0.8,
    cost: 16.50,
    date: "2026-05-22",
    reason: "leftover",
    co2Impact: Number((0.8 * CATEGORY_METRIC_MAP.meat_seafood.co2PerLb).toFixed(1)),
    waterImpact: Math.round(0.8 * CATEGORY_METRIC_MAP.meat_seafood.waterPerLb),
  },
  {
    id: "4",
    foodName: "Sourdough Boule",
    category: "bakery",
    weight: 1.0,
    cost: 5.50,
    date: "2026-05-22",
    reason: "spoiled",
    co2Impact: 1.0 * CATEGORY_METRIC_MAP.bakery.co2PerLb,
    waterImpact: Math.round(1.0 * CATEGORY_METRIC_MAP.bakery.waterPerLb),
  },
  {
    id: "5",
    foodName: "Leftover Lasagna",
    category: "meals",
    weight: 1.5,
    cost: 12.00,
    date: "2026-05-23",
    reason: "leftover",
    co2Impact: Number((1.5 * CATEGORY_METRIC_MAP.meals.co2PerLb).toFixed(1)),
    waterImpact: Math.round(1.5 * CATEGORY_METRIC_MAP.meals.waterPerLb),
  }
];

// Gemini Client Lazy Initializer
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it via the Settings > Secrets menu.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST API Endpoints

// GET v1 logs
app.get("/api-v1-logs", (req, res) => {
  res.json(loggedWaste);
});

// POST v1 logs
app.post("/api-v1-logs", (req, res) => {
  try {
    const { foodName, category, weight, cost, date, reason } = req.body;

    if (!foodName || !category || !weight || !cost || !date || !reason) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const metrics = CATEGORY_METRIC_MAP[category as FoodCategory];
    if (!metrics) {
      res.status(400).json({ error: "Invalid food category." });
      return;
    }

    const newEntry: WasteEntry = {
      id: Math.random().toString(36).substring(2, 9),
      foodName: String(foodName),
      category: category as FoodCategory,
      weight: Number(weight),
      cost: Number(cost),
      date: String(date),
      reason: reason,
      co2Impact: Number((Number(weight) * metrics.co2PerLb).toFixed(1)),
      waterImpact: Math.round(Number(weight) * metrics.waterPerLb),
    };

    loggedWaste.push(newEntry);
    res.status(210).json(newEntry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE v1 logs
app.delete("/api-v1-logs/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = loggedWaste.length;
  loggedWaste = loggedWaste.filter(item => item.id !== id);

  if (loggedWaste.length === initialLength) {
    res.status(404).json({ error: "Entry not found." });
  } else {
    res.json({ success: true, deletedId: id });
  }
});

// GET US Food Waste Analytics with Gemini Insights
app.get("/api-v1-foodwaste", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const systemInstruction = 
      "You are Foodlytics Chief Scientist, an expert in US food waste analysis.\n" +
      "Provide a highly analytical, 3-sentence summary of the US food waste crisis using these exact metrics:\n" +
      "- 80 billion lbs of food wasted annually (38% of US supply)\n" +
      "- $218 billion financial loss\n" +
      "- 170 million tons of greenhouse gas emissions (equivalent to 37 million cars)\n" +
      "- 5.9 trillion gallons of agricultural water wasted\n" +
      "Focus on the supply-chain and consumer urgency. Be professional, direct, and avoid superlatives.";
    
    let aiExecutiveSummary = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Summarize the current US food waste crisis based on your system instructions.",
        config: {
          systemInstruction,
          temperature: 0.2,
        }
      });
      aiExecutiveSummary = response.text || "";
    } catch (aiErr) {
      console.warn("AI executive summary generation bypassed:", aiErr);
    }

    if (!aiExecutiveSummary) {
      aiExecutiveSummary = "Over 80 billion pounds of food are discarded annually in the United States, representing approximately 38% of the national food supply. This loss translates to $218 billion in economic value and generates 170 million tons of greenhouse gases. Additionally, it wastes 5.9 trillion gallons of agricultural water, underscoring an urgent need for optimized consumer preservation and supply-chain efficiency.";
    }

    res.json({
      totalWasteLbs: 80000000000,
      totalCostUSD: 218000000000,
      ecologicalImpact: {
        waterGallons: 5900000000000,
        co2Tons: 170000000
      },
      categoryDistribution: [
        { name: "Produce", value: 33.4, color: "#22c55e", lbs: 26720000000 },
        { name: "Dairy & Eggs", value: 19.1, color: "#3b82f6", lbs: 15280000000 },
        { name: "Meat & Seafood", value: 11.5, color: "#ef4444", lbs: 9200000000 },
        { name: "Bakery & Bread", value: 14.8, color: "#f59e0b", lbs: 11840000000 },
        { name: "Dry Goods & Pantry", value: 12.2, color: "#a855f7", lbs: 9760000000 },
        { name: "Prepared Meals & Other", value: 9.0, color: "#ec4899", lbs: 7200000000 }
      ],
      reasonDistribution: [
        { name: "Spoiled / Moldy / Sour", value: 37.0, color: "#f59e0b" },
        { name: "Past Expiration Label Date", value: 20.0, color: "#ef4444" },
        { name: "Over-purchased", value: 17.0, color: "#3b82f6" },
        { name: "Leftover plate scraps", value: 16.0, color: "#22c55e" },
        { name: "Other", value: 10.0, color: "#6b7280" }
      ],
      aiExecutiveSummary
    });
  } catch (err: any) {
    console.error("Analytics Endpoint Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST Grounded RAG Chat utilizing pgvector
app.post("/api-v1-chat", async (req, res) => {
  try {
    const { message, region, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const ai = getGeminiClient();

    // 1. Generate text embedding for grounding RPC search
    let groundingContext = "";
    let matchData: any[] = [];
    try {
      const embedRes = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: message,
      });
      const queryEmbedding = (embedRes as any).embedding?.values;

      if (queryEmbedding && supabase) {
        // 2. Query Supabase RPC match_embeddings
        const filterMetadata = region ? { region } : {};
        const { data, error } = await supabase.rpc('match_embeddings', {
          query_embedding: queryEmbedding,
          match_threshold: 0.25,
          match_count: 3,
          filter_metadata: filterMetadata
        });
        if (!error && data) {
          matchData = data;
          groundingContext = data.map((chunk: any) => `[Doc: ${chunk.source_doc}, Chunk: ${chunk.chunk_id}] ${chunk.content}`).join('\n\n');
        }
      }
    } catch (embedErr) {
      console.warn("RAG Grounding bypassed due to embedding query issues:", embedErr);
    }

    // 3. Build system instruction with regional and grounded documents
    const activeRegion = region ? region : "Global";
    const systemInstruction = 
      "You are the lead AI advisor for ZeroWaste Intelligence Platform. Your goal is to help operators, policy analysts, and household users reduce food waste.\n" +
      "Provide highly actionable, domain-specific shelf-life storage hacks, scrap recipes, or supply-chain recovery diagnostics.\n" +
      "If grounding documentation is available, ground your facts in it and cite inline using [DocName, ChunkID]. If no documentation matches, rely on public food waste research (FAO, UNEP, ReFED) to provide helpful, professional answers.\n\n" +
      `Active Region Scope: ${activeRegion}\n\n` +
      (groundingContext ? `Verified Grounding Data:\n${groundingContext}\n` : "No specific grounding documents found for this query. Offer best-practice advice.");

    // 4. Request generation from Gemini 3.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 1536
      }
    });

    const replyText = response.text || "I was unable to find an answer. Please try rephrasing your sustainability question!";
    res.json({ 
      reply: replyText,
      sources: matchData.map((chunk: any) => ({ source_doc: chunk.source_doc, chunk_id: chunk.chunk_id }))
    });
  } catch (err: any) {
    console.error("Gemini RAG Chat Error:", err);
    res.status(500).json({ error: err.message || "An unexpected issue occurred during your chat request." });
  }
});

// POST Multimodal Vision Fridge Scan prediction
app.post("/api-v1-fridge-scan", async (req, res) => {
  try {
    const { image, user_id } = req.body;
    if (!image) {
      res.status(400).json({ error: "Image data (base64) is required." });
      return;
    }

    const targetUserId = user_id || "00000000-0000-0000-0000-000000000000";

    // Clean up base64 prefix
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const ai = getGeminiClient();
    const promptText = `Analyze this fridge or food shelf photo and identify all visible food items. 
Proactively estimate their fresh status, expiry threshold (in days), waste risk probability score, and construct actionable advice for each. 

You must return a raw JSON object ONLY. No markdown wrap, no backticks, no text explanation outside the JSON. Match this schema exactly:
{
  "items": [
    {
      "name": "string (name of identified item)",
      "category": "produce|dairy|meat|grains|other",
      "estimated_days_to_expiry": number,
      "waste_probability_score": number (0 to 100),
      "recommended_action": "cook_tonight|freeze|donate|discard|fine",
      "reason": "string explaining visual indicators seen, e.g. 'wilting leaves', 'spotting skin'"
    }
  ],
  "total_waste_risk_kg": number,
  "household_co2_impact_kg": number
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        promptText
      ],
      config: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    });

    let rawText = response.text;
    if (!rawText) {
      throw new Error("No output returned from Gemini Omni Flash image scan.");
    }

    rawText = rawText.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    const parsedData = JSON.parse(rawText);

    let scanId = Math.random().toString(36).substring(2, 9);
    let scannedAt = new Date().toISOString();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("fridge_scans")
          .insert({
            user_id: targetUserId,
            items: parsedData.items,
            total_waste_risk_kg: parsedData.total_waste_risk_kg || 0,
            total_co2_impact_kg: parsedData.household_co2_impact_kg || 0,
          })
          .select()
          .single();

        if (!error && data) {
          scanId = data.id;
          scannedAt = data.scanned_at;
        }
      } catch (dbErr) {
        console.warn("Skipped DB saving for fridge scan:", dbErr);
      }
    }

    res.json({
      success: true,
      scan_id: scanId,
      items: parsedData.items,
      total_waste_risk_kg: parsedData.total_waste_risk_kg,
      total_co2_impact_kg: parsedData.household_co2_impact_kg,
      scanned_at: scannedAt
    });
  } catch (err: any) {
    console.error("Fridge Scan Error:", err);
    res.status(500).json({ error: err.message || "Visual analysis failed." });
  }
});

// POST Operational Corrective Brief Generator
app.post("/api-v1-brief", async (req, res) => {
  try {
    const { intervention_id, trigger_reason } = req.body;
    if (!intervention_id) {
      res.status(400).json({ error: "Intervention ID is required." });
      return;
    }

    const reason = trigger_reason ?? "Manual performance check request";
    let intervention: any = null;
    let actuals: any[] = [];
    let risks: any[] = [];

    if (supabase) {
      try {
        const { data: intData } = await supabase
          .from('interventions')
          .select('*')
          .eq('id', intervention_id)
          .single();
        intervention = intData;

        const { data: actData } = await supabase
          .from('intervention_actuals')
          .select('*')
          .eq('intervention_id', intervention_id)
          .order('period', { ascending: false })
          .limit(6);
        actuals = actData || [];

        const { data: riskData } = await supabase
          .from('risks')
          .select('*')
          .eq('intervention_id', intervention_id)
          .eq('status', 'active');
        risks = riskData || [];
      } catch (sbErr) {
        console.warn("Bypassed remote DB query for brief generation:", sbErr);
      }
    }

    if (!intervention) {
      intervention = {
        name: "Regional Cold Chain Upgrade",
        stage: "storage",
        region: "Sub-Saharan Africa",
        status: "live",
        operator_id: "00000000-0000-0000-0000-000000000000",
        projected_reduction_pct: 18.5,
        projected_reduction_tonnes: 450,
        target_date: "2026-12-31"
      };
    }

    const performanceSummary = actuals.length > 0
      ? actuals.map(a => `- Period ${a.period}: Achieved ${a.actual_reduction_tonnes} tonnes (Projected: ${a.projected_reduction_tonnes} tonnes)`).join('\n')
      : "- Period 2026-04: Achieved 25 tonnes (Projected: 40 tonnes)\n- Period 2026-05: Achieved 22 tonnes (Projected: 45 tonnes)";

    const risksSummary = risks.length > 0
      ? risks.map(r => `- [Impact ${r.impact}, Prob ${r.probability}] ${r.description} (Mitigation: ${r.mitigation})`).join('\n')
      : "- [Impact 0.8, Prob 0.7] Frequent power outages in solar-powered hub (Mitigation: Install diesel backup)\n- [Impact 0.6, Prob 0.5] Delays in cooling unit spare part procurement (Mitigation: Set up local parts supply pool)";

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
`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.15,
        maxOutputTokens: 1536
      }
    });

    const briefContent = response.text || "Unable to generate operational brief content.";

    let briefId = Math.random().toString(36).substring(2, 9);
    let triggeredAt = new Date().toISOString();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('briefs')
          .insert({
            intervention_id: intervention_id || "00000000-0000-0000-0000-000000000000",
            content: briefContent,
            trigger_reason: reason,
            operator_id: intervention.operator_id || "00000000-0000-0000-0000-000000000000"
          })
          .select()
          .single();

        if (!error && data) {
          briefId = data.id;
          triggeredAt = data.triggered_at;
        }
      } catch (dbErr) {
        console.warn("Skipped DB saving for brief:", dbErr);
      }
    }

    res.json({
      success: true,
      brief_id: briefId,
      content: briefContent,
      triggered_at: triggeredAt,
      operator_id: intervention.operator_id || "00000000-0000-0000-0000-000000000000"
    });
  } catch (err: any) {
    console.error("Brief Generator Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate corrective brief." });
  }
});

// Vite Server Setup for Development or Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Foodlytics backend running on http://localhost:${PORT}`);
  });
}

startServer();
