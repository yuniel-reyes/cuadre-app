import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import ProductForm from '../components/ProductForm'
import CsvImportModal from '../components/CsvImportModal'
import type { Product } from '../types'

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showCsvImport, setShowCsvImport] = useState(false)

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
          Importar CSV
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
