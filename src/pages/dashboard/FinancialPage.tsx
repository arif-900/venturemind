import React, { useState, useEffect, useCallback } from 'react'
import { Calculator, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord } from '@/lib/validations/business'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export const FinancialPage: React.FC = () => {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessRequestRecord[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

  const [initialCapital, setInitialCapital] = useState<number>(50000)
  const [monthlyBurn, setMonthlyBurn] = useState<number>(4500)
  const [expectedMonthlyRevenue, setExpectedMonthlyRevenue] = useState<number>(1200)

  const loadBusinesses = useCallback(async () => {
    if (!user) return
    const res = await businessService.getBusinesses(user.id)
    if (res.data && res.data.length > 0) {
      setBusinesses(res.data)
      const firstWithBudget = res.data.find((b) => b.budget !== null && b.budget !== undefined)
      if (firstWithBudget) {
        setSelectedBusinessId(firstWithBudget.id)
        setInitialCapital(firstWithBudget.budget || 50000)
      }
    }
  }, [user])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  const handleSelectBusiness = (id: string) => {
    setSelectedBusinessId(id)
    const biz = businesses.find((b) => b.id === id)
    if (biz && biz.budget !== null && biz.budget !== undefined) {
      setInitialCapital(biz.budget)
    }
  }

  const netMonthlyBurn = monthlyBurn - expectedMonthlyRevenue
  const runwayMonths = netMonthlyBurn > 0 ? (initialCapital / netMonthlyBurn).toFixed(1) : 'Infinite (Profitable)'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl font-bold text-white tracking-tight">Financial Runway & Burn Rate Calculator</h1>
        <p className="text-xs text-slate-400">
          Calculate how many months your starting capital will last based on your estimated expenses and revenues.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Runway Forecast
          </span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-emerald-400">{runwayMonths}</span>
            <span className="text-xs text-slate-400 ml-1.5">
              {typeof runwayMonths === 'string' && runwayMonths.includes('Infinite') ? '' : 'Months'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Starting Capital ÷ Net Monthly Burn</p>
        </Card>

        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Monthly Burn
          </span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-rose-400">
              ${Math.max(0, netMonthlyBurn).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Expenses minus expected revenues</p>
        </Card>

        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Calculation Method
          </span>
          <div className="mt-2">
            <span className="text-sm font-semibold text-indigo-400">Exact Arithmetic</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Direct formula calculation</p>
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
                Sync with your saved business capital or model custom variables
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {businesses.length > 0 && (
            <div className="space-y-1.5 pb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Synchronize Capital From Saved Business
              </label>
              <select
                value={selectedBusinessId}
                onChange={(e) => handleSelectBusiness(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Custom Capital Entry</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.title} {biz.budget ? `($${biz.budget.toLocaleString()})` : '(No budget set)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Starting Capital ($)"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
              helperText="Validated cash reserve"
            />
            <Input
              label="Monthly Fixed Costs ($)"
              type="number"
              value={monthlyBurn}
              onChange={(e) => setMonthlyBurn(parseFloat(e.target.value) || 0)}
              helperText="Operating expenditures"
            />
            <Input
              label="Est. Monthly Revenue ($)"
              type="number"
              value={expectedMonthlyRevenue}
              onChange={(e) => setExpectedMonthlyRevenue(parseFloat(e.target.value) || 0)}
              helperText="Anticipated cash inflows"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-white">How This Is Calculated:</p>
            <p>
              Formula: <code className="text-indigo-300 font-mono">Runway = Capital ÷ (Fixed Expenses - Monthly Revenue)</code>
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              VentureMind calculates cash runway directly using the formula above. These numbers reflect your entered assumptions so you can plan for a realistic operational buffer before opening.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-5 border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          No Fabricated Projections
        </div>
        <p className="leading-relaxed">
          We never inject fabricated industry averages or fake profit margins. Every calculation is derived directly from your specified inputs.
        </p>
      </Card>
    </div>
  )
}
