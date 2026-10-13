import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Shield,
  MapPin,
  TrendingUp,
  Cpu,
  Lock,
  Compass,
  CheckCircle2,
  BarChart3,
  Navigation,
  Zap,
  Globe,
  Database,
  GitBranch,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────────────────────────────────────
// Animated gradient orb background
// ─────────────────────────────────────────────────────────────────────────────
const HeroOrbs: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div
      className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
      style={{
        background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        animation: 'orb-drift 12s ease-in-out infinite alternate',
      }}
    />
    <div
      className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
      style={{
        background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
        animation: 'orb-drift 16s ease-in-out infinite alternate-reverse',
      }}
    />
    <div
      className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
      style={{
        background: 'radial-gradient(circle, #0891b2 0%, transparent 70%)',
        animation: 'orb-drift 20s ease-in-out infinite alternate',
      }}
    />
    {/* Subtle grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}
    />
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Verdict badge (animated)
// ─────────────────────────────────────────────────────────────────────────────
const VerdictBadge: React.FC<{ verdict: string; color: string; delay?: string }> = ({
  verdict,
  color,
  delay = '0s',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${color}`}
    style={{ animationDelay: delay, animation: 'fade-up 0.6s ease both' }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {verdict}
  </span>
)

// ─────────────────────────────────────────────────────────────────────────────
// Stat counter card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ value: string; label: string; icon: React.ReactNode; color: string }> = ({
  value,
  label,
  icon,
  color,
}) => (
  <div className="flex flex-col items-center gap-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm hover:border-slate-700 transition-colors">
    <div className={`mb-1 ${color}`}>{icon}</div>
    <span className="text-2xl font-black text-white tabular-nums">{value}</span>
    <span className="text-[11px] text-slate-500 text-center leading-snug">{label}</span>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Feature pillar card
// ─────────────────────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  tag: string
  tagColor: string
  delay?: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  iconBg,
  title,
  description,
  tag,
  tagColor,
  delay = '0s',
}) => (
  <div
    className="group relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm flex flex-col gap-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300"
    style={{ animationDelay: delay, animation: 'fade-up 0.6s ease both' }}
  >
    {/* Hover glow */}
    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at top left, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
      {icon}
    </div>

    <div className="flex-1">
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>

    <div className={`pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] font-semibold ${tagColor}`}>
      <CheckCircle2 className="w-3 h-3" />
      {tag}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Architecture pill
// ─────────────────────────────────────────────────────────────────────────────
const ArchPill: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors backdrop-blur-sm">
    <span className="text-indigo-400">{icon}</span>
    {label}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export const HomePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes orb-drift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .cta-pulse { animation: pulse-ring 2.5s ease-out infinite; }
        .section-fade { animation: fade-up 0.7s ease both; }
      `}</style>

      <div className="relative space-y-0">

        {/* ══════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
          <HeroOrbs />

          <div className="relative z-10 max-w-5xl mx-auto space-y-8 py-20">
            {/* Top badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 backdrop-blur-sm shadow-lg"
              style={{ animation: 'fade-up 0.4s ease both' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              VentureMind • Location &amp; Business Feasibility Platform
            </div>

            {/* H1 */}
            <h1
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08]"
              style={{ animation: 'fade-up 0.5s ease both' }}
            >
              AI Decision Intelligence{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 45%, #f472b6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                for Entrepreneurs
              </span>
            </h1>

            {/* Sub-headline */}
            <p
              className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
              style={{ animation: 'fade-up 0.55s ease both' }}
            >
              Find actual competitors on the map, calculate your financial runway, and get grounded strategy insights powered by Gemini AI.{' '}
              <strong className="text-slate-300">No fake businesses. No fabricated stats.</strong>
            </p>

            {/* Verdict badges (mock decision showcase) */}
            <div
              className="flex flex-wrap items-center justify-center gap-3"
              style={{ animation: 'fade-up 0.6s ease both' }}
            >
              <VerdictBadge verdict="RECOMMENDED" color="bg-emerald-950/60 text-emerald-300 border-emerald-700/50" delay="0.1s" />
              <VerdictBadge verdict="CONDITIONAL" color="bg-amber-950/60 text-amber-300 border-amber-700/50" delay="0.2s" />
              <VerdictBadge verdict="NOT RECOMMENDED" color="bg-red-950/50 text-red-300 border-red-800/50" delay="0.3s" />
              <VerdictBadge verdict="INSUFFICIENT DATA" color="bg-slate-900 text-slate-400 border-slate-700" delay="0.4s" />
            </div>

            {/* CTA buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animation: 'fade-up 0.65s ease both' }}
            >
              {user ? (
                <Link to="/dashboard">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="cta-pulse"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth/register">
                    <Button
                      variant="primary"
                      size="lg"
                      icon={<Sparkles className="w-4 h-4" />}
                      className="cta-pulse"
                    >
                      Start Free Analysis
                    </Button>
                  </Link>
                  <Link to="/auth/login">
                    <Button variant="secondary" size="lg" icon={<Lock className="w-4 h-4" />}>
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust bar */}
            <div
              className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500"
              style={{ animation: 'fade-up 0.7s ease both' }}
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" /> OpenStreetMap &amp; Mapbox POIs
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Zero Synthetic Data Guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Supabase Row-Level Security
              </span>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, #0a0d14)' }} />
        </section>

        {/* ══════════════════════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════════════════════ */}
        <section className="relative py-16 px-4 bg-slate-950/60 border-y border-slate-800/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                value="3"
                label="Live Data Sources per Query"
                icon={<Database className="w-5 h-5" />}
                color="text-indigo-400"
              />
              <StatCard
                value="0"
                label="Fabricated Businesses"
                icon={<Shield className="w-5 h-5" />}
                color="text-emerald-400"
              />
              <StatCard
                value="100"
                label="Evidence-Based Suitability Score"
                icon={<BarChart3 className="w-5 h-5" />}
                color="text-blue-400"
              />
              <StatCard
                value="RLS"
                label="Row-Level Security Enforced"
                icon={<Lock className="w-5 h-5" />}
                color="text-purple-400"
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FEATURE PILLARS
        ══════════════════════════════════════════════════════════ */}
        <section className="relative py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14 section-fade">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 mb-4">
                Platform Architecture
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                How VentureMind Helps You Decide
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Built from scratch to provide real market insight instead of vague chatbot advice
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <FeatureCard
                icon={<MapPin className="w-5 h-5 text-blue-400" />}
                iconBg="bg-blue-950/60 border border-blue-800/40"
                title="Location &amp; Competitor Search"
                description="Search neighborhoods by radius. We fetch real business records, compute accurate distances using the Haversine formula, and separate direct competitors from institutions like colleges and schools."
                tag="Live OpenStreetMap &amp; Mapbox data"
                tagColor="text-blue-400"
                delay="0.1s"
              />
              <FeatureCard
                icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                iconBg="bg-emerald-950/60 border border-emerald-800/40"
                title="Financial Runway Modeling"
                description="Calculate your monthly burn rate and runway in months using pure arithmetic. Test your assumptions with different revenue and cost scenarios before signing a lease."
                tag="Transparent mathematical formulas"
                tagColor="text-emerald-400"
                delay="0.2s"
              />
              <FeatureCard
                icon={<Cpu className="w-5 h-5 text-indigo-400" />}
                iconBg="bg-indigo-950/60 border border-indigo-800/40"
                title="Evidence-Grounded AI Analysis"
                description="Gemini 3.8 Flash receives the real competitor records, budget, and demographic parameters. It gives you realistic differentiation strategies and highlights what still needs a field survey."
                tag="Constrained by real evidence"
                tagColor="text-indigo-400"
                delay="0.3s"
              />
              <FeatureCard
                icon={<Shield className="w-5 h-5 text-purple-400" />}
                iconBg="bg-purple-950/60 border border-purple-800/40"
                title="Your Business Data Stays Yours"
                description="Every business workspace, financial model, and saved report is isolated using PostgreSQL Row-Level Security in Supabase. Your private plans are never exposed to other accounts."
                tag="Enterprise-grade privacy"
                tagColor="text-purple-400"
                delay="0.4s"
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            DECISION ENGINE SHOWCASE
        ══════════════════════════════════════════════════════════ */}
        <section className="relative py-24 px-4 overflow-hidden">
          {/* Background accent */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.07) 0%, transparent 65%)' }} />

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: copy */}
              <div className="space-y-6 section-fade">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                  <Zap className="w-3 h-3" /> New — Location Decision Engine
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Not just data.{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    A clear decision.
                  </span>
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  VentureMind doesn't stop at showing competitor counts. It scores your location across five evidence-based dimensions and gives you a clear verdict — with the reasoning behind it.
                </p>

                <ul className="space-y-3">
                  {[
                    { icon: <BarChart3 className="w-4 h-4 text-indigo-400" />, text: 'Competitive Pressure — density of direct rivals per km²' },
                    { icon: <Navigation className="w-4 h-4 text-blue-400" />, text: 'Market Demand Signal — indirect businesses as footfall proxies' },
                    { icon: <Database className="w-4 h-4 text-purple-400" />, text: 'Data Confidence — multi-source coverage quality score' },
                    { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, text: 'Financial Feasibility — runway from your own numbers' },
                    { icon: <Compass className="w-4 h-4 text-amber-400" />, text: 'Relative Advantage — compared against discovered alternatives' },
                  ].map(({ icon, text }, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-slate-300">
                      <span className="mt-0.5 shrink-0">{icon}</span>
                      {text}
                    </li>
                  ))}
                </ul>

                {!user && (
                  <Link to="/auth/register">
                    <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                      Try the Decision Engine
                    </Button>
                  </Link>
                )}
              </div>

              {/* Right: mock score card */}
              <div className="relative section-fade" style={{ animationDelay: '0.2s' }}>
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
                  {/* Verdict row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Location Verdict</p>
                        <p className="text-sm font-black text-emerald-300">RECOMMENDED</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">74</p>
                      <p className="text-[10px] text-slate-500">/ 100</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="space-y-3">
                    {[
                      { label: 'Competitive Pressure', score: 24, max: 30, color: 'bg-emerald-500' },
                      { label: 'Market Demand Signal', score: 18, max: 25, color: 'bg-blue-500' },
                      { label: 'Data Confidence', score: 16, max: 20, color: 'bg-indigo-500' },
                      { label: 'Financial Feasibility', score: 11, max: 15, color: 'bg-amber-500' },
                      { label: 'Relative Advantage', score: 5, max: 10, color: 'bg-purple-500' },
                    ].map(({ label, score, max, color }) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{label}</span>
                          <span className="text-white font-semibold tabular-nums">{score}/{max}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${(score / max) * 100}%`, transition: 'width 1s ease' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
                    Scoring based on retrieved open data only — no AI-generated statistics.
                  </p>
                </div>

                {/* Floating alternative badge */}
                <div className="absolute -bottom-4 -right-4 px-3 py-2 rounded-xl bg-purple-950/90 border border-purple-700/60 text-[11px] text-purple-300 font-semibold shadow-xl backdrop-blur-sm flex items-center gap-1.5">
                  <Navigation className="w-3 h-3" />
                  3 alternatives ranked
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            ARCHITECTURE PILLS
        ══════════════════════════════════════════════════════════ */}
        <section className="py-16 px-4 border-y border-slate-800/60 bg-slate-950/40">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform Architecture</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ArchPill icon={<Globe className="w-3.5 h-3.5" />} label="Mapbox Places API" />
              <ArchPill icon={<Compass className="w-3.5 h-3.5" />} label="OpenStreetMap Overpass" />
              <ArchPill icon={<Navigation className="w-3.5 h-3.5" />} label="Nominatim Geocoding" />
              <ArchPill icon={<Cpu className="w-3.5 h-3.5" />} label="Gemini 3.8 Flash AI" />
              <ArchPill icon={<Database className="w-3.5 h-3.5" />} label="Supabase + PostgreSQL" />
              <ArchPill icon={<GitBranch className="w-3.5 h-3.5" />} label="React + TypeScript + Vite" />
              <ArchPill icon={<Lock className="w-3.5 h-3.5" />} label="Row-Level Security (RLS)" />
              <ArchPill icon={<Shield className="w-3.5 h-3.5" />} label="Zero Synthetic Data Policy" />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECURITY CTA BANNER
        ══════════════════════════════════════════════════════════ */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div
              className="relative rounded-3xl overflow-hidden p-10 md:p-14 text-center space-y-6"
              style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.10) 50%, rgba(8,145,178,0.08) 100%)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              {/* Background shimmer */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top center, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />

              <div className="relative z-10 space-y-6">
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300">
                    <Lock className="w-3 h-3 text-indigo-400" /> Private &amp; Confidential
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300">
                    <Cpu className="w-3 h-3 text-purple-400" /> Evidence-Based AI
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Empirical Accuracy
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
                    Ready to make a{' '}
                    <span style={{
                      background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      grounded decision?
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                    AI-Powered Business Intelligence and Decision Support Platform for Entrepreneurs. Grounding decisions in real-time external evidence, deterministic calculations, and verified AI reasoning.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {user ? (
                    <Link to="/dashboard">
                      <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
                        Open Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/auth/register">
                        <Button variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
                          Create Free Account
                        </Button>
                      </Link>
                      <Link to="/auth/login">
                        <Button variant="secondary" size="lg">
                          Sign In
                        </Button>
                      </Link>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-slate-600">Enterprise Privacy · No data sold · Isolated per account</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
