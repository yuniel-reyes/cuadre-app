import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import SyncStatusPill from '../components/SyncStatusPill'
import DashboardPage from './DashboardPage'
import ShiftsPage from './ShiftsPage'
import POSPage from './POSPage'
import ProductsPage from './ProductsPage'
import ReportsPage from './ReportsPage'
import UserManagementPage from './UserManagementPage'
import ExchangeRatesPage from './ExchangeRatesPage'

type Tab = 'inicio' | 'turnos' | 'pos' | 'productos' | 'reportes' | 'usuarios' | 'tasas'

const TAB_LABELS: Record<Tab, string> = {
  inicio:    'Inicio',
  turnos:    'Turnos',
  pos:       'Ventas',
  productos: 'Productos',
  reportes:  'Reportes',
  usuarios:  'Usuarios',
  tasas:     'Tasas',
}

const OWNER_TABS: Tab[]      = ['inicio', 'turnos', 'pos', 'productos', 'reportes', 'usuarios', 'tasas']
const SUPERVISOR_TABS: Tab[] = ['inicio', 'turnos', 'pos', 'reportes']

export default function OwnerDashboard() {
  const { user, business, signOut } = useAuthStore()
  const [tab, setTab] = useState<Tab>('inicio')

  const visibleTabs = user?.role === 'owner' ? OWNER_TABS : SUPERVISOR_TABS

  return (
    <div className="min-h-svh bg-cream">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-ink truncate">{business?.name}</h1>
          <p className="text-xs text-muted-foreground capitalize font-mono">{business?.type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncStatusPill />
          <span className="text-sm text-ink/60 hidden sm:block">{user?.name}</span>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-ink transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="bg-card border-b border-border px-2 flex gap-0.5 overflow-x-auto scrollbar-none">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              tab === t
                ? 'border-terracotta text-terracotta'
                : 'border-transparent text-muted-foreground hover:text-ink'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-2xl mx-auto">
        {tab === 'inicio'    && <DashboardPage />}
        {tab === 'turnos'    && <ShiftsPage />}
        {tab === 'pos'       && <POSPage />}
        {tab === 'productos' && <ProductsPage />}
        {tab === 'reportes'  && <ReportsPage />}
        {tab === 'usuarios'  && <UserManagementPage />}
        {tab === 'tasas'     && <ExchangeRatesPage />}
      </main>
    </div>
  )
}
