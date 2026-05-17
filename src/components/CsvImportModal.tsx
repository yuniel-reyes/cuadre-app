import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'

interface Props {
  onClose: () => void
}

interface CsvRow {
  name: string
  category?: string
  unit?: string
  sale_price: string
  cost_price?: string
  currency?: string
  current_stock?: string
  min_stock?: string
}

interface ParsedProduct {
  name: string
  category: string
  unit: string
  sale_price: number
  cost_price: number
  currency: string
  current_stock: number
  min_stock: number
  valid: boolean
  error?: string
}

export default function CsvImportModal({ onClose }: Props) {
  const { user } = useAuthStore()
  const [preview, setPreview] = useState<ParsedProduct[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CsvRow>) => {
        const parsed: ParsedProduct[] = results.data.map((row: CsvRow) => {
          const salePrice = parseFloat(row.sale_price)
          if (!row.name?.trim()) {
            return { ...defaults(row), valid: false, error: 'Falta nombre' }
          }
          if (isNaN(salePrice) || salePrice < 0) {
            return { ...defaults(row), valid: false, error: 'Precio inválido' }
          }
          return { ...defaults(row), valid: true }
        })
        setPreview(parsed)
      },
    })
  }

  const defaults = (row: CsvRow): ParsedProduct => ({
    name: row.name?.trim() ?? '',
    category: row.category?.trim() ?? '',
    unit: row.unit?.trim() || 'unidad',
    sale_price: parseFloat(row.sale_price) || 0,
    cost_price: parseFloat(row.cost_price ?? '0') || 0,
    currency: ['CUP', 'MLC', 'USD'].includes(row.currency ?? '')
      ? row.currency!
      : 'CUP',
    current_stock: parseFloat(row.current_stock ?? '0') || 0,
    min_stock: parseFloat(row.min_stock ?? '0') || 0,
    valid: true,
  })

  const validRows = preview.filter((r) => r.valid)

  const handleImport = async () => {
    if (!user || validRows.length === 0) return
    setImporting(true)

    for (const row of validRows) {
      await db.execute(
        `INSERT INTO products
          (id, business_id, name, category, unit, sale_price, cost_price, currency, current_stock, min_stock, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          crypto.randomUUID(), user.business_id,
          row.name, row.category, row.unit,
          row.sale_price, row.cost_price, row.currency,
          row.current_stock, row.min_stock,
        ]
      )
    }

    setImporting(false)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90svh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display font-bold text-ink">Importar productos (CSV)</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format guide */}
          <div className="bg-sand rounded-lg p-3 text-xs text-ink/70 space-y-1 border border-border">
            <p className="font-mono font-medium text-ink uppercase tracking-widest text-[10px]">Formato del CSV</p>
            <p>Columnas requeridas: <code className="bg-cream px-1 rounded border border-border">name</code>, <code className="bg-cream px-1 rounded border border-border">sale_price</code></p>
            <p>Columnas opcionales: <code className="bg-cream px-1 rounded border border-border">category</code>, <code className="bg-cream px-1 rounded border border-border">unit</code>, <code className="bg-cream px-1 rounded border border-border">cost_price</code>, <code className="bg-cream px-1 rounded border border-border">currency</code>, <code className="bg-cream px-1 rounded border border-border">current_stock</code>, <code className="bg-cream px-1 rounded border border-border">min_stock</code></p>
          </div>

          {/* File picker */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl py-6 text-sm text-muted-foreground hover:border-terracotta hover:text-terracotta transition-colors"
          >
            Seleccionar archivo CSV
          </button>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">
                Vista previa: {validRows.length} de {preview.length} filas válidas
              </p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-sand text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-mono uppercase tracking-widest">Nombre</th>
                        <th className="px-3 py-2 text-left font-mono uppercase tracking-widest">Categoría</th>
                        <th className="px-3 py-2 text-right font-mono uppercase tracking-widest">Precio</th>
                        <th className="px-3 py-2 text-right font-mono uppercase tracking-widest">Costo</th>
                        <th className="px-3 py-2 text-center font-mono uppercase tracking-widest">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.map((row, i) => (
                        <tr key={i} className={row.valid ? '' : 'bg-destructive/5'}>
                          <td className="px-3 py-2 text-ink">{row.name || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.category || '—'}</td>
                          <td className="px-3 py-2 text-right text-ink font-mono">{row.sale_price} {row.currency}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-mono">{row.cost_price}</td>
                          <td className="px-3 py-2 text-center font-mono">
                            {row.valid
                              ? <span className="text-moss">OK</span>
                              : <span className="text-destructive">{row.error}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={importing || done || validRows.length === 0}
                className="w-full bg-terracotta text-cream py-2.5 rounded-lg font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
              >
                {done ? 'Importado ✓' : importing ? 'Importando...' : `Importar ${validRows.length} productos →`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
