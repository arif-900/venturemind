import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  MapPin,
  Sparkles,
  TrendingUp,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

export const DashboardLayout: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const res = await signOut()
    if (res.success) {
      // Mandatory sign-out behavior: redirect to '/'
      navigate('/')
    }
  }

  const navItems = [
    { name: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
    { name: 'My Businesses', to: '/dashboard/business', icon: Briefcase },
    { name: 'Location Intelligence', to: '/dashboard/location', icon: MapPin },
    { name: 'AI Intelligence', to: '/dashboard/ai-intelligence', icon: Sparkles },
    { name: 'Financial Model', to: '/dashboard/financial', icon: TrendingUp },
    { name: 'Reports', to: '/dashboard/reports', icon: FileText },
    { name: 'Profile & Settings', to: '/dashboard/profile', icon: User },
  ]

  // Breadcrumb helper
  const getBreadcrumbTitle = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Overview'
    if (path === '/dashboard/business/new') return 'New Business Request'
    if (path.startsWith('/dashboard/business/')) return 'Business Workspace'
    if (path === '/dashboard/business') return 'My Businesses'
    if (path === '/dashboard/location') return 'Location Intelligence'
    if (path === '/dashboard/ai-intelligence') return 'AI Business Intelligence'
    if (path === '/dashboard/financial') return 'Financial Intelligence'
    if (path === '/dashboard/reports') return 'Reports'
    if (path === '/dashboard/profile') return 'Profile'
    return 'Dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-sm">
            VM
          </div>
          <span className="font-bold text-white tracking-tight">VentureMind</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Persistent Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              VM
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight">VentureMind</span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> Enterprise Workspace
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action: New Business Request */}
        <div className="p-4">
          <Link
            to="/dashboard/business/new"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs tracking-wide shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Business Request
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-indigo-300">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
            icon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Persistent Application Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header / Breadcrumb */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/dashboard" className="hover:text-slate-200">
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">{getBreadcrumbTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated Session
            </span>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
