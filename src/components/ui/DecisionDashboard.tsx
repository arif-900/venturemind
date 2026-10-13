import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  MapPin,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Shield,
  BarChart3,
  Navigation,
  ExternalLink,
  Info,
  Zap,
} from 'lucide-react'
import type { LocationDecisionResult, DecisionVerdict, ScoreComponent } from '@/lib/services/locationDecisionService'
import { GoogleMapsLink } from './GoogleMapsLink'

interface DecisionDashboardProps {
  result: LocationDecisionResult
  locationName: string
  businessTitle: string
  sector: string
  onSelectAlternative?: (areaName: string, coords?: [number, number]) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict config
// ─────────────────────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<
  DecisionVerdict,
  {
    label: string
    icon: React.ReactNode
    bg: string
    border: string
    text: string
    ring: string
    badge: string
  }
> = {
  RECOMMENDED: {
    label: 'RECOMMENDED',
    icon: <CheckCircle2 className="w-6 h-6" />,
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/60',
    text: 'text-emerald-300',
    ring: '#10b981',
    badge: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
  },
  CONDITIONAL: {
    label: 'CONDITIONAL',
    icon: <AlertTriangle className="w-6 h-6" />,
    bg: 'bg-amber-950/40',
    border: 'border-amber-700/60',
    text: 'text-amber-300',
    ring: '#f59e0b',
    badge: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
  },
  NOT_RECOMMENDED: {
    label: 'NOT RECOMMENDED',
    icon: <XCircle className="w-6 h-6" />,
    bg: 'bg-red-950/40',
    border: 'border-red-700/60',
    text: 'text-red-300',
    ring: '#ef4444',
    badge: 'bg-red-900/60 text-red-300 border border-red-700/50',
  },
  INSUFFICIENT_DATA: {
    label: 'INSUFFICIENT DATA',
    icon: <HelpCircle className="w-6 h-6" />,
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/60',
    text: 'text-slate-300',
    ring: '#64748b',
    badge: 'bg-slate-800 text-slate-300 border border-slate-700',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Ring SVG
// ─────────────────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="100" height="100" className="transform -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Score bar
// ─────────────────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ component: ScoreComponent }> = ({ component }) => {
  const pct = (component.score / component.maxScore) * 100
  const [expanded, setExpanded] = useState(false)

  const barColor =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'

  const sourceColor: Record<string, string> = {
    retrieved: 'text-blue-400',
    calculated: 'text-purple-400',
    user_input: 'text-amber-400',
    missing: 'text-slate-500',
  }

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">{component.label}</span>
          <span className={`text-[10px] font-medium ${sourceColor[component.evidenceSource]}`}>
            [{component.evidenceSource.replace('_', ' ')}]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white tabular-nums">
            {component.score}<span className="text-slate-500 font-normal">/{component.maxScore}</span>
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Rationale (expandable) */}
      {expanded && (
        <p className="text-[11px] text-slate-400 leading-relaxed pl-0.5 pt-0.5 border-l-2 border-slate-700 pl-2">
          {component.rationale}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Alternative location card
// ─────────────────────────────────────────────────────────────────────────────

const AlternativeCard: React.FC<{
  alt: LocationDecisionResult['alternativeRankings'][number]
  rank: number
  selectedDirectCount: number
  onSelect?: (areaName: string, coords?: [number, number]) => void
}> = ({ alt, rank, selectedDirectCount, onSelect }) => {
  const isBetter = alt.directCount < selectedDirectCount
  const isWorse = alt.directCount > selectedDirectCount

  return (
    <div
      className={`p-4 rounded-xl border text-xs space-y-2 transition-colors ${
        isBetter
          ? 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700/60'
          : isWorse
          ? 'bg-red-950/10 border-red-900/30 hover:border-red-800/50'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
              isBetter
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                : isWorse
                ? 'bg-red-900/30 text-red-400 border border-red-800/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            #{rank}
          </span>
          <span className="font-semibold text-white text-sm leading-snug">{alt.areaName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
            title="Ranking score (higher = better alternative)"
          >
            Score: {alt.rankingScore}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span>
          <span className="text-amber-400 font-semibold">{alt.directCount}</span> direct
        </span>
        <span>
          <span className="text-blue-400 font-semibold">{alt.indirectCount}</span> indirect
        </span>
        {alt.distanceKm !== undefined && (
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {alt.distanceKm.toFixed(1)} km away
          </span>
        )}
      </div>

      {/* Advantage */}
      <p className={`text-[11px] leading-relaxed ${isBetter ? 'text-emerald-300/80' : isWorse ? 'text-red-300/70' : 'text-slate-400'}`}>
        {alt.advantage}
      </p>

      {/* Sample competitors */}
      {alt.sampleCompetitors.length > 0 && (
        <p className="text-[10px] text-slate-500">
          Businesses found: {alt.sampleCompetitors.slice(0, 3).join(', ')}
          {alt.sampleCompetitors.length > 3 && ` + ${alt.sampleCompetitors.length - 3} more`}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-800/60">
        {alt.mapsUrl && (
          <a
            href={alt.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            <MapPin className="w-3 h-3" />
            Google Maps
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {onSelect && (
          <button
            onClick={() => onSelect(alt.areaName, alt.coordinates)}
            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors ml-auto"
          >
            Analyse this area
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const DecisionDashboard: React.FC<DecisionDashboardProps> = ({
  result,
  locationName,
  businessTitle,
  sector,
  onSelectAlternative,
}) => {
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(true)
  const cfg = VERDICT_CONFIG[result.verdict]

  // Derived: how many direct competitors in selected location (from components)
  const altAdvComp = result.components.find((c) => c.label === 'Relative Location Advantage')
  const selectedDirectFromRationale = parseInt(
    altAdvComp?.rationale.match(/(\d+) direct competitor/)?.[1] ?? '0',
  )

  return (
    <div className="space-y-5">
      {/* ── Verdict Banner ────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Score ring */}
          <div className="relative shrink-0 flex items-center justify-center w-[100px] h-[100px]">
            <ScoreRing score={result.compositeScore} color={cfg.ring} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black tabular-nums ${cfg.text}`}>
                {result.compositeScore}
              </span>
              <span className="text-[9px] text-slate-500 font-medium">/ 100</span>
            </div>
          </div>

          {/* Verdict text */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`${cfg.text}`}>{cfg.icon}</span>
              <span className={`text-base font-black tracking-wider ${cfg.text}`}>
                {cfg.label}
              </span>
              <span className={`text-[10px] font-bold uppercase rounded-full px-2.5 py-0.5 ${cfg.badge}`}>
                Location Decision
              </span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {result.primaryReason}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
              <span>
                📍 <strong className="text-slate-300">{locationName}</strong>
              </span>
              <span>
                🏷 <strong className="text-slate-300">{sector}</strong>
              </span>
              <span>
                🕐 {new Date(result.computedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column grid: Score breakdown + Advantages/Risks ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Score Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Score Breakdown
            </h3>
            <span className="ml-auto text-[10px] text-slate-500">Click rows to expand</span>
          </div>
          <div className="space-y-4">
            {result.components.map((comp) => (
              <ScoreBar key={comp.label} component={comp} />
            ))}
          </div>
        </div>

        {/* Advantages + Risks */}
        <div className="space-y-4">
          {/* Advantages */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Advantages
              </h3>
            </div>
            <ul className="space-y-1.5">
              {result.advantages.map((adv, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  {adv}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/30 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-300">
                Key Risks
              </h3>
            </div>
            <ul className="space-y-1.5">
              {result.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Market Gaps ───────────────────────────────────────────────── */}
      {result.marketGaps.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/30 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Potential Market Gaps
            </h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.marketGaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/30"
              >
                <Zap className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Ranked Alternative Locations ──────────────────────────────── */}
      {result.alternativeRankings.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowAlternatives((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Alternative Location Rankings ({result.alternativeRankings.length})
              </h3>
            </div>
            {showAlternatives ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAlternatives && (
            <div className="px-5 pb-5 space-y-3">
              <p className="text-[11px] text-slate-400">
                Ranked by composite score (lower competition pressure + higher demand signal = better).
                Click <em>Analyse this area</em> to re-run the decision engine for that location.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.alternativeRankings.map((alt, i) => (
                  <AlternativeCard
                    key={alt.areaName + i}
                    alt={alt}
                    rank={i + 1}
                    selectedDirectCount={selectedDirectFromRationale}
                    onSelect={onSelectAlternative}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actionable Next Steps ─────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Actionable Next Steps
          </h3>
        </div>
        <ol className="space-y-2">
          {result.actionableNextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-[11px] text-slate-300 leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-[9px] font-bold text-indigo-300 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Assumptions & Evidence Sources (collapsible) ──────────────── */}
      <div className="rounded-xl border border-slate-800/60 overflow-hidden">
        <button
          onClick={() => setShowAssumptions((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400">
              Scoring Assumptions & Evidence Sources
            </span>
          </div>
          {showAssumptions ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {showAssumptions && (
          <div className="px-5 pb-5 pt-2 space-y-4 bg-slate-950/40">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                User-Provided Assumptions
              </p>
              <ul className="space-y-1">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-amber-200/70 flex items-start gap-1.5">
                    <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-500/60" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Evidence Sources
              </p>
              <div className="flex flex-wrap gap-2">
                {result.evidenceSources.map((src, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Scoring Methodology
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Composite score = Competitive Pressure (30) + Market Demand Signal (25) + Data Confidence (20) + Financial Feasibility (15) + Relative Location Advantage (10).
                All components derived from retrieved open data or user inputs. No AI-generated market statistics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
