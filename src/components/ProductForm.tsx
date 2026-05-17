import { useState } from 'react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@powersync/react'
import type { Product, Currency } from '../types'

interface Props {
  product: Product | null
  onClose: () => void
}

const UNITS = ['unidad', 'caja', 'libra', 'litro', 'kg', 'bolsa', 'paquete']
const CURRENCIES: Currency[] = ['CUP', 'MLC', 'USD']

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent'
const labelCls = 'block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5'

export default function ProductForm({ product, onClose }: Props) {
  const { user } = useAuthStore()
  const isEdit = !!product

  const { data: products = [] } = useQuery<{ category: string }>(
    `SELECT DISTINCT category FROM products WHERE business_id = ? AND category != ''`,
    [user?.business_id]
  )
  const existingCategories = [...new Set(products.map((p) => p.category))]

  const [form, setForm] = useState({
    name: product?.name ?? '',
    category: product?.category ?? '',
    unit: product?.unit ?? 'unidad',
    sale_price: product?.sale_price?.toString() ?? '',
    cost_price: product?.cost_price?.toString() ?? '',
    currency: (product?.currency ?? 'CUP') as Currency,
    current_stock: product?.current_stock?.toString() ?? '0',
    min_stock: product?.min_stock?.toString() ?? '0',
    active: product?.active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const salePrice = parseFloat(form.sale_price) || 0
  const costPrice = parseFloat(form.cost_price) || 0
  const margin = salePrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0
  const marginColor = margin >= 30 ? 'text-moss' : margin >= 15 ? 'text-ember' : 'text-destructive'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    if (isEdit && product) {
      await db.execute(
        `UPDATE products SET
          name = ?, category = ?, unit = ?,
          sale_price = ?, cost_price = ?, currency = ?,
          current_stock = ?, min_stock = ?, active = ?
         WHERE id = ?`,
        [
          form.name, form.category, form.unit,
          salePrice, costPrice, form.currency,
          parseFloat(form.current_stock) || 0,
          parseFloat(form.min_stock) || 0,
          form.active ? 1 : 0,
          product.id,
        ]
      )
    } else {
      await db.execute(
        `INSERT INTO products
          (id, business_id, name, category, unit, sale_price, cost_price, currency, current_stock, min_stock, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), user.business_id,
          form.name, form.category, form.unit,
          salePrice, costPrice, form.currency,
          parseFloat(form.current_stock) || 0,
          parseFloat(form.min_stock) || 0,
          1,
        ]
      )
    }

    setSaving(false)
    onClose()
  }

  const handleDeactivate = async () => {
    if (!product) return
    await db.execute(`UPDATE products SET active = ? WHERE id = ?`, [
      product.active ? 0 : 1,
      product.id,
    ])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90svh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display font-bold text-ink">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
              placeholder="Ej: Refresco cola 1L"
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Categoría</label>
            <input
              list="categories"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
              placeholder="Ej: Bebidas"
            />
            <datalist id="categories">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Unit + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Unidad</label>
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                className={inputCls}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value as Currency)}
                className={inputCls}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Precio venta *</label>
              <input
                required
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.sale_price}
                onChange={(e) => set('sale_price', e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>Precio costo</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => set('cost_price', e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Live margin */}
          {salePrice > 0 && (
            <p className={`text-sm font-medium ${marginColor}`}>
              Margen: {margin.toFixed(1)}%
              {margin < 15 && ' — bajo'}
              {margin >= 15 && margin < 30 && ' — normal'}
              {margin >= 30 && ' — bueno'}
            </p>
          )}

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stock actual</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.current_stock}
                onChange={(e) => set('current_stock', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Stock mínimo</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.min_stock}
                onChange={(e) => set('min_stock', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDeactivate}
                className="px-4 py-2 border border-border rounded-lg text-sm text-ink hover:bg-sand transition-colors"
              >
                {product?.active ? 'Desactivar' : 'Activar'}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-terracotta text-cream py-2.5 rounded-lg font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
