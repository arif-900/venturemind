import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

function devAiIntelligencePlugin() {
  return {
    name: 'dev-ai-intelligence-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/analyze-business') && req.method === 'POST') {
          let rawBody = ''
          req.on('data', (chunk: any) => {
            rawBody += chunk
          })
          req.on('end', async () => {
            try {
              const env = loadEnv('development', process.cwd(), '')
              const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

              if (!geminiApiKey) {
                res.statusCode = 503
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in .env' }))
                return
              }

              const body = JSON.parse(rawBody)
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
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing required parameters: businessTitle, category, objective' }))
                return
              }

              let evidenceText = 'No real-time location/competitor search performed yet. Rely only on user inputs and explicitly request field verification.'
              if (verifiedEvidence) {
                const radiusKm = searchRadiusMeters ? (searchRadiusMeters / 1000).toFixed(1) : '1.5'
                const directList = (verifiedEvidence.competitorsList || []).filter((c: any) => c.relevance === 'direct')
                const indirectList = (verifiedEvidence.competitorsList || []).filter((c: any) => c.relevance === 'indirect')
                const unverifiedList = (verifiedEvidence.competitorsList || []).filter((c: any) => c.relevance === 'unverified')

                const directCompsText = directList.length > 0
                  ? directList.map((c: any) => `  * Direct Competitor: "${c.name}" | Type: ${c.type} | Distance: ${c.distanceKm ?? '?'}km | Relationship: ${c.relevanceReason || c.relevanceLabel || 'Direct competitor'}`).join('\n')
                  : '  * None registered in open geospatial registries within selected radius.'

                const indirectCompsText = indirectList.length > 0
                  ? indirectList.map((c: any) => `  * Indirect / Demographic Establishment: "${c.name}" | Type: ${c.type} | Distance: ${c.distanceKm ?? '?'}km | Relationship: ${c.relevanceReason || c.relevanceLabel || 'Indirect demographic/substitute'}`).join('\n')
                  : '  * None registered in open registries within selected radius.'

                const unverifiedCompsText = unverifiedList.length > 0
                  ? unverifiedList.map((c: any) => `  * Unverified Listing: "${c.name}" | Type: ${c.type} | Distance: ${c.distanceKm ?? '?'}km`).join('\n')
                  : '  * None.'

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
- Unverified General Listings (${verifiedEvidence.unverifiedCompetitorCount ?? unverifiedList.length}):
${unverifiedCompsText}
- Empirical Registry Coverage Note: ${verifiedEvidence.coverageNote || 'Standard open registry query performed.'}
- Evidence Sources: ${verifiedEvidence.sources || 'OpenStreetMap Contributors, Mapbox Places'}
- Candidate Alternative Areas Detected via Real GIS:
${altCandidatesText}`;
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
                console.error('Gemini API upstream error in dev middleware:', errText)
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Upstream Gemini model error or rate limit reached.', details: errText }))
                return
              }

              const geminiData = (await geminiRes.json()) as any
              const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
              const parsed = JSON.parse(rawContent)

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  ...parsed,
                  timestamp: new Date().toISOString(),
                })
              )
            } catch (err: any) {
              console.error('Dev AI intelligence middleware error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal server error in business analysis' }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devAiIntelligencePlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('zod')) {
              return 'vendor-validation'
            }
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
