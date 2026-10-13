import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <div className="w-6 h-6 rounded-lg bg-indigo-500 animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Verifying authenticated session...</p>
        <div className="w-64 max-w-full space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login preserving destination
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}
