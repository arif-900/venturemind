import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Briefcase,
  ArrowLeft,
  MapPin,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Pencil,
  X,
  Save,
  Compass,
  Building2,
  Clock,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calculator,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord, BusinessRequestInput, businessCategories, BUSINESS_OBJECTIVES, BUSINESS_STATUSES } from '@/lib/validations/business'
import { geminiService, GeminiAnalysisResult } from '@/lib/services/geminiService'
import {
  realtimeIntelligenceService,
  RealCompetitorPOI,
  TerritoryIntelligence,
  ProvenanceMetadata,
} from '@/lib/services/realtimeIntelligenceService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR, formatINRSafe, CURRENCY_LABEL } from '@/lib/currency'
import { GoogleMapsLink } from '@/components/ui/GoogleMapsLink'
import { buildGoogleMapsUrl } from '@/lib/services/realtimeIntelligenceService'

export const BusinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [business, setBusiness] = useState<BusinessRequestRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)

  // Sub-modules state
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'location' | 'financial'>('overview')

  // Real-time location & competitor intelligence state
  const [territory, setTerritory] = useState<TerritoryIntelligence | null>(null)
  const [competitors, setCompetitors] = useState<RealCompetitorPOI[]>([])
  const [locationNotice, setLocationNotice] = useState<string | null>(null)
  const [locationProvenance, setLocationProvenance] = useState<ProvenanceMetadata | null>(null)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // AI analysis state - user-triggered & grounded in real evidence
  const [aiAnalysis, setAiAnalysis] = useState<GeminiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Interactive Financial Modeling State — start empty, never inject demo values
  const [monthlyBurn, setMonthlyBurn] = useState<number | undefined>(undefined)
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | undefined>(undefined)

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<BusinessRequestInput>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  // Quick status change
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const loadBusiness = useCallback(async () => {
    if (!id || !user) return

    setIsLoading(true)
    setErrorMsg(null)
    setIsForbidden(false)

    const res = await businessService.getBusinessById(id, user.id)

    if (res.forbidden) {
      setIsForbidden(true)
      setErrorMsg('You do not have permission to view this business workspace.')
    } else if (res.error) {
      setErrorMsg(res.error)
    } else {
      setBusiness(res.data)
      // Auto-open edit modal if navigated with openEdit flag
      if ((location.state as any)?.openEdit && res.data) {
        setEditForm({
          title: res.data.title,
          business_category: res.data.business_category,
          description: res.data.description || '',
          budget: res.data.budget ?? undefined,
          target_location: res.data.target_location || '',
          objective: res.data.objective,
          status: res.data.status,
        })
        setIsEditOpen(true)
        // Clear location state so refreshing doesn't re-open
        navigate(location.pathname, { replace: true, state: {} })
      }
    }

    setIsLoading(false)
  }, [id, user])

  useEffect(() => {
    loadBusiness()
  }, [loadBusiness])

  // Real-time on-demand territory & competitor search
  const handleVerifyLocation = async () => {
    if (!business?.target_location) return
    setIsSearchingLocation(true)
    setLocationError(null)
    setLocationNotice(null)

    const res = await realtimeIntelligenceService.evaluateLocationMarket(
      business.target_location,
      business.business_category,
      business.title,
      business.description || undefined
    )

    setIsSearchingLocation(false)
    if (res.error && !res.territory) {
      setLocationError(res.error)
    } else {
      setTerritory(res.territory)
      setCompetitors(res.competitors)
      setLocationNotice(res.notice || null)
      if (res.competitors.length > 0) {
        setLocationProvenance(res.competitors[0].provenance)
      } else if (res.territory) {
        setLocationProvenance(res.territory.provenance)
      }
    }
  }

  // Real AI evaluation grounded in real-time verified evidence
  const handleRunAiAnalysis = async () => {
    if (!business) return
    setIsAnalyzing(true)
    setAiError(null)

    // Build genuine verified evidence payload with all retrieved competitors
    const verifiedEvidence = territory || competitors.length > 0
      ? {
          coordinates: territory?.coordinates,
          competitorCount: competitors.length,
          allCompetitorNames: competitors.map((c) => c.name),
          sampleCompetitors: competitors.map((c) => c.name),
          sources: locationProvenance?.source || 'Mapbox Search & OpenStreetMap Contributors',
          competitorsList: competitors.map((c) => ({
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
        }
      : undefined

    const res = await geminiService.generatePreliminaryAnalysis({
      businessTitle: business.title,
      category: business.business_category,
      objective: business.objective,
      budget: business.budget,
      targetLocation: business.target_location,
      verifiedEvidence,
    })

    setIsAnalyzing(false)
    if (res.data) {
      setAiAnalysis(res.data)
    } else {
      setAiError(res.error || 'Unable to generate analysis at this time. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!business || !user) return
    if (!window.confirm('Are you sure you want to delete this business request?')) return

    setIsDeleting(true)
    const res = await businessService.deleteBusiness(business.id, user.id)
    setIsDeleting(false)

    if (res.success) {
      navigate('/dashboard/business')
    } else {
      alert(res.error || 'Failed to delete business')
    }
  }

  const handleOpenEdit = () => {
    if (!business) return
    setEditForm({
      title: business.title,
      business_category: business.business_category,
      description: business.description || '',
      budget: business.budget ?? undefined,
      target_location: business.target_location || '',
      objective: business.objective,
      status: business.status,
    })
    setEditError(null)
    setEditSuccess(false)
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!business || !user) return
    if (!editForm.title?.trim()) {
      setEditError('Business title is required.')
      return
    }
    setIsSaving(true)
    setEditError(null)
    const res = await businessService.updateBusiness(business.id, editForm, user.id)
    setIsSaving(false)
    if (res.data) {
      setBusiness(res.data)
      setEditSuccess(true)
      setTimeout(() => {
        setIsEditOpen(false)
        setEditSuccess(false)
      }, 900)
    } else {
      setEditError(res.error || 'Failed to save changes.')
    }
  }

  const handleStatusChange = async (newStatus: typeof BUSINESS_STATUSES[number]) => {
    if (!business || !user || newStatus === business.status) return
    setIsChangingStatus(true)
    const res = await businessService.updateBusiness(business.id, { status: newStatus }, user.id)
    setIsChangingStatus(false)
    if (res.data) {
      setBusiness(res.data)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isForbidden) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8 border-rose-900/60 bg-rose-950/20">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto mb-6">
            You do not have permission to view this business workspace. Please verify you are signed in with the correct account.
          </p>
          <Link to="/dashboard">
            <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Return to Your Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (errorMsg || !business) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8 border-slate-800">
          <h2 className="text-lg font-bold text-white mb-2">Business Request Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">{errorMsg || 'The requested resource could not be found.'}</p>
          <Link to="/dashboard">
            <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Overview
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Financial deterministic runway math — only compute when all inputs are present
  const declaredCapital = business.budget ?? null
  const hasBurn = monthlyBurn !== undefined && !isNaN(monthlyBurn)
  const hasRevenue = monthlyRevenue !== undefined && !isNaN(monthlyRevenue)
  const netBurn = hasBurn && hasRevenue ? monthlyBurn! - monthlyRevenue! : null
  const runwayMonths =
    netBurn === null
      ? null
      : netBurn <= 0
      ? 'Infinite (Profitable)'
      : declaredCapital !== null
      ? (declaredCapital / netBurn).toFixed(1)
      : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/business">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Businesses
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{business.title}</h1>
              {/* Quick status changer */}
              <div className="relative flex items-center">
                {isChangingStatus && (
                  <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
                )}
                <select
                  value={business.status}
                  disabled={isChangingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as typeof BUSINESS_STATUSES[number])}
                  className={`appearance-none cursor-pointer text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-0.5 border transition-colors focus:outline-none disabled:opacity-60
                    ${ business.status === 'draft'      ? 'bg-slate-800 text-slate-300 border-slate-600'
                      : business.status === 'submitted'  ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : business.status === 'in_review'  ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : business.status === 'analyzed'   ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-red-950 text-red-300 border-red-800'
                    }`}
                >
                  {BUSINESS_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-indigo-400 font-medium mt-0.5">
              {business.business_category} • Objective: <span className="capitalize">{business.objective.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenEdit}
            icon={<Pencil className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> Project Overview
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'location'
              ? 'border-indigo-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" /> Location & Competitors
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'border-indigo-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Strategic Analysis
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'financial'
              ? 'border-indigo-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Financial Runway
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-slate-800">
            <CardHeader>
              <CardTitle>Concept Details</CardTitle>
              <CardDescription>Business plan details and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {business.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Target Location
                  </h4>
                  <div className="text-xs text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {business.target_location ? (
                      <GoogleMapsLink
                        mode="address"
                        address={business.target_location}
                        label={business.title}
                        className="text-slate-200"
                      />
                    ) : (
                      <span>Not specified</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Capital Allocation
                  </h4>
                  <p className="text-xs text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold text-sm">₹</span>
                    {formatINRSafe(business.budget, 'Unspecified')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm">Summary Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Identifier:</span>
                  <span className="font-mono text-[10px] text-slate-300 truncate max-w-[120px]">{business.id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Created:</span>
                  <span className="text-slate-300">{new Date(business.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Last Updated:</span>
                  <span className="text-slate-300">{new Date(business.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 border-indigo-900/60 bg-indigo-950/20">
              <h4 className="text-xs font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Workspace Status
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This business workspace is active and ready for real-time location evaluation, competitor discovery, and financial forecasting.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Location & Competitors Grounding */}
      {activeTab === 'location' && (
        <Card className="border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Real-Time Location & Market Intelligence</CardTitle>
                <CardDescription>
                  On-demand territory geocoding and live registered competitor discovery for: {business.target_location || 'Unspecified location'}
                </CardDescription>
              </div>
              {business.target_location && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleVerifyLocation}
                  isLoading={isSearchingLocation}
                  icon={<Compass className="w-4 h-4" />}
                >
                  {territory ? 'Refresh Live Intelligence' : 'Discover Territory & Competitors'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!business.target_location ? (
              <p className="text-xs text-slate-400">No target location specified for this business request.</p>
            ) : !territory && !isSearchingLocation ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white mb-1">Verify Territory & Nearby Businesses</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Retrieve genuine OpenStreetMap competitors and Mapbox territory parameters on-demand for {business.target_location}.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleVerifyLocation}
                  icon={<Compass className="w-4 h-4" />}
                >
                  Start Live Query
                </Button>
              </div>
            ) : isSearchingLocation ? (
              <div className="p-8 space-y-3">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Querying live external registries (Mapbox Geocoding & OpenStreetMap)...
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {locationError && <Alert variant="error">{locationError}</Alert>}

                {territory && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-sm text-white">{territory.placeName}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4">
                        <span>
                          Coordinates:{' '}
                          <a
                            href={buildGoogleMapsUrl({ coordinates: territory.coordinates }) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline font-mono transition-colors"
                            title="View territory center on Google Maps"
                          >
                            [{territory.coordinates[0].toFixed(4)}, {territory.coordinates[1].toFixed(4)}]
                          </a>
                        </span>
                        {territory.context.region && <span>Region: <span className="text-slate-200">{territory.context.region}</span></span>}
                        {territory.context.postcode && <span>Postcode: <span className="text-slate-200">{territory.context.postcode}</span></span>}
                      </div>
                    </div>
                    <Badge variant="neutral">{territory.placeType.join(', ')}</Badge>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Live Registered Competitors ({competitors.length})
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500">Live query via OpenStreetMap</span>
                  </div>

                  {locationNotice && (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                      <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
                        <Info className="w-4 h-4 text-amber-400" /> Empirical Observation
                      </div>
                      {locationNotice}
                    </div>
                  )}

                  {competitors.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {competitors.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-semibold text-white">{c.name}</span>
                              <Badge variant="neutral" className="capitalize text-[10px]">{c.type}</Badge>
                            </div>
                            {/* Address — clickable opens Google Maps */}
                            <div className="flex items-start gap-1.5 mb-2">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                              <GoogleMapsLink
                                mode="address"
                                coordinates={c.coordinates}
                                address={c.address}
                                label={c.name}
                                className="text-[11px] text-slate-300"
                              />
                            </div>
                          </div>
                          <div className="space-y-1 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Coords: [{c.coordinates[0].toFixed(4)}, {c.coordinates[1].toFixed(4)}]</span>
                              <span>{c.distanceKm !== undefined ? `${c.distanceKm.toFixed(2)} km away` : 'Within radius'}</span>
                            </div>
                            {/* View on Google Maps footer action */}
                            <GoogleMapsLink
                              coordinates={c.coordinates}
                              address={c.address}
                              label={c.name}
                              showDisabled
                            />
                            <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/40">
                              <span className="truncate max-w-[200px]" title={c.provenance.source}>
                                Source: <span className="text-slate-400">{c.provenance.source}</span>
                              </span>
                              <span>
                                Retrieved: <span className="text-slate-400">{new Date(c.provenance.retrievedAt).toLocaleTimeString()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {locationProvenance && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> Real Data Provenance
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                        Genuine Real-Time Query
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px] text-slate-500">
                      <div>Source: <span className="text-slate-400">{locationProvenance.source}</span></div>
                      <div>Retrieved: <span className="text-slate-400">{new Date(locationProvenance.retrievedAt).toLocaleTimeString()}</span></div>
                      <div>Attribution: <span className="text-slate-400">{locationProvenance.attribution}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Strategic Evaluation (AI Grounded in Real Data) */}
      {activeTab === 'ai' && (
        <Card className="border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evidence-Grounded Strategic Evaluation</CardTitle>
                <CardDescription>
                  AI reasoning grounded strictly in real retrieved competitor data and capital parameters.
                </CardDescription>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunAiAnalysis}
                isLoading={isAnalyzing}
                icon={<Sparkles className="w-4 h-4" />}
              >
                {aiAnalysis ? 'Update Analysis' : 'Run Grounded Analysis'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiError && <Alert variant="error">{aiError}</Alert>}

            {!aiAnalysis && !isAnalyzing && (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white mb-1">On-Demand Strategic Reasoning</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  {competitors.length > 0
                    ? `Ready to evaluate with ${competitors.length} live verified competitors and territory coordinates.`
                    : 'Analyze this concept based on declared parameters. (Tip: verify location first to ground analysis in live competitor presence).'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunAiAnalysis}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Generate Evaluation
                </Button>
              </div>
            )}

            {isAnalyzing && (
              <div className="p-8 space-y-3">
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  Reasoning over empirical parameters and synthesizing market evidence...
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-semibold text-white mb-1">Executive Summary</h4>
                  <p className="text-slate-300 leading-relaxed">{aiAnalysis.executiveSummary}</p>
                </div>

                {/* Verified Facts vs Estimates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiAnalysis.verifiedFacts && aiAnalysis.verifiedFacts.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Verified Real-Time Facts
                      </div>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        {aiAnalysis.verifiedFacts.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="font-semibold text-white">Strategic Considerations</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {aiAnalysis.keyConsiderations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Empirical Gaps & Missing Data Transparency */}
                {aiAnalysis.missingEvidenceGaps && aiAnalysis.missingEvidenceGaps.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <AlertTriangle className="w-4 h-4" /> Empirical Data Gaps & Unverified Factors
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The following data points could not be established via open public APIs and require field verification before committing capital:
                    </p>
                    <ul className="space-y-1 list-disc list-inside text-amber-200/90 text-[11px]">
                      {aiAnalysis.missingEvidenceGaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Provenance note */}
                <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-[10px] text-slate-500 flex items-center justify-between">
                  <span>
                    Generated: {new Date(aiAnalysis.timestamp).toLocaleTimeString()} • {aiAnalysis.provenanceNotes || 'Grounded in venture input & real-time external registries'}
                  </span>
                  <span className="text-indigo-400 font-mono">Viability Score: {aiAnalysis.estimatedViabilityScore}/100</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Interactive Financial Projections (Deterministic Formulas) */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Runway Forecast
              </span>
              <div className="mt-2">
                {runwayMonths !== null ? (
                  <>
                    <span className="text-3xl font-bold text-emerald-400">{runwayMonths}</span>
                    <span className="text-xs text-slate-400 ml-1.5">
                      {typeof runwayMonths === 'string' && runwayMonths.includes('Infinite') ? '' : 'Months'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500 italic">Enter burn &amp; revenue below</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Capital ÷ Net Monthly Burn</p>
            </Card>

            <Card className="p-5 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Net Monthly Burn
              </span>
              <div className="mt-2">
                {netBurn !== null ? (
                  <span className="text-3xl font-bold text-rose-400">
                    {formatINR(Math.max(0, netBurn))}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500 italic">—</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Expenses minus expected revenues</p>
            </Card>

            <Card className="p-5 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Declared Capital
              </span>
              <div className="mt-2">
                <span className="text-2xl font-bold text-white">
                  {formatINRSafe(declaredCapital, 'Not set')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">From business request record</p>
            </Card>
          </div>

          <Card glass className="border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle>Interactive Runway Modeling</CardTitle>
                  <CardDescription>
                    Adjust monthly burn assumptions to evaluate capital runway deterministically
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Monthly Fixed Costs / Expenses ({CURRENCY_LABEL})
                  </label>
                  <input
                    id="detail-monthly-burn"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 50,000"
                    value={monthlyBurn !== undefined ? monthlyBurn : ''}
                    onChange={(e) => setMonthlyBurn(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">Rent, software, salaries, utilities</p>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Expected Monthly Revenue ({CURRENCY_LABEL})
                  </label>
                  <input
                    id="detail-monthly-revenue"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 1,50,000"
                    value={monthlyRevenue !== undefined ? monthlyRevenue : ''}
                    onChange={(e) => setMonthlyRevenue(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">Initial projected monthly cash inflow</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-white">Deterministic Mathematical Provenance:</p>
                <p>
                  Formula: <code className="text-indigo-300 font-mono">Runway = Declared Capital ÷ (Monthly Expenses − Monthly Revenue)</code>
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Note: Declared capital ({formatINRSafe(declaredCapital, 'not set')}) is your saved project budget in ₹ INR.
                  Variable cost assumptions represent projection parameters, not historical audited records.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──────────── Edit Business Modal ──────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsEditOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Edit Business Idea</h2>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Business Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={editForm.title ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Chai Tapri Franchise"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Business Category
                </label>
                <select
                  value={editForm.business_category ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, business_category: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {businessCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Objective
                </label>
                <select
                  value={editForm.objective ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, objective: e.target.value as typeof BUSINESS_OBJECTIVES[number] }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {BUSINESS_OBJECTIVES.map((obj) => (
                    <option key={obj} value={obj}>{obj.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Starting Capital (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.budget !== undefined && editForm.budget !== null ? editForm.budget : ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      budget: e.target.value === '' ? undefined : parseFloat(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 5,00,000"
                />
              </div>

              {/* Target Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Location
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={editForm.target_location ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, target_location: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Pune, Maharashtra"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <textarea
                  maxLength={1000}
                  rows={4}
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Describe your business concept..."
                />
              </div>

              {/* Error / Success */}
              {editError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/60 px-3.5 py-2.5 text-xs text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/50 border border-emerald-800/60 px-3.5 py-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Changes saved successfully!
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || editSuccess}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
