import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PowerSyncContext } from '@powersync/react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from './store/authStore'
import { db, connectPowerSync, disconnectPowerSync } from './lib/powersync'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import DependienteDashboard from './pages/DependienteDashboard'
import OnboardingWizard from './pages/OnboardingWizard'

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)

  const { data: rates = [], isLoading } = useQuery<{ id: string }>(
    `SELECT id FROM exchange_rates WHERE business_id = ? LIMIT 1`,
    [user?.business_id]
  )

  const showOnboarding =
    !dismissed &&
    !isLoading &&
    user?.role === 'owner' &&
    rates.length === 0

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setDismissed(true)} />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, initialized } = useAuthStore()

  useEffect(() => {
    if (user) {
      connectPowerSync()
    } else {
      disconnectPowerSync()
    }
  }, [user])

  if (!initialized) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-cream">
        <p className="text-muted-foreground text-sm font-mono">Cargando...</p>
      </div>
    )
  }

  const Dashboard = user
    ? (user.role === 'owner' || user.role === 'supervisor' ? <OwnerDashboard /> : <DependienteDashboard />)
    : null

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />

      {/* Protected */}
      <Route
        path="/app"
        element={
          user
            ? <OnboardingGate>{Dashboard}</OnboardingGate>
            : <Navigate to="/login" replace />
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <PowerSyncContext.Provider value={db}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PowerSyncContext.Provider>
  )
}
