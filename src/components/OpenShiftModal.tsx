import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import type { Product } from '../types'

interface Props {
  onClose: () => void
}

export default function OpenShiftModal({ onClose }: Props) {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [opening, setOpening] = useState(false)

  const { data: products = [] } = useQuery<Product>(
    `SELECT * FROM products WHERE business_id = ? AND active = 1 ORDER BY category, name`,
    [user?.business_id]
  )

  const categories = [...new Set(products.map((p) => p.category || 'Sin categoría'))]

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleCategory = (cat: string) => {
    const catProducts = products.filter((p) => (p.category || 'Sin categoría') === cat)
    const allSelected = catProducts.every((p) => selected.has(p.id))
    setSelected((prev) => {
      const next = new Set(prev)
      catProducts.forEach((p) => allSelected ? next.delete(p.id) : next.add(p.id))
      return next
    })
  }

  const selectAll = () => setSelected(new Set(products.map((p) => p.id)))

  const handleOpen = async () => {
    if (!user || selected.size === 0) return
    setOpening(true)

    const shiftId = crypto.randomUUID()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO shifts (id, business_id, dependiente_id, date, status, opened_at)
       VALUES (?, ?, ?, ?, 'open', ?)`,
      [shiftId, user.business_id, user.id, today, now]
    )

    const recentItems = await db.getAll<{ product_id: string; final: number }>(
      `SELECT ci.product_id, ci.final
       FROM cuadre_items ci
       JOIN shifts s ON s.id = ci.shift_id
       WHERE s.business_id = ? AND s.status = 'closed'
       ORDER BY s.date DESC, s.opened_at DESC`,
      [user.business_id]
    )

    const lastFinal = new Map<string, number>()
    for (const item of recentItems) {
      if (!lastFinal.has(item.product_id)) {
        lastFinal.set(item.product_id, item.final)
      }
    }

    const selectedProducts = products.filter((p) => selected.has(p.id))
    for (const product of selectedProducts) {
      const inicio = lastFinal.get(product.id) ?? 0
      const itemId = crypto.randomUUID()
      await db.execute(
        `INSERT INTO cuadre_items
           (id, shift_id, product_id, price_at_shift, cost_at_shift,
            inicio, entradas, salidas, a_la_venta,
            final, efectivo_esperado, efectivo_declarado, discrepancy)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, 0, 0)`,
        [itemId, shiftId, product.id, product.sale_price, product.cost_price, inicio, inicio]
      )
    }

    setOpening(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90svh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-ink">Abrir turno</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Subheader */}
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.size} producto{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
          </p>
          <button onClick={selectAll} className="text-sm text-terracotta font-medium hover:text-ember transition-colors">
            Seleccionar todos
          </button>
        </div>

        {/* Product list */}
        <div className="overflow-y-auto flex-1">
          {categories.map((cat) => {
            const catProducts = products.filter((p) => (p.category || 'Sin categoría') === cat)
            const allSelected = catProducts.every((p) => selected.has(p.id))
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full px-4 py-2 bg-sand text-left flex items-center justify-between border-b border-border"
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{cat}</span>
                  <span className="text-xs text-terracotta">{allSelected ? 'Deseleccionar' : 'Todos'}</span>
                </button>
                {catProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 border-b border-border/50 hover:bg-sand transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected.has(p.id) ? 'bg-terracotta border-terracotta' : 'border-border'
                    }`}>
                      {selected.has(p.id) && (
                        <svg className="w-3 h-3 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-ink text-left flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.sale_price} {p.currency}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleOpen}
            disabled={opening || selected.size === 0}
            className="w-full bg-terracotta text-cream py-3 rounded-xl font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
          >
            {opening ? 'Abriendo...' : `Abrir turno con ${selected.size} productos →`}
          </button>
        </div>
      </div>
    </div>
  )
}
