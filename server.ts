import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { WasteEntry, CATEGORY_METRIC_MAP, FoodCategory } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
app.get("/api/logs", (req, res) => {
  res.json(loggedWaste);
});

app.post("/api/logs", (req, res) => {
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

app.delete("/api/logs/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = loggedWaste.length;
  loggedWaste = loggedWaste.filter(item => item.id !== id);

  if (loggedWaste.length === initialLength) {
    res.status(404).json({ error: "Entry not found." });
  } else {
    res.json({ success: true, deletedId: id });
  }
});

// AI Advisor chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const ai = getGeminiClient();

    // Prepare a customized system instruction focusing on Food Waste Reduction
    const systemInstruction = 
      "You are Foodlytics Advisor, an elite, friendly, and practical sustainability expert focused entirely on reducing food waste.\n" +
      "Provide highly actionable advice on:\n" +
      "1. Shelf-life extension techniques (proper storage, freezing, revival methods like soaking wilted celery).\n" +
      "2. 'Scrappy' kitchen recipes based on leftovers, stale items, or parts usually thrown away (e.g., banana peels, carrot tops, parmesan rinds, dry bread).\n" +
      "3. Practical portion size adjustment and meal prep strategies.\n" +
      "4. Understanding date labels ('Use By' vs 'Best Before').\n" +
      "Be warm, concise, and encourage simple steps. Format your answer using cleanly structured Markdown (with bullet points and bold key terms). Always root suggestions in sustainability.";

    // Use our recommended gemini-3.5-flash for friendly Q&A
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I was unable to find an answer. Please try rephrasing your sustainability question!";
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: err.message || "An unexpected issue occurred calling the Gemini AI service." });
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
