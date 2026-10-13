import React from 'react'
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
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export const HomePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-400 border border-indigo-800/60 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>VentureMind • Location & Business Feasibility Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Evaluate Business Locations & Competitors with <span className="gradient-text">Real Data</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Find actual competitors on the map, calculate your financial runway, and get grounded strategy insights powered by Gemini AI. No fake businesses, no fabricated stats.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {user ? (
            <Link to="/dashboard">
              <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth/register">
                <Button variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
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

        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" /> OpenStreetMap & Mapbox POIs
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Zero Synthetic Data Guarantee
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" /> Supabase Row-Level Security
          </span>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How VentureMind Helps You Decide
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Built from scratch to provide real market insight instead of vague chatbot advice
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card glass className="p-6 border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Location & Competitor Search</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Search neighborhoods by radius. We fetch real business records, compute accurate distances using the Haversine formula, and separate direct competitors from institutions like colleges and schools.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Live OpenStreetMap & Mapbox data
            </div>
          </Card>

          <Card glass className="p-6 border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Financial Runway Modeling</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculate your monthly burn rate and runway in months using pure arithmetic. Test your assumptions with different revenue and cost scenarios before signing a lease.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Transparent mathematical formulas
            </div>
          </Card>

          <Card glass className="p-6 border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Evidence-Grounded AI Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini 3.8 Flash receives the real competitor records, budget, and demographic parameters. It gives you realistic differentiation strategies and highlights what still needs a field survey.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Constrained by real evidence
            </div>
          </Card>
        </div>
      </section>

      {/* Security & Privacy Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">Your Business Data Stays Yours</h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Every business workspace, financial model, and saved report is isolated using PostgreSQL Row-Level Security in Supabase. Your private plans are never exposed to other accounts.
            </p>
          </div>
          <Link to="/auth/register" className="shrink-0">
            <Button variant="primary" size="md">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
