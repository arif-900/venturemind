/**
 * VentureMind — Location Decision Service
 * ─────────────────────────────────────────
 * Deterministic, evidence-grounded scoring engine.
 * Zero invented facts. Every component is derived from retrieved real-world data.
 *
 * Scoring methodology:
 *  - COMPETITION_PRESSURE   (0-30 pts)  — penalises dense direct competitor clusters
 *  - MARKET_DEMAND_SIGNAL   (0-25 pts)  — rewards indirect/demographic hubs as demand proxies
 *  - DATA_CONFIDENCE        (0-20 pts)  — rewards breadth of evidence sources, penalises gaps
 *  - FINANCIAL_FEASIBILITY  (0-15 pts)  — runway headroom from user's own numbers
 *  - ALTERNATIVE_ADVANTAGE  (0-10 pts)  — whether alternatives outperform the selected location
 *
 * Score ranges → Verdicts:
 *  75–100 → RECOMMENDED
 *  55–74  → CONDITIONAL
 *  30–54  → NOT_RECOMMENDED
 *   0–29  → INSUFFICIENT_DATA  (when data coverage is critically low)
 */

import type { RealCompetitorPOI, CandidateAlternativeArea, DiscoveryMetrics } from './realtimeIntelligenceService'

export type DecisionVerdict =
  | 'RECOMMENDED'
  | 'CONDITIONAL'
  | 'NOT_RECOMMENDED'
  | 'INSUFFICIENT_DATA'

export interface ScoreComponent {
  label: string
  score: number       // 0–maxScore
  maxScore: number
  weight: number      // 0-1 weight used
  rationale: string   // human-readable explanation of the score
  evidenceSource: 'retrieved' | 'calculated' | 'user_input' | 'missing'
}

export interface AlternativeLocationRanking {
  areaName: string
  coordinates?: [number, number]
  distanceKm?: number
  competitorCount: number
  directCount: number
  indirectCount: number
  sampleCompetitors: string[]
  competitivePressureScore: number   // 0-100 — lower means less pressure
  rankingScore: number               // composite ranking score (higher = better)
  advantage: string                  // single-sentence why this is better/worse than selected
  mapsUrl?: string
}

export interface LocationDecisionResult {
  verdict: DecisionVerdict
  compositeScore: number          // 0–100
  components: ScoreComponent[]
  primaryReason: string           // 1-sentence verdict headline
  advantages: string[]
  risks: string[]
  marketGaps: string[]
  actionableNextSteps: string[]
  alternativeRankings: AlternativeLocationRanking[]
  dataCoverageNote: string
  assumptions: string[]           // list of user-provided assumptions that affect score
  evidenceSources: string[]
  computedAt: string
}

export interface DecisionEngineInput {
  /** Business idea title */
  businessTitle: string
  /** Resolved business sector/category */
  sector: string
  /** Location name searched */
  locationName: string
  /** User's starting capital (INR) */
  budget?: number | null
  /** User's monthly burn estimate (INR) */
  monthlyBurn?: number
  /** User's expected monthly revenue (INR) */
  monthlyRevenue?: number
  /** Radius used for competitor discovery */
  radiusMeters: number
  /** All retrieved competitor POIs (businesses + geographic features combined) */
  competitors: RealCompetitorPOI[]
  /** Alternative candidate areas retrieved by geospatial probing */
  alternativeCandidates: CandidateAlternativeArea[]
  /** Multi-source discovery metrics */
  discoveryMetrics?: DiscoveryMetrics | null
  /** Coverage note from the market scan */
  coverageNote?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Compute Google Maps URL — reusing the same logic as buildGoogleMapsUrl without import cycle */
function mapsUrl(coords?: [number, number], address?: string): string | undefined {
  if (coords && coords.length === 2) {
    const [lng, lat] = coords
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
    }
  }
  if (address && address.trim().length > 3) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
  }
  return undefined
}

// ────────────────────────────────────────────────────────────────────────────
// Scoring components
// ────────────────────────────────────────────────────────────────────────────

/**
 * Component 1: COMPETITION_PRESSURE (0–30)
 * Lower direct competition relative to radius = higher score.
 * We don't penalise competition uniformly — many indirect competitors can mean demand exists.
 */
function scoreCompetitionPressure(
  directCount: number,
  radiusKm: number,
): ScoreComponent {
  // Density: competitors per km²
  const areaKm2 = Math.PI * radiusKm * radiusKm
  const density = directCount / Math.max(areaKm2, 0.01)

  // Score: full 30 pts at 0 direct competitors; zero at density ≥ 3/km²
  const pressureFraction = clamp(density / 3, 0, 1)
  const score = Math.round(30 * (1 - pressureFraction))

  let rationale: string
  if (directCount === 0) {
    rationale = 'No direct competitors retrieved in the search radius — no competitive saturation detected from open data.'
  } else if (density < 0.5) {
    rationale = `${directCount} direct competitor(s) within ${radiusKm.toFixed(1)} km (${density.toFixed(2)}/km²) — low density, potential market gap.`
  } else if (density < 1.5) {
    rationale = `${directCount} direct competitor(s) at ${density.toFixed(2)}/km² — moderate competition; differentiation is necessary.`
  } else {
    rationale = `${directCount} direct competitor(s) at ${density.toFixed(2)}/km² — high competitive density; saturation risk.`
  }

  return {
    label: 'Competitive Pressure',
    score,
    maxScore: 30,
    weight: 0.30,
    rationale,
    evidenceSource: 'retrieved',
  }
}

/**
 * Component 2: MARKET_DEMAND_SIGNAL (0–25)
 * Indirect competitors (schools, banks, complementary businesses) act as demand proxies.
 * 0 indirect = zero demand signal from open data (not necessarily bad, just unknown).
 */
function scoreMarketDemand(
  indirectCount: number,
  totalBusinessPOIs: number,
): ScoreComponent {
  if (totalBusinessPOIs === 0) {
    return {
      label: 'Market Demand Signal',
      score: 0,
      maxScore: 25,
      weight: 0.25,
      rationale: 'No business POIs retrieved. Demand signal cannot be estimated from open data.',
      evidenceSource: 'missing',
    }
  }

  // Indirect businesses indicate customer footfall and demographic concentration
  const demandRatio = clamp(indirectCount / Math.max(totalBusinessPOIs, 1), 0, 1)
  const score = Math.round(25 * clamp(demandRatio * 2, 0, 1)) // scale up — ratio of 0.5+ = full score

  let rationale: string
  if (indirectCount === 0) {
    rationale = 'No indirect demographic anchors (schools, banks, retail hubs) found — customer traffic level unknown from open data.'
  } else if (indirectCount <= 3) {
    rationale = `${indirectCount} indirect demographic anchor(s) detected — limited demand signal. Physical survey advised.`
  } else {
    rationale = `${indirectCount} complementary/demographic anchor businesses within radius — moderate-to-strong foot traffic signal.`
  }

  return {
    label: 'Market Demand Signal',
    score,
    maxScore: 25,
    weight: 0.25,
    rationale,
    evidenceSource: 'retrieved',
  }
}

/**
 * Component 3: DATA_CONFIDENCE (0–20)
 * Multi-source retrieval = higher confidence.
 * Missing data = penalised.
 */
function scoreDataConfidence(
  metrics: DiscoveryMetrics | null | undefined,
  coverageNote: string | undefined,
): ScoreComponent {
  if (!metrics) {
    return {
      label: 'Data Confidence',
      score: 5,
      maxScore: 20,
      weight: 0.20,
      rationale: 'Discovery metrics unavailable — confidence in evidence coverage is low.',
      evidenceSource: 'missing',
    }
  }

  // Start at max, deduct for failed queries and limitations
  let score = 20
  const failedCount = metrics.failedQueries?.length || 0
  const limitCount = metrics.coverageLimitations?.length || 0
  score -= failedCount * 3     // -3 per failed source
  score -= limitCount * 1      // -1 per coverage limitation
  // Bonus if multi-source
  const sourcesActive = [metrics.rawMapbox > 0, metrics.rawOsmOverpass > 0, metrics.rawOsmNominatim > 0].filter(Boolean).length
  if (sourcesActive < 2) score -= 5

  score = clamp(score, 0, 20)

  const rationale = `${sourcesActive} of 3 sources returned data. ${failedCount} query failover(s). ${limitCount} coverage limitation(s) noted.${coverageNote ? ' Coverage: ' + coverageNote.slice(0, 80) + '…' : ''}`

  return {
    label: 'Data Confidence',
    score,
    maxScore: 20,
    weight: 0.20,
    rationale,
    evidenceSource: 'retrieved',
  }
}

/**
 * Component 4: FINANCIAL_FEASIBILITY (0–15)
 * Uses the user's own numbers. If absent, the component scores 0 and is flagged as missing.
 */
function scoreFinancialFeasibility(
  budget?: number | null,
  monthlyBurn?: number,
  monthlyRevenue?: number,
): ScoreComponent {
  if (!budget || budget <= 0) {
    return {
      label: 'Financial Feasibility',
      score: 0,
      maxScore: 15,
      weight: 0.15,
      rationale: 'No starting capital entered. Financial feasibility cannot be assessed.',
      evidenceSource: 'missing',
    }
  }

  const burn = monthlyBurn || 0
  const revenue = monthlyRevenue || 0
  const netBurn = burn - revenue

  if (burn === 0) {
    return {
      label: 'Financial Feasibility',
      score: 7,
      maxScore: 15,
      weight: 0.15,
      rationale: `Budget ₹${budget.toLocaleString('en-IN')} provided but monthly costs not entered. Partial score assigned.`,
      evidenceSource: 'user_input',
    }
  }

  let score: number
  let rationale: string

  if (netBurn <= 0) {
    score = 15
    rationale = `Monthly revenue ≥ expenses — profitable assumption (Revenue: ₹${revenue.toLocaleString('en-IN')}, Burn: ₹${burn.toLocaleString('en-IN')}). Verify assumptions with real cost data.`
  } else {
    const runwayMonths = budget / netBurn
    if (runwayMonths >= 18) {
      score = 15
      rationale = `${runwayMonths.toFixed(1)}-month runway — strong financial buffer at user's stated assumptions.`
    } else if (runwayMonths >= 12) {
      score = 11
      rationale = `${runwayMonths.toFixed(1)}-month runway — adequate but moderate. Reaching profitability before month ${Math.ceil(runwayMonths)} is essential.`
    } else if (runwayMonths >= 6) {
      score = 6
      rationale = `${runwayMonths.toFixed(1)}-month runway — tight. Business must reach break-even quickly or secure additional capital.`
    } else {
      score = 2
      rationale = `Only ${runwayMonths.toFixed(1)}-month runway at stated assumptions — very high financial risk.`
    }
  }

  return {
    label: 'Financial Feasibility',
    score,
    maxScore: 15,
    weight: 0.15,
    rationale,
    evidenceSource: 'user_input',
  }
}

/**
 * Component 5: ALTERNATIVE_ADVANTAGE (0–10)
 * If the best alternative has meaningfully lower competition, award points to this location
 * relative to alternatives (higher = this location is better or equal to alternatives).
 */
function scoreAlternativeAdvantage(
  selectedDirectCount: number,
  alternatives: CandidateAlternativeArea[],
): ScoreComponent {
  if (alternatives.length === 0) {
    return {
      label: 'Relative Location Advantage',
      score: 10,
      maxScore: 10,
      weight: 0.10,
      rationale: 'No alternative areas discovered — selected location has no identified comparable alternatives in the search radius.',
      evidenceSource: 'retrieved',
    }
  }

  const bestAltDirect = Math.min(...alternatives.map((a) => a.directCompetitorsCount ?? a.competitorCount))

  if (selectedDirectCount <= bestAltDirect) {
    return {
      label: 'Relative Location Advantage',
      score: 10,
      maxScore: 10,
      weight: 0.10,
      rationale: `Selected area has ≤ direct competitors vs. best alternative (${bestAltDirect} direct) — relatively favourable position.`,
      evidenceSource: 'calculated',
    }
  }

  const disadvantageFraction = clamp((selectedDirectCount - bestAltDirect) / Math.max(selectedDirectCount, 1), 0, 1)
  const score = Math.round(10 * (1 - disadvantageFraction))

  return {
    label: 'Relative Location Advantage',
    score,
    maxScore: 10,
    weight: 0.10,
    rationale: `Best alternative (${alternatives[0]?.areaName}) has ${bestAltDirect} direct vs. ${selectedDirectCount} here — selected area is at a relative competitive disadvantage.`,
    evidenceSource: 'calculated',
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Alternative ranking
// ────────────────────────────────────────────────────────────────────────────

function rankAlternatives(
  alternatives: CandidateAlternativeArea[],
  selectedDirectCount: number,
): AlternativeLocationRanking[] {
  return alternatives
    .map((alt) => {
      const altDirect = alt.directCompetitorsCount ?? 0
      const altIndirect = alt.indirectCompetitorsCount ?? 0
      const altTotal = alt.competitorCount

      // Lower direct = less pressure → higher score for the alternative
      const pressureScore = clamp(100 - (altDirect / Math.max(altTotal, 1)) * 100, 0, 100)
      const demandScore = clamp((altIndirect / Math.max(altTotal, 1)) * 100, 0, 100)
      const rankingScore = Math.round(pressureScore * 0.6 + demandScore * 0.4)

      const isBetter = altDirect < selectedDirectCount
      const advantage = isBetter
        ? `${altDirect} direct competitor(s) vs. ${selectedDirectCount} at selected location — lower competitive pressure.`
        : altDirect === selectedDirectCount
        ? `Same direct competitor count as selected location — comparable competitive environment.`
        : `${altDirect} direct competitor(s) — higher competition than selected location.`

      return {
        areaName: alt.areaName,
        coordinates: alt.coordinates,
        distanceKm: alt.distanceKm,
        competitorCount: altTotal,
        directCount: altDirect,
        indirectCount: altIndirect,
        sampleCompetitors: alt.sampleCompetitors || [],
        competitivePressureScore: Math.round(pressureScore),
        rankingScore,
        advantage,
        mapsUrl: mapsUrl(alt.coordinates, alt.areaName),
      }
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)
}

// ────────────────────────────────────────────────────────────────────────────
// Advantages, Risks, Gaps, Next Steps
// ────────────────────────────────────────────────────────────────────────────

function deriveAdvantages(
  components: ScoreComponent[],
  directCount: number,
  indirectCount: number,
  alternatives: CandidateAlternativeArea[],
  budget?: number | null,
): string[] {
  const out: string[] = []
  const comp = Object.fromEntries(components.map((c) => [c.label, c]))

  if (directCount === 0) out.push('No direct competitors found in open data — potential market gap in this location.')
  if (indirectCount > 3) out.push(`${indirectCount} complementary businesses nearby suggest established customer traffic.`)
  if ((comp['Financial Feasibility']?.score ?? 0) >= 11) out.push('Financial runway looks adequate based on provided inputs.')
  if ((comp['Competitive Pressure']?.score ?? 0) >= 20) out.push('Low competitive density relative to search radius.')
  if (alternatives.length === 0) out.push('No comparable alternative areas found — this may be a relatively unique catchment.')
  if (out.length === 0) out.push('Some aspects of this location merit further investigation through a physical survey.')
  return out
}

function deriveRisks(
  components: ScoreComponent[],
  directCount: number,
  metrics: DiscoveryMetrics | null | undefined,
  budget?: number | null,
  monthlyBurn?: number,
): string[] {
  const out: string[] = []
  const comp = Object.fromEntries(components.map((c) => [c.label, c]))

  if (directCount >= 5) out.push(`${directCount} direct competitors retrieved — market may already be served; differentiation is critical.`)
  if ((comp['Financial Feasibility']?.score ?? 15) <= 6) out.push('Financial runway is short at stated assumptions — seek validation of cost estimates.')
  if (!budget) out.push('Starting capital not specified — financial feasibility cannot be confirmed.')
  if ((comp['Data Confidence']?.score ?? 20) < 10) out.push('Multiple data sources failed — evidence coverage is limited; physical survey is strongly recommended.')
  if ((metrics?.failedQueries?.length ?? 0) > 0) out.push('Some query sources returned no data — actual competitor density may differ from what was retrieved.')
  if ((comp['Market Demand Signal']?.score ?? 25) === 0) out.push('No demand-proxy businesses detected in open data — customer traffic levels are unknown.')
  if (out.length === 0) out.push('No major risks identified from retrieved evidence — physical validation is still advisable.')
  return out
}

function deriveMarketGaps(
  directCount: number,
  sector: string,
  indirectCount: number,
  alternatives: AlternativeLocationRanking[],
): string[] {
  const out: string[] = []
  if (directCount === 0) out.push(`No ${sector} establishments found in open data — potential underserved market segment if demand exists.`)
  if (directCount <= 2 && indirectCount >= 3) out.push('Minimal direct competition alongside strong complementary businesses — indicates potential unmet demand.')
  if (alternatives.some((a) => a.directCount < directCount)) {
    out.push('Nearby alternative areas show lower direct competition — cross-location comparison recommended.')
  }
  if (out.length === 0) out.push('No clear market gap identified from retrieved open data alone — physical validation needed.')
  return out
}

function deriveNextSteps(
  verdict: DecisionVerdict,
  directCount: number,
  alternatives: AlternativeLocationRanking[],
): string[] {
  const steps: string[] = []
  if (verdict === 'INSUFFICIENT_DATA') {
    steps.push('Conduct a physical survey of the target area — open data coverage is too limited for a reliable remote assessment.')
    steps.push('Refine the location query (add a city or district name) to improve geocoding accuracy.')
  }
  if (verdict === 'NOT_RECOMMENDED' && alternatives.length > 0) {
    steps.push(`Consider evaluating ${alternatives[0].areaName} — retrieved evidence shows lower direct competition there.`)
  }
  steps.push('Validate cost assumptions with local market quotes before committing capital.')
  steps.push('Interview potential customers in the target area to confirm demand.')
  if (directCount > 0) steps.push(`Visit the ${directCount} identified competitor location(s) to understand their offerings and gaps.`)
  steps.push('Run a Financial Runway analysis with realistic monthly costs once local quotes are available.')
  return steps
}

// ────────────────────────────────────────────────────────────────────────────
// Main exported function
// ────────────────────────────────────────────────────────────────────────────

export function computeLocationDecision(input: DecisionEngineInput): LocationDecisionResult {
  const {
    businessTitle,
    sector,
    locationName,
    budget,
    monthlyBurn,
    monthlyRevenue,
    radiusMeters,
    competitors,
    alternativeCandidates,
    discoveryMetrics,
    coverageNote,
  } = input

  // Separate business POIs from geographic features
  const businessPOIs = competitors.filter((c) => !c.isGeographicFeature)
  const directCount = businessPOIs.filter((c) => c.relevance === 'direct').length
  const indirectCount = businessPOIs.filter((c) => c.relevance === 'indirect').length
  const radiusKm = radiusMeters / 1000

  // Score each component
  const c1 = scoreCompetitionPressure(directCount, radiusKm)
  const c2 = scoreMarketDemand(indirectCount, businessPOIs.length)
  const c3 = scoreDataConfidence(discoveryMetrics, coverageNote)
  const c4 = scoreFinancialFeasibility(budget, monthlyBurn, monthlyRevenue)
  const c5 = scoreAlternativeAdvantage(directCount, alternativeCandidates)

  const components = [c1, c2, c3, c4, c5]
  const compositeScore = clamp(
    components.reduce((sum, c) => sum + c.score, 0),
    0,
    100,
  )

  // Determine verdict
  const missingComponents = components.filter((c) => c.evidenceSource === 'missing').length
  const isCriticallyBlind = c3.score <= 5 && businessPOIs.length === 0

  let verdict: DecisionVerdict
  if (isCriticallyBlind) {
    verdict = 'INSUFFICIENT_DATA'
  } else if (compositeScore >= 75) {
    verdict = 'RECOMMENDED'
  } else if (compositeScore >= 55) {
    verdict = 'CONDITIONAL'
  } else if (compositeScore >= 30) {
    verdict = 'NOT_RECOMMENDED'
  } else {
    verdict = 'INSUFFICIENT_DATA'
  }

  // Build primary reason
  const primaryReasonMap: Record<DecisionVerdict, string> = {
    RECOMMENDED: `Retrieved evidence supports proceeding to physical validation of ${locationName} for ${sector}.`,
    CONDITIONAL: `${locationName} may work for ${sector} if key risks are addressed before committing capital.`,
    NOT_RECOMMENDED: `Identified risks and competitive pressure make other locations worth evaluating first.`,
    INSUFFICIENT_DATA: `Evidence coverage from open data is insufficient for a reliable recommendation — on-the-ground verification is required.`,
  }

  // Rank alternatives
  const alternativeRankings = rankAlternatives(alternativeCandidates, directCount)

  const advantages = deriveAdvantages(components, directCount, indirectCount, alternativeCandidates, budget)
  const risks = deriveRisks(components, directCount, discoveryMetrics, budget, monthlyBurn)
  const marketGaps = deriveMarketGaps(directCount, sector, indirectCount, alternativeRankings)
  const actionableNextSteps = deriveNextSteps(verdict, directCount, alternativeRankings)

  const assumptions: string[] = []
  if (budget) assumptions.push(`Starting capital: ₹${budget.toLocaleString('en-IN')} (user input)`)
  if (monthlyBurn) assumptions.push(`Monthly expenses: ₹${monthlyBurn.toLocaleString('en-IN')} (user estimate — verify with local quotes)`)
  if (monthlyRevenue) assumptions.push(`Monthly revenue: ₹${monthlyRevenue.toLocaleString('en-IN')} (user projection — not validated)`)
  assumptions.push(`Search radius: ${radiusKm.toFixed(1)} km from ${locationName}`)
  assumptions.push('Competitor counts reflect open registry data — actual market may have unlisted businesses')

  const evidenceSources: string[] = []
  if ((discoveryMetrics?.rawMapbox ?? 0) > 0) evidenceSources.push('Mapbox Search API')
  if ((discoveryMetrics?.rawOsmOverpass ?? 0) > 0) evidenceSources.push('OpenStreetMap Overpass')
  if ((discoveryMetrics?.rawOsmNominatim ?? 0) > 0) evidenceSources.push('Nominatim Geocoding')
  if (evidenceSources.length === 0) evidenceSources.push('Limited open data (queries may have returned no results)')

  return {
    verdict,
    compositeScore,
    components,
    primaryReason: primaryReasonMap[verdict],
    advantages,
    risks,
    marketGaps,
    actionableNextSteps,
    alternativeRankings,
    dataCoverageNote: coverageNote || c3.rationale,
    assumptions,
    evidenceSources,
    computedAt: new Date().toISOString(),
  }
}
