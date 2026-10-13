import { getAppEnv } from '@/lib/env'
import { supabase } from '@/lib/supabase/client'

export interface ProvenanceMetadata {
  source: string
  retrievedAt: string
  attribution: string
  dataFreshness: string
  queryParameters: Record<string, any>
}

export interface TerritoryIntelligence {
  id: string
  placeName: string
  coordinates: [number, number] // [lng, lat]
  placeType: string[]
  context: {
    city?: string
    district?: string
    region?: string
    postcode?: string
    country?: string
  }
  bbox?: number[]
  provenance: ProvenanceMetadata
}

export type CompetitorRelevanceType = 'direct' | 'indirect' | 'unverified'

export interface RealCompetitorPOI {
  id: string
  name: string
  type: string
  category: string
  address: string
  coordinates: [number, number] // [lng, lat]
  osmId: string | number
  /** OSM class key (amenity, shop, office, highway, boundary, place, etc.) */
  osmClass?: string
  distanceKm?: number
  provenance: ProvenanceMetadata
  relevance: CompetitorRelevanceType
  relevanceLabel: string
  relevanceReason: string
  /** True when the record represents a road, boundary, postcode, locality, or other non-business geographic entity */
  isGeographicFeature?: boolean
  /** Human-readable label for the geographic feature type when isGeographicFeature is true */
  geoFeatureLabel?: string
  contactPhone?: string
  website?: string
  sourceId?: string
  rawTags?: Record<string, any>
}

export interface DiscoveryMetrics {
  rawOsmOverpass: number
  rawOsmNominatim: number
  rawMapbox: number
  duplicatesMerged: number
  totalUnique: number
  failedQueries: string[]
  coverageLimitations: string[]
  retrievalDurationMs: number
}

export interface RealtimeLocationIntelligenceResult {
  territory: TerritoryIntelligence | null
  competitors: RealCompetitorPOI[]
  competitorCount: number
  discoveryMetrics?: DiscoveryMetrics
  notice?: string
  error?: string
}

/**
 * Returned when a query matches multiple distinct geographic places.
 * The user must select one to continue.
 */
export interface LocationDisambiguationCandidate {
  id: string
  displayName: string
  shortName: string
  coordinates: [number, number] // [lng, lat]
  placeType: string
  contextText: string
  source: string
}

export interface AreaSuggestion {
  id: string
  displayName: string
  shortName: string
  coordinates: [number, number] // [lng, lat]
  placeType: string // 'neighbourhood' | 'locality' | 'road' | 'town' | 'city' | 'address'
  source: string
  contextText?: string
}

export interface CandidateAlternativeArea {
  id: string
  areaName: string
  coordinates: [number, number] // [lng, lat]
  distanceKm: number
  placeType: string
  competitorCount: number
  directCompetitorsCount?: number
  indirectCompetitorsCount?: number
  sampleCompetitors: string[]
  coverageNote?: string
  provenance: ProvenanceMetadata
}

export interface BoundedCompetitorResult {
  data: RealCompetitorPOI[]
  /** Records classified as genuine business establishments */
  businesses: RealCompetitorPOI[]
  /** Records classified as geographic features (roads, postcodes, localities, etc.) */
  geographicFeatures: RealCompetitorPOI[]
  directCompetitors: RealCompetitorPOI[]
  indirectCompetitors: RealCompetitorPOI[]
  unverifiedCompetitors: RealCompetitorPOI[]
  directCount: number
  indirectCount: number
  unverifiedCount: number
  businessCount: number
  discoveryMetrics: DiscoveryMetrics
  error?: string
  notice?: string
  coverageNote?: string
  provenance: ProvenanceMetadata
}

export interface AdvancedLocationResult {
  territory: TerritoryIntelligence | null
  searchCoordinates: [number, number]
  searchRadiusMeters: number
  competitors: RealCompetitorPOI[]
  /** Genuine business POIs (roads, postcodes, localities excluded) */
  businesses: RealCompetitorPOI[]
  /** Geographic features separated from businesses */
  geographicFeatures: RealCompetitorPOI[]
  competitorCount: number
  businessCount: number
  directCompetitorCount: number
  indirectCompetitorCount: number
  unverifiedCompetitorCount: number
  discoveryMetrics?: DiscoveryMetrics
  coverageNote: string
  alternativeCandidates: CandidateAlternativeArea[]
  provenance: ProvenanceMetadata
  notice?: string
  error?: string
}

export interface SavedAnalysisRecord {
  id: string
  business_request_id?: string | null
  user_id: string
  analysis_type: string
  title: string
  summary?: string | null
  evidence_payload: any
  provenance: ProvenanceMetadata
  created_at: string
}

// Category keyword mapping for genuine OpenStreetMap POI search
export const CATEGORY_QUERY_MAP: Record<string, string> = {
  'Food & Beverage / Restaurant': 'restaurant OR cafe OR bakery OR fast_food',
  'Retail & E-commerce': 'shop OR store OR supermarket OR clothing',
  'Healthcare & Wellness': 'clinic OR pharmacy OR hospital OR medical',
  'Technology & SaaS': 'coworking OR technology OR software OR internet',
  'Professional Services': 'bank OR accounting OR lawyer OR consultancy',
  'Real Estate & Construction': 'real estate OR construction OR architect',
  'Manufacturing & Logistics': 'logistics OR warehouse OR freight',
  'Education & Training': 'coaching OR academy OR college OR tuition',
  'Hospitality & Tourism': 'hotel OR hostel OR resort OR tourism',
  'Others': 'commercial',
}

/**
 * Validates that coordinate values are within physically meaningful ranges.
 * Returns true when [lng, lat] is plausibly a real GPS point.
 */
export function isValidCoordinatePair(lng: number, lat: number): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    !isNaN(lng) && !isNaN(lat) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    // Reject the null-island (0,0) placeholder that indicates a failed geocode
    !(Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001)
  )
}

/**
 * Builds a safe Google Maps URL pointing to the given coordinates or address.
 *
 * Priority:
 *  1. If valid lat/lon are provided → uses the `?q=lat,lon` form (pin-drops exactly)
 *  2. If only an address string is available → uses `?q=<encoded address>`
 *  3. If neither is available → returns null (caller must not render a link)
 *
 * Always URL-encodes the query component so special characters are safe.
 */
export function buildGoogleMapsUrl(options: {
  coordinates?: [number, number] | null // [lng, lat]
  address?: string | null
}): string | null {
  const { coordinates, address } = options

  // Prefer verified coordinates — generates a precise pin-drop
  if (coordinates && isValidCoordinatePair(coordinates[0], coordinates[1])) {
    const [lng, lat] = coordinates
    // Google Maps expects lat,lng in the query
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }

  // Fall back to address search when coordinates are absent or invalid
  if (address && address.trim().length > 3) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
  }

  return null
}

// OSM classes that represent geographic/administrative features rather than business establishments
const GEO_FEATURE_CLASSES = new Set([
  'boundary', 'place', 'waterway', 'natural', 'landuse',
  'highway', 'railway', 'aeroway', 'route', 'barrier',
  'power', 'man_made', 'leisure', 'tourism', 'sport',
])

// OSM place types that are administrative rather than commercial
const GEO_PLACE_TYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood',
  'quarter', 'municipality', 'county', 'state', 'country',
  'postcode', 'continent', 'island', 'islet', 'locality',
  'administrative', 'residential', 'street', 'road',
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'pedestrian', 'footway', 'path', 'cycleway',
  'river', 'stream', 'lake', 'reservoir', 'forest', 'wood', 'park',
  'meadow', 'farm', 'allotments', 'cemetery', 'industrial', 'rail',
  'bus_stop', 'platform', 'station',
])

// OSM types/classes that are genuine commercial establishments
const COMMERCIAL_CLASSES = new Set([
  'amenity', 'shop', 'office', 'craft', 'healthcare',
])

const COMMERCIAL_TYPES = new Set([
  'commercial', 'retail', 'industrial_unit', 'warehouse',
])

/**
 * Determines whether an OSM/Mapbox POI record represents a geographic feature
 * (road, postcode, locality, administrative boundary) rather than a genuine
 * business establishment.
 *
 * Returns { isGeoFeature: boolean, label: string } so the caller can display
 * the appropriate UI.
 */
export function classifyGeoFeature(poi: {
  type: string
  osmClass?: string
  name?: string
}): { isGeoFeature: boolean; label: string } {
  const osmClass = (poi.osmClass || '').toLowerCase()
  const osmType  = (poi.type || '').toLowerCase()

  // Explicit commercial classes are never geographic features
  if (COMMERCIAL_CLASSES.has(osmClass)) {
    return { isGeoFeature: false, label: '' }
  }
  if (COMMERCIAL_TYPES.has(osmType)) {
    return { isGeoFeature: false, label: '' }
  }

  // Highway types are roads/streets
  if (osmClass === 'highway' || GEO_PLACE_TYPES.has(osmType) && ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'pedestrian', 'footway', 'path', 'cycleway', 'road', 'street'].includes(osmType)) {
    return { isGeoFeature: true, label: 'Road / Street' }
  }

  // Place types (city, suburb, neighbourhood, postcode, etc.)
  if (osmClass === 'place' || ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'municipality', 'county', 'state', 'country', 'postcode', 'continent', 'island', 'islet', 'locality', 'administrative', 'residential'].includes(osmType)) {
    const labelMap: Record<string, string> = {
      city: 'City', town: 'Town', village: 'Village', hamlet: 'Hamlet',
      suburb: 'Suburb / District', neighbourhood: 'Neighbourhood', quarter: 'Quarter',
      municipality: 'Municipality', county: 'County', state: 'State/Province',
      country: 'Country', postcode: 'Postcode / ZIP', continent: 'Continent',
      island: 'Island', islet: 'Islet', locality: 'Locality',
      administrative: 'Administrative Area', residential: 'Residential Area',
    }
    return { isGeoFeature: true, label: labelMap[osmType] || 'Geographic Place' }
  }

  // Boundary / waterway / natural features
  if (osmClass === 'boundary') return { isGeoFeature: true, label: 'Administrative Boundary' }
  if (osmClass === 'waterway') return { isGeoFeature: true, label: 'Waterway / River' }
  if (osmClass === 'natural') return { isGeoFeature: true, label: 'Natural Feature' }
  if (osmClass === 'landuse') return { isGeoFeature: true, label: 'Land Use Area' }
  if (osmClass === 'railway' || osmClass === 'aeroway') return { isGeoFeature: true, label: 'Transport Infrastructure' }

  // Generic geo-feature class check
  if (GEO_FEATURE_CLASSES.has(osmClass)) return { isGeoFeature: true, label: 'Geographic Feature' }

  // Mapbox forward geocode returns place_type results like 'postcode', 'address', 'poi'
  // POI type from Mapbox is a genuine business; others are not
  if (['postcode', 'address', 'region', 'district', 'country', 'place'].includes(osmClass)) {
    return { isGeoFeature: true, label: osmClass.charAt(0).toUpperCase() + osmClass.slice(1) }
  }

  return { isGeoFeature: false, label: '' }
}

/**
 * Derives targeted search keywords based on specific business idea and category.
 * For the 'Others' / custom sector, derives keywords from the title and description text.
 */
export function getSearchKeywordsForBusiness(
  title?: string,
  category?: string,
  description?: string
): string[] {
  const full = `${title || ''} ${description || ''}`.toLowerCase()
  const cat = category || ''

  // Education / Bank Exam Coaching Use Case
  if (
    cat === 'Education & Training' ||
    full.includes('bank') ||
    full.includes('coaching') ||
    full.includes('academy') ||
    full.includes('tuition') ||
    full.includes('exam')
  ) {
    if (full.includes('bank') || full.includes('ibps') || full.includes('sbi') || full.includes('rrb')) {
      return ['bank coaching', 'coaching', 'academy', 'college', 'tuition']
    }
    return ['coaching', 'academy', 'college', 'tuition', 'school']
  }

  // Healthcare & Wellness
  if (cat === 'Healthcare & Wellness') {
    if (full.includes('dental') || full.includes('dentist')) {
      return ['dental', 'dentist', 'clinic', 'hospital']
    }
    if (full.includes('pharmacy') || full.includes('chemist')) {
      return ['pharmacy', 'chemist', 'medical store', 'clinic']
    }
    if (full.includes('gym') || full.includes('fitness') || full.includes('crossfit') || full.includes('workout')) {
      return ['gym', 'fitness', 'crossfit', 'sports club', 'clinic']
    }
    return ['clinic', 'hospital', 'pharmacy', 'medical', 'healthcare']
  }

  // Food & Beverage
  if (cat === 'Food & Beverage / Restaurant') {
    if (full.includes('cafe') || full.includes('coffee')) {
      return ['cafe', 'coffee', 'bakery', 'restaurant']
    }
    if (full.includes('bakery') || full.includes('cake') || full.includes('pastry')) {
      return ['bakery', 'cafe', 'pastry', 'restaurant']
    }
    if (full.includes('fast food') || full.includes('burger') || full.includes('pizza') || full.includes('shawarma')) {
      return ['fast_food', 'restaurant', 'cafe', 'bakery']
    }
    return ['restaurant', 'cafe', 'fast_food', 'bakery']
  }

  // Retail & E-commerce
  if (cat === 'Retail & E-commerce') {
    if (full.includes('grocery') || full.includes('supermarket') || full.includes('provision')) {
      return ['supermarket', 'grocery', 'provisions', 'store']
    }
    if (full.includes('clothing') || full.includes('boutique') || full.includes('apparel') || full.includes('fashion')) {
      return ['clothing', 'boutique', 'fashion', 'store', 'shop']
    }
    if (full.includes('book') || full.includes('stationery')) {
      return ['bookstore', 'stationery', 'shop', 'store']
    }
    return ['supermarket', 'store', 'shop', 'clothing']
  }

  // Technology & SaaS
  if (cat === 'Technology & SaaS') {
    if (full.includes('coworking') || full.includes('shared office') || full.includes('workspace')) {
      return ['coworking', 'workspace', 'technology', 'software']
    }
    return ['software', 'technology', 'coworking', 'IT', 'internet']
  }

  // Professional Services
  if (cat === 'Professional Services') {
    if (full.includes('bank') || full.includes('finance') || full.includes('investment')) {
      return ['bank', 'financial', 'accounting', 'consultancy']
    }
    if (full.includes('law') || full.includes('legal') || full.includes('advocate') || full.includes('attorney')) {
      return ['lawyer', 'legal', 'law office', 'consultancy']
    }
    if (full.includes('tax') || full.includes('audit') || full.includes('accounting') || full.includes('ca')) {
      return ['accounting', 'tax consultant', 'auditor', 'finance']
    }
    return ['bank', 'accounting', 'lawyer', 'consultancy']
  }

  // Real Estate & Construction
  if (cat === 'Real Estate & Construction') {
    if (full.includes('architect') || full.includes('design')) {
      return ['architect', 'construction', 'real estate']
    }
    return ['real estate', 'construction', 'builder', 'architect']
  }

  // Manufacturing & Logistics
  if (cat === 'Manufacturing & Logistics') {
    if (full.includes('courier') || full.includes('delivery') || full.includes('cargo')) {
      return ['courier', 'logistics', 'freight', 'warehouse']
    }
    return ['logistics', 'warehouse', 'freight', 'factory']
  }

  // Hospitality & Tourism
  if (cat === 'Hospitality & Tourism') {
    if (full.includes('resort') || full.includes('luxury')) {
      return ['resort', 'hotel', 'lodge', 'tourism']
    }
    if (full.includes('hostel') || full.includes('dorm')) {
      return ['hostel', 'hotel', 'guest house', 'lodging']
    }
    return ['hotel', 'hostel', 'resort', 'tourism', 'lodge']
  }

  // Custom / 'Others' sector: derive search terms from the free-text category and business details
  if (cat && cat !== 'Others') {
    // User provided a custom sector label — use meaningful words from it
    const customWords = cat
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
    if (customWords.length > 0) {
      return [...new Set([...customWords.slice(0, 3), 'commercial'])]
    }
  }

  // Extract meaningful words from the title/description as last-resort search keywords
  const titleWords = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['and', 'the', 'for', 'with', 'center', 'pvt', 'ltd'].includes(w))
  if (titleWords.length > 0) {
    return [...new Set([...titleWords.slice(0, 3), 'commercial'])]
  }

  const rawKeywords = CATEGORY_QUERY_MAP[cat] || 'commercial'
  return rawKeywords.split(' OR ').map((k) => k.trim())
}

/**
 * Rigorously classifies competitor relevance based on authentic POI metadata
 * and business context. Zero synthetic assumptions.
 */
export function classifyCompetitorRelevance(
  poi: {
    name: string
    type: string
    category: string
    address?: string
    osmClass?: string
    extratags?: Record<string, any>
  },
  context: {
    businessTitle?: string
    category: string
    businessDescription?: string
  }
): {
  relevance: CompetitorRelevanceType
  relevanceLabel: string
  relevanceReason: string
} {
  const title = (context.businessTitle || '').toLowerCase()
  const desc = (context.businessDescription || '').toLowerCase()
  const fullBizContext = `${title} ${desc}`
  const poiName = (poi.name || '').toLowerCase()
  const poiType = (poi.type || '').toLowerCase()
  const poiClass = (poi.osmClass || '').toLowerCase()
  const extra = JSON.stringify(poi.extratags || {}).toLowerCase()
  const combinedPoi = `${poiName} ${poiType} ${poiClass} ${extra}`

  // 1. BANK COACHING & COMPETITIVE EXAM PREPARATION
  const isBankOrExamCoaching =
    fullBizContext.includes('bank') ||
    fullBizContext.includes('ibps') ||
    fullBizContext.includes('sbi') ||
    fullBizContext.includes('rrb') ||
    fullBizContext.includes('coaching') ||
    fullBizContext.includes('competitive exam') ||
    fullBizContext.includes('exam prep') ||
    fullBizContext.includes('entrance') ||
    fullBizContext.includes('test prep') ||
    (context.category === 'Education & Training' && fullBizContext.includes('center'))

  if (isBankOrExamCoaching) {
    const isUnrelatedVocational =
      combinedPoi.includes('cricket') ||
      combinedPoi.includes('tennis') ||
      combinedPoi.includes('sports') ||
      combinedPoi.includes('driving') ||
      combinedPoi.includes('dance') ||
      combinedPoi.includes('music') ||
      combinedPoi.includes('martial arts') ||
      combinedPoi.includes('badminton') ||
      combinedPoi.includes('yoga')

    const isCoachingDirect =
      combinedPoi.includes('coaching') ||
      combinedPoi.includes('bank coaching') ||
      combinedPoi.includes('study circle') ||
      combinedPoi.includes('career') ||
      combinedPoi.includes('academy') ||
      combinedPoi.includes('tutorial') ||
      combinedPoi.includes('tuition') ||
      combinedPoi.includes('competitive') ||
      combinedPoi.includes('ibps') ||
      combinedPoi.includes('sbi') ||
      combinedPoi.includes('rrb') ||
      combinedPoi.includes('clerk') ||
      combinedPoi.includes('test prep') ||
      combinedPoi.includes('ias') ||
      combinedPoi.includes('upsc') ||
      combinedPoi.includes('ssc') ||
      poiType === 'coaching'

    if (isCoachingDirect && !isUnrelatedVocational) {
      const isSpecificBank =
        combinedPoi.includes('bank') ||
        combinedPoi.includes('ibps') ||
        combinedPoi.includes('sbi') ||
        combinedPoi.includes('rrb') ||
        combinedPoi.includes('clerk') ||
        combinedPoi.includes('po')

      return {
        relevance: 'direct',
        relevanceLabel: isSpecificBank
          ? 'Direct Competitor: Banking Exam Coaching'
          : 'Direct Competitor: Competitive Exam & Coaching Academy',
        relevanceReason: isSpecificBank
          ? 'Dedicated institute specializing in banking exams (IBPS/SBI/RRB) targeting identical student aspirants.'
          : 'Active coaching/academy facility providing academic or competitive examination training.',
      }
    }

    // Degree Colleges / Higher Education (Student Demographics / Feeders)
    const isCollegeOrUniversity =
      combinedPoi.includes('college') ||
      combinedPoi.includes('university') ||
      combinedPoi.includes('polytechnic') ||
      combinedPoi.includes('campus') ||
      combinedPoi.includes('degree') ||
      poiType === 'college' ||
      poiType === 'university'

    if (isCollegeOrUniversity) {
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Degree / Higher Education College (Student Hub)',
        relevanceReason:
          'Undergraduate / technical institution educating the core demographic of banking exam aspirants. Not a direct bank coaching institute, but provides key student concentration.',
      }
    }

    if (isUnrelatedVocational) {
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Vocational / Hobby Center',
        relevanceReason:
          'Specialized instruction in recreational, technical, or athletic pursuits rather than competitive academic examinations.',
      }
    }

    // Primary & Secondary Schools (K-12)
    const isSchool =
      combinedPoi.includes('school') ||
      combinedPoi.includes('vidyalaya') ||
      combinedPoi.includes('high school') ||
      combinedPoi.includes('secondary') ||
      poiType === 'school'

    if (isSchool) {
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Primary / Secondary School',
        relevanceReason:
          'K-12 school catering to elementary and secondary education; non-competing curriculum and serves a younger age bracket than bank job applicants.',
      }
    }

    return {
      relevance: 'unverified',
      relevanceLabel: 'Relevance Unverified: General Educational Listing',
      relevanceReason:
        'Listed as an educational facility in open registries without specific curriculum or course details.',
    }
  }

  // 2. GENERAL EDUCATION & TRAINING (Non-Bank)
  if (context.category === 'Education & Training') {
    if (combinedPoi.includes('coaching') || combinedPoi.includes('academy') || combinedPoi.includes('tuition') || combinedPoi.includes('tutorial')) {
      return {
        relevance: 'direct',
        relevanceLabel: `Direct Competitor: ${poi.type || 'Educational Academy'}`,
        relevanceReason: 'Direct competitor offering tutoring, exam preparation, or skills training.',
      }
    }
    if (combinedPoi.includes('college') || combinedPoi.includes('university') || combinedPoi.includes('school')) {
      return {
        relevance: 'indirect',
        relevanceLabel: `Indirect Institution: ${poi.type || 'Educational Institute'}`,
        relevanceReason: 'Formal academic institution serving general student demographic.',
      }
    }
  }

  // 3. HEALTHCARE & WELLNESS
  if (context.category === 'Healthcare & Wellness') {
    if (fullBizContext.includes('dental') || fullBizContext.includes('dentist')) {
      if (combinedPoi.includes('dental') || combinedPoi.includes('dentist')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Dental Clinic',
          relevanceReason: 'Direct competitor offering dental, orthodontic, or oral health care.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Medical Facility / Pharmacy',
        relevanceReason: 'Broader healthcare service or dispensary; does not specialize in dentistry.',
      }
    }

    if (fullBizContext.includes('gym') || fullBizContext.includes('fitness') || fullBizContext.includes('crossfit')) {
      if (combinedPoi.includes('gym') || combinedPoi.includes('fitness') || combinedPoi.includes('crossfit') || combinedPoi.includes('workout') || combinedPoi.includes('health club')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Fitness Gym & Training Center',
          relevanceReason: 'Directly competes in physical fitness memberships, equipment, and personal training.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Sports / Wellness Facility',
        relevanceReason: 'Recreational facility or medical clinic serving general wellness demand.',
      }
    }

    if (fullBizContext.includes('pharmacy') || fullBizContext.includes('chemist') || fullBizContext.includes('medical store')) {
      if (combinedPoi.includes('pharmacy') || combinedPoi.includes('chemist') || combinedPoi.includes('druggist') || combinedPoi.includes('medical store')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Pharmacy & Dispensary',
          relevanceReason: 'Direct competitor dispensing prescription medicines and healthcare products.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Clinical / Hospital Facility',
        relevanceReason: 'Inpatient or outpatient treatment provider rather than dedicated retail pharmacy.',
      }
    }
  }

  // 4. FOOD & BEVERAGE
  if (context.category === 'Food & Beverage / Restaurant') {
    if (fullBizContext.includes('cafe') || fullBizContext.includes('coffee')) {
      if (combinedPoi.includes('cafe') || combinedPoi.includes('coffee') || combinedPoi.includes('bakery')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Cafe & Coffee Venue',
          relevanceReason: 'Directly competes in cafe beverages, seating, and quick refreshments.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Full Dining Restaurant',
        relevanceReason: 'Provides full-service meals rather than specialized cafe/coffee experience.',
      }
    }

    if (fullBizContext.includes('bakery') || fullBizContext.includes('cake') || fullBizContext.includes('pastry')) {
      if (combinedPoi.includes('bakery') || combinedPoi.includes('pastry') || combinedPoi.includes('cake') || combinedPoi.includes('confectionery')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Bakery & Confectionery',
          relevanceReason: 'Specializes in baked goods, cakes, and confectioneries.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Restaurant / Food Venue',
        relevanceReason: 'General restaurant or cafe offering prepared meals.',
      }
    }

    if (combinedPoi.includes('restaurant') || combinedPoi.includes('fast_food') || combinedPoi.includes('food_court') || combinedPoi.includes('bistro')) {
      return {
        relevance: 'direct',
        relevanceLabel: `Direct Competitor: ${poi.type || 'Dining Venue'}`,
        relevanceReason: 'Active food & beverage enterprise serving dining customers.',
      }
    }
  }

  // 5. RETAIL & E-COMMERCE
  if (context.category === 'Retail & E-commerce') {
    if (fullBizContext.includes('grocery') || fullBizContext.includes('supermarket')) {
      if (combinedPoi.includes('supermarket') || combinedPoi.includes('grocery') || combinedPoi.includes('provisions') || combinedPoi.includes('hypermarket')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Supermarket / Grocery Retailer',
          relevanceReason: 'Direct competitor offering daily essentials, food items, and packaged provisions.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Specialty Retail Outlet',
        relevanceReason: 'Specialty shop operating in non-grocery retail sector.',
      }
    }
  }

  // 6. TECHNOLOGY & SAAS
  if (context.category === 'Technology & SaaS') {
    if (fullBizContext.includes('coworking') || fullBizContext.includes('shared office') || fullBizContext.includes('workspace')) {
      if (combinedPoi.includes('coworking') || combinedPoi.includes('shared office') || combinedPoi.includes('workspace')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Coworking Space',
          relevanceReason: 'Offers shared desks, private offices, and event space for professionals.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Entity: Technology / Commercial Office',
        relevanceReason: 'Corporate or IT office occupying private commercial facilities.',
      }
    }
  }

  // 7. PROFESSIONAL SERVICES
  if (context.category === 'Professional Services') {
    if (fullBizContext.includes('bank') || fullBizContext.includes('finance')) {
      if (combinedPoi.includes('bank') || combinedPoi.includes('financial') || combinedPoi.includes('credit')) {
        return {
          relevance: 'direct',
          relevanceLabel: 'Direct Competitor: Banking & Financial Institution',
          relevanceReason: 'Direct competitor offering branch banking, retail deposits, and financial services.',
        }
      }
      return {
        relevance: 'indirect',
        relevanceLabel: 'Indirect Competitor: Professional Service Office',
        relevanceReason: 'Professional advisory firm in legal, accounting, or business services.',
      }
    }
  }

  // 8. HOSPITALITY & TOURISM
  if (context.category === 'Hospitality & Tourism') {
    if (combinedPoi.includes('hotel') || combinedPoi.includes('lodge') || combinedPoi.includes('resort') || combinedPoi.includes('guest house')) {
      return {
        relevance: 'direct',
        relevanceLabel: `Direct Competitor: ${poi.type || 'Accommodation Provider'}`,
        relevanceReason: 'Direct competitor offering overnight guest lodging and hospitality amenities.',
      }
    }
  }

  // 9. CUSTOM / OTHERS SECTOR — keyword-based matching derived from the user's own sector label
  // and business title. We do NOT fall back to 'indirect' blindly, because that would label every
  // unrelated OSM node as a competitor. Instead, we check whether the POI name/type meaningfully
  // overlaps with the words the user provided.
  const isSectorOthers = !context.category || context.category === 'Others'
  const customSectorWords = isSectorOthers
    ? []
    : context.category
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3)

  // 10. GENERAL CATEGORY FALLBACK (Matches specific title keywords OR custom sector words)
  const titleKeywords = title
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 4 && !['center', 'services', 'venture', 'pvt', 'ltd', 'branch', 'others'].includes(w))

  const allKeywords = [...new Set([...titleKeywords, ...customSectorWords])]

  const matchesSpecificKeyword = allKeywords.some((k) => combinedPoi.includes(k))

  if (matchesSpecificKeyword) {
    const matched = allKeywords.find((k) => combinedPoi.includes(k))
    return {
      relevance: 'direct',
      relevanceLabel: `Direct Competitor: ${poi.type || 'Commercial Enterprise'}`,
      relevanceReason: `Matches targeted keyword "${matched}" found in registered establishment name or OSM tags.`,
    }
  }

  // For custom/Others sectors, return 'unverified' rather than 'indirect' when there is no
  // keyword overlap — the category is too open-ended to assume indirect relevance.
  if (isSectorOthers || (context.category && context.category !== 'Others' && !CATEGORY_QUERY_MAP[context.category])) {
    return {
      relevance: 'unverified',
      relevanceLabel: `Relevance Unverified: ${poi.type || 'Commercial Listing'}`,
      relevanceReason:
        'Sector is custom/unrecognised; relevance cannot be confirmed from OSM tags alone. Field verification required.',
    }
  }

  return {
    relevance: 'indirect',
    relevanceLabel: `Indirect Competitor: ${poi.type || 'Commercial Listing'}`,
    relevanceReason: 'Operates within broader industry sector with distinct specialization or service tier.',
  }
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

/**
 * Builds targeted Overpass QL query based on category and business context.
 * For custom sectors ('Others' or any free-text category), derives Overpass tags
 * from the business title / description keywords rather than falling back to
 * an unrelated generic query.
 */
function buildOverpassQuery(
  category: string,
  minLat: string,
  minLng: string,
  maxLat: string,
  maxLng: string,
  title?: string,
  description?: string
): string {
  const full = `${title || ''} ${description || ''}`.toLowerCase()

  let statements = ''

  if (category === 'Food & Beverage / Restaurant') {
    statements = `
      node["amenity"~"restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|bistro"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|bistro"](${minLat},${minLng},${maxLat},${maxLng});
      node["shop"~"bakery|pastry|confectionery|coffee"](${minLat},${minLng},${maxLat},${maxLng});
      way["shop"~"bakery|pastry|confectionery|coffee"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Education & Training' || full.includes('coaching') || full.includes('academy')) {
    statements = `
      node["amenity"~"college|university|school|language_school|music_school|training|research_institute"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"college|university|school|language_school|music_school|training|research_institute"](${minLat},${minLng},${maxLat},${maxLng});
      node["office"~"educational_institution|tutoring|training"](${minLat},${minLng},${maxLat},${maxLng});
      node["name"~"Coaching|Academy|Tutorial|Tuition|Institute|College|School",i](${minLat},${minLng},${maxLat},${maxLng});
      way["name"~"Coaching|Academy|Tutorial|Tuition|Institute|College|School",i](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Healthcare & Wellness') {
    statements = `
      node["amenity"~"hospital|clinic|pharmacy|dentist|doctors"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"hospital|clinic|pharmacy|dentist|doctors"](${minLat},${minLng},${maxLat},${maxLng});
      node["healthcare"~"hospital|clinic|pharmacy|dentist|doctor|centre|laboratory"](${minLat},${minLng},${maxLat},${maxLng});
      node["leisure"~"fitness_centre|sports_centre"](${minLat},${minLng},${maxLat},${maxLng});
      way["leisure"~"fitness_centre|sports_centre"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Retail & E-commerce') {
    statements = `
      node["shop"~"supermarket|convenience|clothes|department_store|electronics|books|chemist|shoes|mall|general|grocery|hardware|stationery"](${minLat},${minLng},${maxLat},${maxLng});
      way["shop"~"supermarket|convenience|clothes|department_store|electronics|books|chemist|shoes|mall|general|grocery|hardware|stationery"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Technology & SaaS') {
    statements = `
      node["amenity"~"coworking_space|internet_cafe"](${minLat},${minLng},${maxLat},${maxLng});
      node["office"~"it|software|telecommunication|coworking|company"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"coworking_space"](${minLat},${minLng},${maxLat},${maxLng});
      way["office"~"it|software|telecommunication|coworking|company"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Professional Services') {
    statements = `
      node["amenity"~"bank|atm"](${minLat},${minLng},${maxLat},${maxLng});
      way["amenity"~"bank"](${minLat},${minLng},${maxLat},${maxLng});
      node["office"~"lawyer|accountant|financial|tax_advisor|estate_agent|insurance|company|consulting"](${minLat},${minLng},${maxLat},${maxLng});
      way["office"~"lawyer|accountant|financial|tax_advisor|estate_agent|insurance|company|consulting"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Real Estate & Construction') {
    statements = `
      node["office"~"estate_agent|architect|construction_company"](${minLat},${minLng},${maxLat},${maxLng});
      way["office"~"estate_agent|architect|construction_company"](${minLat},${minLng},${maxLat},${maxLng});
      node["shop"~"doityourself|hardware|building_materials"](${minLat},${minLng},${maxLat},${maxLng});
      way["shop"~"doityourself|hardware|building_materials"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Manufacturing & Logistics') {
    statements = `
      node["industrial"~"warehouse|factory"](${minLat},${minLng},${maxLat},${maxLng});
      way["industrial"~"warehouse|factory"](${minLat},${minLng},${maxLat},${maxLng});
      node["office"~"logistics|freight|courier"](${minLat},${minLng},${maxLat},${maxLng});
      node["amenity"~"post_office|parcel_locker"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else if (category === 'Hospitality & Tourism') {
    statements = `
      node["tourism"~"hotel|hostel|guest_house|motel|resort|apartment"](${minLat},${minLng},${maxLat},${maxLng});
      way["tourism"~"hotel|hostel|guest_house|motel|resort|apartment"](${minLat},${minLng},${maxLat},${maxLng});
    `
  } else {
    // Custom / 'Others' sector — build targeted Overpass query from keywords derived
    // from the business title and description rather than a generic catch-all
    const customKeywords = getSearchKeywordsForBusiness(title, category, description)
      .filter((k) => k !== 'commercial' && k.length >= 3)
      .slice(0, 4)

    if (customKeywords.length > 0) {
      // Build name-based tag searches using the derived keywords
      const namePattern = customKeywords.map((k) => k.replace(/[^a-zA-Z0-9\s]/g, '')).join('|')
      statements = `
        node["name"~"${namePattern}",i](${minLat},${minLng},${maxLat},${maxLng});
        way["name"~"${namePattern}",i](${minLat},${minLng},${maxLat},${maxLng});
        node["amenity"](${minLat},${minLng},${maxLat},${maxLng});
        node["shop"](${minLat},${minLng},${maxLat},${maxLng});
        node["office"](${minLat},${minLng},${maxLat},${maxLng});
      `
    } else {
      statements = `
        node["amenity"](${minLat},${minLng},${maxLat},${maxLng});
        node["shop"](${minLat},${minLng},${maxLat},${maxLng});
        node["office"](${minLat},${minLng},${maxLat},${maxLng});
      `
    }
  }

  return `[out:json][timeout:15];(${statements});out center tags 120;`
}

/**
 * Mapbox Search Box supported category mapper
 */
function getMapboxSearchCategories(category: string, title?: string): string[] {
  const full = (title || '').toLowerCase()

  switch (category) {
    case 'Food & Beverage / Restaurant':
      if (full.includes('cafe') || full.includes('coffee')) return ['cafe', 'coffee_shop', 'bakery', 'restaurant']
      if (full.includes('bakery') || full.includes('pastry')) return ['bakery', 'cafe', 'restaurant']
      return ['restaurant', 'cafe', 'fast_food', 'bakery']

    case 'Education & Training':
      return ['college', 'school', 'university']

    case 'Healthcare & Wellness':
      if (full.includes('dental') || full.includes('dentist')) return ['dentist', 'clinic', 'hospital']
      if (full.includes('gym') || full.includes('fitness')) return ['fitness_center', 'sports_complex']
      if (full.includes('pharmacy') || full.includes('chemist')) return ['pharmacy', 'hospital', 'clinic']
      return ['hospital', 'pharmacy', 'clinic', 'fitness_center']

    case 'Retail & E-commerce':
      if (full.includes('clothing') || full.includes('boutique')) return ['clothing_store', 'department_store']
      if (full.includes('book')) return ['book_store', 'stationery_store']
      return ['supermarket', 'convenience_store', 'clothing_store', 'department_store']

    case 'Technology & SaaS':
      return ['coworking_space']

    case 'Professional Services':
      if (full.includes('law') || full.includes('legal')) return ['lawyer', 'legal_services']
      if (full.includes('tax') || full.includes('account')) return ['accounting', 'financial_service']
      return ['bank', 'atm', 'accounting', 'lawyer']

    case 'Hospitality & Tourism':
      return ['hotel', 'hostel', 'resort', 'motel']

    case 'Real Estate & Construction':
      return ['real_estate_agency']

    default:
      return []
  }
}

/**
 * Deduplicates POIs carefully without removing distinct branches or neighboring businesses
 */
function deduplicateAndMergePOIs(pois: RealCompetitorPOI[]): {
  unique: RealCompetitorPOI[]
  mergedCount: number
} {
  const unique: RealCompetitorPOI[] = []
  let mergedCount = 0

  for (const poi of pois) {
    const rawName = poi.name.trim()
    if (!rawName) continue

    const normName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!normName) continue

    let matchedIdx = -1

    for (let i = 0; i < unique.length; i++) {
      const existing = unique[i]

      // 1. Exact Source ID match
      if (poi.sourceId && existing.sourceId && poi.sourceId === existing.sourceId) {
        matchedIdx = i
        break
      }

      // 2. Physical distance constraint
      const dist = haversineDistanceKm(
        poi.coordinates[1],
        poi.coordinates[0],
        existing.coordinates[1],
        existing.coordinates[0]
      )

      // Only consider identical entity if within 45 meters (0.045 km)
      if (dist <= 0.045) {
        const existingNorm = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (
          normName === existingNorm ||
          (normName.length > 5 && existingNorm.length > 5 && (normName.includes(existingNorm) || existingNorm.includes(normName)))
        ) {
          matchedIdx = i
          break
        }
      }
    }

    if (matchedIdx >= 0) {
      // Merge metadata into existing record
      mergedCount++
      const existing = unique[matchedIdx]

      if (!existing.provenance.source.includes(poi.provenance.source)) {
        existing.provenance.source = `${existing.provenance.source} & ${poi.provenance.source}`
      }
      if (!existing.contactPhone && poi.contactPhone) {
        existing.contactPhone = poi.contactPhone
      }
      if (!existing.website && poi.website) {
        existing.website = poi.website
      }
      if (poi.address && poi.address.length > existing.address.length) {
        existing.address = poi.address
      }
      if (!existing.rawTags && poi.rawTags) {
        existing.rawTags = poi.rawTags
      }
    } else {
      unique.push(poi)
    }
  }

  return { unique, mergedCount }
}

/**
 * Real-Time Intelligence Service
 * Handles live geocoding, multi-source spatial POI discovery, and competitor classification.
 * Combines Mapbox Search Box API, OpenStreetMap Overpass POI API, and Nominatim.
 * Strictly zero synthetic data.
 */
export const realtimeIntelligenceService = {
  /**
   * 1. Query Mapbox / Nominatim for verified geographic territory parameters.
   *
   * Returns the best-matching result together with any additional disambiguation
   * candidates when the query is ambiguous (multiple distinct places with the same
   * name in different regions).
   */
  async getTerritory(query: string): Promise<{
    data: TerritoryIntelligence | null
    disambiguationCandidates?: LocationDisambiguationCandidate[]
    error?: string
  }> {
    if (!query || query.trim().length < 2) {
      return { data: null, error: 'Location query must be at least 2 characters.' }
    }

    const { mapboxToken } = getAppEnv()
    const trimmed = query.trim()
    const retrievalTime = new Date().toISOString()

    // Try Mapbox first if token is available — request up to 5 results for disambiguation
    if (mapboxToken && !mapboxToken.startsWith('pk.your') && !mapboxToken.includes('placeholder')) {
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trimmed
        )}.json?access_token=${mapboxToken}&limit=5`

        const res = await fetch(endpoint)
        if (res.ok) {
          const json = await res.json()
          const features: any[] = json.features || []

          if (features.length > 0) {
            const feature = features[0]
            const [lng, lat] = feature.center

            // Reject obviously invalid coordinates
            if (!isValidCoordinatePair(lng, lat)) {
              console.warn('Mapbox returned invalid coordinates for query:', trimmed, feature.center)
            } else {
              const contextObj: TerritoryIntelligence['context'] = {}
              if (Array.isArray(feature.context)) {
                feature.context.forEach((c: any) => {
                  if (c.id?.startsWith('place')) contextObj.city = c.text
                  if (c.id?.startsWith('district')) contextObj.district = c.text
                  if (c.id?.startsWith('region')) contextObj.region = c.text
                  if (c.id?.startsWith('postcode')) contextObj.postcode = c.text
                  if (c.id?.startsWith('country')) contextObj.country = c.text
                })
              }

              // Build disambiguation candidates from additional results
              const disambiguationCandidates: LocationDisambiguationCandidate[] = features
                .slice(1)
                .filter((f: any) => {
                  const [fLng, fLat] = f.center
                  return isValidCoordinatePair(fLng, fLat)
                })
                .map((f: any) => ({
                  id: f.id,
                  displayName: f.place_name,
                  shortName: f.text || f.place_name.split(',')[0],
                  coordinates: f.center as [number, number],
                  placeType: f.place_type?.[0] || 'place',
                  contextText: f.place_name.split(',').slice(1, 4).join(',').trim(),
                  source: 'Mapbox Places API',
                }))

              return {
                data: {
                  id: feature.id,
                  placeName: feature.place_name,
                  coordinates: feature.center,
                  placeType: feature.place_type || ['place'],
                  context: contextObj,
                  bbox: feature.bbox,
                  provenance: {
                    source: 'Mapbox Geocoding API',
                    retrievedAt: retrievalTime,
                    attribution: json.attribution || '© Mapbox © OpenStreetMap',
                    dataFreshness: 'Real-time on-demand query',
                    queryParameters: { query: trimmed },
                  },
                },
                disambiguationCandidates: disambiguationCandidates.length > 0 ? disambiguationCandidates : undefined,
              }
            }
          }
        }
      } catch (err) {
        console.warn('Mapbox territory query fallback to OpenStreetMap:', err)
      }
    }

    // High-precision OpenStreetMap Nominatim resolution (supports local towns, streets, neighborhoods worldwide)
    // Request up to 5 results so we can surface disambiguation candidates.
    try {
      const osmEndpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        trimmed
      )}&format=json&limit=5&addressdetails=1`

      const osmRes = await fetch(osmEndpoint, {
        headers: {
          'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
        },
      })

      if (!osmRes.ok) {
        return { data: null, error: 'Location intelligence service returned a non-200 response.' }
      }

      const osmItems = await osmRes.json()
      if (!Array.isArray(osmItems) || osmItems.length === 0) {
        return { data: null, error: `No matching territory found for "${trimmed}".` }
      }

      // Filter to only results with valid coordinates
      const validItems = osmItems.filter((item: any) => {
        const lat = parseFloat(item.lat)
        const lon = parseFloat(item.lon)
        return isValidCoordinatePair(lon, lat)
      })

      if (validItems.length === 0) {
        return { data: null, error: `Geocoding returned invalid coordinates for "${trimmed}". Please try a more specific location name.` }
      }

      const item = validItems[0]
      const addr = item.address || {}
      const contextObj: TerritoryIntelligence['context'] = {
        city: addr.city || addr.town || addr.village,
        district: addr.county || addr.state_district,
        region: addr.state,
        postcode: addr.postcode,
        country: addr.country,
      }

      const lat = parseFloat(item.lat)
      const lon = parseFloat(item.lon)

      // Nominatim boundingbox is ordered [minlat, maxlat, minlon, maxlon]
      // TerritoryIntelligence.bbox is [minLng, minLat, maxLng, maxLat] (GeoJSON convention)
      const bbox = item.boundingbox && item.boundingbox.length === 4
        ? [
            parseFloat(item.boundingbox[2]), // minLon
            parseFloat(item.boundingbox[0]), // minLat
            parseFloat(item.boundingbox[3]), // maxLon
            parseFloat(item.boundingbox[1]), // maxLat
          ]
        : undefined

      // Build disambiguation candidates from additional Nominatim results
      const disambiguationCandidates: LocationDisambiguationCandidate[] = validItems
        .slice(1)
        .map((di: any) => {
          const diAddr = di.address || {}
          const contextParts = [
            diAddr.county || diAddr.state_district,
            diAddr.state,
            diAddr.country,
          ].filter(Boolean)
          return {
            id: `osm_${di.osm_type || 'node'}_${di.osm_id}`,
            displayName: di.display_name,
            shortName: di.name || di.display_name.split(',')[0],
            coordinates: [parseFloat(di.lon), parseFloat(di.lat)] as [number, number],
            placeType: di.type || di.class || 'locality',
            contextText: contextParts.join(', '),
            source: 'OpenStreetMap Nominatim',
          }
        })

      return {
        data: {
          id: `osm_${item.osm_type || 'node'}_${item.osm_id}`,
          placeName: item.display_name,
          coordinates: [lon, lat],
          placeType: [item.type || item.class || 'locality'],
          context: contextObj,
          bbox,
          provenance: {
            source: 'OpenStreetMap Contributors (via Nominatim)',
            retrievedAt: retrievalTime,
            attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
            dataFreshness: 'Real-time on-demand query',
            queryParameters: { query: trimmed },
          },
        },
        disambiguationCandidates: disambiguationCandidates.length > 0 ? disambiguationCandidates : undefined,
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Geocoding service network failure.' }
    }
  },

  /**
   * 2. Real-time autocomplete suggestions for cities, neighborhoods, localities, and streets
   */
  async searchAreaSuggestions(query: string, limit = 5): Promise<AreaSuggestion[]> {
    if (!query || query.trim().length < 2) return []
    const trimmed = query.trim()
    const results: AreaSuggestion[] = []
    const seenNames = new Set<string>()

    const { mapboxToken } = getAppEnv()

    // Query 1: OpenStreetMap Nominatim for exact local neighbourhoods and streets
    try {
      const osmEndpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        trimmed
      )}&format=json&limit=${limit}&addressdetails=1`

      const osmRes = await fetch(osmEndpoint, {
        headers: {
          'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
        },
      })

      if (osmRes.ok) {
        const items = await osmRes.json()
        if (Array.isArray(items)) {
          for (const item of items) {
            const shortName = item.name || item.display_name.split(',')[0]
            const normKey = `${shortName.toLowerCase()}_${item.lat.slice(0, 5)}`
            if (!seenNames.has(normKey)) {
              seenNames.add(normKey)
              results.push({
                id: `osm_${item.osm_id}`,
                displayName: item.display_name,
                shortName,
                coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
                placeType: item.type || item.class || 'locality',
                source: 'OpenStreetMap Nominatim',
                contextText: item.display_name.split(',').slice(1, 4).join(',').trim(),
              })
            }
          }
        }
      }
    } catch (err) {
      console.warn('Nominatim suggestion query warning:', err)
    }

    // Query 2: Mapbox geocoding if token available to enrich city/locality options
    if (mapboxToken && !mapboxToken.startsWith('pk.your') && !mapboxToken.includes('placeholder')) {
      try {
        const mbEndpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trimmed
        )}.json?access_token=${mapboxToken}&limit=${limit}&types=neighborhood,locality,place,address`

        const mbRes = await fetch(mbEndpoint)
        if (mbRes.ok) {
          const mbData = await mbRes.json()
          if (Array.isArray(mbData.features)) {
            for (const f of mbData.features) {
              const short = f.text || f.place_name.split(',')[0]
              const normKey = `${short.toLowerCase()}_${f.center[1].toFixed(2)}`
              if (!seenNames.has(normKey)) {
                seenNames.add(normKey)
                results.push({
                  id: f.id,
                  displayName: f.place_name,
                  shortName: short,
                  coordinates: f.center,
                  placeType: f.place_type?.[0] || 'locality',
                  source: 'Mapbox Places API',
                  contextText: f.place_name.split(',').slice(1, 3).join(',').trim(),
                })
              }
            }
          }
        }
      } catch (err) {
        console.warn('Mapbox suggestion query warning:', err)
      }
    }

    return results.slice(0, limit)
  },

  /**
   * 3. Query OpenStreetMap Nominatim for real active competitors/businesses (Legacy backward-compatible)
   */
  async getNearbyCompetitors(
    locationName: string,
    categoryName: string,
    limit: number = 8
  ): Promise<{ data: RealCompetitorPOI[]; error?: string; notice?: string; provenance?: ProvenanceMetadata }> {
    if (!locationName || locationName.trim().length < 2) {
      return { data: [], error: 'Valid location name required for competitor intelligence.' }
    }

    const keyword = CATEGORY_QUERY_MAP[categoryName] || categoryName
    const searchTerms = `${keyword.split(' OR ')[0]} ${locationName}`.trim()
    const retrievalTime = new Date().toISOString()

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchTerms
      )}&format=json&limit=${limit}&addressdetails=1`

      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
        },
      })

      if (!res.ok) {
        return {
          data: [],
          error: 'External OpenStreetMap intelligence service is busy or returned a non-200 response.',
        }
      }

      const rawItems = await res.json()
      if (!Array.isArray(rawItems)) {
        return { data: [], error: 'Unexpected response format from external intelligence service.' }
      }

      const provenance: ProvenanceMetadata = {
        source: 'OpenStreetMap Contributors (via Nominatim)',
        retrievedAt: retrievalTime,
        attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
        dataFreshness: 'Live on-demand query',
        queryParameters: { locationName, categoryName, query: searchTerms },
      }

      if (rawItems.length === 0) {
        return {
          data: [],
          notice: `No registered commercial establishments found matching category "${categoryName}" in ${locationName}.`,
          provenance,
        }
      }

      const competitors: RealCompetitorPOI[] = rawItems.map((item: any) => {
        const addr = item.address || {}
        const addressParts = [
          addr.house_number,
          addr.road,
          addr.neighbourhood || addr.suburb,
          addr.city || addr.town || addr.village,
          addr.state,
          addr.postcode,
        ].filter(Boolean)

        const rawName = item.name || item.display_name?.split(',')?.[0] || 'Commercial Establishment'
        const classification = classifyCompetitorRelevance(
          {
            name: rawName,
            type: item.type || item.class || 'commercial',
            category: categoryName,
            address: item.display_name,
            osmClass: item.class,
          },
          { category: categoryName }
        )

        return {
          id: `osm_${item.osm_type || 'node'}_${item.osm_id}`,
          name: rawName,
          type: item.type || item.class || 'commercial',
          category: categoryName,
          address: addressParts.length > 0 ? addressParts.join(', ') : item.display_name,
          coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
          osmId: item.osm_id,
          relevance: classification.relevance,
          relevanceLabel: classification.relevanceLabel,
          relevanceReason: classification.relevanceReason,
          provenance,
        }
      })

      return { data: competitors, provenance }
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to query live competitor intelligence.' }
    }
  },

  /**
   * 4. Multi-Source Bounded Competitor Search with Radius, Overpass POI API, Mapbox Search Box & Deduplication
   */
  async getNearbyCompetitorsBounded(options: {
    coordinates: [number, number] // [lng, lat]
    radiusMeters: number // e.g. 1000m (1km)
    category: string
    businessTitle?: string
    businessDescription?: string
    locationName?: string
    bbox?: number[]
  }): Promise<BoundedCompetitorResult> {
    const { coordinates, radiusMeters, category, businessTitle, businessDescription, locationName, bbox: userBbox } = options
    const [centerLng, centerLat] = coordinates
    const retrievalTime = new Date().toISOString()
    const startTime = Date.now()

    // Determine targeted search terms based on user business intent
    const keywords = getSearchKeywordsForBusiness(businessTitle, category, businessDescription)
    const primaryKeywords = keywords.slice(0, 4)

    // Calculate GPS bounding box for radius
    const deltaLat = radiusMeters / 111320
    const deltaLng = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180))
    const minLat = (centerLat - deltaLat).toFixed(6)
    const maxLat = (centerLat + deltaLat).toFixed(6)
    const minLng = (centerLng - deltaLng).toFixed(6)
    const maxLng = (centerLng + deltaLng).toFixed(6)
    const computedBbox = [minLng, minLat, maxLng, maxLat].join(',')
    const viewbox = [minLng, maxLat, maxLng, minLat].join(',')

    const effectiveBbox = userBbox && userBbox.length === 4
      ? [userBbox[0].toFixed(6), userBbox[1].toFixed(6), userBbox[2].toFixed(6), userBbox[3].toFixed(6)].join(',')
      : computedBbox

    const rawPOIs: RealCompetitorPOI[] = []
    const failedQueries: string[] = []
    let rawOsmOverpassCount = 0
    let rawOsmNominatimCount = 0
    let rawMapboxCount = 0

    const provenance: ProvenanceMetadata = {
      source: 'OpenStreetMap Contributors & Mapbox Places API',
      retrievedAt: retrievalTime,
      attribution: 'Data © OpenStreetMap contributors, ODbL 1.0 & Mapbox',
      dataFreshness: 'Live on-demand query',
      queryParameters: {
        center: [centerLng, centerLat],
        radiusMeters,
        category,
        businessTitle,
        keywords: primaryKeywords,
        locationName,
      },
    }

    // Execute Step A (Overpass), Step B (Nominatim), and Step C (Mapbox) concurrently
    await Promise.allSettled([
      // Step A: OpenStreetMap Overpass POI API (Structured OSM Database)
      (async () => {
        const overpassQuery = buildOverpassQuery(
          category,
          minLat,
          minLng,
          maxLat,
          maxLng,
          businessTitle,
          businessDescription
        );

        const overpassMirrors = [
          'https://overpass-api.de/api/interpreter',
          'https://lz4.overpass-api.de/api/interpreter',
        ];

        for (const mirror of overpassMirrors) {
          try {
            const opRes = await fetch(mirror, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
              },
              body: 'data=' + encodeURIComponent(overpassQuery),
              signal: AbortSignal.timeout(5000),
            });

            if (opRes.ok) {
              const opJson = await opRes.json();
              if (Array.isArray(opJson.elements)) {
                for (const elem of opJson.elements) {
                  const tags = elem.tags || {};
                  const rawName = tags.name || tags.operator || tags.brand;
                  if (!rawName || rawName.trim().length === 0) continue;

                  const lat = elem.lat !== undefined ? elem.lat : elem.center?.lat;
                  const lon = elem.lon !== undefined ? elem.lon : elem.center?.lon;
                  if (lat === undefined || lon === undefined) continue;

                  const dist = haversineDistanceKm(centerLat, centerLng, lat, lon);
                  if (dist <= (radiusMeters / 1000) * 1.15) {
                    rawOsmOverpassCount++;
                    const classification = classifyCompetitorRelevance(
                      {
                        name: rawName,
                        type: tags.amenity || tags.shop || tags.office || tags.leisure || tags.tourism || 'commercial',
                        category,
                        address: tags['addr:full'] || tags['addr:street'] || (rawName + ', ' + (locationName || '')),
                        extratags: tags,
                      },
                      { businessTitle, category, businessDescription }
                    );

                    const addressParts = [
                      tags['addr:housenumber'],
                      tags['addr:street'],
                      tags['addr:suburb'] || tags['addr:neighbourhood'],
                      tags['addr:city'],
                    ].filter(Boolean);

                    rawPOIs.push({
                      id: 'osm_' + elem.type + '_' + elem.id,
                      name: rawName,
                      type: tags.amenity || tags.shop || tags.office || tags.leisure || tags.tourism || 'commercial',
                      category,
                      address: addressParts.length > 0 ? addressParts.join(', ') : (rawName + ', ' + (locationName || 'Local Area')),
                      coordinates: [lon, lat],
                      osmId: elem.id,
                      distanceKm: dist,
                      relevance: classification.relevance,
                      relevanceLabel: classification.relevanceLabel,
                      relevanceReason: classification.relevanceReason,
                      contactPhone: tags.phone || tags['contact:phone'] || undefined,
                      website: tags.website || tags['contact:website'] || undefined,
                      sourceId: 'OSM ' + elem.type + '/' + elem.id,
                      rawTags: Object.keys(tags).length > 0 ? tags : undefined,
                      provenance: {
                        ...provenance,
                        source: 'OpenStreetMap Contributors (via Overpass API)',
                      },
                    });
                  }
                }
                break;
              }
            }
          } catch (err: any) {
            failedQueries.push('Overpass mirror (' + mirror.replace(/https?:\/\//, '').split('/')[0] + '): ' + (err.message || 'timed out'));
          }
        }
      })(),

      // Step B: OpenStreetMap Nominatim Bounded Viewbox Search
      (async () => {
        try {
          const osmPromises = primaryKeywords.slice(0, 3).map(async (kw) => {
            const osmUrl = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(kw) +
              '&format=json&viewbox=' + viewbox + '&bounded=1&limit=25&extratags=1&addressdetails=1';

            const osmRes = await fetch(osmUrl, {
              headers: {
                'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
              },
            });

            if (!osmRes.ok) return [];
            const data = await osmRes.json();
            return Array.isArray(data) ? data : [];
          });

          const osmResultsArrays = await Promise.all(osmPromises);
          const allOsmItems = osmResultsArrays.flat();

          for (const item of allOsmItems) {
            const osmClass = (item.class || '').toLowerCase();
            const osmType = (item.type || '').toLowerCase();

            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lon)) continue;

            // Determine whether this OSM record is a geographic feature (road, postcode, etc.)
            // rather than a business. We KEEP geographic features tagged, not silently drop them.
            const geoCheck = classifyGeoFeature({ type: osmType, osmClass });

            const dist = haversineDistanceKm(centerLat, centerLng, lat, lon);
            if (dist <= (radiusMeters / 1000) * 1.15) {
              const rawName = item.name || item.display_name?.split(',')?.[0] || '';
              if (!rawName || rawName.trim().length === 0) continue;

              rawOsmNominatimCount++;
              const addr = item.address || {};
              const addressParts = [
                addr.house_number,
                addr.road,
                addr.neighbourhood || addr.suburb,
                addr.city || addr.town || addr.village,
                addr.state,
              ].filter(Boolean);

              const extraTags = item.extratags || {};

              // Only classify competitor relevance for genuine business records
              const classification = geoCheck.isGeoFeature
                ? { relevance: 'unverified' as const, relevanceLabel: 'Geographic Feature', relevanceReason: geoCheck.label }
                : classifyCompetitorRelevance(
                    {
                      name: rawName,
                      type: osmType || osmClass || 'commercial',
                      category,
                      address: item.display_name,
                      osmClass: item.class,
                      extratags: extraTags,
                    },
                    { businessTitle, category, businessDescription }
                  );

              rawPOIs.push({
                id: 'osm_' + (item.osm_type || 'node') + '_' + item.osm_id,
                name: rawName,
                type: osmType || osmClass || 'commercial',
                category,
                osmClass,
                address: addressParts.length > 0 ? addressParts.join(', ') : item.display_name,
                coordinates: [lon, lat],
                osmId: item.osm_id,
                distanceKm: dist,
                isGeographicFeature: geoCheck.isGeoFeature,
                geoFeatureLabel: geoCheck.isGeoFeature ? geoCheck.label : undefined,
                relevance: classification.relevance,
                relevanceLabel: classification.relevanceLabel,
                relevanceReason: classification.relevanceReason,
                contactPhone: extraTags.phone || extraTags['contact:phone'] || undefined,
                website: extraTags.website || extraTags['contact:website'] || undefined,
                sourceId: 'OSM ' + (item.osm_type || 'node') + '/' + item.osm_id,
                rawTags: Object.keys(extraTags).length > 0 ? extraTags : undefined,
                provenance: {
                  ...provenance,
                  source: 'OpenStreetMap Contributors (via Nominatim)',
                },
              });
            }
          }
        } catch (err: any) {
          failedQueries.push('Nominatim query: ' + (err.message || 'error'));
        }
      })(),

      // Step C: Mapbox Search Box & Places API (Concurrent category & forward searches)
      (async () => {
        const { mapboxToken } = getAppEnv();
        if (!mapboxToken || mapboxToken.startsWith('pk.your') || mapboxToken.includes('placeholder')) {
          return;
        }

        const mapboxCategories = getMapboxSearchCategories(category, businessTitle);

        const catPromises = mapboxCategories.slice(0, 3).map(async (mbCat) => {
          try {
            const mbCatUrl = 'https://api.mapbox.com/search/searchbox/v1/category/' + encodeURIComponent(mbCat) +
              '?proximity=' + centerLng + ',' + centerLat + '&bbox=' + effectiveBbox + '&access_token=' + mapboxToken + '&limit=25';

            const mbRes = await fetch(mbCatUrl);
            if (mbRes.ok) {
              const mbJson = await mbRes.json();
              if (Array.isArray(mbJson.features)) {
                for (const f of mbJson.features) {
                  const coords = f.geometry?.coordinates;
                  if (!coords) continue;
                  const [lon, lat] = coords;
                  const dist = haversineDistanceKm(centerLat, centerLng, lat, lon);

                  if (dist <= (radiusMeters / 1000) * 1.15) {
                    const rawName = f.properties?.name || f.properties?.name_preferred || 'Commercial Venue';
                    rawMapboxCount++;

                    const classification = classifyCompetitorRelevance(
                      {
                        name: rawName,
                        type: mbCat,
                        category,
                        address: f.properties?.full_address || f.properties?.place_formatted,
                      },
                      { businessTitle, category, businessDescription }
                    );

                    rawPOIs.push({
                      id: f.properties?.mapbox_id || ('mb_' + lon + '_' + lat),
                      name: rawName,
                      type: mbCat,
                      category,
                      address: f.properties?.full_address || f.properties?.place_formatted || (rawName + ', ' + (locationName || '')),
                      coordinates: [lon, lat],
                      osmId: f.properties?.mapbox_id || 'mapbox',
                      distanceKm: dist,
                      relevance: classification.relevance,
                      relevanceLabel: classification.relevanceLabel,
                      relevanceReason: classification.relevanceReason,
                      contactPhone: f.properties?.metadata?.phone || undefined,
                      website: f.properties?.metadata?.website || undefined,
                      sourceId: 'Mapbox ' + (f.properties?.mapbox_id || mbCat),
                      provenance: {
                        ...provenance,
                        source: 'Mapbox Places Search Box API',
                      },
                    });
                  }
                }
              }
            }
          } catch (catErr: any) {
            failedQueries.push('Mapbox category query (' + mbCat + '): ' + (catErr.message || 'error'));
          }
        });

        const fwdPromises = primaryKeywords.slice(0, 3).map(async (kw) => {
          try {
            const mbForwardUrl = 'https://api.mapbox.com/search/searchbox/v1/forward?q=' + encodeURIComponent(kw) +
              '&proximity=' + centerLng + ',' + centerLat + '&bbox=' + effectiveBbox + '&access_token=' + mapboxToken + '&limit=10';

            const mbRes = await fetch(mbForwardUrl);
            if (mbRes.ok) {
              const mbJson = await mbRes.json();
              if (Array.isArray(mbJson.features)) {
                for (const f of mbJson.features) {
                  const coords = f.geometry?.coordinates;
                  if (!coords) continue;
                  const [lon, lat] = coords;
                  const dist = haversineDistanceKm(centerLat, centerLng, lat, lon);

                  if (dist <= (radiusMeters / 1000) * 1.15) {
                    const rawName = f.properties?.name || 'Commercial Establishment';
                    rawMapboxCount++;

                    const classification = classifyCompetitorRelevance(
                      {
                        name: rawName,
                        type: kw,
                        category,
                        address: f.properties?.full_address || f.properties?.place_formatted,
                      },
                      { businessTitle, category, businessDescription }
                    );

                    rawPOIs.push({
                      id: f.properties?.mapbox_id || ('mb_' + lon + '_' + lat),
                      name: rawName,
                      type: kw,
                      category,
                      address: f.properties?.full_address || f.properties?.place_formatted || (rawName + ', ' + (locationName || '')),
                      coordinates: [lon, lat],
                      osmId: f.properties?.mapbox_id || 'mapbox',
                      distanceKm: dist,
                      relevance: classification.relevance,
                      relevanceLabel: classification.relevanceLabel,
                      relevanceReason: classification.relevanceReason,
                      contactPhone: f.properties?.metadata?.phone || undefined,
                      website: f.properties?.metadata?.website || undefined,
                      sourceId: 'Mapbox ' + (f.properties?.mapbox_id || kw),
                      provenance: {
                        ...provenance,
                        source: 'Mapbox Places Search Box API',
                      },
                    });
                  }
                }
              }
            }
          } catch (fwdErr) {
            try {
              const mbUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(kw) +
                '.json?proximity=' + centerLng + ',' + centerLat + '&bbox=' + effectiveBbox + '&access_token=' + mapboxToken + '&limit=10';

              const res = await fetch(mbUrl);
              if (res.ok) {
                const data = await res.json();
                for (const f of data.features || []) {
                  const [lon, lat] = f.center;
                  const dist = haversineDistanceKm(centerLat, centerLng, lat, lon);
                  if (dist <= (radiusMeters / 1000) * 1.15) {
                    const rawName = f.text || f.place_name?.split(',')?.[0] || 'POI';
                    rawMapboxCount++;
                    const classification = classifyCompetitorRelevance(
                      { name: rawName, type: kw, category, address: f.place_name },
                      { businessTitle, category, businessDescription }
                    );
                    rawPOIs.push({
                      id: f.id,
                      name: rawName,
                      type: kw,
                      category,
                      address: f.place_name,
                      coordinates: [lon, lat],
                      osmId: f.id,
                      distanceKm: dist,
                      relevance: classification.relevance,
                      relevanceLabel: classification.relevanceLabel,
                      relevanceReason: classification.relevanceReason,
                      sourceId: 'Mapbox ' + f.id,
                      provenance: { ...provenance, source: 'Mapbox Places API' },
                    });
                  }
                }
              }
            } catch (e: any) {
              failedQueries.push('Mapbox Geocoding (' + kw + '): ' + (e.message || 'error'));
            }
          }
        });

        await Promise.allSettled([...catPromises, ...fwdPromises]);
      })(),
    ]);

    // Step D: Precision Non-Destructive Deduplication
    const { unique: gatheredPOIs, mergedCount } = deduplicateAndMergePOIs(rawPOIs)

    // Sort by physical proximity
    gatheredPOIs.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))

    // Split into genuine business establishments vs. geographic features
    const businesses = gatheredPOIs.filter((p) => !p.isGeographicFeature)
    const geographicFeatures = gatheredPOIs.filter((p) => p.isGeographicFeature === true)

    // Categorized competitor breakdown (businesses only)
    const directCompetitors = businesses.filter((p) => p.relevance === 'direct')
    const indirectCompetitors = businesses.filter((p) => p.relevance === 'indirect')
    const unverifiedCompetitors = businesses.filter((p) => p.relevance === 'unverified')

    // Formulate honest empirical coverage note (based on businesses, not total POIs)
    const radiusKm = (radiusMeters / 1000).toFixed(1)
    let coverageNote = ''
    let notice: string | undefined = undefined

    if (businesses.length === 0) {
      notice = `Zero registered commercial establishments found in open registries for "${category}" within ${radiusKm} km radius.`
      coverageNote =
        'Zero registered competitor POIs found in public registry databases within this radius. Note: Open geospatial databases rarely list all operating private businesses; zero results does NOT prove an absence of local competitors or customer demand. A physical ground survey is mandatory.'
    } else if (directCompetitors.length === 0) {
      coverageNote = `No direct competitors verified in open registries within ${radiusKm} km. However, ${indirectCompetitors.length} indirect establishment(s) / demographic hub(s) were identified. Many businesses operate without public GIS registration; field verification is required.`
    } else {
      coverageNote = `Verified ${directCompetitors.length} direct competitor(s) and ${indirectCompetitors.length} indirect / demographic hub(s) within ${radiusKm} km radius.${
        geographicFeatures.length > 0 ? ` ${geographicFeatures.length} geographic feature(s) displayed separately.` : ''
      }`
    }

    const discoveryMetrics: DiscoveryMetrics = {
      rawOsmOverpass: rawOsmOverpassCount,
      rawOsmNominatim: rawOsmNominatimCount,
      rawMapbox: rawMapboxCount,
      duplicatesMerged: mergedCount,
      totalUnique: gatheredPOIs.length,
      failedQueries,
      coverageLimitations: [
        'OpenStreetMap and Mapbox contain community and commercial GIS data; unregistered private businesses may not appear.',
        'Physical ground reconnaissance is required to confirm active operating status.',
      ],
      retrievalDurationMs: Date.now() - startTime,
    }

    return {
      data: gatheredPOIs,
      businesses,
      geographicFeatures,
      directCompetitors,
      indirectCompetitors,
      unverifiedCompetitors,
      directCount: directCompetitors.length,
      indirectCount: indirectCompetitors.length,
      unverifiedCount: unverifiedCompetitors.length,
      businessCount: businesses.length,
      discoveryMetrics,
      notice,
      coverageNote,
      provenance,
    }
  },

  /**
   * 5. Discovers Genuine Alternative Nearby Localities & Neighborhoods using Real Geospatial Probing
   */
  async discoverAlternativeAreas(
    centerCoords: [number, number],
    currentAreaName: string,
    category: string,
    businessTitle?: string,
    businessDescription?: string
  ): Promise<CandidateAlternativeArea[]> {
    const [centerLng, centerLat] = centerCoords
    const candidates: CandidateAlternativeArea[] = []
    const seenNames = new Set<string>()
    seenNames.add(currentAreaName.toLowerCase())

    // Define 4 real geographic probing offsets (~1.5 km to 2.5 km away in cardinal directions)
    const offsets = [
      { lat: centerLat + 0.016, lon: centerLng, dir: 'North' },
      { lat: centerLat - 0.016, lon: centerLng, dir: 'South' },
      { lat: centerLat, lon: centerLng + 0.018, dir: 'East' },
      { lat: centerLat, lon: centerLng - 0.018, dir: 'West' },
    ]

    for (const offset of offsets) {
      if (candidates.length >= 3) break

      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${offset.lat.toFixed(
          5
        )}&lon=${offset.lon.toFixed(5)}&format=json&zoom=15`

        const revRes = await fetch(revUrl, {
          headers: {
            'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
          },
        })

        if (revRes.ok) {
          const revData = await revRes.json()
          const addr = revData.address || {}
          const areaName =
            addr.neighbourhood ||
            addr.suburb ||
            addr.quarter ||
            addr.residential ||
            addr.village ||
            addr.road ||
            revData.display_name.split(',')[0]

          const normName = areaName.toLowerCase()
          if (areaName && !seenNames.has(normName) && !currentAreaName.toLowerCase().includes(normName)) {
            seenNames.add(normName)
            const coords: [number, number] = [offset.lon, offset.lat]
            const dist = haversineDistanceKm(centerLat, centerLng, offset.lat, offset.lon)

            // Probe competitor presence in candidate area
            const compCheck = await this.getNearbyCompetitorsBounded({
              coordinates: coords,
              radiusMeters: 1200,
              category,
              businessTitle,
              businessDescription,
              locationName: areaName,
            })

            candidates.push({
              id: `candidate_${candidates.length + 1}`,
              areaName,
              coordinates: coords,
              distanceKm: dist,
              placeType: revData.type || 'neighbourhood',
              // Use business count (excluding geographic features) as the meaningful competitor count
              competitorCount: compCheck.businessCount ?? compCheck.data.length,
              directCompetitorsCount: compCheck.directCount,
              indirectCompetitorsCount: compCheck.indirectCount,
              sampleCompetitors: compCheck.businesses.slice(0, 3).map((c) => `${c.name} (${c.relevance})`),
              coverageNote: compCheck.coverageNote,
              provenance: {
                source: 'OpenStreetMap Reverse Geocoding & Bounded Registry Search',
                retrievedAt: new Date().toISOString(),
                attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
                dataFreshness: 'Real-time on-demand spatial probe',
                queryParameters: { coordinates: coords, category },
              },
            })
          }
        }
      } catch (probeErr) {
        console.warn('Candidate area probe note:', probeErr)
      }
    }

    return candidates
  },

  /**
   * 6. Combined live territory + competitor intelligence execution (Legacy backward-compatible)
   */
  async evaluateLocationMarket(
    locationName: string,
    categoryName: string,
    businessTitle?: string,
    businessDescription?: string
  ): Promise<RealtimeLocationIntelligenceResult> {
    const territoryRes = await this.getTerritory(locationName)
    let competitorRes: {
      data: RealCompetitorPOI[]
      businesses?: RealCompetitorPOI[]
      geographicFeatures?: RealCompetitorPOI[]
      businessCount?: number
      error?: string
      notice?: string
      discoveryMetrics?: DiscoveryMetrics
    }

    const coords = territoryRes.data?.coordinates
    const hasValidCoords = coords ? isValidCoordinatePair(coords[0], coords[1]) : false

    if (territoryRes.data && hasValidCoords) {
      const bounded = await this.getNearbyCompetitorsBounded({
        coordinates: territoryRes.data.coordinates,
        radiusMeters: 2500,
        category: categoryName,
        businessTitle,
        businessDescription,
        locationName,
        bbox: territoryRes.data.bbox,
      })
      competitorRes = {
        data: bounded.data,
        businesses: bounded.businesses,
        geographicFeatures: bounded.geographicFeatures,
        businessCount: bounded.businessCount,
        error: bounded.error,
        notice: bounded.notice,
        discoveryMetrics: bounded.discoveryMetrics,
      }
    } else {
      const legacy = await this.getNearbyCompetitors(locationName, categoryName, 15)
      competitorRes = {
        data: legacy.data,
        error: legacy.error,
        notice: legacy.notice,
      }
    }

    return {
      territory: territoryRes.data,
      competitors: competitorRes.data,
      competitorCount: competitorRes.data.length,
      discoveryMetrics: competitorRes.discoveryMetrics,
      notice: competitorRes.notice,
      error: territoryRes.error || competitorRes.error,
    }
  },

  /**
   * 7. Full Advanced Location Intelligence Execution (Area + Radius + Deduplicated POIs + Candidate Alternatives)
   */
  async evaluateAdvancedLocationMarket(input: {
    query: string
    coordinates?: [number, number]
    radiusMeters?: number
    category: string
    businessTitle?: string
    businessDescription?: string
  }): Promise<AdvancedLocationResult> {
    const { query, coordinates, radiusMeters = 1500, category, businessTitle, businessDescription } = input

    let territory: TerritoryIntelligence | null = null
    let targetCoords: [number, number] = coordinates || [0, 0]

    // If the caller provided pre-verified coordinates, use them directly;
    // still resolve territory metadata for display purposes.
    const providedCoordsValid = coordinates ? isValidCoordinatePair(coordinates[0], coordinates[1]) : false

    if (!providedCoordsValid) {
      const terrRes = await this.getTerritory(query)
      territory = terrRes.data
      if (terrRes.data && isValidCoordinatePair(terrRes.data.coordinates[0], terrRes.data.coordinates[1])) {
        targetCoords = terrRes.data.coordinates
      }
    } else {
      const terrRes = await this.getTerritory(query)
      territory = terrRes.data
      targetCoords = coordinates!
    }

    if (!isValidCoordinatePair(targetCoords[0], targetCoords[1])) {
      return {
        territory: null,
        searchCoordinates: [0, 0],
        searchRadiusMeters: radiusMeters,
        competitors: [],
        businesses: [],
        geographicFeatures: [],
        competitorCount: 0,
        businessCount: 0,
        directCompetitorCount: 0,
        indirectCompetitorCount: 0,
        unverifiedCompetitorCount: 0,
        coverageNote: 'Unable to geocode location query into verifiable GPS coordinates.',
        alternativeCandidates: [],
        provenance: {
          source: 'OpenStreetMap & Mapbox',
          retrievedAt: new Date().toISOString(),
          attribution: 'Data © OpenStreetMap contributors, ODbL 1.0 & Mapbox',
          dataFreshness: 'Query failed',
          queryParameters: { query, category },
        },
        error: `Could not verify geographic coordinates for "${query}". Please check the spelling or pick an area from suggestions.`,
      }
    }

    // Run bounded competitor discovery and alternative candidate discovery concurrently
    const [competitorRes, candidateAreas] = await Promise.all([
      this.getNearbyCompetitorsBounded({
        coordinates: targetCoords,
        radiusMeters,
        category,
        businessTitle,
        businessDescription,
        locationName: query,
        bbox: territory?.bbox,
      }),
      this.discoverAlternativeAreas(targetCoords, query, category, businessTitle, businessDescription),
    ])

    return {
      territory,
      searchCoordinates: targetCoords,
      searchRadiusMeters: radiusMeters,
      competitors: competitorRes.data,
      businesses: competitorRes.businesses,
      geographicFeatures: competitorRes.geographicFeatures,
      competitorCount: competitorRes.data.length,
      businessCount: competitorRes.businessCount,
      directCompetitorCount: competitorRes.directCount,
      indirectCompetitorCount: competitorRes.indirectCount,
      unverifiedCompetitorCount: competitorRes.unverifiedCount,
      discoveryMetrics: competitorRes.discoveryMetrics,
      coverageNote: competitorRes.coverageNote || '',
      alternativeCandidates: candidateAreas,
      provenance: competitorRes.provenance,
      notice: competitorRes.notice,
      error: competitorRes.error,
    }
  },

  /**
   * 8. Save analysis run to Supabase with provenance (On-Demand only)
   */
  async saveAnalysis(
    userId: string,
    payload: {
      businessRequestId?: string | null
      analysisType: string
      title: string
      summary?: string
      evidencePayload: any
      provenance: ProvenanceMetadata
    }
  ): Promise<{ data: SavedAnalysisRecord | null; error?: string }> {
    if (!userId) {
      return { data: null, error: 'Authentication required to save decision analyses.' }
    }

    try {
      const { data, error } = await supabase
        .from('saved_analyses')
        .insert({
          user_id: userId,
          business_request_id: payload.businessRequestId || null,
          analysis_type: payload.analysisType,
          title: payload.title,
          summary: payload.summary || null,
          evidence_payload: payload.evidencePayload,
          provenance: payload.provenance,
        })
        .select()
        .single()

      if (error) {
        console.warn('Supabase saved_analyses table note:', error.message)
        return {
          data: null,
          error: 'Analysis generated live. (To persist in database, apply migration 002 in Supabase SQL editor).',
        }
      }

      return { data: data as SavedAnalysisRecord }
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to persist analysis record.' }
    }
  },

  /**
   * 9. Retrieve saved analyses belonging to user
   */
  async getSavedAnalyses(userId: string): Promise<{ data: SavedAnalysisRecord[]; error?: string }> {
    if (!userId) {
      return { data: [], error: 'Authentication required' }
    }

    try {
      const { data, error } = await supabase
        .from('saved_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: (data as SavedAnalysisRecord[]) || [] }
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to fetch saved analyses' }
    }
  },
}
