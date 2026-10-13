import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Sparkles, LayoutDashboard, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    const res = await signOut()
    if (res.success) {
      navigate('/')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-tight">VentureMind</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/60 uppercase tracking-widest">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">Decision Intelligence</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Platform
          </Link>
          <Link
            to="/about"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Architecture
          </Link>
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" icon={<LayoutDashboard className="w-4 h-4" />}>
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                icon={<LogOut className="w-4 h-4 text-slate-400" />}
                title="Sign out"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" size="sm" icon={<LogIn className="w-4 h-4" />}>
                  Sign In
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button variant="primary" size="sm" icon={<Sparkles className="w-4 h-4" />}>
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
