// filename: supabase/functions/api-v1-chat/index.ts
// purpose: Grounded RAG Chat Edge Function using Gemini 3.5 Flash & pgvector semantic search
// dependencies: Supabase JS SDK, Deno std/http
// brief_section: Section 7 - AI Layer Architecture & Section 8 - Educational Chat Page

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

    const { query, region, history, stream } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Initialize Supabase Service Role Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Generate vector embedding for the query using Gemini Text Embedding model
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
      const embedErr = await embedResponse.text()
      throw new Error(`Failed to generate query embedding: ${embedErr}`)
    }

    const embedJson = await embedResponse.json()
    const queryEmbedding = embedJson.embedding?.values

    if (!queryEmbedding) {
      throw new Error("Invalid embedding response format.")
    }

    // 3. Perform RAG pgvector semantic search via database RPC
    const filterMetadata = region ? { region } : {}
    const { data: matchData, error: matchError } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: 5,
      filter_metadata: filterMetadata
    })

    if (matchError) {
      throw new Error(`Database error during semantic matching: ${matchError.message}`)
    }

    // 3.5 Fetch latest household waste logs to ground the advisor in the user's actual data
    const { data: logsData, error: logsError } = await supabase
      .from("household_waste_logs")
      .select("*")
      .order("discard_date", { ascending: false })
      .limit(100)

    const logsContext = (logsData && logsData.length > 0)
      ? logsData.map(log => `- ${log.food_name} (${log.category}): ${log.weight_lbs} lbs, $${log.cost_usd}, discarded on ${log.discard_date} due to ${log.reason}. CO2 penalty: ${log.co2_impact_lbs} lbs, Water penalty: ${log.water_impact_gal} gal.`).join('\n')
      : "No household waste logs have been recorded yet."

    // 4. Construct System Grounding Prompt
    const groundingContext = (matchData && matchData.length > 0)
      ? matchData.map((chunk: any) => `[Doc: ${chunk.source_doc}, Chunk: ${chunk.chunk_id}] ${chunk.content}`).join('\n\n')
      : "No matching reference documentation found in the database. Rely on global baseline calculations for South Asia, East Africa, and Latin America if requested, but clearly state you have no specific grounding documents."

    const activeRegion = region ? region : "Global"
    const systemInstruction = `You are the lead AI advisor for ZeroWaste Intelligence Platform. Your primary goal is to help users, policy analysts, and supply chain operators reduce food waste by 50% against the locked January 2026 baseline.
Ground your answers strictly in the verified context chunks provided below. Never invent, hallucinate, or assume food waste statistics that are not present. If the matching data does not contain the answer, say so clearly.

Active Region Scope: ${activeRegion}

Verified Grounding Data:
${groundingContext}

Active Household Waste Logs:
${logsContext}

Use the user's household waste logs to answer specific questions about their own food waste history, habits, cost, and ecological impact if they ask! Provide shelf-saving hacks, cooking tips, or zero-waste recipes for items they are wasting or have already wasted!

Cite your sources inline in the text using [DocName, ChunkID]. Keep your answer highly analytical, precise, and professional. Avoid superlatives.
At the very end of your response, output a structured JSON block containing the exact cited source metadata for the client to render citations:
\`\`\`sources
${JSON.stringify((matchData || []).map((chunk: any) => ({ source_doc: chunk.source_doc, chunk_id: chunk.chunk_id })), null, 2)}
\`\`\`
`

    // 5. Structure contents for Gemini API (including history)
    const formattedContents: any[] = []
    
    // Add history if present
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : msg.parts?.[0]?.text ?? '' }]
        })
      })
    }

    // Add current user prompt
    formattedContents.push({
      role: 'user',
      parts: [{ text: query }]
    })

    // 6. Request streaming or single response from Gemini 3.5 Flash
    if (stream === true) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              temperature: 0.15,
              topP: 0.95,
              maxOutputTokens: 2048
            }
          })
        }
      )

      if (!geminiResponse.ok) {
        const geminiErr = await geminiResponse.text()
        throw new Error(`Gemini Stream Generation failed: ${geminiErr}`)
      }

      // Stream response chunks directly to client
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const reader = geminiResponse.body?.getReader()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Response body is not readable.")
      }

      // Run async loop to read and stream chunks without blocking
      (async () => {
        try {
          let buffer = ""
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim()
                if (dataStr === '[DONE]') continue
                try {
                  const parsed = JSON.parse(dataStr)
                  const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                  if (textChunk) {
                    await writer.write(encoder.encode(textChunk))
                  }
                } catch {
                  // Ignore parsing errors for empty or framing chunks
                }
              }
            }
          }
          await writer.close()
        } catch (err) {
          console.error("Stream pipe error:", err)
          await writer.abort(err)
        }
      })()

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      // Standard non-streaming JSON response (Default)
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              temperature: 0.15,
              topP: 0.95,
              maxOutputTokens: 2048
            }
          })
        }
      )

      if (!geminiResponse.ok) {
        const geminiErr = await geminiResponse.text()
        throw new Error(`Gemini Generation failed: ${geminiErr}`)
      }

      const geminiJson = await geminiResponse.json()
      const replyText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "No response received."

      return new Response(
        JSON.stringify({ reply: replyText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error("api-v1-chat edge function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during your request." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
