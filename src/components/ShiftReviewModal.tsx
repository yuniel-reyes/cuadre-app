import { useState } from 'react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import CuadreTable from './CuadreTable'
import type { ShiftStatus } from '../types'

interface ShiftRow {
  id: string
  date: string
  status: string
  dependiente_name: string
}

interface Props {
  shiftId: string
  shift: ShiftRow
  onClose: () => void
}

export default function ShiftReviewModal({ shiftId, shift, onClose }: Props) {
  const { user } = useAuthStore()
  const [flagMode, setFlagMode] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const isPending = shift.status === 'pending_review'

  const handleApprove = async () => {
    if (!user) return
    setSaving(true)
    await db.execute(
      `UPDATE shifts SET status = 'closed', approved_by = ? WHERE id = ?`,
      [user.id, shiftId]
    )
    setSaving(false)
    onClose()
  }

  const handleFlag = async () => {
    if (!user) return
    setSaving(true)
    await db.execute(
      `UPDATE shifts SET status = 'open', notes = ? WHERE id = ?`,
      [note.trim() || null, shiftId]
    )
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl max-h-[95svh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-ink">
              Turno — {new Date(shift.date + 'T12:00:00').toLocaleDateString('es-CU', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </h2>
            <p className="text-xs text-muted-foreground">{shift.dependiente_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Cuadre table */}
        <div className="overflow-y-auto flex-1 p-4">
          <CuadreTable
            shiftId={shiftId}
            status={shift.status as ShiftStatus}
            date={shift.date}
          />
        </div>

        {/* Actions — only for pending review */}
        {isPending && (
          <div className="p-4 border-t border-border shrink-0">
            {flagMode ? (
              <div className="space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota para el dependiente (opcional)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-destructive resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlagMode(false)}
                    className="px-4 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-sand transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFlag}
                    disabled={saving}
                    className="flex-1 bg-destructive text-cream py-2.5 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? 'Enviando...' : 'Devolver al dependiente'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setFlagMode(true)}
                  className="px-4 py-2.5 border border-destructive/40 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  Marcar problema
                </button>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex-1 bg-terracotta text-cream py-2.5 rounded-xl font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Aprobando...' : 'Aprobar turno →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
