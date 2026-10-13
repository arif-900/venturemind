import React, { useEffect, useState, useCallback } from 'react'
import { FileText, Clock, ShieldCheck, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  realtimeIntelligenceService,
  SavedAnalysisRecord,
} from '@/lib/services/realtimeIntelligenceService'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { GoogleMapsLink } from '@/components/ui/GoogleMapsLink'
import { buildGoogleMapsUrl } from '@/lib/services/realtimeIntelligenceService'

export const ReportsPage: React.FC = () => {
  const { user } = useAuth()
  const [reports, setReports] = useState<SavedAnalysisRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setErrorMsg(null)

    const res = await realtimeIntelligenceService.getSavedAnalyses(user.id)
    if (res.error) {
      // If table is not yet created, display informative message rather than failing
      setErrorMsg(res.error)
    } else {
      setReports(res.data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl font-bold text-white tracking-tight">Saved Location & Market Reports</h1>
        <p className="text-xs text-slate-400">
          Review your saved location analyses, competitor breakdowns, and AI decision summaries.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="info" title="Reports Storage Note" className="text-xs">
          {errorMsg}
        </Alert>
      )}

      <Card glass className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>Saved Reports & Analyses</CardTitle>
              <CardDescription>
                Saved location searches with verified competitor lists and timestamps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-white mb-1">No Saved Reports Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Run a location query on the Location Intelligence or AI Intelligence page, then click &quot;Save Location Report&quot; to keep your results here for future reference.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-white">{report.title}</h4>
                      <p className="text-xs text-slate-300 mt-0.5">{report.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {report.evidence_payload?.viabilityScore !== undefined && (
                        <Badge
                          variant={
                            report.evidence_payload.viabilityScore >= 70
                              ? 'success'
                              : report.evidence_payload.viabilityScore >= 50
                              ? 'warning'
                              : 'danger'
                          }
                          className="shrink-0 font-semibold"
                        >
                          Score: {report.evidence_payload.viabilityScore}/100
                        </Badge>
                      )}
                      <Badge variant="neutral" className="capitalize shrink-0">
                        {report.analysis_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {report.evidence_payload?.territory && (
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] pt-1 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <GoogleMapsLink
                        mode="address"
                        coordinates={report.evidence_payload.territory.coordinates}
                        address={report.evidence_payload.territory.placeName}
                        label={report.evidence_payload.territory.placeName}
                        className="text-slate-300"
                      />
                      {(report.evidence_payload.competitorCount !== undefined ||
                        report.evidence_payload.competitorsCount !== undefined) && (
                        <span className="text-slate-500">
                          • {report.evidence_payload.competitorCount ?? report.evidence_payload.competitorsCount} verified competitors
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Saved {new Date(report.created_at).toLocaleString()}
                    </span>
                    <span>
                      Provenance: {report.provenance?.source || 'OpenStreetMap & Mapbox'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="p-5 border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Evidence Provenance & Auditability
        </div>
        <p className="leading-relaxed">
          Every saved dossier records the origin API, query timestamp, and licensing attribution of external sources to provide full transparency for investor evaluations and internal diligence.
        </p>
      </Card>
    </div>
  )
}
