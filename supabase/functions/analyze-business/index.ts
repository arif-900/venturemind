// Supabase Edge Function: analyze-business
// Secure server-side execution for Gemini AI intelligence reasoning
// Grounded strictly in real-time verified evidence. Zero synthetic data.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server environment is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      businessTitle,
      category,
      objective,
      budget,
      targetLocation,
      targetDemographic,
      searchRadiusMeters,
      verifiedEvidence,
    } = body

    if (!businessTitle || !category || !objective) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: businessTitle, category, objective' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'AI service configuration pending: GEMINI_API_KEY has not been set in Edge Function secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let evidenceText = 'No real-time location/competitor search performed yet. Rely only on user inputs and explicitly request field verification.'
    if (verifiedEvidence) {
      const radiusKm = searchRadiusMeters ? (searchRadiusMeters / 1000).toFixed(1) : '1.5'
      const directList = (verifiedEvidence.competitorsList || []).filter((c: any) => c.relevance === 'direct')
      const indirectList = (verifiedEvidence.competitorsList || []).filter((c: any) => c.relevance === 'indirect')

      const directCompsText = directList.length > 0
        ? directList.map((c: any) => `  * Direct Competitor: "${c.name}" | Type: ${c.type} | Distance: ${c.distanceKm ?? '?'}km | Relationship: ${c.relevanceReason || c.relevanceLabel || 'Direct competitor'}`).join('\n')
        : '  * None registered in open geospatial registries within selected radius.'

      const indirectCompsText = indirectList.length > 0
        ? indirectList.map((c: any) => `  * Indirect / Demographic Establishment: "${c.name}" | Type: ${c.type} | Distance: ${c.distanceKm ?? '?'}km | Relationship: ${c.relevanceReason || c.relevanceLabel || 'Indirect demographic/substitute'}`).join('\n')
        : '  * None registered in open registries within selected radius.'

      const altCandidatesText = Array.isArray(verifiedEvidence.alternativeCandidates) && verifiedEvidence.alternativeCandidates.length > 0
        ? verifiedEvidence.alternativeCandidates.map((a: any) => `- Candidate: "${a.areaName}" (Coords: ${JSON.stringify(a.coordinates || 'Unknown')}), Competitor POIs: ${a.competitorCount} (Direct: ${a.directCompetitorsCount ?? '0'}, Indirect: ${a.indirectCompetitorsCount ?? '0'})`).join('\n')
        : 'No distinct adjacent candidate areas identified.'

      evidenceText = `VERIFIED EXTERNAL EVIDENCE RETRIEVED:
- Selected Search Area / Epicenter: "${targetLocation || 'Not specified'}" (Coordinates: ${verifiedEvidence.coordinates ? JSON.stringify(verifiedEvidence.coordinates) : 'Not geocoded'})
- Search Radius: ${radiusKm} km
- Verified Direct Competitors (${verifiedEvidence.directCompetitorCount ?? directList.length}):
${directCompsText}
- Verified Indirect Institutions / Demographic Hubs (${verifiedEvidence.indirectCompetitorCount ?? indirectList.length}):
${indirectCompsText}
- Empirical Registry Coverage Note: ${verifiedEvidence.coverageNote || 'Standard open registry query performed.'}
- Evidence Sources: ${verifiedEvidence.sources || 'OpenStreetMap Contributors, Mapbox Places'}
- Candidate Alternative Areas Detected via Real GIS:
${altCandidatesText}`
    }

    const prompt = `You are VentureMind AI, an evidence-grounded strategic advisor for entrepreneurs.
Strict Rules:
1. NEVER fabricate or invent missing statistics, customer footfall numbers, rent rates, market sizes, or customer demand.
2. DO NOT treat a low or zero registered competitor count as proof of low competition or high demand. In open registries (OSM/Mapbox), private businesses, academies, and coaching centers are frequently unmapped.
3. Analyze DIRECT competitors separately from INDIRECT competitors:
   - For educational/coaching ventures (e.g. Bank Coaching Center): Direct competitors are specialized banking exam / competitive test prep institutes; Indirect establishments are colleges/universities (which act as student feeder pools) and secondary schools (non-competing K-12).
   - Explain how each direct competitor affects the founder's market opportunity and differentiation.
   - Treat nearby colleges and universities as potential student talent pools / applicant catchments, not direct rivals.
   - Do NOT assume an area is suitable merely because it contains schools or colleges without evaluating student concentration and accessibility.
4. Ground all alternative location comparisons strictly in the provided geospatial evidence. Detail what advantages/disadvantages exist and list factors requiring field verification.
5. If empirical data is missing or incomplete, explicitly state "Insufficient empirical data" in missingEvidenceGaps.

Evaluate this venture:
- Business Initiative: "${businessTitle}"
- Category: "${category}"
- Stated Objective: "${objective}"
- Declared Capital / Budget: ${budget ? '$' + budget : 'Unspecified'}
- Target Customer Profile / Demographic: "${targetDemographic || 'Unspecified by founder'}"
- Primary Target Location: "${targetLocation || 'Not specified'}"

${evidenceText}

Respond ONLY with valid JSON having the following structure:
{
  "executiveSummary": "string summarizing viability based strictly on provided data",
  "verifiedFacts": ["string", "string"],
  "locationSuitabilityAnalysis": "detailed string assessing the selected area's suitability, physical accessibility, and commercial vs residential fabric based on real data",
  "directCompetitorAnalysis": [
    {
      "competitorName": "name of direct competitor or 'None registered'",
      "impactOnVenture": "how this competitor influences pricing, student acquisition, or market share",
      "differentiationStrategy": "actionable positioning advice to compete or differentiate"
    }
  ],
  "indirectCompetitorAnalysis": [
    {
      "competitorName": "name of college, school, or related institution",
      "category": "institution type",
      "strategicRelationship": "e.g., student feeder demographic or non-competing substitute"
    }
  ],
  "keyConsiderations": ["string", "string", "string"],
  "estimatedViabilityScore": number between 1 and 100 based on completeness and capital sufficiency,
  "missingEvidenceGaps": ["string", "string"],
  "alternativeLocationComparisons": [
    {
      "areaName": "string exactly matching candidate area name from evidence",
      "competitorCount": number,
      "pros": "string explaining potential advantages for this specific business idea",
      "cons": "string explaining drawbacks, competition, or zoning risks",
      "recommendationVerdict": "Favorable" or "Needs Field Survey" or "High Barrier" or "Insufficient Empirical Data",
      "factorsRequiringFieldVerification": ["factor 1", "factor 2"]
    }
  ],
  "strategicNextSteps": ["string", "string"],
  "provenanceNotes": "string describing evidence sources and methodology used"
}`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API upstream error:', errText)
      return new Response(
        JSON.stringify({ error: 'Upstream AI model error or rate limit reached.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiRes.json()
    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    const parsed = JSON.parse(rawContent)

    return new Response(
      JSON.stringify({
        ...parsed,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error in business analysis' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
