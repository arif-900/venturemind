import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Search,
  Compass,
  Building2,
  Bookmark,
  ArrowRight,
  TrendingUp,
  Info,
  Layers,
  RefreshCw,
  Clock,
  Target,
  Phone,
  Globe,
  ExternalLink,
  Filter,
} from 'lucide-react'
import { geminiService, GeminiAnalysisResult } from '@/lib/services/geminiService'
import {
  realtimeIntelligenceService,
  RealCompetitorPOI,
  TerritoryIntelligence,
  AreaSuggestion,
  CandidateAlternativeArea,
  ProvenanceMetadata,
  DiscoveryMetrics,
  LocationDisambiguationCandidate,
  buildGoogleMapsUrl,
} from '@/lib/services/realtimeIntelligenceService'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord, businessCategories, BUSINESS_OBJECTIVES, CUSTOM_SECTOR_SENTINEL } from '@/lib/validations/business'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { InteractiveAreaMap } from '@/components/map/InteractiveAreaMap'
import { GoogleMapsLink } from '@/components/ui/GoogleMapsLink'
import { DecisionDashboard } from '@/components/ui/DecisionDashboard'
import { CURRENCY_LABEL } from '@/lib/currency'
import { computeLocationDecision, LocationDecisionResult } from '@/lib/services/locationDecisionService'

const RADIUS_OPTIONS = [
  { label: '500m (Hyperlocal)', value: 500 },
  { label: '1.0 km (Standard)', value: 1000 },
  { label: '2.0 km (Commercial Hub)', value: 2000 },
  { label: '3.0 km (Sub-district)', value: 3000 },
  { label: '5.0 km (District Wide)', value: 5000 },
]

export const AiIntelligencePage: React.FC = () => {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessRequestRecord[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

  // Form states
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(businessCategories[0])
  const [customSector, setCustomSector] = useState('')
  const [customSectorError, setCustomSectorError] = useState<string | null>(null)
  const [objective, setObjective] = useState<typeof BUSINESS_OBJECTIVES[number]>('new_launch')
  const [budget, setBudget] = useState<number | undefined>(undefined)
  const [targetDemographic, setTargetDemographic] = useState('')
  const [description, setDescription] = useState('')

  // Location & Area states
  const [locationInput, setLocationInput] = useState('')
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null)
  const [selectedRadiusMeters, setSelectedRadiusMeters] = useState<number>(1500)
  const [territory, setTerritory] = useState<TerritoryIntelligence | null>(null)

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([])
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const searchDebounceRef = useRef<any>(null)

  // Real-time market evidence
  const [competitors, setCompetitors] = useState<RealCompetitorPOI[]>([])
  const [coverageNote, setCoverageNote] = useState<string>('')
  const [alternativeCandidates, setAlternativeCandidates] = useState<CandidateAlternativeArea[]>([])
  const [marketProvenance, setMarketProvenance] = useState<ProvenanceMetadata | null>(null)
  const [discoveryMetrics, setDiscoveryMetrics] = useState<DiscoveryMetrics | null>(null)
  const [isDiscoveringMarket, setIsDiscoveringMarket] = useState(false)

  // Location disambiguation
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<LocationDisambiguationCandidate[]>([])
  const [showDisambiguation, setShowDisambiguation] = useState(false)

  // Relevance counts and filtering
  const [competitorFilter, setCompetitorFilter] = useState<'all' | 'direct' | 'indirect' | 'unverified'>('all')
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null)
  const [directCompetitorCount, setDirectCompetitorCount] = useState<number>(0)
  const [indirectCompetitorCount, setIndirectCompetitorCount] = useState<number>(0)
  const [unverifiedCompetitorCount, setUnverifiedCompetitorCount] = useState<number>(0)
  const mapSectionRef = useRef<HTMLDivElement>(null)

  // Gemini Analysis state
  const [result, setResult] = useState<GeminiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Location Decision Engine state
  const [decisionResult, setDecisionResult] = useState<LocationDecisionResult | null>(null)
  const [monthlyBurn, setMonthlyBurn] = useState<number | undefined>(undefined)
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | undefined>(undefined)

  // Save to dossier state
  const [isSaving, setIsSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  const loadBusinesses = useCallback(async () => {
    if (!user) return
    const res = await businessService.getBusinesses(user.id)
    if (res.data) {
      setBusinesses(res.data)
    }
  }, [user])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  /**
   * The resolved sector sent to every service call.
   * When the user picks 'Others', their typed value is used; otherwise the dropdown value.
   */
  const effectiveSector =
    category === CUSTOM_SECTOR_SENTINEL ? customSector.trim() : category

  const validateCustomSector = (): boolean => {
    if (category !== CUSTOM_SECTOR_SENTINEL) return true
    if (!customSector.trim()) {
      setCustomSectorError('Please enter your business sector before running analysis.')
      return false
    }
    setCustomSectorError(null)
    return true
  }

  // Handle loading saved business request
  const handleSelectBusiness = (id: string) => {
    setSelectedBusinessId(id)
    const biz = businesses.find((b) => b.id === id)
    if (biz) {
      setTitle(biz.title)
      // Restore category — if it was saved as a custom value, set to Others + customSector
      const savedCat = biz.business_category
      const isKnownCat = (businessCategories as readonly string[]).includes(savedCat)
      if (isKnownCat) {
        setCategory(savedCat)
        setCustomSector('')
      } else {
        setCategory(CUSTOM_SECTOR_SENTINEL)
        setCustomSector(savedCat)
      }
      setObjective(biz.objective)
      setBudget(biz.budget ?? undefined)
      if (biz.description) {
        setDescription(biz.description)
      }
      if (biz.target_location) {
        setLocationInput(biz.target_location)
        // Reset coordinates to re-trigger geocoding for new location
        setSelectedCoordinates(null)
      }
    }
  }

  // Debounced search suggestions for cities and local areas (e.g. Nandyala, Srinivasa Nagar, Kurnool Road, Hyderabad)
  const handleLocationInputChange = (value: string) => {
    setLocationInput(value)
    setShowSuggestionsDropdown(true)

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    if (value.trim().length < 2) {
      setSuggestions([])
      setIsSearchingSuggestions(false)
      return
    }

    setIsSearchingSuggestions(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await realtimeIntelligenceService.searchAreaSuggestions(value.trim(), 5)
        setSuggestions(results)
      } catch (err) {
        console.warn('Suggestions error:', err)
      } finally {
        setIsSearchingSuggestions(false)
      }
    }, 280)
  }

  // Handle selecting an area suggestion
  const handleSelectSuggestion = (s: AreaSuggestion) => {
    setLocationInput(s.displayName)
    setSelectedCoordinates(s.coordinates)
    setShowSuggestionsDropdown(false)
  }

  // Handle clicking on map to reposition search area
  const handleMapSelectCoordinates = async (coords: [number, number]) => {
    setSelectedCoordinates(coords)
    // Reverse geocode clicked location to get readable area name
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords[1].toFixed(5)}&lon=${coords[0].toFixed(
          5
        )}&format=json&zoom=16`,
        {
          headers: {
            'User-Agent': 'VentureMind-IntelligencePlatform/2.0 (contact: intelligence@venturemind.ai)',
          },
        }
      )
      if (res.ok) {
        const d = await res.json()
        const readable =
          d.address?.neighbourhood ||
          d.address?.suburb ||
          d.address?.road ||
          d.address?.city ||
          d.address?.town ||
          d.display_name.split(',')[0]
        if (readable) {
          setLocationInput(readable)
        }
      }
    } catch (err) {
      console.warn('Reverse geocode note:', err)
    }
  }

  // Handle selecting candidate alternative area
  const handleSelectAlternativeArea = (alt: CandidateAlternativeArea) => {
    setLocationInput(alt.areaName)
    setSelectedCoordinates(alt.coordinates)
  }

  // Handle clicking to inspect competitor on map
  const handleInspectCompetitor = (c: RealCompetitorPOI) => {
    setSelectedCompetitorId(c.id)
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // 1. Fetch Real-Time Location & Competitor Market Evidence
  const fetchMarketEvidence = async () => {
    if (!locationInput.trim()) return null
    setIsDiscoveringMarket(true)
    setErrorMsg(null)
    setShowDisambiguation(false)

    try {
      const marketRes = await realtimeIntelligenceService.evaluateAdvancedLocationMarket({
        query: locationInput.trim(),
        coordinates: selectedCoordinates || undefined,
        radiusMeters: selectedRadiusMeters,
        category: effectiveSector,
        businessTitle: title.trim() || undefined,
        businessDescription: description.trim() || undefined,
      })

      // Fetch disambiguation candidates in parallel (lightweight territory-only call)
      realtimeIntelligenceService.getTerritory(locationInput.trim()).then((terrCheck) => {
        if (terrCheck.disambiguationCandidates && terrCheck.disambiguationCandidates.length > 0) {
          setDisambiguationCandidates(terrCheck.disambiguationCandidates)
          setShowDisambiguation(true)
        } else {
          setDisambiguationCandidates([])
          setShowDisambiguation(false)
        }
      }).catch(() => { /* silent — disambiguation is best-effort */ })

      if (marketRes.territory) {
        setTerritory(marketRes.territory)
        setSelectedCoordinates(marketRes.searchCoordinates)
      }
      setCompetitors(marketRes.competitors)
      setDirectCompetitorCount(marketRes.directCompetitorCount)
      setIndirectCompetitorCount(marketRes.indirectCompetitorCount)
      setUnverifiedCompetitorCount(marketRes.unverifiedCompetitorCount)
      setCoverageNote(marketRes.coverageNote)
      setAlternativeCandidates(marketRes.alternativeCandidates)
      setMarketProvenance(marketRes.provenance)
      setDiscoveryMetrics(marketRes.discoveryMetrics || null)

      // ── Compute deterministic location decision immediately ──────────
      const decision = computeLocationDecision({
        businessTitle: title.trim() || 'Business Idea',
        sector: effectiveSector || category,
        locationName: locationInput.trim(),
        budget: budget || null,
        monthlyBurn,
        monthlyRevenue,
        radiusMeters: selectedRadiusMeters,
        competitors: marketRes.competitors,
        alternativeCandidates: marketRes.alternativeCandidates,
        discoveryMetrics: marketRes.discoveryMetrics || null,
        coverageNote: marketRes.coverageNote,
      })
      setDecisionResult(decision)

      return marketRes
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to query real-time market data.')
      return null
    } finally {
      setIsDiscoveringMarket(false)
    }
  }

  // 2. Full Decision Analysis Execution
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!validateCustomSector()) return

    setIsAnalyzing(true)
    setErrorMsg(null)
    setSaveNotice(null)
    setAnalysisStatus('Querying live OpenStreetMap & Mapbox registries for verified POIs...')

    // Step A: Retrieve genuine geospatial evidence
    const marketData = await fetchMarketEvidence()

    setAnalysisStatus('Executing evidence-grounded Gemini AI strategic reasoning...')

    // Step B: Build verified evidence payload
    const verifiedEvidence = marketData
      ? {
          coordinates: marketData.searchCoordinates,
          competitorCount: marketData.competitors.length,
          directCompetitorCount: marketData.directCompetitorCount,
          indirectCompetitorCount: marketData.indirectCompetitorCount,
          unverifiedCompetitorCount: marketData.unverifiedCompetitorCount,
          allCompetitorNames: marketData.competitors.map((c) => c.name),
          sampleCompetitors: marketData.competitors.map((c) => c.name),
          sources: marketData.provenance.source,
          coverageNote: marketData.coverageNote,
          discoveryMetrics: marketData.discoveryMetrics,
          competitorsList: marketData.competitors.map((c) => ({
            name: c.name,
            type: c.type,
            address: c.address,
            distanceKm: c.distanceKm,
            relevance: c.relevance,
            relevanceLabel: c.relevanceLabel,
            relevanceReason: c.relevanceReason,
            contactPhone: c.contactPhone,
            website: c.website,
            source: c.provenance.source,
            sourceId: c.sourceId,
            retrievedAt: c.provenance.retrievedAt,
          })),
          alternativeCandidates: marketData.alternativeCandidates.map((a) => ({
            areaName: a.areaName,
            coordinates: a.coordinates,
            competitorCount: a.competitorCount,
            directCompetitorsCount: a.directCompetitorsCount,
            indirectCompetitorsCount: a.indirectCompetitorsCount,
            sampleCompetitors: a.sampleCompetitors,
          })),
        }
      : undefined

    // Step C: Run Gemini grounded analysis
    const res = await geminiService.generatePreliminaryAnalysis({
      businessTitle: title.trim(),
      // Pass the effective sector — Gemini must know the actual sector, not the 'Others' sentinel
      category: effectiveSector || category,
      objective,
      budget: budget || null,
      targetLocation: locationInput.trim() || undefined,
      targetDemographic: targetDemographic.trim() || undefined,
      searchRadiusMeters: selectedRadiusMeters,
      verifiedEvidence,
    })

    setIsAnalyzing(false)
    setAnalysisStatus(null)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setResult(res.data)
    }
  }

  // Save analysis to Supabase
  const handleSaveToDossier = async () => {
    if (!user || !result) return
    setIsSaving(true)
    setSaveNotice(null)

    const res = await realtimeIntelligenceService.saveAnalysis(user.id, {
      analysisType: 'ai_strategic_evaluation',
      title: `${title} (${effectiveSector || category} in ${locationInput || 'Unspecified area'})`,
      summary: result.executiveSummary,
      evidencePayload: {
        viabilityScore: result.estimatedViabilityScore,
        locationSuitability: result.locationSuitabilityAnalysis,
        verifiedFacts: result.verifiedFacts,
        keyConsiderations: result.keyConsiderations,
        missingEvidenceGaps: result.missingEvidenceGaps,
        alternativeComparisons: result.alternativeLocationComparisons,
        territory: {
          placeName: locationInput || (territory?.placeName ? territory.placeName : 'Selected Area'),
          coordinates: selectedCoordinates,
        },
        sector: effectiveSector || category,
        customSector: category === CUSTOM_SECTOR_SENTINEL ? customSector.trim() : undefined,
        competitorCount: competitors.length,
        competitorsCount: competitors.length,
        searchRadiusMeters: selectedRadiusMeters,
      },
      provenance: marketProvenance || {
        source: 'Google Gemini 3.8 Flash & OpenStreetMap / Mapbox',
        retrievedAt: new Date().toISOString(),
        attribution: 'VentureMind Evidence Engine',
        dataFreshness: 'Live on-demand query',
        queryParameters: { title, category: effectiveSector || category, location: locationInput },
      },
    })

    setIsSaving(false)
    if (res.error) {
      setSaveNotice(res.error)
    } else {
      setSaveNotice('Decision intelligence evaluation persisted to your dossiers.')
    }
  }

  // Use selected/geocoded coordinates for the map center; no hardcoded default location
  const mapCenter: [number, number] = selectedCoordinates || [0, 0]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="pb-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">AI Location & Decision Intelligence</h1>
            <Badge variant="analyzed" className="text-[10px] font-mono">
              Live Map Data
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate business feasibility across entire cities, specific neighborhoods, and custom map radii with zero fabricated data.
          </p>
        </div>

        {user && result && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveToDossier}
            isLoading={isSaving}
            icon={<Bookmark className="w-3.5 h-3.5" />}
          >
            Save Analysis Report
          </Button>
        )}
      </div>

      {saveNotice && <Alert variant="info" className="text-xs">{saveNotice}</Alert>}

      <Card glass className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>Business Details & Target Location</CardTitle>
              <CardDescription>
                Enter your business idea, target location, and search radius to analyze real competitors and market feasibility
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {businesses.length > 0 && (
            <div className="space-y-1.5 pb-4 border-b border-slate-800/80 mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Load From Your Saved Businesses
              </label>
              <select
                value={selectedBusinessId}
                onChange={(e) => handleSelectBusiness(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Custom Analysis Entry</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.title} ({biz.business_category} - {biz.target_location || 'Unspecified location'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business / Project Title"
                placeholder="e.g. Bank Coaching Center or Specialty Dental Clinic"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Business Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setCustomSectorError(null)
                  }}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {businessCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom sector text input — only when 'Others' is selected */}
            {category === CUSTOM_SECTOR_SENTINEL && (
              <div>
                <Input
                  label="Enter your specific business sector *"
                  id="ai-custom-sector"
                  placeholder="e.g. Pet Grooming, EV Charging Station, Wedding Photography Studio"
                  value={customSector}
                  onChange={(e) => {
                    setCustomSector(e.target.value)
                    if (e.target.value.trim()) setCustomSectorError(null)
                  }}
                  error={customSectorError || undefined}
                  helperText="Used for targeted OSM Overpass queries and Gemini sector classification — not a generic search."
                />
              </div>
            )}

            {/* Row 2: Objective & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Strategic Objective
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as any)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 capitalize"
                >
                  {BUSINESS_OBJECTIVES.map((o) => (
                    <option key={o} value={o}>
                      {o.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label={`Declared Capital / Available Budget (${CURRENCY_LABEL})`}
                type="number"
                placeholder="e.g. 5,00,000"
                value={budget || ''}
                onChange={(e) => setBudget(e.target.value ? parseFloat(e.target.value) : undefined)}
                helperText="Evaluated against equipment, commercial leasing, and operational runway"
              />
            </div>

            {/* Financial Feasibility Inputs for Decision Engine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="md:col-span-2 flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300">Financial Feasibility Inputs</span>
                <span className="text-slate-500">— used by the Location Decision Engine to score runway</span>
              </div>
              <Input
                label={`Est. Monthly Expenses (${CURRENCY_LABEL})`}
                type="number"
                placeholder="e.g. 40,000"
                value={monthlyBurn || ''}
                onChange={(e) => setMonthlyBurn(e.target.value ? parseFloat(e.target.value) : undefined)}
                helperText="Rent, staff, utilities, supplies — your estimate"
              />
              <Input
                label={`Est. Monthly Revenue (${CURRENCY_LABEL})`}
                type="number"
                placeholder="e.g. 60,000"
                value={monthlyRevenue || ''}
                onChange={(e) => setMonthlyRevenue(e.target.value ? parseFloat(e.target.value) : undefined)}
                helperText="Your projected first-year monthly revenue"
              />
            </div>

            {/* Row 3: Idea Details & Target Demographic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Specific Business Model & Offerings"
                placeholder="e.g. Bank exam coaching for SBI, IBPS, and RRB PO & Clerk"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                helperText="Enables accurate differentiation between direct competitors and indirect demographic hubs"
              />

              <Input
                label="Target Customer Profile / Intended Demographic"
                placeholder="e.g. Degree students, competitive exam aspirants, college graduates"
                value={targetDemographic}
                onChange={(e) => setTargetDemographic(e.target.value)}
                helperText="Helps Gemini evaluate demographic catchment alignment"
              />
            </div>

            {/* Row 4: Location Search with Live Autocomplete & Radius Selector */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Target City, Local Neighborhood, or Street
                </label>
                <span className="text-[10px] text-slate-500">
                  Try "Nandyala", "Srinivasa Nagar", "Kurnool Road", "Madhapur", etc.
                </span>
              </div>

              <div className="relative">
                <div className="relative">
                  <Input
                    placeholder="Search city, neighborhood, locality, or street..."
                    value={locationInput}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestionsDropdown(true)
                    }}
                  />
                  <div className="absolute right-3 top-3 text-slate-400">
                    {isSearchingSuggestions ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      <Search className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestionsDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <div className="font-semibold text-white group-hover:text-indigo-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{s.shortName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate pl-5">
                            {s.contextText || s.displayName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="neutral" className="text-[10px] capitalize">
                            {s.placeType}
                          </Badge>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            [{s.coordinates[0].toFixed(2)}, {s.coordinates[1].toFixed(2)}]
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Disambiguation Warning Panel */}
              {showDisambiguation && disambiguationCandidates.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Other places with similar name detected
                  </div>
                  <p className="text-amber-200/80">
                    The first result was used. These additional matches exist — refine your query (e.g. add state or country) if a different location was intended:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {disambiguationCandidates.map((dc) => (
                      <div
                        key={dc.id}
                        className="p-2 rounded-lg bg-slate-900 border border-amber-800/20 flex flex-col gap-0.5"
                      >
                        <span className="font-semibold text-white text-[11px]">{dc.shortName}</span>
                        <span className="text-slate-400 text-[10px]">{dc.contextText || dc.displayName}</span>
                        <span className="text-slate-500 font-mono text-[9px]">
                          [{dc.coordinates[0].toFixed(4)}, {dc.coordinates[1].toFixed(4)}] • {dc.placeType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Radius Pills */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Search Perimeter & Radius
                </label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedRadiusMeters(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        selectedRadiusMeters === opt.value
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Map Component */}
            <div ref={mapSectionRef} className="pt-2">
              <InteractiveAreaMap
                center={mapCenter}
                radiusMeters={selectedRadiusMeters}
                locationName={locationInput || 'Selected Search Epicenter'}
                competitors={competitors}
                alternativeCandidates={alternativeCandidates}
                selectedCompetitorId={selectedCompetitorId}
                onSelectCoordinates={handleMapSelectCoordinates}
                onSelectAlternative={handleSelectAlternativeArea}
                onSelectCompetitor={(comp) => setSelectedCompetitorId(comp.id)}
                className="h-80 w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>
                  Center: <code className="text-slate-200 font-mono">[{mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)}]</code>
                  {' • '}
                  Radius: <span className="text-slate-200 font-semibold">{(selectedRadiusMeters / 1000).toFixed(1)} km</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={fetchMarketEvidence}
                  isLoading={isDiscoveringMarket}
                  icon={<Compass className="w-4 h-4" />}
                >
                  Discover POIs Only
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isAnalyzing}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Execute Grounded Decision Analysis
                </Button>
              </div>
            </div>
          </form>

          {errorMsg && <Alert variant="error" className="mt-4">{errorMsg}</Alert>}

          {/* Loading Skeleton */}
          {isAnalyzing && (
            <div className="mt-6 p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                {analysisStatus || 'Synthesizing evidence...'}
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {/* ── Location Decision Dashboard ──────────────────────────── */}
          {decisionResult && !isDiscoveringMarket && (
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Location Decision Engine
                </h2>
                <span className="ml-auto text-[10px] text-slate-500">
                  Evidence-only scoring • no AI hallucination
                </span>
              </div>
              <DecisionDashboard
                result={decisionResult}
                locationName={locationInput || territory?.placeName || 'Selected Area'}
                businessTitle={title || 'Business Idea'}
                sector={effectiveSector || category}
                onSelectAlternative={(areaName, coords) => {
                  setLocationInput(areaName)
                  if (coords) setSelectedCoordinates(coords)
                  setDecisionResult(null)
                }}
              />
            </div>
          )}

          {/* Real Market Findings Overview */}
          {(competitors.length > 0 || coverageNote) && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Verified Competitor & Area POI Registry ({competitors.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                    {directCompetitorCount} Direct
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                    {indirectCompetitorCount} Indirect / Demographics
                  </span>
                  {unverifiedCompetitorCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {unverifiedCompetitorCount} Unverified
                    </span>
                  )}
                </div>
              </div>

              {coverageNote && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed text-[11px]">{coverageNote}</div>
                </div>
              )}

              {/* Multi-Source Live Discovery & Provenance Breakdown HUD */}
              {discoveryMetrics && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-white">
                        Multi-Source Discovery Breakdown
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Zero Synthetic Data • 100% Genuine External APIs
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Mapbox Search</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawMapbox}</div>
                      <div className="text-[9px] text-slate-500">Live POIs</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">OSM Overpass</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawOsmOverpass}</div>
                      <div className="text-[9px] text-slate-500">Tag Registry</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">OSM Nominatim</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawOsmNominatim}</div>
                      <div className="text-[9px] text-slate-500">Viewbox Search</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-900/30 bg-amber-950/10">
                      <div className="text-[10px] text-amber-300">Deduplicated</div>
                      <div className="text-base font-bold text-amber-400 font-mono">-{discoveryMetrics.duplicatesMerged}</div>
                      <div className="text-[9px] text-amber-500/80">45m Proximity</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-emerald-900/40 bg-emerald-950/10 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-emerald-300">Unique Displayed</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">{discoveryMetrics.totalUnique}</div>
                      <div className="text-[9px] text-emerald-500/80">All Valid Records</div>
                    </div>
                  </div>

                  {discoveryMetrics.failedQueries && discoveryMetrics.failedQueries.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Query Notes / Failovers: </span>
                        <span>{discoveryMetrics.failedQueries.join(' • ')}</span>
                      </div>
                    </div>
                  )}

                  {discoveryMetrics.coverageLimitations && discoveryMetrics.coverageLimitations.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/60">
                      {discoveryMetrics.coverageLimitations.map((lim, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-400 font-bold shrink-0">•</span>
                          <span>{lim}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Relevance Filtering Pills */}
              {competitors.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400" /> Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompetitorFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                        competitorFilter === 'all'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Records ({competitors.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompetitorFilter('direct')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                        competitorFilter === 'direct'
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      Direct Competitors ({directCompetitorCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompetitorFilter('indirect')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                        competitorFilter === 'indirect'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-blue-400 hover:text-blue-300'
                      }`}
                    >
                      Indirect / Student Hubs ({indirectCompetitorCount})
                    </button>
                    {unverifiedCompetitorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setCompetitorFilter('unverified')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                          competitorFilter === 'unverified'
                            ? 'bg-slate-700 border-slate-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Unverified ({unverifiedCompetitorCount})
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500">
                    Showing {competitors.filter((c) => competitorFilter === 'all' || c.relevance === competitorFilter).length} of {competitors.length} returned POIs
                  </span>
                </div>
              )}

              {/* Every Competitor Displayed Transparently */}
              {competitors.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {competitors
                    .filter((c) => competitorFilter === 'all' || c.relevance === competitorFilter)
                    .map((c, idx) => {
                      const isSelected = selectedCompetitorId === c.id
                      const isDirect = c.relevance === 'direct'
                      const isIndirect = c.relevance === 'indirect'

                      return (
                        <div
                          key={c.id || idx}
                          onClick={() => handleInspectCompetitor(c)}
                          className={`p-4 rounded-xl bg-slate-900 border text-xs flex flex-col justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 ring-1 ring-amber-500/50 shadow-lg'
                              : isDirect
                              ? 'border-amber-500/40 hover:border-amber-400/80 bg-gradient-to-b from-amber-950/10 to-transparent'
                              : isIndirect
                              ? 'border-blue-900/40 hover:border-blue-700/80'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-sm text-white leading-snug">
                                {c.name}
                              </span>
                              <Badge
                                variant={isDirect ? 'warning' : isIndirect ? 'analyzed' : 'neutral'}
                                className="text-[9px] uppercase tracking-wider shrink-0 font-bold"
                              >
                                {c.relevance === 'direct'
                                  ? 'Direct Competitor'
                                  : c.relevance === 'indirect'
                                  ? 'Indirect Demographic'
                                  : 'Unverified'}
                              </Badge>
                            </div>

                            {/* Relevance Rationale */}
                            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] leading-relaxed">
                              <span className="text-slate-400 font-medium">Relevance: </span>
                              <span className={isDirect ? 'text-amber-200' : isIndirect ? 'text-blue-200' : 'text-slate-300'}>
                                {c.relevanceReason || c.relevanceLabel}
                              </span>
                            </div>

                            {/* Full Verified Address — clickable Maps link */}
                            <div className="flex items-start gap-1.5 pt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                              <GoogleMapsLink
                                mode="address"
                                coordinates={c.coordinates}
                                address={c.address}
                                label={c.name}
                                className="text-[11px] text-slate-300"
                              />
                            </div>

                            {/* Contact Details (if returned by genuine source) */}
                            {(c.contactPhone || c.website) && (
                              <div className="flex items-center gap-3 pt-1 text-[11px]">
                                {c.contactPhone && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <Phone className="w-3 h-3 text-emerald-400" />
                                    <span>{c.contactPhone}</span>
                                  </div>
                                )}
                                {c.website && (
                                  <a
                                    href={c.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 text-blue-400 hover:underline"
                                  >
                                    <Globe className="w-3 h-3 text-blue-400" />
                                    <span>Website</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-2.5 mt-3 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-indigo-400 font-semibold">
                                {c.distanceKm !== undefined ? `${c.distanceKm.toFixed(2)} km away` : 'Within radius'}
                              </span>
                              <span className="text-slate-500 font-mono">
                                [{c.coordinates[0].toFixed(4)}, {c.coordinates[1].toFixed(4)}]
                              </span>
                              <span className="text-indigo-400 hover:underline">
                                {isSelected ? '• Focused on Map' : 'Click to inspect on map →'}
                              </span>
                            </div>
                            {/* View on Google Maps footer action */}
                            <GoogleMapsLink
                              coordinates={c.coordinates}
                              address={c.address}
                              label={c.name}
                              showDisabled
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/40 text-[9px] text-slate-500">
                              <span className="truncate max-w-[220px]" title={c.provenance.source}>
                                Source: <span className="text-slate-400">{c.provenance.source}</span>
                              </span>
                              <span>
                                Retrieved: <span className="text-slate-400">{new Date(c.provenance.retrievedAt).toLocaleTimeString()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* Alternative Location Recommendations */}
          {alternativeCandidates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Adjacent Localities Discovered via GIS ({alternativeCandidates.length})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">Real geospatial probing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {alternativeCandidates.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-purple-200">{alt.areaName}</span>
                        <Badge variant="analyzed" className="text-[9px]">
                          {alt.distanceKm} km away
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-1">
                        <span><span className="text-amber-400 font-semibold">{alt.directCompetitorsCount ?? 0}</span> direct</span>
                        <span><span className="text-blue-400 font-semibold">{alt.indirectCompetitorsCount ?? 0}</span> indirect</span>
                      </div>
                      {alt.sampleCompetitors.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          Nearby: {alt.sampleCompetitors.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-900/30">
                      <GoogleMapsLink
                        coordinates={alt.coordinates}
                        address={alt.areaName}
                        label={alt.areaName}
                        mode="icon-text"
                        className="text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSelectAlternativeArea(alt)}
                        className="ml-auto py-1 px-2 bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 border border-purple-700/50 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Analyse</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Decision Intelligence Results Breakdown */}
          {result && (
            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-5 text-xs">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-white">Executive Viability Assessment</h4>
                  <Badge variant="analyzed" className="font-mono">
                    Viability Score: {result.estimatedViabilityScore}/100
                  </Badge>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs pt-1">{result.executiveSummary}</p>
              </div>

              {/* Location Suitability Analysis */}
              {result.locationSuitabilityAnalysis && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Target className="w-4 h-4" /> Location Suitability & Accessibility
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {result.locationSuitabilityAnalysis}
                  </p>
                </div>
              )}

              {/* Direct Competitor Positioning & Impact Analysis */}
              {result.directCompetitorAnalysis && result.directCompetitorAnalysis.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Target className="w-4 h-4" /> Direct Competitor Impact & Positioning Strategy
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {result.directCompetitorAnalysis.map((comp, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                        <span className="font-semibold text-amber-300">{comp.competitorName}</span>
                        <p className="text-slate-300 text-[11px]"><strong className="text-slate-400">Impact on Venture: </strong>{comp.impactOnVenture}</p>
                        <p className="text-slate-300 text-[11px]"><strong className="text-amber-400/90">Differentiation: </strong>{comp.differentiationStrategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indirect Competitor & Feeder Demographic Analysis */}
              {result.indirectCompetitorAnalysis && result.indirectCompetitorAnalysis.length > 0 && (
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Building2 className="w-4 h-4" /> Indirect Institutions & Demographic Feeders
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {result.indirectCompetitorAnalysis.map((ind, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{ind.competitorName}</span>
                          <span className="text-[10px] text-blue-400 uppercase font-mono">{ind.category}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]"><strong className="text-slate-400">Strategic Relationship: </strong>{ind.strategicRelationship}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Facts & Strategic Considerations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.verifiedFacts && result.verifiedFacts.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Verified Empirical Facts
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300 text-xs">
                      {result.verifiedFacts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                    <TrendingUp className="w-4 h-4" /> Strategic Considerations
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-300 text-xs">
                    {result.keyConsiderations.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Side-by-Side Alternative Location Comparisons */}
              {result.alternativeLocationComparisons && result.alternativeLocationComparisons.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                    <Layers className="w-4 h-4" /> Comparative Alternative Location Evaluations
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {result.alternativeLocationComparisons.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{item.areaName}</span>
                          <Badge variant="submitted" className="text-[10px]">
                            {item.recommendationVerdict}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <strong className="text-slate-300">Advantages: </strong>
                          {item.pros}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <strong className="text-slate-300">Risks / Drawbacks: </strong>
                          {item.cons}
                        </div>
                        {item.factorsRequiringFieldVerification && item.factorsRequiringFieldVerification.length > 0 && (
                          <div className="text-[10px] text-amber-300/90 pt-1 border-t border-slate-800/60">
                            <strong>Requires Field Verification: </strong>
                            {item.factorsRequiringFieldVerification.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empirical Data Gaps & Unverified Factors */}
              {result.missingEvidenceGaps && result.missingEvidenceGaps.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <AlertTriangle className="w-4 h-4" /> Empirical Data Gaps (Mandatory Field Verification)
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    The following metrics cannot be established via open registry APIs and must not be assumed without physical ground reconnaissance:
                  </p>
                  <ul className="space-y-1 list-disc list-inside text-amber-200/90 text-[11px]">
                    {result.missingEvidenceGaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strategic Next Steps */}
              {result.strategicNextSteps && result.strategicNextSteps.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white text-xs">Recommended Action Plan</h4>
                  <ul className="space-y-1 list-decimal list-inside text-slate-300 text-xs">
                    {result.strategicNextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Provenance & Legal Attribution Banner */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  Generated: {new Date(result.timestamp).toLocaleTimeString()} • {result.provenanceNotes || 'Grounded in venture input & real-time external registries'}
                </span>
                <span className="text-emerald-400 font-mono">
                  ZERO Synthetic Data Enforced
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="p-5 border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Strict Empirical Evidence Mandate
        </div>
        <p className="leading-relaxed">
          VentureMind AI evaluates locations strictly using authentic geospatial data from OpenStreetMap and Mapbox. If an area has sparse coverage or missing empirical metrics (such as exact foot traffic or local lease rates), we state the gap transparently rather than simulating certainty.
        </p>
      </Card>
    </div>
  )
}
