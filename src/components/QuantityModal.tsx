import { useState } from 'react'
import type { Product, Currency } from '../types'

const CURRENCIES: Currency[] = ['CUP', 'MLC', 'USD']

export interface CartItem {
  product: Product
  quantity: number
  currency: Currency
  unitPrice: number
  subtotal: number
}

interface Props {
  product: Product
  onAdd: (item: CartItem) => void
  onClose: () => void
}

export default function QuantityModal({ product, onAdd, onClose }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [currency, setCurrency] = useState<Currency>(product.currency as Currency)

  const subtotal = quantity * product.sale_price

  const handleAdd = () => {
    onAdd({
      product,
      quantity,
      currency,
      unitPrice: product.sale_price,
      subtotal,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-5 border border-border">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-bold text-ink leading-tight">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              {product.sale_price.toFixed(2)} {product.currency} / {product.unit}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none ml-3">
            ×
          </button>
        </div>

        {/* Quantity picker */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Cantidad</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-xl border border-border text-xl font-medium text-ink hover:bg-sand flex items-center justify-center transition-colors"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
              className="flex-1 text-center text-xl font-semibold font-display border border-border rounded-xl py-2.5 bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-11 rounded-xl border border-border text-xl font-medium text-ink hover:bg-sand flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Currency selector */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Moneda</label>
          <div className="flex gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors font-mono ${
                  currency === c
                    ? 'bg-terracotta text-cream border-terracotta'
                    : 'border-border text-ink hover:bg-sand'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Subtotal */}
        <div className="bg-sand rounded-xl px-4 py-3 flex items-center justify-between border border-border">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold font-display text-ink">
            {subtotal.toFixed(2)} {currency}
          </span>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          className="w-full bg-terracotta text-cream py-3 rounded-xl font-medium text-sm hover:bg-ember transition-colors"
        >
          Agregar a la venta →
        </button>
      </div>
    </div>
  )
}
