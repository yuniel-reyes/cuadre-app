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

  return (
    <div className="p-4 max-w-sm">
      <h2 className="font-display font-bold text-ink text-lg mb-1">Tasas de cambio</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Todos los reportes se convierten a CUP usando estas tasas.
      </p>

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
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar tasas'}
        </button>
      </form>

      {current && (
        <p className="text-xs text-muted-foreground font-mono mt-4">
          Última actualización: {new Date(current.updated_at).toLocaleString('es-CU')}
        </p>
      )}
    </div>
  )
}
