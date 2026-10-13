import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, PlusCircle, ArrowRight, Search, Filter } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord } from '@/lib/validations/business'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

export const BusinessListPage: React.FC = () => {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessRequestRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const res = await businessService.getBusinesses(user.id)
    if (res.data) {
      setBusinesses(res.data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = businesses.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.business_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.target_location && b.target_location.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">My Businesses</h1>
          <p className="text-xs text-slate-400">
            All business ventures and intelligence workspaces registered under your account
          </p>
        </div>
        <Link to="/dashboard/business/new">
          <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
            New Business Request
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, industry, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="analyzed">Analyzed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-800">
          <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400">
            {businesses.length === 0 ? 'No businesses found. Create your first request.' : 'No matching businesses found.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((biz) => (
            <Card
              key={biz.id}
              className="p-5 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-white">{biz.title}</h3>
                  <Badge variant={biz.status}>{biz.status}</Badge>
                </div>
                <p className="text-xs text-indigo-400">{biz.business_category}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Objective: <strong className="text-slate-300 capitalize">{biz.objective.replace('_', ' ')}</strong></span>
                  {biz.budget && <span>Budget: <strong className="text-slate-300">${biz.budget.toLocaleString()}</strong></span>}
                  {biz.target_location && <span>Location: <strong className="text-slate-300">{biz.target_location}</strong></span>}
                </div>
              </div>

              <div className="shrink-0">
                <Link to={`/dashboard/business/${biz.id}`}>
                  <Button variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open Workspace
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
