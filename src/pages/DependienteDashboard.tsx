import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import SyncStatusPill from '../components/SyncStatusPill'
import BusinessSwitcher from '../components/BusinessSwitcher'
import OpenShiftModal from '../components/OpenShiftModal'
import CuadreTable from '../components/CuadreTable'
import POSPage from './POSPage'
import type { Shift } from '../types'

type Tab = 'turno' | 'pos'

export default function DependienteDashboard() {
  const { user, business, signOut } = useAuthStore()
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [tab, setTab] = useState<Tab>('turno')

  const today = new Date().toISOString().split('T')[0]

  const { data: activeShifts = [] } = useQuery<Shift>(
    `SELECT * FROM shifts
     WHERE dependiente_id = ? AND date = ? AND status IN ('open', 'pending_review')
     ORDER BY opened_at DESC LIMIT 1`,
    [user?.id, today]
  )
  const activeShift = activeShifts[0] ?? null

  const { data: recentShifts = [] } = useQuery<Shift>(
    `SELECT * FROM shifts WHERE dependiente_id = ? ORDER BY date DESC, opened_at DESC LIMIT 5`,
    [user?.id]
  )

  return (
    <div className="min-h-svh bg-cream">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-ink truncate">{business?.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {new Date().toLocaleDateString('es-CU', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BusinessSwitcher />
          <SyncStatusPill />
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-ink transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="bg-card border-b border-border px-4 flex gap-1">
        {(['turno', 'pos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-terracotta text-terracotta'
                : 'border-transparent text-muted-foreground hover:text-ink'
            }`}
          >
            {t === 'turno' ? 'Mi Turno' : 'Ventas'}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-2xl mx-auto">
        {tab === 'turno' && (
          <div className="space-y-4">
            {activeShift?.notes && activeShift.status === 'open' && (
              <div className="bg-ember/10 border border-ember/30 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-ember">Nota del dueño:</p>
                <p className="text-sm text-ink/80 mt-1">{activeShift.notes}</p>
              </div>
            )}

            {!activeShift && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-16 h-16 bg-terracotta/10 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-ink text-lg">No hay turno abierto</p>
                  <p className="text-sm text-muted-foreground mt-1">Abre tu turno para comenzar el cuadre de hoy.</p>
                </div>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="bg-terracotta text-cream px-8 py-3 rounded-xl font-semibold text-sm hover:bg-ember transition-colors"
                >
                  Abrir turno →
                </button>
              </div>
            )}

            {activeShift && (
              <CuadreTable shiftId={activeShift.id} status={activeShift.status} date={activeShift.date} />
            )}

            {!activeShift && recentShifts.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Turnos recientes
                </p>
                <div className="space-y-2">
                  {recentShifts.map((s) => (
                    <div key={s.id} className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-ink">
                        {new Date(s.date + 'T12:00:00').toLocaleDateString('es-CU', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`tag text-[10px] ${
                        s.status === 'closed'
                          ? 'bg-moss/15 text-moss border-moss/30'
                          : s.status === 'pending_review'
                          ? 'bg-ember/15 text-ember border-ember/30'
                          : 'bg-terracotta/10 text-terracotta border-terracotta/30'
                      }`}>
                        {s.status === 'closed' ? 'Cerrado' : s.status === 'pending_review' ? 'Pendiente' : 'Abierto'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'pos' && <POSPage />}
      </main>

      {showOpenModal && <OpenShiftModal onClose={() => setShowOpenModal(false)} />}
    </div>
  )
}
