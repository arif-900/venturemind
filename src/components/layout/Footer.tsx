import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Sparkles, Terminal } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">VentureMind</span>
              <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                Decision Intelligence
              </span>
            </div>
            <p className="text-slate-400 text-xs max-w-md leading-relaxed">
              AI-Powered Business Intelligence and Decision Support Platform for Entrepreneurs.
              Grounding decisions in real-time external evidence, deterministic calculations, and verified AI reasoning.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Private & Confidential
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Evidence-Based AI
              </span>
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" /> Empirical Accuracy
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Overview</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About & Mission</Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Authentication</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
              </li>
              <li>
                <Link to="/auth/register" className="hover:text-white transition-colors">Register Account</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 VentureMind. Built for high-performance enterprise decision making.</p>
          <div className="flex items-center gap-6">
            <span>Enterprise Privacy</span>
            <span>Secure Cloud Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
