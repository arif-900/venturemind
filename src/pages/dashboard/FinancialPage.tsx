import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Calculator, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { businessService } from '@/lib/services/businessService'
import { BusinessRequestRecord } from '@/lib/validations/business'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { formatINR, formatINRSafe, CURRENCY_SYMBOL, CURRENCY_LABEL } from '@/lib/currency'

export const FinancialPage: React.FC = () => {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessRequestRecord[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

  /**
   * Financial inputs — all start as `undefined` (no value) so we never silently
   * show a fabricated amount. Each is only populated from:
   *   (a) a saved business's actual `budget` field, or
   *   (b) explicit user key-strokes in the number input.
   */
  const [initialCapital, setInitialCapital] = useState<number | undefined>(undefined)
  const [monthlyBurn, setMonthlyBurn] = useState<number | undefined>(undefined)
  const [expectedMonthlyRevenue, setExpectedMonthlyRevenue] = useState<number | undefined>(undefined)

  /**
   * Track whether the user has manually edited capital after selecting a business.
   * If they have, switching away to "Custom" won't clear their typed value.
   */
  const userEditedCapital = useRef(false)

  const loadBusinesses = useCallback(async () => {
    if (!user) return
    const res = await businessService.getBusinesses(user.id)
    if (res.data && res.data.length > 0) {
      setBusinesses(res.data)
      // Do NOT auto-select a business or pre-fill any values on load.
      // The user must explicitly choose a business to sync from.
    }
  }, [user])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  /**
   * When the user picks a business from the dropdown:
   * - Populate Starting Capital from the actual saved `budget` (may be null/undefined → leave empty).
   * - Do NOT touch monthlyBurn or expectedMonthlyRevenue — those are never stored per-business.
   * - If the user switches back to "Custom Capital Entry", clear the synced capital so the
   *   field is empty and the user must enter their own value.
   */
  const handleSelectBusiness = (id: string) => {
    setSelectedBusinessId(id)
    userEditedCapital.current = false

    if (!id) {
      // User chose "Custom Capital Entry" — clear the capital field so they enter their own
      setInitialCapital(undefined)
      return
    }

    const biz = businesses.find((b) => b.id === id)
    if (biz) {
      // Use saved budget. If it is null/undefined, show empty — never substitute a fake amount.
      setInitialCapital(
        biz.budget !== null && biz.budget !== undefined && !isNaN(biz.budget)
          ? biz.budget
          : undefined
      )
    }
  }

  // Compute runway only when all three inputs have actual values
  const hasCapital = initialCapital !== undefined && !isNaN(initialCapital)
  const hasBurn = monthlyBurn !== undefined && !isNaN(monthlyBurn)
  const hasRevenue = expectedMonthlyRevenue !== undefined && !isNaN(expectedMonthlyRevenue)
  const allInputsPresent = hasCapital && hasBurn && hasRevenue

  const netMonthlyBurn = allInputsPresent ? (monthlyBurn! - expectedMonthlyRevenue!) : null
  const runwayResult: string | null = (() => {
    if (!allInputsPresent) return null
    if (netMonthlyBurn! <= 0) return 'Infinite (Profitable)'
    return (initialCapital! / netMonthlyBurn!).toFixed(1)
  })()

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl font-bold text-white tracking-tight">Financial Runway &amp; Burn Rate Calculator</h1>
        <p className="text-xs text-slate-400">
          Calculate how many months your starting capital will last based on your estimated expenses and revenues.
          Enter your actual figures — no demo values are pre-filled.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Runway Forecast
          </span>
          <div className="mt-2">
            {runwayResult !== null ? (
              <>
                <span className="text-3xl font-bold text-emerald-400">{runwayResult}</span>
                <span className="text-xs text-slate-400 ml-1.5">
                  {runwayResult.includes('Infinite') ? '' : 'Months'}
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500 italic">Enter all three values below</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Starting Capital ÷ Net Monthly Burn</p>
        </Card>

        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Monthly Burn
          </span>
          <div className="mt-2">
            {allInputsPresent ? (
              <span className="text-3xl font-bold text-rose-400">
                {formatINR(Math.max(0, netMonthlyBurn!))}
              </span>
            ) : (
              <span className="text-sm text-slate-500 italic">—</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Expenses minus expected revenues</p>
        </Card>

        <Card className="p-5 border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Starting Capital
          </span>
          <div className="mt-2">
            {hasCapital ? (
              <span className="text-2xl font-bold text-white">
                {formatINR(initialCapital!)}
              </span>
            ) : (
              <span className="text-sm text-slate-500 italic">Not entered</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {selectedBusiness ? `From: ${selectedBusiness.title}` : 'Manually entered'}
          </p>
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
                Sync with your saved business capital or enter custom variables
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business selector — only shown when the user has saved businesses */}
          {businesses.length > 0 && (
            <div className="space-y-1.5 pb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Sync Starting Capital From Saved Business
              </label>
              <select
                value={selectedBusinessId}
                onChange={(e) => handleSelectBusiness(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Custom Capital Entry (Enter manually below)</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.title}
                    {biz.budget !== null && biz.budget !== undefined
                      ? ` — Saved capital: ${CURRENCY_SYMBOL}${new Intl.NumberFormat('en-IN').format(biz.budget)}`
                      : ' — No capital saved'}
                  </option>
                ))}
              </select>
              {selectedBusinessId && selectedBusiness && (
                selectedBusiness.budget === null || selectedBusiness.budget === undefined ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{selectedBusiness.title}</strong> has no saved starting capital. Please enter
                      the Starting Capital manually in the field below.
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Starting Capital ({CURRENCY_LABEL})
              </label>
              <input
                id="financial-starting-capital"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 5,00,000"
                value={initialCapital !== undefined ? initialCapital : ''}
                onChange={(e) => {
                  userEditedCapital.current = true
                  const val = e.target.value
                  setInitialCapital(val === '' ? undefined : parseFloat(val))
                }}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500">
                Your declared cash reserve{selectedBusiness?.budget !== undefined && selectedBusiness?.budget !== null ? ' (synced from saved business)' : ''}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Monthly Fixed Costs ({CURRENCY_LABEL})
              </label>
              <input
                id="financial-monthly-burn"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50,000"
                value={monthlyBurn !== undefined ? monthlyBurn : ''}
                onChange={(e) => {
                  const val = e.target.value
                  setMonthlyBurn(val === '' ? undefined : parseFloat(val))
                }}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500">Operating expenditures (rent, salaries, utilities)</p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Est. Monthly Revenue ({CURRENCY_LABEL})
              </label>
              <input
                id="financial-monthly-revenue"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1,50,000"
                value={expectedMonthlyRevenue !== undefined ? expectedMonthlyRevenue : ''}
                onChange={(e) => {
                  const val = e.target.value
                  setExpectedMonthlyRevenue(val === '' ? undefined : parseFloat(val))
                }}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500">Anticipated cash inflows</p>
            </div>
          </div>

          {!allInputsPresent && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 italic">
              <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              Enter all three values above to compute runway.
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-white">How This Is Calculated:</p>
            <p>
              Formula:{' '}
              <code className="text-indigo-300 font-mono">Runway = Capital ÷ (Fixed Expenses − Monthly Revenue)</code>
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Enter all amounts in <strong className="text-slate-400">Indian Rupees (₹ INR)</strong>. The formula is
              purely arithmetic — it works with the numbers you enter. Do not mix currencies across fields.
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
          We never inject fabricated industry averages, demo amounts, or fake profit margins. Every
          calculation is derived directly from the values you type. All fields start empty — enter
          your real figures only.
        </p>
      </Card>
    </div>
  )
}
