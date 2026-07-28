import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PowerSyncContext } from '@powersync/react'
import { useAuthStore, DEMO_MODE } from './store/authStore'
import { db } from './lib/powersync'
import { seedDemoData } from './lib/demoSeed'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import DependienteDashboard from './pages/DependienteDashboard'
import BusinessPicker from './components/BusinessPicker'
import type { UserRole } from './types'

const ROLE_LABELS: Record<UserRole, string> = {
  owner:       'Dueño',
  supervisor:  'Supervisor',
  dependiente: 'Dependiente',
}

function DemoRoleSwitcher() {
  const { user, setDemoRole } = useAuthStore()
  if (!DEMO_MODE || !user) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-ink/90 backdrop-blur rounded-full px-3 py-1.5 shadow-lg">
      <span className="text-xs text-ink/40 font-mono mr-1 select-none">demo</span>
      {(['owner', 'supervisor', 'dependiente'] as UserRole[]).map((role) => (
        <button
          key={role}
          onClick={() => setDemoRole(role)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            user.role === role
              ? 'bg-terracotta text-white'
              : 'text-cream/70 hover:text-cream hover:bg-white/10'
          }`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  )
}

function DemoDataSeeder() {
  useEffect(() => {
    if (DEMO_MODE) seedDemoData()
  }, [])
  return null
}

function AppRoutes() {
  const { user, business, businesses, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-cream">
        <p className="text-muted-foreground text-sm font-mono">Cargando...</p>
      </div>
    )
  }

  // Real mode: user logged in but no active business selected (multi-business picker)
  if (!DEMO_MODE && user && !business && businesses.length > 1) {
    return <BusinessPicker />
  }

  const Dashboard = user?.role === 'dependiente'
    ? <DependienteDashboard />
    : <OwnerDashboard />

  return (
    <>
      <Routes>
        {DEMO_MODE ? (
          <>
            <Route path="*" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={Dashboard} />
          </>
        ) : (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />
            <Route
              path="/app"
              element={user ? Dashboard : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <DemoRoleSwitcher />
    </>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <PowerSyncContext.Provider value={db}>
      <DemoDataSeeder />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PowerSyncContext.Provider>
  )
}
