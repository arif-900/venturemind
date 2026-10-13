import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  MapPin,
  Calculator,
  Shield,
  ArrowRight,
  GraduationCap,
  ExternalLink,
  Code2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-400 border border-indigo-800/60">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Final Year B.Tech Project • Computer Science & Engineering</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          About <span className="gradient-text">VentureMind</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          An engineering solution to help small business owners and founders evaluate locations, find real competitors, and assess financial feasibility using verified data.
        </p>
      </div>

      <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
        {/* Project Background */}
        <Card className="p-6 border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Why I Built This Project</h2>
            <Badge variant="analyzed">Problem Background</Badge>
          </div>
          <p>
            Many first-time entrepreneurs and small business owners invest their savings based on gut feeling or generic advice from standard AI chatbots. When asked for advice, regular AI models often invent fake store names, hallucinate customer traffic numbers, and ignore whether an area actually has the right customer base.
          </p>
          <p>
            At the same time, finding real local data is tedious. An entrepreneur opening a bank coaching center in a town like Nandyala or Hyderabad has to manually look up map markers, filter out irrelevant schools, estimate driving distances, and calculate how many months their capital will last before making a profit.
          </p>
          <p>
            <strong>VentureMind</strong> bridges this gap. It connects genuine map data from OpenStreetMap and Mapbox with deterministic financial math and Gemini AI reasoning, under a strict rule: <em>never fabricate competitors or market statistics</em>.
          </p>
        </Card>

        {/* How VentureMind Works */}
        <Card className="p-6 border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">How the System Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">1. Real Competitor Discovery</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Queries OpenStreetMap (via Nominatim) and Mapbox Places using a specified radius. Applies the Haversine formula to compute exact distances and classifies businesses into direct competitors, indirect feeder hubs (e.g., colleges), or unverified listings.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">2. Exact Financial Runway</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Computes net monthly burn and cash runway using straightforward mathematical formulas instead of statistical guesswork. Shows founders how many months their initial capital will support operations under different revenue scenarios.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">3. Grounded AI Strategy</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Passes the retrieved competitor records and location parameters into Gemini 3.8 Flash. The model is constrained to analyze only verified facts, provide competitor differentiation strategies, and highlight factors requiring on-ground verification.
              </p>
            </div>
          </div>
        </Card>

        {/* Technical Architecture */}
        <Card className="p-6 border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Technical Implementation & Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Frontend Framework</span>
              <p className="text-white font-semibold">React 19 + TypeScript + Vite</p>
              <p className="text-slate-500">Component-driven architecture with Mapbox GL JS for interactive maps.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Backend & Security</span>
              <p className="text-white font-semibold">Supabase (PostgreSQL + Auth + RLS)</p>
              <p className="text-slate-500">Row Level Security ensures users can only access their own business plans and reports.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">External Geospatial APIs</span>
              <p className="text-white font-semibold">OpenStreetMap (Nominatim) & Mapbox API</p>
              <p className="text-slate-500">Real-time geocoding, boundary queries, and Points of Interest (POIs) under ODbL license.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">AI Reasoning Engine</span>
              <p className="text-white font-semibold">Google Gemini 3.8 Flash</p>
              <p className="text-slate-500">Executed through a secure proxy and Edge Function with strict JSON schema validation.</p>
            </div>
          </div>
        </Card>

        {/* Academic Note */}
        <Card className="p-5 border-slate-800 bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Academic Integrity & Citation Notice</span>
          </div>
          <p className="text-[11px] text-slate-400">
            This project was developed for academic demonstration. All geographical data is sourced from OpenStreetMap contributors and Mapbox. In accordance with honest engineering practices, zero synthetic competitor names or market stats are ever generated when an API query returns empty.
          </p>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="text-center pt-2">
        <Link to="/auth/register">
          <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
            Create an Account & Start Analysis
          </Button>
        </Link>
      </div>
    </div>
  )
}
