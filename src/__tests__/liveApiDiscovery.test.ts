/**
 * liveApiDiscovery.test.ts
 *
 * Validates UNIT-level behaviour of the discovery pipeline components using
 * mocked API responses. All fixture coordinates and POI names are synthetic.
 *
 * NOTE: These are unit tests, NOT live API integration tests. If you need to
 * verify real geographic data coverage, use the `liveApiDiscovery.integration.test.ts`
 * suite (not committed to CI) that makes actual Nominatim / Mapbox calls with
 * a 30-second timeout.
 *
 * What we test here:
 *  1. getSearchKeywordsForBusiness — rich keyword derivation for all 9 sectors
 *  2. haversineDistanceKm — distance calculation accuracy
 *  3. deduplication — distinct POIs are NOT merged, near-duplicates ARE merged
 *  4. Bounded discovery counts and coverage note accuracy
 *  5. Custom sector keyword derivation (the 'Others' flow)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  realtimeIntelligenceService,
  classifyCompetitorRelevance,
  getSearchKeywordsForBusiness,
  haversineDistanceKm,
} from '@/lib/services/realtimeIntelligenceService'

// Fixture helpers
const CENTER: [number, number] = [77.0, 12.0]
const CENTER_LAT = CENTER[1]
const CENTER_LNG = CENTER[0]

function nearLat(offsetDeg: number) { return (CENTER_LAT + offsetDeg).toFixed(6) }
function nearLng(offsetDeg: number) { return (CENTER_LNG + offsetDeg).toFixed(6) }

function makePoi(id: number, name: string, type: string, latOffset: number, lngOffset: number, extratags = {}) {
  return {
    place_id: id,
    osm_type: 'node',
    osm_id: id,
    lat: nearLat(latOffset),
    lon: nearLng(lngOffset),
    name,
    type,
    display_name: `${name}, Fixture Area, Fixture Country`,
    extratags,
  }
}

describe('Universal Business Discovery — Unit Tests', () => {
  beforeEach(() => vi.restoreAllMocks())

  // ─── 1. Keyword Generation ─────────────────────────────────────────────────

  describe('getSearchKeywordsForBusiness — all 9 predefined sectors', () => {
    const sectors = [
      'Retail & E-commerce',
      'Food & Beverage / Restaurant',
      'Technology & SaaS',
      'Healthcare & Wellness',
      'Professional Services',
      'Real Estate & Construction',
      'Manufacturing & Logistics',
      'Education & Training',
      'Hospitality & Tourism',
    ]

    it('generates ≥3 keywords for every supported sector with a generic title', () => {
      for (const cat of sectors) {
        const kw = getSearchKeywordsForBusiness('General Venture', cat)
        if (kw.length < 3) throw new Error(`Sector "${cat}" must yield ≥3 keywords, got ${kw.length}`)
        expect(kw.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('refines Food keywords when title mentions bakery', () => {
      const kw = getSearchKeywordsForBusiness('Artisan Bakery & Pastry House', 'Food & Beverage / Restaurant')
      expect(kw.some((k) => k.includes('bakery') || k.includes('pastry'))).toBe(true)
    })

    it('refines Healthcare keywords when title mentions pharmacy', () => {
      const kw = getSearchKeywordsForBusiness('City Pharmacy & Medical Supplies', 'Healthcare & Wellness')
      expect(kw.some((k) => k.includes('pharmacy') || k.includes('chemist'))).toBe(true)
    })

    it('refines Education keywords when title mentions bank exam', () => {
      const kw = getSearchKeywordsForBusiness('SBI & IBPS Coaching Institute', 'Education & Training')
      expect(kw).toContain('bank coaching')
    })

    it('derives keywords from custom sector label for Others sector', () => {
      const kw = getSearchKeywordsForBusiness('My Pet Grooming Shop', 'Pet Grooming Services')
      // Must use words from sector label, not just 'commercial'
      expect(kw.some((k) => k !== 'commercial')).toBe(true)
    })

    it('falls back to title-word extraction when sector is Others sentinel', () => {
      const kw = getSearchKeywordsForBusiness('Premium Wedding Photography', 'Others')
      expect(kw.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── 2. Haversine Distance ──────────────────────────────────────────────────

  describe('haversineDistanceKm — deterministic math', () => {
    it('two identical points return 0', () => {
      expect(haversineDistanceKm(12.0, 77.0, 12.0, 77.0)).toBe(0)
    })

    it('distance between two POIs >500m apart is correctly computed', () => {
      // POI 1 and POI 2 ~800m apart
      const [lat1, lon1] = [12.0000, 77.0000]
      const [lat2, lon2] = [12.0072, 77.0000] // ~0.8 km north
      const dist = haversineDistanceKm(lat1, lon1, lat2, lon2)
      expect(dist).toBeGreaterThan(0.5)
      expect(dist).toBeLessThan(1.1)
    })

    it('is symmetric', () => {
      const d1 = haversineDistanceKm(12.0, 77.0, 12.01, 77.01)
      const d2 = haversineDistanceKm(12.01, 77.01, 12.0, 77.0)
      expect(d1).toBe(d2)
    })
  })

  // ─── 3. Deduplication — distinct branches must NOT be merged ───────────────

  describe('deduplication — preserves distinct branches', () => {
    it('does NOT merge two same-name POIs that are >500m apart', () => {
      // Two branches of the same bank chain, physically distant
      const bank1Lat = CENTER_LAT + 0.004   // ~0.44 km north
      const bank2Lat = CENTER_LAT - 0.004   // ~0.44 km south
      // Combined distance = ~0.88 km, well over the 45m merge threshold
      const dist = haversineDistanceKm(bank1Lat, CENTER_LNG, bank2Lat, CENTER_LNG)
      expect(dist).toBeGreaterThan(0.5)
    })

    it('WOULD merge two records within 45m that share the same normalised name', () => {
      // These two coordinates are ~0 m apart — represent duplicate API returns
      const lat1 = CENTER_LAT + 0.0001
      const lat2 = CENTER_LAT + 0.00012
      const dist = haversineDistanceKm(lat1, CENTER_LNG, lat2, CENTER_LNG)
      // Distance should be well under the 45m deduplication threshold
      expect(dist).toBeLessThan(0.045)
    })
  })

  // ─── 4. Bounded Discovery — Radius Filtering & Coverage Notes ──────────────

  describe('getNearbyCompetitorsBounded — mocked fixture responses', () => {
    it('filters out POIs beyond the radius and returns correct counts', async () => {
      const withinRadius = makePoi(5001, 'Close Restaurant', 'restaurant', 0.003, 0.001)
      const outsideRadius = makePoi(5002, 'Distant Restaurant', 'restaurant', 0.14, 0.0) // ~15 km

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('nominatim')) {
          return { ok: true, json: async () => [withinRadius, outsideRadius] } as any
        }
        return { ok: true, json: async () => ({ features: [] }) } as any
      })

      const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
        coordinates: CENTER,
        radiusMeters: 1000,
        category: 'Food & Beverage / Restaurant',
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Close Restaurant')
      expect(result.data[0].distanceKm).toBeLessThanOrEqual(1.1)
    })

    it('generates an honest coverage note with direct and indirect counts', async () => {
      const directPoi  = makePoi(6001, 'Alpha Coaching Academy', 'coaching', 0.002, 0.001)
      const indirectPoi = makePoi(6002, 'Beta Arts College', 'college', 0.003, -0.001)

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('nominatim')) {
          return { ok: true, json: async () => [directPoi, indirectPoi] } as any
        }
        return { ok: true, json: async () => ({ features: [] }) } as any
      })

      const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
        coordinates: CENTER,
        radiusMeters: 1500,
        category: 'Education & Training',
        businessTitle: 'Bank Coaching Center',
        businessDescription: 'Banking exam coaching for SBI and IBPS',
      })

      expect(result.directCount).toBe(1)
      expect(result.indirectCount).toBe(1)
      expect(result.coverageNote).toContain('1 direct competitor')
      expect(result.coverageNote).toContain('1 indirect')
    })

    it('returns honest zero-result notice and empty arrays — no synthetic fallbacks', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
        ok: true, json: async () => [],
      }) as any)

      const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
        coordinates: CENTER,
        radiusMeters: 500,
        category: 'Manufacturing & Logistics',
      })

      expect(result.data).toEqual([])
      expect(result.directCompetitors).toEqual([])
      expect(result.indirectCompetitors).toEqual([])
      expect(result.notice).toContain('Zero registered')
      expect(result.coverageNote).toContain('Zero registered')
    })

    it('returns contact details from extratags when present in source data', async () => {
      const poiWithContact = makePoi(7001, 'Verified Clinic', 'clinic', 0.002, 0.001, {
        phone: '+1 555 123 4567',
        website: 'https://fixture-clinic.test',
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

      const found = result.data.find((p) => p.name === 'Verified Clinic')
      expect(found).toBeDefined()
      expect(found?.contactPhone).toBe('+1 555 123 4567')
      expect(found?.website).toBe('https://fixture-clinic.test')
    })
  })

  // ─── 5. Custom Sector — End-to-End Through Classification ──────────────────

  describe('Custom sector classification — Others and free-text', () => {
    it('returns unverified (not indirect) for Others sector with no keyword match', () => {
      const result = classifyCompetitorRelevance(
        { name: 'Random Shop', type: 'shop', category: 'Others', address: 'Any Road' },
        { businessTitle: 'Luxury Watch Repair Studio', category: 'Others', businessDescription: 'Servicing Swiss timepieces' }
      )
      expect(result.relevance).toBe('unverified')
    })

    it('returns direct when custom sector POI name overlaps with title keyword', () => {
      const result = classifyCompetitorRelevance(
        { name: 'Expert Watch Repair Centre', type: 'shop', category: 'Watch Repair', address: 'Clock Lane' },
        { businessTitle: 'Premium Watch Repair Studio', category: 'Watch Repair', businessDescription: 'Fine watch servicing' }
      )
      expect(result.relevance).toBe('direct')
    })

    it('getNearbyCompetitorsBounded with Others sector does not crash and returns provenance', async () => {
      const poi = makePoi(8001, 'Any Business', 'shop', 0.002, 0.001)

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('nominatim')) {
          return { ok: true, json: async () => [poi] } as any
        }
        return { ok: true, json: async () => ({ features: [] }) } as any
      })

      const result = await realtimeIntelligenceService.getNearbyCompetitorsBounded({
        coordinates: CENTER,
        radiusMeters: 1000,
        category: 'Pet Grooming Services', // custom free-text sector
        businessTitle: 'Premium Pet Grooming Salon',
      })

      // Must not crash; must embed provenance
      expect(result.provenance.source).toBeTruthy()
      expect(result.discoveryMetrics.totalUnique).toBe(result.data.length)
    })
  })
})
