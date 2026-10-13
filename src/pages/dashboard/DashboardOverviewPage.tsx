import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  PlusCircle,
  MapPin,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord } from '@/lib/validations/business'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'

export const DashboardOverviewPage: React.FC = () => {
  const { user, profile } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessRequestRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setFetchError(null)

    const res = await businessService.getBusinesses(user.id)
    if (res.error) {
      setFetchError('Unable to load business workspaces at this time.')
    } else {
      setBusinesses(res.data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            VentureMind Decision Intelligence • Account: <span className="capitalize text-indigo-400">{profile?.role || 'Entrepreneur'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/business/new">
            <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              Create Business Request
            </Button>
          </Link>
        </div>
      </div>

      {fetchError && (
        <Alert variant="error" title="Notice">
          {fetchError}
        </Alert>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Businesses
            </span>
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-white">{businesses.length}</span>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Active business projects</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Draft Projects
            </span>
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {businesses.filter((b) => b.status === 'draft').length}
              </span>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Pending submission or review</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Submitted & Active
            </span>
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {businesses.filter((b) => b.status === 'submitted' || b.status === 'in_review').length}
              </span>
            )}
            <p className="text-[11px] text-slate-500 mt-1">In active evaluation</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Account Privacy
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-semibold text-emerald-400">Protected</span>
            <p className="text-[11px] text-slate-500 mt-1">Confidential & Isolated</p>
          </div>
        </Card>
      </div>

      {/* Main Business Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Your Business Requests</h2>
            <p className="text-xs text-slate-400">
              Manage your business concepts, target geographic parameters, and financial goals
            </p>
          </div>
          {businesses.length > 0 && (
            <Link to="/dashboard/business">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : businesses.length === 0 ? (
          /* Empty State - Clear and Actionable */
          <Card className="p-12 text-center border-dashed border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No business requests yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Create your first business request to begin evaluating market viability, location intelligence, and unit economics.
            </p>
            <Link to="/dashboard/business/new">
              <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
                Create Your First Business
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((biz) => (
              <Card
                key={biz.id}
                className="hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm text-white truncate">{biz.title}</h4>
                    <Badge variant={biz.status}>{biz.status}</Badge>
                  </div>
                  <p className="text-xs text-indigo-400 font-medium mb-2">{biz.business_category}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {biz.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Objective:</span>
                      <span className="text-slate-300 font-medium capitalize">
                        {biz.objective.replace('_', ' ')}
                      </span>
                    </div>
                    {biz.budget !== null && biz.budget !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Budget:</span>
                        <span className="text-slate-300 font-medium">
                          ${biz.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {biz.target_location && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Location:</span>
                        <span className="text-slate-300 font-medium truncate max-w-[150px]">
                          {biz.target_location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 rounded-b-xl flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Created {new Date(biz.created_at).toLocaleDateString()}
                  </span>
                  <Link to={`/dashboard/business/${biz.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300">
                      Open Workspace <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Intelligence Capabilities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
        <Card className="p-5 border-slate-800/80 bg-slate-900/40">
          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center mb-3">
            <MapPin className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Location Intelligence</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Search neighborhoods by radius, discover genuine competitors from OpenStreetMap & Mapbox, and view physical distances.
          </p>
          <div className="mt-3">
            <Link to="/dashboard/location" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
              Explore Module <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="p-5 border-slate-800/80 bg-slate-900/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">AI Intelligence</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Structured strategic analysis with verified data and market considerations grounded in evidence.
          </p>
          <div className="mt-3">
            <Link to="/dashboard/ai-intelligence" className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
              Explore Module <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="p-5 border-slate-800/80 bg-slate-900/40">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Financial Intelligence</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Calculate your operational runway in months, test revenue scenarios, and estimate net burn rate without guesswork.
          </p>
          <div className="mt-3">
            <Link to="/dashboard/financial" className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
              Explore Module <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
