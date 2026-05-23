// filename: supabase/functions/embed-document/index.ts
// purpose: Text chunk document embedding ingest function using Gemini text-embedding-004 & pgvector store
// dependencies: Supabase JS SDK, Deno std/http
// brief_section: Section 7 - AI Layer Architecture & Section 9 - Ingestion Pipeline

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

    const { content, source_doc, chunk_id, metadata } = await req.json()

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!source_doc || !chunk_id) {
      return new Response(
        JSON.stringify({ error: "source_doc and chunk_id are required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Initialize Supabase Service Role Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Request 1536-dimensional vector representation from models/text-embedding-004
    const embedResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: content }]
          }
        })
      }
    )

    if (!embedResponse.ok) {
      const embedErr = await embedResponse.text()
      throw new Error(`Gemini Text Embedding API call failed: ${embedErr}`)
    }

    const embedJson = await embedResponse.json()
    const vectorArray = embedJson.embedding?.values

    if (!vectorArray || !Array.isArray(vectorArray) || vectorArray.length !== 1536) {
      throw new Error(`Embedding vector generation returned invalid dimensions. Expected 1536-dim, got: ${vectorArray?.length ?? 'none'}`)
    }

    // 3. Upsert content and vector embedding into embeddings table
    const { data: insertedRow, error: insertError } = await supabase
      .from('embeddings')
      .insert({
        content,
        embedding: vectorArray,
        source_doc,
        chunk_id,
        metadata: metadata ?? {}
      })
      .select('id, chunk_id, source_doc')
      .single()

    if (insertError) {
      throw new Error(`Database error saving vector embedding record: ${insertError.message}`)
    }

    // 4. Return response
    return new Response(
      JSON.stringify({
        success: true,
        id: insertedRow.id,
        chunk_id: insertedRow.chunk_id,
        source_doc: insertedRow.source_doc,
        message: "Document chunk successfully vectorized and indexed."
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("embed-document edge function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during document chunk indexing." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
