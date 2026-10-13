/**
 * Advanced Location Intelligence Tests — Deterministic Fixture-Based Suite
 *
 * All test fixtures are synthetic and self-contained.
 * No test depends on real-world API responses, specific city names, specific
 * business names, or specific GPS coordinates as final assertions.
 *
 * What we test:
 *  1. Haversine distance accuracy (deterministic math)
 *  2. Coordinate validation (isValidCoordinatePair)
 *  3. Search keyword generation across ALL sectors including custom/Others
 *  4. Relevance classification across all known sectors + custom sectors
 *  5. Bounded competitor discovery with mocked API responses (radius filtering,
 *     provenance embedding, deduplication signals, zero-synthetic-data enforcement)
 *  6. Territory disambiguation candidate structure
 *  7. Gemini input schema validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  haversineDistanceKm,
  isValidCoordinatePair,
  getSearchKeywordsForBusiness,
  classifyCompetitorRelevance,
  realtimeIntelligenceService,
  CATEGORY_QUERY_MAP,
} from '@/lib/services/realtimeIntelligenceService'
import { geminiAnalysisInputSchema } from '@/lib/services/geminiService'

// ---------------------------------------------------------------------------
// Reusable fixture helpers — no real-world place names hardcoded
// ---------------------------------------------------------------------------

/** Creates a minimal mock POI at known offset from a center coordinate. */
function makeMockOsmPoi(overrides: {
  osm_id: number
  name: string
  type: string
  lat: string
  lon: string
  display_name?: string
  extratags?: Record<string, string>
}) {
  return {
    place_id: overrides.osm_id,
    osm_type: 'node',
    osm_id: overrides.osm_id,
    lat: overrides.lat,
    lon: overrides.lon,
    name: overrides.name,
    type: overrides.type,
    display_name: overrides.display_name ?? `${overrides.name}, Test Area, Test Country`,
    extratags: overrides.extratags || {},
  }
}

/** Center coordinate fixture — generic, not tied to any real city. */
const CENTER: [number, number] = [77.0, 12.0] // [lng, lat]
const CENTER_LAT = CENTER[1]
const CENTER_LNG = CENTER[0]

/** Coordinate ~0.4 km north of CENTER */
const NEAR_LAT = (CENTER_LAT + 0.004).toFixed(6)
const NEAR_LNG = CENTER_LNG.toFixed(6)

/** Coordinate ~15 km north — well outside any 2 km radius. */
const FAR_LAT = (CENTER_LAT + 0.14).toFixed(6)
const FAR_LNG = CENTER_LNG.toFixed(6)

// ---------------------------------------------------------------------------
// 1. Haversine Distance — Deterministic Math
// ---------------------------------------------------------------------------

describe('Haversine Distance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(CENTER_LAT, CENTER_LNG, CENTER_LAT, CENTER_LNG)).toBe(0)
  })

  it('correctly computes ~0.44 km for 0.004° lat difference at equatorial region', () => {
    const dist = haversineDistanceKm(CENTER_LAT, CENTER_LNG, CENTER_LAT + 0.004, CENTER_LNG)
    expect(dist).toBeGreaterThan(0.40)
    expect(dist).toBeLessThan(0.50)
  })

  it('distance is symmetric (A→B equals B→A)', () => {
    const d1 = haversineDistanceKm(CENTER_LAT, CENTER_LNG, CENTER_LAT + 0.01, CENTER_LNG + 0.01)
    const d2 = haversineDistanceKm(CENTER_LAT + 0.01, CENTER_LNG + 0.01, CENTER_LAT, CENTER_LNG)
    expect(d1).toBe(d2)
  })

  it('larger offset produces larger distance', () => {
    const dNear = haversineDistanceKm(CENTER_LAT, CENTER_LNG, CENTER_LAT + 0.004, CENTER_LNG)
    const dFar  = haversineDistanceKm(CENTER_LAT, CENTER_LNG, CENTER_LAT + 0.14,  CENTER_LNG)
    expect(dFar).toBeGreaterThan(dNear)
  })
})

// ---------------------------------------------------------------------------
// 2. Coordinate Validation
// ---------------------------------------------------------------------------

describe('isValidCoordinatePair', () => {
  it('accepts a valid real-world coordinate pair', () => {
    expect(isValidCoordinatePair(77.0, 12.0)).toBe(true)
    expect(isValidCoordinatePair(-97.74, 30.27)).toBe(true)
    expect(isValidCoordinatePair(139.69, 35.68)).toBe(true)
  })

  it('rejects the null-island placeholder (0, 0)', () => {
    expect(isValidCoordinatePair(0, 0)).toBe(false)
  })

  it('rejects latitude out of range', () => {
    expect(isValidCoordinatePair(77.0, 91.0)).toBe(false)
    expect(isValidCoordinatePair(77.0, -91.0)).toBe(false)
  })

  it('rejects longitude out of range', () => {
    expect(isValidCoordinatePair(181.0, 12.0)).toBe(false)
    expect(isValidCoordinatePair(-181.0, 12.0)).toBe(false)
  })

  it('rejects NaN values', () => {
    expect(isValidCoordinatePair(NaN, 12.0)).toBe(false)
    expect(isValidCoordinatePair(77.0, NaN)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. Search Keyword Generation
// ---------------------------------------------------------------------------

describe('getSearchKeywordsForBusiness — keyword derivation', () => {
  it('returns ≥3 keywords for every known predefined category', () => {
    const knownCategories = Object.keys(CATEGORY_QUERY_MAP)
    for (const cat of knownCategories) {
      const kw = getSearchKeywordsForBusiness('Generic Venture', cat)
      if (kw.length < 3) throw new Error(`Category "${cat}" should yield ≥3 keywords, got ${kw.length}`)
      expect(kw.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('returns bank-specific keywords when title/description mention banking exams', () => {
    const kw = getSearchKeywordsForBusiness(
      'Bank Exam Coaching Center',
      'Education & Training',
      'Preparation for SBI, IBPS, and RRB entrance exams'
    )
    expect(kw).toContain('bank coaching')
    expect(kw).toContain('coaching')
  })

  it('returns dental-specific keywords when title mentions dental', () => {
    const kw = getSearchKeywordsForBusiness('Advanced Dental & Orthodontics', 'Healthcare & Wellness')
    expect(kw.some((k) => k.includes('dental') || k.includes('dentist'))).toBe(true)
  })

  it('returns grocery-specific keywords when title mentions grocery', () => {
    const kw = getSearchKeywordsForBusiness('Premium Organic Grocery Supermarket', 'Retail & E-commerce')
    expect(kw.some((k) => k.includes('supermarket') || k.includes('grocery'))).toBe(true)
  })

  it('returns keywords derived from free-text custom sector label', () => {
    // When category is a custom free-text value (not a predefined one),
    // keywords must come from the sector label itself, not from a generic fallback
    const kw = getSearchKeywordsForBusiness('My Pet Shop', 'Pet Grooming Services')
    // Should contain words from the sector label, not just 'commercial'
    expect(kw.some((k) => !['commercial', 'shop'].includes(k))).toBe(true)
  })

  it('returns at least one non-generic keyword for custom sector derived from title', () => {
    const kw = getSearchKeywordsForBusiness('Wedding Photography Studio', 'Others')
    // Falls through to title-word extraction: 'wedding', 'photography', 'studio'
    expect(kw.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Relevance Classification
// ---------------------------------------------------------------------------

describe('classifyCompetitorRelevance — sector-accurate classification', () => {
  // Education / Bank Coaching
  it('classifies a banking coaching POI as direct for a bank coaching business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'Apex Banking & SSC Coaching Academy', type: 'coaching', category: 'Education & Training', address: 'Test Road, Test City' },
      { businessTitle: 'Bank Coaching Center', category: 'Education & Training', businessDescription: 'Coaching for SBI, IBPS, RRB exams' }
    )
    expect(result.relevance).toBe('direct')
    expect(result.relevanceLabel.toLowerCase()).toContain('direct')
  })

  it('classifies a degree college as indirect for a bank coaching business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'Government Degree College', type: 'college', category: 'Education & Training', address: 'College Road, Test City' },
      { businessTitle: 'Bank Coaching Center', category: 'Education & Training', businessDescription: 'Banking exam preparation' }
    )
    expect(result.relevance).toBe('indirect')
    expect(result.relevanceReason.toLowerCase()).toContain('student')
  })

  it('classifies a K-12 school as indirect for a bank coaching business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'English Medium High School', type: 'school', category: 'Education & Training', address: 'School Street, Test City' },
      { businessTitle: 'Bank Coaching Center', category: 'Education & Training', businessDescription: 'Banking exam preparation' }
    )
    expect(result.relevance).toBe('indirect')
  })

  it('classifies an unrelated commercial POI as unverified for a coaching business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'XYZ Commercial Complex', type: 'commercial', category: 'Education & Training', address: 'Main Road, Test City' },
      { businessTitle: 'Bank Coaching Center', category: 'Education & Training', businessDescription: 'Banking exam preparation' }
    )
    expect(result.relevance).toBe('unverified')
  })

  // Food & Beverage
  it('classifies a cafe as direct for a coffee shop business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'Downtown Coffee Lounge', type: 'cafe', category: 'Food & Beverage / Restaurant', address: '1 Main St' },
      { businessTitle: 'Artisan Coffee Bar', category: 'Food & Beverage / Restaurant', businessDescription: 'Specialty coffee and pastries' }
    )
    expect(result.relevance).toBe('direct')
  })

  // Healthcare
  it('classifies a dental clinic as direct for a dental business', () => {
    const result = classifyCompetitorRelevance(
      { name: 'City Dental Care Clinic', type: 'dentist', category: 'Healthcare & Wellness', address: '2 Health Ave' },
      { businessTitle: 'Advanced Dental & Orthodontics', category: 'Healthcare & Wellness', businessDescription: 'Dental care and braces' }
    )
    expect(result.relevance).toBe('direct')
    expect(result.relevanceLabel.toLowerCase()).toContain('dental')
  })

  // Custom / Others sector — unverified when no keyword match
  it('returns unverified for unknown custom/Others sector with no keyword overlap', () => {
    const result = classifyCompetitorRelevance(
      { name: 'Random General Store', type: 'shop', category: 'Others', address: '3 Any Road' },
      { businessTitle: 'Luxury Watch Repair', category: 'Others', businessDescription: 'Servicing luxury timepieces' }
    )
    // Should not blindly call this 'indirect' — it's an open-ended sector
    expect(result.relevance).toBe('unverified')
  })

  it('returns direct for custom sector when POI name overlaps with business title keyword', () => {
    // e.g. a "Photography" POI for a "Photography Studio" business
    const result = classifyCompetitorRelevance(
      { name: 'Professional Photography Services', type: 'studio', category: 'Wedding Photography', address: '5 Lens Lane' },
      { businessTitle: 'Wedding Photography Studio', category: 'Wedding Photography', businessDescription: 'Professional wedding shoots' }
    )
    expect(result.relevance).toBe('direct')
    expect(result.relevanceReason).toContain('photography')
  })
})

// ---------------------------------------------------------------------------
// 5. Bounded Competitor Discovery — Mocked API Fixtures
// ---------------------------------------------------------------------------

describe('getNearbyCompetitorsBounded — spatial filtering & provenance', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('strictly filters out POIs beyond the specified radius', async () => {
    const nearPoi = makeMockOsmPoi({
      osm_id: 1001,
      name: 'Near Business',
      type: 'shop',
      lat: NEAR_LAT,
      lon: NEAR_LNG,
    })
    const farPoi = makeMockOsmPoi({
      osm_id: 1002,
      name: 'Far Business',
      type: 'shop',
      lat: FAR_LAT,
      lon: FAR_LNG,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => [nearPoi, farPoi] } as any
      }
      return { ok: true, json: async () => ({ features: [] }) } as any
    })

    const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
      coordinates: CENTER,
      radiusMeters: 1000,
      category: 'Retail & E-commerce',
    })

    // Only the near POI should be within 1 km
    expect(result.data.length).toBe(1)
    expect(result.data[0].name).toBe('Near Business')
    expect(result.data[0].distanceKm).toBeDefined()
    expect(result.data[0].distanceKm!).toBeLessThanOrEqual(1.0)
  })

  it('embeds provenance source and retrievedAt on every returned POI', async () => {
    const poi = makeMockOsmPoi({
      osm_id: 2001,
      name: 'Test Establishment',
      type: 'restaurant',
      lat: NEAR_LAT,
      lon: NEAR_LNG,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => [poi] } as any
      }
      return { ok: true, json: async () => ({ features: [] }) } as any
    })

    const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
      coordinates: CENTER,
      radiusMeters: 1000,
      category: 'Food & Beverage / Restaurant',
    })

    expect(result.data.length).toBeGreaterThanOrEqual(1)
    for (const p of result.data) {
      expect(p.provenance.source).toBeTruthy()
      expect(p.provenance.retrievedAt).toBeTruthy()
      expect(p.provenance.attribution).toBeTruthy()
    }
  })

  it('returns an honest notice and empty array when no POIs are found — no synthetic fallbacks', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => [],
    }) as any)

    const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
      coordinates: CENTER,
      radiusMeters: 500,
      category: 'Manufacturing & Logistics',
    })

    expect(result.data).toEqual([])
    expect(result.notice).toContain('Zero registered')
    expect(result.coverageNote).toContain('Zero registered')
  })

  it('correctly separates direct and indirect competitors with accurate counts', async () => {
    const directPoi = makeMockOsmPoi({
      osm_id: 3001,
      name: 'Sunrise Banking Exam Coaching Academy',
      type: 'coaching',
      lat: NEAR_LAT,
      lon: NEAR_LNG,
    })
    const indirectPoi = makeMockOsmPoi({
      osm_id: 3002,
      name: 'City Arts & Science College',
      type: 'college',
      lat: (CENTER_LAT + 0.003).toFixed(6),
      lon: (CENTER_LNG + 0.002).toFixed(6),
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => [directPoi, indirectPoi] } as any
      }
      return { ok: true, json: async () => ({ features: [] }) } as any
    })

    const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
      coordinates: CENTER,
      radiusMeters: 2000,
      category: 'Education & Training',
      businessTitle: 'Bank Coaching Center',
      businessDescription: 'Banking exam prep for SBI, IBPS',
    })

    expect(result.data).toHaveLength(2)
    expect(result.directCount).toBe(1)
    expect(result.indirectCount).toBe(1)
    expect(result.directCompetitors[0].name).toBe('Sunrise Banking Exam Coaching Academy')
    expect(result.indirectCompetitors[0].name).toBe('City Arts & Science College')
    expect(result.directCompetitors[0].relevance).toBe('direct')
    expect(result.indirectCompetitors[0].relevance).toBe('indirect')
  })

  it('extracts phone and website from extratags when present', async () => {
    const poiWithContact = makeMockOsmPoi({
      osm_id: 4001,
      name: 'Verified Contact Business',
      type: 'clinic',
      lat: NEAR_LAT,
      lon: NEAR_LNG,
      extratags: {
        phone: '+1 555 000 1234',
        website: 'https://example-clinic.test',
      },
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => [poiWithContact] } as any
      }
      return { ok: true, json: async () => ({ features: [] }) } as any
    })

    const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
      coordinates: CENTER,
      radiusMeters: 1000,
      category: 'Healthcare & Wellness',
    })

    const found = result.data.find((p) => p.name === 'Verified Contact Business')
    expect(found).toBeDefined()
    expect(found?.contactPhone).toBe('+1 555 000 1234')
    expect(found?.website).toBe('https://example-clinic.test')
  })
})

// ---------------------------------------------------------------------------
// 6. Territory Geocoding — Disambiguation Candidate Structure
// ---------------------------------------------------------------------------

describe('getTerritory — disambiguation candidates', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects queries shorter than 2 characters', async () => {
    const res = await realtimeIntelligenceService.getTerritory('a')
    expect(res.data).toBeNull()
    expect(res.error).toContain('at least 2 characters')
  })

  it('parses a Nominatim response and returns a valid territory with correct bbox order', async () => {
    // Nominatim boundingbox = [minlat, maxlat, minlon, maxlon]
    // Expected conversion to GeoJSON = [minLon, minLat, maxLon, maxLat]
    const mockNominatimItems = [
      {
        osm_type: 'relation',
        osm_id: 999001,
        lat: '12.0000',
        lon: '77.0000',
        display_name: 'Test City, Test State, Test Country',
        name: 'Test City',
        type: 'city',
        class: 'place',
        boundingbox: ['11.9', '12.1', '76.9', '77.1'], // [minlat, maxlat, minlon, maxlon]
        address: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postcode: '999000',
        },
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => mockNominatimItems } as any
      }
      // No Mapbox token in test env — this path won't be hit
      return { ok: false, status: 401 } as any
    })

    const res = await realtimeIntelligenceService.getTerritory('Test City')

    expect(res.data).not.toBeNull()
    expect(res.data?.coordinates).toEqual([77.0, 12.0]) // [lon, lat]

    // Verify bbox conversion: GeoJSON = [minLon, minLat, maxLon, maxLat]
    const bbox = res.data?.bbox
    expect(bbox).toBeDefined()
    if (bbox) {
      expect(bbox[0]).toBeCloseTo(76.9, 1)   // minLon from boundingbox[2]
      expect(bbox[1]).toBeCloseTo(11.9, 1)   // minLat from boundingbox[0]
      expect(bbox[2]).toBeCloseTo(77.1, 1)   // maxLon from boundingbox[3]
      expect(bbox[3]).toBeCloseTo(12.1, 1)   // maxLat from boundingbox[1]
    }

    expect(res.data?.provenance.source).toContain('OpenStreetMap')
    expect(res.data?.context.city).toBe('Test City')
  })

  it('returns disambiguation candidates when multiple valid Nominatim results exist', async () => {
    const mockItems = [
      {
        osm_type: 'node', osm_id: 10001,
        lat: '12.0', lon: '77.0',
        display_name: 'Springfield, State A, Country X',
        name: 'Springfield', type: 'city', class: 'place',
        boundingbox: ['11.9', '12.1', '76.9', '77.1'],
        address: { city: 'Springfield', state: 'State A', country: 'Country X' },
      },
      {
        osm_type: 'node', osm_id: 10002,
        lat: '35.0', lon: '-90.0',
        display_name: 'Springfield, State B, Country Y',
        name: 'Springfield', type: 'city', class: 'place',
        boundingbox: ['34.9', '35.1', '-90.1', '-89.9'],
        address: { city: 'Springfield', state: 'State B', country: 'Country Y' },
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => mockItems } as any
      }
      return { ok: false, status: 401 } as any
    })

    const res = await realtimeIntelligenceService.getTerritory('Springfield')

    // Primary result uses the first valid item
    expect(res.data).not.toBeNull()
    expect(res.data?.coordinates[0]).toBeCloseTo(77.0, 1)

    // Disambiguation candidates returned for the second result
    expect(res.disambiguationCandidates).toBeDefined()
    expect(res.disambiguationCandidates!.length).toBeGreaterThanOrEqual(1)
    const candidate = res.disambiguationCandidates![0]
    expect(candidate.coordinates[0]).toBeCloseTo(-90.0, 1)
    expect(candidate.source).toContain('OpenStreetMap')
    expect(candidate.displayName).toBeTruthy()
  })

  it('rejects a Nominatim result with coordinates at (0,0) as invalid', async () => {
    const mockItems = [
      {
        osm_type: 'node', osm_id: 20001,
        lat: '0.0000', lon: '0.0000', // null-island
        display_name: 'Null Island, Ocean',
        name: 'Null Island', type: 'place', class: 'place',
        boundingbox: ['-0.1', '0.1', '-0.1', '0.1'],
        address: {},
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('nominatim')) {
        return { ok: true, json: async () => mockItems } as any
      }
      return { ok: false, status: 401 } as any
    })

    const res = await realtimeIntelligenceService.getTerritory('Null Island')
    // Should be rejected by isValidCoordinatePair
    expect(res.data).toBeNull()
    expect(res.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 7. Gemini Input Schema Validation
// ---------------------------------------------------------------------------

describe('geminiAnalysisInputSchema — payload validation', () => {
  it('accepts a comprehensive payload with all optional fields present', () => {
    const payload = {
      businessTitle: 'Artisan Bakery & Café',
      category: 'Food & Beverage / Restaurant',
      objective: 'new_launch',
      budget: 50000,
      targetLocation: 'Test City, Test State',
      targetDemographic: 'Young urban professionals',
      searchRadiusMeters: 1500,
      verifiedEvidence: {
        coordinates: [77.0, 12.0] as [number, number],
        competitorCount: 3,
        sampleCompetitors: ['Competitor A', 'Competitor B'],
        sources: 'OpenStreetMap Contributors, Mapbox',
        coverageNote: 'Verified 3 registered establishments.',
        competitorsList: [
          { name: 'Competitor A', type: 'bakery', distanceKm: 0.3 },
          { name: 'Competitor B', type: 'cafe', distanceKm: 0.7 },
        ],
        alternativeCandidates: [
          { areaName: 'Nearby District', coordinates: [77.01, 12.01] as [number, number], competitorCount: 1 },
        ],
      },
    }

    const parsed = geminiAnalysisInputSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })

  it('accepts a custom free-text sector string', () => {
    const payload = {
      businessTitle: 'Premium Pet Grooming Services',
      category: 'Pet Grooming & Boarding',
      objective: 'new_launch',
    }
    const parsed = geminiAnalysisInputSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })

  it('accepts an empty verifiedEvidence (analysis without location data)', () => {
    const payload = {
      businessTitle: 'Planning Stage Business',
      category: 'Technology & SaaS',
      objective: 'market_research',
    }
    const parsed = geminiAnalysisInputSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })

  it('rejects a businessTitle shorter than 2 characters', () => {
    const parsed = geminiAnalysisInputSchema.safeParse({
      businessTitle: 'A',
      category: 'Retail & E-commerce',
      objective: 'expansion',
    })
    expect(parsed.success).toBe(false)
  })
})
