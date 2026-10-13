import React, { Suspense, lazy } from 'react'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Skeleton } from '@/components/ui/Skeleton'

// Eager load critical entry pages for sub-second LCP
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Lazy load non-critical pages to keep initial bundle size lean
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const DashboardOverviewPage = lazy(() =>
  import('@/pages/dashboard/DashboardOverviewPage').then((m) => ({ default: m.DashboardOverviewPage }))
)
const BusinessListPage = lazy(() =>
  import('@/pages/dashboard/BusinessListPage').then((m) => ({ default: m.BusinessListPage }))
)
const NewBusinessPage = lazy(() =>
  import('@/pages/dashboard/NewBusinessPage').then((m) => ({ default: m.NewBusinessPage }))
)
const BusinessDetailPage = lazy(() =>
  import('@/pages/dashboard/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage }))
)
const LocationPage = lazy(() =>
  import('@/pages/dashboard/LocationPage').then((m) => ({ default: m.LocationPage }))
)
const AiIntelligencePage = lazy(() =>
  import('@/pages/dashboard/AiIntelligencePage').then((m) => ({ default: m.AiIntelligencePage }))
)
const FinancialPage = lazy(() =>
  import('@/pages/dashboard/FinancialPage').then((m) => ({ default: m.FinancialPage }))
)
const ReportsPage = lazy(() =>
  import('@/pages/dashboard/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)
const ProfilePage = lazy(() =>
  import('@/pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)

// Public Layout Shell with Top Navbar and Footer
const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// Fallback skeleton loader during lazy route chunk loading
const PageLoader: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes with Shared Navbar & Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* Protected Authenticated Routes with Persistent Dashboard Shell */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverviewPage />} />
          <Route path="business" element={<BusinessListPage />} />
          <Route path="business/new" element={<NewBusinessPage />} />
          <Route path="business/:id" element={<BusinessDetailPage />} />
          <Route path="location" element={<LocationPage />} />
          <Route path="ai-intelligence" element={<AiIntelligencePage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 404 Catch-All: Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
