// filename: supabase/functions/gemini-fridge-scan/index.ts
// purpose: Multimodal visual fridge scan and item prediction using Gemini Omni Flash
// dependencies: Supabase JS SDK, Deno std/http
// brief_section: Section 13 - Gap-Closing Addition 1 - Gemini Omni Fridge Scan

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

    const { image, user_id } = await req.json()

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image data (base64) is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up base64 prefix if present (e.g. data:image/jpeg;base64,...)
    let mimeType = 'image/jpeg'
    let base64Data = image
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/)
      if (match) {
        mimeType = match[1]
        base64Data = match[2]
      }
    }

    // 1. Initialize Supabase Service Role Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Formulate Visual Prompt for Gemini Omni Flash (multimodal)
    const promptText = `Analyze this fridge or food shelf photo and identify all visible food items. 
Proactively estimate their fresh status, expiry threshold (in days), waste risk probability score, and construct actionable advice for each. 

You must return a raw JSON object ONLY. No markdown wrap, no backticks, no text explanation outside the JSON. Match this schema exactly:
{
  "items": [
    {
      "name": "string (name of identified item)",
      "category": "produce|dairy|meat|grains|other",
      "estimated_days_to_expiry": number (e.g., 2, 5, 14),
      "waste_probability_score": number (0 to 100),
      "recommended_action": "cook_tonight|freeze|donate|discard|fine",
      "reason": "string explaining visual indicators seen, e.g. 'wilting leaves', 'spotting skin'"
    }
  ],
  "total_waste_risk_kg": number (sum of estimated waste risk weight),
  "household_co2_impact_kg": number (estimated greenhouse gas CO2 equivalent in kg)
}`

    // 3. Call Gemini Omni Flash model endpoint
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-omni-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: promptText
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const geminiErr = await geminiResponse.text()
      throw new Error(`Gemini Multimodal Inference failed: ${geminiErr}`)
    }

    const geminiJson = await geminiResponse.json()
    let rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error("No output candidate returned from Gemini Omni Flash.")
    }

    // Clean up any potential raw text backticks if response was not strictly JSON formatted
    rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()

    // 4. Parse output and validate schema
    const parsedData = JSON.parse(rawText)
    const { items, total_waste_risk_kg, total_co2_impact_kg } = parsedData

    if (!Array.isArray(items)) {
      throw new Error("Invalid output format: 'items' must be a JSON array.")
    }

    // 5. Log the scan to the database
    const { data: scanRow, error: scanError } = await supabase
      .from('fridge_scans')
      .insert({
        user_id,
        items,
        total_waste_risk_kg: total_waste_risk_kg ?? 0,
        total_co2_impact_kg: total_co2_impact_kg ?? 0,
        image_path: null // Reference can be filled with Storage URL if images are persisted
      })
      .select()
      .single()

    if (scanError) {
      throw new Error(`Database error saving fridge scan: ${scanError.message}`)
    }

    // 6. Return response to consumer client
    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanRow.id,
        items: scanRow.items,
        total_waste_risk_kg: scanRow.total_waste_risk_kg,
        total_co2_impact_kg: scanRow.total_co2_impact_kg,
        scanned_at: scanRow.scanned_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("gemini-fridge-scan edge function error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred during image processing." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
