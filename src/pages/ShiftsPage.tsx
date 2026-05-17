import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import ShiftReviewModal from '../components/ShiftReviewModal'

interface ShiftRow {
  id: string
  date: string
  status: string
  dependiente_name: string
  opened_at: string
  closed_at: string | null
  total_discrepancy: number | null
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  open:           { label: 'Abierto',   cls: 'bg-terracotta/10 text-terracotta border-terracotta/30' },
  pending_review: { label: 'Pendiente', cls: 'bg-ember/10 text-ember border-ember/30' },
  closed:         { label: 'Cerrado',   cls: 'bg-moss/10 text-moss border-moss/30' },
}

export default function ShiftsPage() {
  const { user } = useAuthStore()
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)

  const { data: shifts = [] } = useQuery<ShiftRow>(
    `SELECT s.id, s.date, s.status, s.opened_at, s.closed_at,
            u.name as dependiente_name,
            SUM(ci.discrepancy) as total_discrepancy
     FROM shifts s
     JOIN users u ON u.id = s.dependiente_id
     LEFT JOIN cuadre_items ci ON ci.shift_id = s.id
     WHERE s.business_id = ?
     GROUP BY s.id
     ORDER BY s.date DESC, s.opened_at DESC`,
    [user?.business_id]
  )

  const selected = shifts.find((s) => s.id === selectedShiftId) ?? null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-ink">Turnos</h2>
        <span className="text-xs text-muted-foreground font-mono">{shifts.length} total</span>
      </div>

      {shifts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay turnos aún.</p>
      )}

      {shifts.map((shift) => {
        const { label, cls } = STATUS_STYLE[shift.status] ?? STATUS_STYLE.open
        const hasDiff = shift.total_discrepancy != null && Math.abs(shift.total_discrepancy) > 0.01
        const isPending = shift.status === 'pending_review'

        return (
          <button
            key={shift.id}
            onClick={() => setSelectedShiftId(shift.id)}
            className={`w-full bg-card border rounded-xl p-3 text-left flex items-center gap-3 hover:border-terracotta/30 transition-colors ${
              isPending ? 'border-ember/40' : 'border-border'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-ink">
                  {new Date(shift.date + 'T12:00:00').toLocaleDateString('es-CU', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </span>
                <span className={`tag text-[10px] ${cls}`}>{label}</span>
                {hasDiff && (
                  <span className="tag text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                    discrepancia
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{shift.dependiente_name}</p>
            </div>
            {shift.total_discrepancy != null && Math.abs(shift.total_discrepancy) > 0.01 && (
              <span className="text-sm font-semibold text-destructive shrink-0 font-mono">
                {shift.total_discrepancy >= 0 ? '+' : ''}{shift.total_discrepancy.toFixed(0)}
              </span>
            )}
            <svg className="w-4 h-4 text-ink/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )
      })}

      {selectedShiftId && selected && (
        <ShiftReviewModal
          shiftId={selectedShiftId}
          shift={selected}
          onClose={() => setSelectedShiftId(null)}
        />
      )}
    </div>
  )
}
