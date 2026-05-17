import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import QuantityModal, { type CartItem } from '../components/QuantityModal'
import PaymentModal from '../components/PaymentModal'
import type { Product, Shift } from '../types'

export default function POSPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { data: products = [] } = useQuery<Product>(
    `SELECT * FROM products WHERE business_id = ? AND active = 1 ORDER BY category, name`,
    [user?.business_id]
  )

  const { data: activeShifts = [] } = useQuery<Shift>(
    `SELECT * FROM shifts WHERE dependiente_id = ? AND date = ? AND status = 'open' LIMIT 1`,
    [user?.id, today]
  )
  const activeShiftId = activeShifts[0]?.id ?? null

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory ? p.category === filterCategory : true
    return matchSearch && matchCat
  })

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.findIndex(
        (c) => c.product.id === item.product.id && c.currency === item.currency
      )
      if (existing >= 0) {
        return prev.map((c, i) =>
          i === existing
            ? { ...c, quantity: c.quantity + item.quantity, subtotal: c.subtotal + item.subtotal }
            : c
        )
      }
      return [...prev, item]
    })
  }

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const clearCart = () => setCart([])

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  return (
    <div className="flex flex-col h-[calc(100svh-112px)]">
      {/* Search + filter */}
      <div className="flex gap-2 mb-3">
        <input
          type="search"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta placeholder:text-ink/30"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
        >
          <option value="">Todas</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No hay productos.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
          {filtered.map((product) => {
            const inCart = cart.find((c) => c.product.id === product.id)
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`relative bg-card border rounded-xl p-3 text-left transition-colors hover:border-terracotta/50 active:bg-terracotta/5 ${
                  inCart ? 'border-terracotta' : 'border-border'
                }`}
              >
                {inCart && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-terracotta text-cream text-xs rounded-full flex items-center justify-center font-medium">
                    {inCart.quantity}
                  </span>
                )}
                {product.current_stock <= product.min_stock && product.min_stock > 0 && (
                  <span className="absolute top-2 left-2 w-2 h-2 bg-destructive rounded-full" />
                )}
                <p className="text-sm font-medium text-ink leading-tight line-clamp-2 pr-5">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{product.category}</p>
                <p className="text-sm font-bold text-terracotta mt-2">
                  {product.sale_price.toFixed(2)}{' '}
                  <span className="font-normal text-xs text-muted-foreground">{product.currency}</span>
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cart bar */}
      {cart.length > 0 && (
        <div className="border-t border-border bg-card pt-3 space-y-2">
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink truncate flex-1">{item.product.name}</span>
                <span className="text-muted-foreground mx-2 shrink-0 font-mono text-xs">
                  {item.quantity} × {item.unitPrice.toFixed(2)} {item.currency}
                </span>
                <button
                  onClick={() => removeFromCart(i)}
                  className="text-ink/20 hover:text-destructive text-lg leading-none shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              className="px-3 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-sand transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={() => setShowPayment(true)}
              className="flex-1 bg-terracotta text-cream py-2.5 rounded-xl font-bold text-sm hover:bg-ember transition-colors"
            >
              Cobrar · {cartCount} {cartCount === 1 ? 'producto' : 'productos'}
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <QuantityModal
          product={selectedProduct}
          onAdd={addToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          shiftId={activeShiftId}
          onConfirm={clearCart}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
