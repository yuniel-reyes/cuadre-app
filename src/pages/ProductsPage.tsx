import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import { db } from '../lib/powersync'
import ProductForm from '../components/ProductForm'
import CsvImportModal from '../components/CsvImportModal'
import { exportStockAuditPdf, exportStockAuditCsv } from '../lib/stockAuditExport'
import type { AuditProduct, DayMovement } from '../lib/stockAuditExport'
import type { Product } from '../types'

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showAudit, setShowAudit] = useState(false)

  const { data: products = [] } = useQuery<Product>(
    `SELECT * FROM products WHERE business_id = ? ORDER BY category, name`,
    [user?.business_id]
  )

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = filterCategory ? p.category === filterCategory : true
    return matchSearch && matchCategory
  })

  const activeFiltered = filtered.filter((p) => p.active)
  const inactiveFiltered = filtered.filter((p) => !p.active)

  const handleEdit = (product: Product) => {
    setEditProduct(product)
    setShowForm(true)
  }

  const handleAdd = () => {
    setEditProduct(null)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditProduct(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta placeholder:text-ink/30"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="flex-1 bg-terracotta text-cream py-2 rounded-lg text-sm font-medium hover:bg-ember transition-colors"
        >
          + Agregar producto
        </button>
        <button
          onClick={() => setShowCsvImport(true)}
          className="px-4 py-2 border border-border rounded-lg text-sm text-ink hover:bg-sand transition-colors"
        >
          CSV
        </button>
        <button
          onClick={() => setShowAudit(true)}
          className="px-4 py-2 border border-border rounded-lg text-sm text-ink hover:bg-sand transition-colors flex items-center gap-1.5"
          title="Exportar auditoría de stock"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          Auditoría
        </button>
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        {activeFiltered.length} producto{activeFiltered.length !== 1 ? 's' : ''} activo{activeFiltered.length !== 1 ? 's' : ''}
        {inactiveFiltered.length > 0 && ` · ${inactiveFiltered.length} inactivo${inactiveFiltered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Active products */}
      <div className="space-y-2">
        {activeFiltered.map((p) => (
          <ProductCard key={p.id} product={p} onEdit={() => handleEdit(p)} />
        ))}
        {activeFiltered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {search || filterCategory ? 'No se encontraron productos' : 'No hay productos aún. Agrega el primero.'}
          </p>
        )}
      </div>

      {/* Inactive products */}
      {inactiveFiltered.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-ink">
            Productos inactivos ({inactiveFiltered.length})
          </summary>
          <div className="space-y-2 mt-2 opacity-60">
            {inactiveFiltered.map((p) => (
              <ProductCard key={p.id} product={p} onEdit={() => handleEdit(p)} />
            ))}
          </div>
        </details>
      )}

      {showForm && (
        <ProductForm product={editProduct} onClose={handleClose} />
      )}
      {showCsvImport && (
        <CsvImportModal onClose={() => setShowCsvImport(false)} />
      )}
      {showAudit && (
        <StockAuditModal products={products} onClose={() => setShowAudit(false)} />
      )}
    </div>
  )
}

function StockAuditModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const { user, business } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(sevenDaysAgo)
  const [dateTo, setDateTo]     = useState(today)
  const [generating, setGenerating] = useState(false)

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta'

  const generate = async (format: 'pdf' | 'csv') => {
    if (!user || !business) return
    setGenerating(true)

    // Stock movements (supervisor/owner manual)
    const smRows = await db.getAll<{
      product_id: string; day: string; type: string; total: number; notes: string
    }>(
      `SELECT product_id,
              DATE(created_at) as day,
              type,
              SUM(quantity) as total,
              GROUP_CONCAT(note, ' | ') as notes
       FROM stock_movements
       WHERE business_id = ?
         AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY product_id, day, type`,
      [user.business_id, dateFrom, dateTo]
    )

    // Cuadre entradas/salidas (from shifts)
    const ciRows = await db.getAll<{
      product_id: string; day: string; entradas: number; salidas: number
    }>(
      `SELECT ci.product_id,
              s.date as day,
              SUM(ci.entradas) as entradas,
              SUM(ci.salidas)  as salidas
       FROM cuadre_items ci
       JOIN shifts s ON s.id = ci.shift_id
       WHERE s.business_id = ?
         AND s.date BETWEEN ? AND ?
       GROUP BY ci.product_id, s.date`,
      [user.business_id, dateFrom, dateTo]
    )

    // Sales quantities
    const saleRows = await db.getAll<{
      product_id: string; day: string; vendidas: number
    }>(
      `SELECT si.product_id,
              DATE(sa.created_at) as day,
              SUM(si.quantity) as vendidas
       FROM sale_items si
       JOIN sales sa ON sa.id = si.sale_id
       WHERE sa.business_id = ?
         AND DATE(sa.created_at) BETWEEN ? AND ?
       GROUP BY si.product_id, day`,
      [user.business_id, dateFrom, dateTo]
    )

    // Merge into DayMovement[]
    const dayMap = new Map<string, DayMovement>()
    const key = (pid: string, day: string) => `${pid}|${day}`

    const getOrCreate = (pid: string, day: string): DayMovement => {
      const k = key(pid, day)
      if (!dayMap.has(k)) {
        dayMap.set(k, {
          product_id: pid, day,
          entradas_stock: 0, salidas_stock: 0,
          entradas_cuadre: 0, salidas_cuadre: 0,
          vendidas: 0, notas: [],
        })
      }
      return dayMap.get(k)!
    }

    for (const r of smRows) {
      const m = getOrCreate(r.product_id, r.day)
      if (r.type === 'entrada') m.entradas_stock += r.total
      else m.salidas_stock += r.total
      if (r.notes) m.notas.push(...r.notes.split(' | ').filter(Boolean))
    }
    for (const r of ciRows) {
      const m = getOrCreate(r.product_id, r.day)
      m.entradas_cuadre += r.entradas ?? 0
      m.salidas_cuadre  += r.salidas  ?? 0
    }
    for (const r of saleRows) {
      const m = getOrCreate(r.product_id, r.day)
      m.vendidas += r.vendidas ?? 0
    }

    const movements = Array.from(dayMap.values())

    const auditProducts: AuditProduct[] = products.filter((p) => p.active).map((p) => ({
      id: p.id, name: p.name, category: p.category, unit: p.unit,
      sale_price: p.sale_price, cost_price: p.cost_price, currency: p.currency,
      current_stock: p.current_stock, min_stock: p.min_stock,
    }))

    const params = { business, products: auditProducts, movements, dateFrom, dateTo }

    if (format === 'pdf') exportStockAuditPdf(params)
    else exportStockAuditCsv(params)

    setGenerating(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-ink">Auditoría de stock</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Genera un reporte con el inventario actual, entradas, salidas y ventas del período para auditoría física.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Desde</label>
              <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Hasta</label>
              <input type="date" value={dateTo} min={dateFrom} max={today} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Quick ranges */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Hoy', from: today, to: today },
              { label: '7 días', from: sevenDaysAgo, to: today },
              { label: '30 días', from: new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0], to: today },
            ].map(({ label, from, to }) => (
              <button
                key={label}
                onClick={() => { setDateFrom(from); setDateTo(to) }}
                className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                  dateFrom === from && dateTo === to
                    ? 'bg-terracotta text-cream border-terracotta'
                    : 'border-border text-muted-foreground hover:bg-sand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => generate('pdf')}
              disabled={generating}
              className="flex-1 bg-terracotta text-cream py-2.5 rounded-xl font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generando...' : 'Exportar PDF'}
            </button>
            <button
              onClick={() => generate('csv')}
              disabled={generating}
              className="px-4 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-sand disabled:opacity-50 transition-colors"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const margin = product.sale_price > 0
    ? ((product.sale_price - product.cost_price) / product.sale_price) * 100
    : 0

  const marginColor =
    margin >= 30 ? 'text-moss' : margin >= 15 ? 'text-ember' : 'text-destructive'

  const lowStock = product.min_stock > 0 && product.current_stock <= product.min_stock

  return (
    <div
      className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-terracotta/30 transition-colors"
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-ink truncate">{product.name}</span>
          {lowStock && (
            <span className="shrink-0 tag text-[10px] bg-destructive/10 text-destructive border-destructive/30">
              stock bajo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
          {product.category && <span>{product.category}</span>}
          {product.category && <span>·</span>}
          <span>{product.unit}</span>
          <span>·</span>
          <span>Stock: {product.current_stock}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-ink">
          {product.sale_price.toFixed(2)} {product.currency}
        </p>
        <p className={`text-xs font-medium ${marginColor}`}>
          {margin.toFixed(0)}% margen
        </p>
      </div>
    </div>
  )
}
