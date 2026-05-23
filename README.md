# Foodlytics

An AI-powered food waste command centre that unifies live supply chain data, semantic knowledge retrieval, and autonomous agent analysis into a single operational dashboard — targeting a **50% reduction in food waste against a locked January 2026 regional baseline** across South Asia, East Africa, and Latin America.

---

## The Problem

One-third of all food produced globally is wasted. That's 1.3 billion tonnes per year — enough to feed every hungry person on earth twice over. The cost is staggering: $1 trillion in economic losses, 8% of global greenhouse gas emissions, and billions of gallons of water consumed for food that never gets eaten.

The data to fix this already exists. Loss rates by crop and region are published. Satellite imagery captures harvest anomalies in real time. Market demand signals surface weeks before a surplus becomes a crisis. But this intelligence is fragmented across siloed databases, academic papers, and disconnected government reports — inaccessible to the operators, analysts, and policymakers who actually need to act on it.

---

## What It Does

### 1. Live Intervention Intelligence
A Gemini-powered ingestion pipeline continuously searches the web for real-world food waste reduction initiatives — cold chain programs, storage interventions, retail redistribution efforts — and structures them into a tracked database of interventions, performance actuals, and risk factors. Every intervention ingested is automatically vectorised and indexed for semantic retrieval, keeping the AI advisor grounded in live, real-world data.

### 2. RAG-Grounded AI Advisor
An AI chat advisor gives operators, analysts, and policy teams instant, cited answers grounded in both the platform's live intervention database and a curated knowledge base of FAO guidelines and supply chain protocols. Responses include inline citations and a structured sources block. The advisor is also grounded in the user's own household waste history, giving personal, data-driven recommendations.

### 3. Autonomous Corrective Brief Generator
When an intervention underperforms, Foodlytics triggers an autonomous investigation loop. Gemini 3.5 Flash calls five real-time database tools in parallel — satellite NDVI anomaly feeds, Google Trends demand signals, FAO loss rate coefficients, historical waste events, and the semantic knowledge base — then synthesises a ranked corrective action brief with a measurable 30-day leading indicator for recovery.

### 4. Household Waste Tracker
A personal waste diary lets households log discarded food with automatic CO₂ and water impact calculations. The AI advisor is grounded in this personal data — answering questions about food habits with the user's actual discard history, not generic tips.

### 5. Fridge Scan *(concept — not yet implemented)*
A multimodal AI feature where users photograph their fridge and Gemini Vision identifies items, estimates expiry risk, and suggests zero-waste recipes for ingredients about to spoil. The edge function infrastructure is built and deployed; connecting it to the frontend UI is the next milestone.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.x, Tailwind v4, shadcn/ui (deployed on Vercel) |
| Database | Supabase (PostgreSQL + pgvector) |
| Edge Functions | Supabase Edge Functions (Deno runtime) |
| AI / Generation | Gemini 3.5 Flash with Google Search grounding |
| Embeddings | Gemini Embedding-001 (1536-dimensional vectors) |
| Vector Search | pgvector HNSW index, cosine similarity |

---

## Architecture

```
Frontend (Next.js)
    │
    ├── Direct DB reads (Supabase client)
    │       ├── household_waste_logs
    │       ├── interventions / actuals / risks
    │       └── baselines
    │
    └── Edge Function calls
            ├── api-v1-advisory      → RAG chat (Gemini 3.5 Flash + pgvector)
            ├── api-v1-us-foodwaste  → Brief generator + US telemetry crawler
            ├── api-v1-fridge-scan   → Gemini Vision fridge analysis
            └── api-v1-ingest        → Live intervention ingestion + embedding
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with pgvector enabled
- Gemini API key (Google AI Studio)

### Environment Variables

Create a `.env.local` file at the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `supabase/functions/.env` for edge functions:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### Run Migrations

```bash
npx supabase db push --project-ref your_project_ref
```

### Deploy Edge Functions

```bash
npx supabase functions deploy api-v1-advisory --project-ref your_project_ref
npx supabase functions deploy api-v1-us-foodwaste --project-ref your_project_ref
npx supabase functions deploy api-v1-ingest --project-ref your_project_ref
npx supabase functions deploy api-v1-fridge-scan --project-ref your_project_ref
npx supabase functions deploy api-v1-embed-document --project-ref your_project_ref
```

### Seed the Vector Store

Call the ingest function to populate the embeddings table with live intervention data:

```bash
curl -X POST https://your_project_ref.supabase.co/functions/v1/api-v1-ingest \
  -H "Authorization: Bearer your_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"query": "food waste cold chain interventions"}'
```

### Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What Makes It Different

Most food waste tools are dashboards that show you the problem. Foodlytics is an **action engine** — it finds live interventions, monitors their performance, investigates failures autonomously, and gives every operator a grounded AI advisor that knows their specific region, commodity, and data. Every AI response is traceable to a real source, making it suitable for policy and supply chain decisions — not just consumer awareness.
