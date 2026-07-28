import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'

export default function ExchangeRatesPage() {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: rates } = useQuery<{
    id: string
    mlc_to_cup: number
    usd_to_cup: number
    updated_at: string
  }>(
    'SELECT id, mlc_to_cup, usd_to_cup, updated_at FROM exchange_rates WHERE business_id = ? LIMIT 1',
    [user?.business_id]
  )

  const current = rates?.[0]

  const [mlc, setMlc] = useState<string>('')
  const [usd, setUsd] = useState<string>('')

  const mlcValue = mlc !== '' ? mlc : String(current?.mlc_to_cup ?? '')
  const usdValue = usd !== '' ? usd : String(current?.usd_to_cup ?? '')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    const now = new Date().toISOString()

    if (current?.id) {
      await db.execute(
        `UPDATE exchange_rates SET mlc_to_cup = ?, usd_to_cup = ?, updated_at = ?, updated_by = ? WHERE id = ?`,
        [parseFloat(mlcValue), parseFloat(usdValue), now, user.id, current.id]
      )
    } else {
      const id = crypto.randomUUID()
      await db.execute(
        `INSERT INTO exchange_rates (id, business_id, mlc_to_cup, usd_to_cup, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, user.business_id, parseFloat(mlcValue), parseFloat(usdValue), now, user.id]
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const today = new Date().toISOString().split('T')[0]
  const lastUpdatedDay = current?.updated_at?.split('T')[0] ?? null
  const isStale = lastUpdatedDay !== today

  return (
    <div className="max-w-sm space-y-4">
      <div>
        <h2 className="font-display font-bold text-ink text-lg mb-1">Tasas de cambio</h2>
        <p className="text-sm text-muted-foreground">
          Todos los reportes y cobros se convierten a CUP usando estas tasas.
        </p>
      </div>

      {/* Staleness warning */}
      {current && isStale && (
        <div className="bg-ember/10 border border-ember/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 text-ember shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-ember">Tasa desactualizada</p>
            <p className="text-xs text-ink/60 mt-0.5">
              Última: {new Date(current.updated_at).toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' })}. Actualiza antes de abrir ventas.
            </p>
          </div>
        </div>
      )}

      {current && !isStale && (
        <div className="bg-moss/10 border border-moss/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <svg className="w-4 h-4 text-moss shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-moss font-medium">Tasa actualizada hoy</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            1 MLC = _____ CUP
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={mlcValue}
            onChange={(e) => setMlc(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
            placeholder="240"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            1 USD = _____ CUP
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={usdValue}
            onChange={(e) => setUsd(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
            placeholder="300"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-terracotta text-cream py-2.5 rounded-lg font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : isStale ? 'Actualizar tasa de hoy →' : 'Guardar tasas'}
        </button>
      </form>

      {current && (
        <p className="text-xs text-muted-foreground font-mono">
          Última actualización: {new Date(current.updated_at).toLocaleString('es-CU')}
        </p>
      )}
    </div>
  )
}
