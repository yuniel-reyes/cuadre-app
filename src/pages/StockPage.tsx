import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import type { Product } from '../types'

type MovType = 'entrada' | 'salida'

interface Movement {
  id: string
  type: MovType
  quantity: number
  note: string | null
  created_at: string
  product_name: string
  user_name: string
}

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta'
const labelCls = 'block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5'

export default function StockPage() {
  const { user } = useAuthStore()
  const [modal, setModal] = useState<MovType | null>(null)

  const { data: movements = [] } = useQuery<Movement>(
    `SELECT sm.id, sm.type, sm.quantity, sm.note, sm.created_at,
            p.name as product_name, u.name as user_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN users u ON u.id = sm.user_id
     WHERE sm.business_id = ?
     ORDER BY sm.created_at DESC
     LIMIT 50`,
    [user?.business_id]
  )

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setModal('entrada')}
          className="flex flex-col items-center gap-2 bg-moss/10 border border-moss/30 rounded-2xl py-5 hover:bg-moss/15 transition-colors"
        >
          <div className="w-10 h-10 bg-moss/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-moss text-sm">Entrada</p>
            <p className="text-xs text-moss/70">Agregar al stock</p>
          </div>
        </button>

        <button
          onClick={() => setModal('salida')}
          className="flex flex-col items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-2xl py-5 hover:bg-destructive/15 transition-colors"
        >
          <div className="w-10 h-10 bg-destructive/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-destructive text-sm">Salida</p>
            <p className="text-xs text-destructive/70">Retirar del stock</p>
          </div>
        </button>
      </div>

      {/* Movement history */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Historial de movimientos
        </h3>

        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">
            Sin movimientos registrados.
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {movements.map((m) => {
              const isEntrada = m.type === 'entrada'
              const date = new Date(m.created_at)
              const dateStr = date.toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })
              const timeStr = date.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={m.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isEntrada ? 'bg-moss/15' : 'bg-destructive/10'
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${isEntrada ? 'text-moss' : 'text-destructive'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {isEntrada
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      }
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{m.product_name}</p>
                    <p className="text-xs text-muted-foreground">{m.user_name} · {dateStr} {timeStr}</p>
                    {m.note && (
                      <p className="text-xs text-ink/60 mt-0.5 italic">"{m.note}"</p>
                    )}
                  </div>
                  <span className={`text-sm font-bold font-mono shrink-0 ${isEntrada ? 'text-moss' : 'text-destructive'}`}>
                    {isEntrada ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <StockMovementModal
          type={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function StockMovementModal({ type, onClose }: { type: MovType; onClose: () => void }) {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: products = [] } = useQuery<Product>(
    `SELECT * FROM products WHERE business_id = ? AND active = 1 ORDER BY category, name`,
    [user?.business_id]
  )

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const isEntrada = type === 'entrada'
  const qty = parseFloat(quantity) || 0
  const canSave = !!selectedProduct && qty > 0 && (isEntrada || note.trim().length > 0)

  const handleSave = async () => {
    if (!user || !selectedProduct || !canSave) return
    setSaving(true)

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO stock_movements (id, business_id, product_id, type, quantity, note, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.business_id, selectedProduct.id, type, qty, note.trim() || null, user.id, now]
    )

    const delta = isEntrada ? qty : -qty
    await db.execute(
      `UPDATE products SET current_stock = MAX(0, current_stock + ?) WHERE id = ?`,
      [delta, selectedProduct.id]
    )

    setSaving(false)
    onClose()
  }

  const accentBg  = isEntrada ? 'bg-moss/10 border-moss/30'   : 'bg-destructive/10 border-destructive/30'
  const accentTxt = isEntrada ? 'text-moss'                    : 'text-destructive'
  const btnCls    = isEntrada
    ? 'bg-moss text-cream hover:bg-moss/90 disabled:opacity-50'
    : 'bg-destructive text-cream hover:bg-destructive/90 disabled:opacity-50'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90svh] flex flex-col border border-border">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-border ${accentBg} border`}>
          <h2 className={`font-display font-bold ${accentTxt}`}>
            {isEntrada ? 'Entrada de stock' : 'Salida de stock'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Product search */}
          {!selectedProduct ? (
            <div>
              <label className={labelCls}>Producto *</label>
              <input
                autoFocus
                type="search"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputCls}
              />
              {search.length > 0 && (
                <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-2">Sin resultados.</p>
                  ) : filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setSearch('') }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-sand text-left border-b border-border/50 last:border-0 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-ink font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                        Stock: {p.current_stock}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className={labelCls}>Producto</label>
              <div className="flex items-center justify-between bg-sand rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Stock actual: {selectedProduct.current_stock} {selectedProduct.unit}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-muted-foreground hover:text-ink ml-3 shrink-0"
                >
                  Cambiar
                </button>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className={labelCls}>Cantidad *</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputCls}
            />
            {selectedProduct && qty > 0 && !isEntrada && qty > selectedProduct.current_stock && (
              <p className="text-xs text-destructive mt-1">
                La salida supera el stock disponible ({selectedProduct.current_stock}).
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className={labelCls}>
              Nota {!isEntrada && <span className="text-destructive">*</span>}
            </label>
            <textarea
              rows={2}
              placeholder={isEntrada ? 'Ej: Recibido de proveedor Hernández' : 'Ej: Enviado a almacén central'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputCls} resize-none`}
            />
            {!isEntrada && !note.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                Obligatorio para salidas — indica a dónde va el producto.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${btnCls}`}
          >
            {saving ? 'Guardando...' : isEntrada
              ? `Registrar entrada${qty > 0 ? ` · +${qty}` : ''}`
              : `Registrar salida${qty > 0 ? ` · -${qty}` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
