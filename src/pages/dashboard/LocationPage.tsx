import React, { useState } from 'react'
import {
  MapPin,
  Search,
  ShieldCheck,
  Building2,
  Compass,
  Bookmark,
  Info,
  Clock,
  Layers,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Globe,
  Phone,
  Navigation,
} from 'lucide-react'
import {
  realtimeIntelligenceService,
  buildGoogleMapsUrl,
  TerritoryIntelligence,
  RealCompetitorPOI,
  ProvenanceMetadata,
  DiscoveryMetrics,
  LocationDisambiguationCandidate,
} from '@/lib/services/realtimeIntelligenceService'
import { businessCategories, CUSTOM_SECTOR_SENTINEL } from '@/lib/validations/business'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Renders a single business establishment card with a Google Maps action.
 * Clicking the address or the "View on Google Maps" link opens Maps in a new
 * tab — it never navigates away from or submits the parent form.
 */
const BusinessCard: React.FC<{ biz: RealCompetitorPOI }> = ({ biz }) => {
  const mapsUrl = buildGoogleMapsUrl({
    coordinates: biz.coordinates,
    address: biz.address,
  })

  const [lng, lat] = biz.coordinates
  const hasValidCoords = lng !== 0 || lat !== 0

  const handleMapsClick = (e: React.MouseEvent) => {
    // Prevent event from bubbling to any parent click handlers
    e.stopPropagation()
  }

  return (
    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-col justify-between hover:border-slate-700 transition-colors group">
      {/* Header row */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="font-semibold text-white leading-snug">{biz.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={
                biz.relevance === 'direct'
                  ? 'warning'
                  : biz.relevance === 'indirect'
                  ? 'analyzed'
                  : 'neutral'
              }
              className="capitalize text-[9px]"
            >
              {biz.relevance}
            </Badge>
            <Badge variant="neutral" className="capitalize text-[10px]">
              {biz.type}
            </Badge>
          </div>
        </div>

        {/* Relevance explanation */}
        {biz.relevanceLabel && biz.relevanceLabel !== 'Geographic Feature' && (
          <p className="text-[10px] text-indigo-300/80 font-medium mb-1 leading-tight">
            {biz.relevanceLabel}
          </p>
        )}
        {biz.relevanceReason && biz.relevanceReason !== biz.geoFeatureLabel && (
          <p className="text-[11px] text-slate-500 italic leading-relaxed mb-2">
            {biz.relevanceReason}
          </p>
        )}

        {/* Address — clickable opens Google Maps */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleMapsClick}
              className="text-[11px] text-slate-300 hover:text-blue-400 hover:underline leading-relaxed transition-colors cursor-pointer"
              title="View address on Google Maps"
              aria-label={`View ${biz.name} on Google Maps`}
            >
              {biz.address}
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 leading-relaxed">{biz.address}</span>
          )}
        </div>

        {/* Contact row */}
        {(biz.contactPhone || biz.website) && (
          <div className="flex flex-wrap gap-2 mb-1.5">
            {biz.contactPhone && (
              <a
                href={`tel:${biz.contactPhone}`}
                onClick={handleMapsClick}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400 transition-colors"
                aria-label={`Call ${biz.name}`}
              >
                <Phone className="w-3 h-3" />
                {biz.contactPhone}
              </a>
            )}
            {biz.website && (
              <a
                href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleMapsClick}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400 transition-colors"
                aria-label={`Visit ${biz.name} website`}
              >
                <Globe className="w-3 h-3" />
                Website
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="space-y-1 pt-2 border-t border-slate-800/80 mt-1">
        {/* Coordinates + distance */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          {hasValidCoords ? (
            <span title="GPS coordinates (longitude, latitude)">
              {biz.coordinates[1].toFixed(5)}, {biz.coordinates[0].toFixed(5)}
            </span>
          ) : (
            <span className="text-slate-600">Coords unavailable</span>
          )}
          {biz.distanceKm !== undefined && (
            <span className="flex items-center gap-1 text-slate-400">
              <Navigation className="w-2.5 h-2.5" />
              {biz.distanceKm.toFixed(2)} km
            </span>
          )}
        </div>

        {/* View on Google Maps action */}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleMapsClick}
            className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:underline transition-colors w-fit"
            aria-label={`View ${biz.name} on Google Maps`}
          >
            <MapPin className="w-3 h-3" />
            View on Google Maps
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : (
          <span className="text-[10px] text-slate-600 italic">
            No verifiable location for Maps link
          </span>
        )}

        {/* Source attribution */}
        <div className="flex items-center justify-between text-[9px] text-slate-600 pt-0.5 border-t border-slate-800/40">
          <span className="truncate max-w-[200px]" title={biz.provenance.source}>
            Source: <span className="text-slate-500">{biz.provenance.source}</span>
          </span>
          <span>
            {new Date(biz.provenance.retrievedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders a geographic feature card (road, locality, postcode, etc.)
 * These are kept visible for context but visually distinct from businesses.
 */
const GeoFeatureCard: React.FC<{ feature: RealCompetitorPOI }> = ({ feature }) => {
  const mapsUrl = buildGoogleMapsUrl({
    coordinates: feature.coordinates,
    address: feature.address,
  })

  const handleMapsClick = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs flex flex-col gap-1.5 hover:border-slate-700/60 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-300 leading-snug">{feature.name}</span>
        <Badge variant="neutral" className="text-[9px] shrink-0">
          {feature.geoFeatureLabel || feature.type}
        </Badge>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{feature.address}</p>
      <div className="flex items-center justify-between">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleMapsClick}
            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 hover:underline transition-colors"
            aria-label={`View ${feature.name} on Google Maps`}
          >
            <MapPin className="w-3 h-3" />
            View on Google Maps
          </a>
        ) : (
          <span />
        )}
        {feature.distanceKm !== undefined && (
          <span className="text-[9px] text-slate-600 font-mono">
            {feature.distanceKm.toFixed(2)} km
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main LocationPage component
// ---------------------------------------------------------------------------

export const LocationPage: React.FC = () => {
  const { user } = useAuth()

  // Location search inputs
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(businessCategories[0])
  const [customSector, setCustomSector] = useState('')
  const [customSectorError, setCustomSectorError] = useState<string | null>(null)

  // Results state — split businesses from geographic features
  const [territory, setTerritory] = useState<TerritoryIntelligence | null>(null)
  const [businesses, setBusinesses] = useState<RealCompetitorPOI[]>([])
  const [geographicFeatures, setGeographicFeatures] = useState<RealCompetitorPOI[]>([])
  const [competitorNotice, setCompetitorNotice] = useState<string | null>(null)
  const [discoveryMetrics, setDiscoveryMetrics] = useState<DiscoveryMetrics | null>(null)
  const [provenance, setProvenance] = useState<ProvenanceMetadata | null>(null)
  const [searchRadiusUsed, setSearchRadiusUsed] = useState<number | null>(null)
  const [showGeoFeatures, setShowGeoFeatures] = useState(false)

  // Disambiguation
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<LocationDisambiguationCandidate[]>([])
  const [showDisambiguation, setShowDisambiguation] = useState(false)

  // Loading & error state
  const [isSearching, setIsSearching] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Save analysis state
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null)

  /** The resolved effective sector: either the chosen category or the trimmed custom value. */
  const effectiveSector =
    selectedCategory === CUSTOM_SECTOR_SENTINEL ? customSector.trim() : selectedCategory

  const validateCustomSector = (): boolean => {
    if (selectedCategory !== CUSTOM_SECTOR_SENTINEL) return true
    if (!customSector.trim()) {
      setCustomSectorError('Please enter your business sector.')
      return false
    }
    setCustomSectorError(null)
    return true
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    if (!validateCustomSector()) return

    setIsSearching(true)
    setErrorMsg(null)
    setCompetitorNotice(null)
    setSaveSuccessNotice(null)
    setShowDisambiguation(false)
    setDisambiguationCandidates([])
    setShowGeoFeatures(false)

    const RADIUS_METERS = 2500

    const res = await realtimeIntelligenceService.evaluateLocationMarket(
      query.trim(),
      effectiveSector
    )

    setIsSearching(false)

    // Surface disambiguation candidates
    const terrCheck = await realtimeIntelligenceService.getTerritory(query.trim())
    if (terrCheck.disambiguationCandidates && terrCheck.disambiguationCandidates.length > 0) {
      setDisambiguationCandidates(terrCheck.disambiguationCandidates)
      setShowDisambiguation(true)
    }

    if (res.error && !res.territory) {
      setErrorMsg(res.error)
      setTerritory(null)
      setBusinesses([])
      setGeographicFeatures([])
      setDiscoveryMetrics(null)
      setProvenance(null)
    } else {
      setTerritory(res.territory)

      // Split all competitors into businesses vs. geographic features
      const allPOIs = res.competitors || []
      const bizList = allPOIs.filter((p) => !p.isGeographicFeature)
      const geoList = allPOIs.filter((p) => p.isGeographicFeature === true)

      setBusinesses(bizList)
      setGeographicFeatures(geoList)
      setCompetitorNotice(res.notice || null)
      setDiscoveryMetrics(res.discoveryMetrics || null)
      setSearchRadiusUsed(RADIUS_METERS)

      if (bizList.length > 0) {
        setProvenance(bizList[0].provenance)
      } else if (geoList.length > 0) {
        setProvenance(geoList[0].provenance)
      } else if (res.territory) {
        setProvenance(res.territory.provenance)
      }
    }
  }

  const handleSaveToDossier = async () => {
    if (!user || !territory || !provenance) return
    setIsSaving(true)
    setSaveSuccessNotice(null)

    const res = await realtimeIntelligenceService.saveAnalysis(user.id, {
      analysisType: 'location_competitors',
      title: `${effectiveSector} in ${territory.placeName}`,
      summary: `Identified ${businesses.length} active registered business establishment(s) via OpenStreetMap for ${effectiveSector}.`,
      evidencePayload: {
        territory: {
          placeName: territory.placeName,
          coordinates: territory.coordinates,
          context: territory.context,
        },
        sector: effectiveSector,
        customSector: selectedCategory === CUSTOM_SECTOR_SENTINEL ? customSector.trim() : undefined,
        searchRadiusMeters: searchRadiusUsed,
        businessCount: businesses.length,
        geographicFeatureCount: geographicFeatures.length,
        competitors: businesses.map((c) => ({
          name: c.name,
          address: c.address,
          coordinates: c.coordinates,
          osmId: c.osmId,
          relevance: c.relevance,
          sourceId: c.sourceId,
        })),
      },
      provenance,
    })

    setIsSaving(false)
    if (res.error) {
      setSaveSuccessNotice(res.error)
    } else {
      setSaveSuccessNotice('Analysis saved to your decision dossiers successfully.')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl font-bold text-white tracking-tight">Real-Time Location &amp; Market Intelligence</h1>
        <p className="text-xs text-slate-400">
          On-demand geographic geocoding and live registered competitor discovery. Grounded in empirical OpenStreetMap &amp; Mapbox data.
        </p>
      </div>

      <Card glass className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>Territory &amp; Competitor Discovery</CardTitle>
              <CardDescription>
                Retrieve real coordinates, commercial density, and live registered establishments
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Territory / City / District
                </label>
                <Input
                  placeholder="e.g. Austin, Texas or Seattle Downtown, WA"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Business Sector
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
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

            {/* Custom sector input — shown only when 'Others' is selected */}
            {selectedCategory === CUSTOM_SECTOR_SENTINEL && (
              <div>
                <Input
                  label="Enter your business sector *"
                  id="location-custom-sector"
                  placeholder="e.g. Pet Grooming, EV Charging Station, Wedding Photography"
                  value={customSector}
                  onChange={(e) => {
                    setCustomSector(e.target.value)
                    if (e.target.value.trim()) setCustomSectorError(null)
                  }}
                  error={customSectorError || undefined}
                  helperText="Describe your specific business type; used for targeted competitor discovery and analysis."
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSearching}
                icon={<Search className="w-4 h-4" />}
              >
                Search Live Territory &amp; Competitors
              </Button>
            </div>
          </form>

          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
          {saveSuccessNotice && <Alert variant="info" className="text-xs">{saveSuccessNotice}</Alert>}

          {/* Location Disambiguation Panel */}
          {showDisambiguation && disambiguationCandidates.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <ChevronDown className="w-4 h-4" />
                Other matching locations for &quot;{query}&quot;
              </div>
              <p className="text-[11px] text-amber-200/80">
                The result above is the closest match. These other places share a similar name — verify the correct one before proceeding:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {disambiguationCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-slate-900 border border-amber-800/30 text-xs flex flex-col gap-1"
                  >
                    <span className="font-semibold text-white">{c.shortName}</span>
                    <span className="text-slate-400 text-[11px]">{c.contextText || c.displayName}</span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      [{c.coordinates[0].toFixed(4)}, {c.coordinates[1].toFixed(4)}] • {c.placeType}
                    </span>
                    <Badge variant="neutral" className="text-[9px] w-fit">{c.source}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-400">
                If these are different places than your intended location, refine your search query (e.g. add the state or country).
              </p>
            </div>
          )}

          {/* Territory Result Card */}
          {territory && (
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-sm text-white">{territory.placeName}</h3>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Coordinates:{' '}
                      <a
                        href={buildGoogleMapsUrl({ coordinates: territory.coordinates }) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline font-mono transition-colors"
                        title="View territory center on Google Maps"
                      >
                        [{territory.coordinates[0].toFixed(5)}, {territory.coordinates[1].toFixed(5)}]
                      </a>
                    </span>
                    {searchRadiusUsed && (
                      <span>Search radius: <span className="text-slate-200">{(searchRadiusUsed / 1000).toFixed(1)} km</span></span>
                    )}
                    {territory.context.region && (
                      <span>State/Region: <span className="text-slate-200">{territory.context.region}</span></span>
                    )}
                    {territory.context.country && (
                      <span>Country: <span className="text-slate-200">{territory.context.country}</span></span>
                    )}
                    {territory.context.postcode && (
                      <span>Postal Zone: <span className="text-slate-200">{territory.context.postcode}</span></span>
                    )}
                    <span>
                      Sector: <span className="text-indigo-300 font-semibold">{effectiveSector}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{territory.placeType.join(', ')}</Badge>
                  {user && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveToDossier}
                      isLoading={isSaving}
                      icon={<Bookmark className="w-3.5 h-3.5" />}
                    >
                      Save Location Report
                    </Button>
                  )}
                </div>
              </div>

              {/* Multi-Source Discovery Breakdown HUD */}
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
                      Zero Synthetic Data • Genuine External APIs
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Mapbox</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawMapbox}</div>
                      <div className="text-[9px] text-slate-500">Live POIs</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Overpass</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawOsmOverpass}</div>
                      <div className="text-[9px] text-slate-500">Tag Registry</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Nominatim</div>
                      <div className="text-base font-bold text-white font-mono">{discoveryMetrics.rawOsmNominatim}</div>
                      <div className="text-[9px] text-slate-500">Viewbox Search</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-900/30 bg-amber-950/10">
                      <div className="text-[10px] text-amber-300">Deduped</div>
                      <div className="text-base font-bold text-amber-400 font-mono">-{discoveryMetrics.duplicatesMerged}</div>
                      <div className="text-[9px] text-amber-500/80">45m Proximity</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-blue-900/30 bg-blue-950/10">
                      <div className="text-[10px] text-blue-300">Businesses</div>
                      <div className="text-base font-bold text-blue-400 font-mono">{businesses.length}</div>
                      <div className="text-[9px] text-blue-500/80">Establishments</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/40 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-slate-400">Geo Features</div>
                      <div className="text-base font-bold text-slate-300 font-mono">{geographicFeatures.length}</div>
                      <div className="text-[9px] text-slate-600">Roads/Places</div>
                    </div>
                  </div>

                  {discoveryMetrics.failedQueries && discoveryMetrics.failedQueries.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Query Failovers: </span>
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

              {/* ── Live Registered Competitor Establishments ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Live Registered Competitor Establishments ({businesses.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500">Live query via Mapbox &amp; OpenStreetMap</span>
                </div>

                {competitorNotice && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
                      <Info className="w-4 h-4 text-amber-400" /> Empirical Observation
                    </div>
                    {competitorNotice}
                  </div>
                )}

                {businesses.length === 0 && !competitorNotice && (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-xs text-slate-400 text-center">
                    No matching business establishments found in the available open registry data for this location and sector.
                    {geographicFeatures.length > 0 && (
                      <span className="block mt-1 text-slate-500">
                        {geographicFeatures.length} geographic reference(s) found — see below.
                      </span>
                    )}
                    <span className="block mt-1">
                      This does not confirm an absence of local competitors — it reflects coverage limitations.
                      A physical ground survey is recommended.
                    </span>
                  </div>
                )}

                {businesses.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {businesses.map((biz) => (
                      <BusinessCard key={biz.id} biz={biz} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Places & Geographic References ── */}
              {geographicFeatures.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowGeoFeatures((v) => !v)}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors w-full text-left"
                    aria-expanded={showGeoFeatures}
                  >
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Places &amp; Geographic References ({geographicFeatures.length})
                    <ChevronDown
                      className={`w-3.5 h-3.5 ml-auto transition-transform ${showGeoFeatures ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showGeoFeatures && (
                    <>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        These records are geographic features (roads, localities, postcodes, administrative boundaries)
                        retrieved by the search — they are <strong className="text-slate-400">not counted as business competitors</strong>.
                        They are shown for context only.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {geographicFeatures.map((feat) => (
                          <GeoFeatureCard key={feat.id} feature={feat} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Data Provenance & Legal Transparency Banner */}
              {provenance && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Data Provenance &amp; Verification
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Genuine Real-Time Query
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px] text-slate-500">
                    <div>Source: <span className="text-slate-400">{provenance.source}</span></div>
                    <div>Retrieved: <span className="text-slate-400">{new Date(provenance.retrievedAt).toLocaleTimeString()}</span></div>
                    <div>License: <span className="text-slate-400">{provenance.attribution}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="p-5 border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Zero Synthetic Data Policy
        </div>
        <p className="leading-relaxed">
          VentureMind retrieves real registered business locations on-demand directly from geographic registries.
          Geographic features (roads, localities, postcodes) are clearly separated from business establishments
          and never counted as competitors. If a territory has zero registered establishments for a category,
          we report that fact honestly rather than generating synthetic competitors.
        </p>
      </Card>
    </div>
  )
}
