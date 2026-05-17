import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@powersync/react'
import { db } from '../lib/powersync'
import { exportShiftPdf } from '../lib/shiftPdf'
import { useAuthStore } from '../store/authStore'
import type { ShiftStatus } from '../types'

interface Props {
  shiftId: string
  status: ShiftStatus
  date: string
}

interface RowState {
  itemId: string
  productId: string
  productName: string
  priceAtShift: number
  costAtShift: number
  currency: string
  inicio: number
  entradas: number
  salidas: number
  final: number
  efectivoDeclarado: number
}

interface DbItem {
  id: string
  product_id: string
  name: string
  price_at_shift: number
  cost_at_shift: number
  currency: string
  inicio: number
  entradas: number
  salidas: number
  final: number
  efectivo_declarado: number
}

function computeRow(row: RowState) {
  const aLaVenta = row.inicio + row.entradas - row.salidas
  const vendidas = aLaVenta - row.final
  const efectivoEsperado = vendidas * row.priceAtShift
  const discrepancy = row.efectivoDeclarado - efectivoEsperado
  return { aLaVenta, vendidas, efectivoEsperado, discrepancy }
}

function toRowState(item: DbItem): RowState {
  return {
    itemId: item.id,
    productId: item.product_id,
    productName: item.name,
    priceAtShift: item.price_at_shift,
    costAtShift: item.cost_at_shift,
    currency: item.currency,
    inicio: item.inicio,
    entradas: item.entradas,
    salidas: item.salidas,
    final: item.final,
    efectivoDeclarado: item.efectivo_declarado,
  }
}

export default function CuadreTable({ shiftId, status, date }: Props) {
  const { user, business } = useAuthStore()
  const [rows, setRows] = useState<RowState[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isEditable = status === 'open'

  const { data: items = [] } = useQuery<DbItem>(
    `SELECT ci.id, ci.product_id, p.name, ci.price_at_shift, ci.cost_at_shift,
            p.currency, ci.inicio, ci.entradas, ci.salidas, ci.final, ci.efectivo_declarado
     FROM cuadre_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.shift_id = ?
     ORDER BY p.category, p.name`,
    [shiftId]
  )

  useEffect(() => {
    if (!initialized && items.length > 0) {
      setRows(items.map(toRowState))
      setInitialized(true)
    }
  }, [items, initialized])

  const saveRow = useCallback(async (row: RowState) => {
    const { aLaVenta, vendidas: _v, efectivoEsperado, discrepancy } = computeRow(row)
    await db.execute(
      `UPDATE cuadre_items SET
         inicio = ?, entradas = ?, salidas = ?, final = ?,
         a_la_venta = ?, efectivo_esperado = ?,
         efectivo_declarado = ?, discrepancy = ?
       WHERE id = ?`,
      [
        row.inicio, row.entradas, row.salidas, row.final,
        aLaVenta, efectivoEsperado,
        row.efectivoDeclarado, discrepancy,
        row.itemId,
      ]
    )
  }, [])

  const updateField = (
    itemId: string,
    field: keyof Pick<RowState, 'inicio' | 'entradas' | 'salidas' | 'final' | 'efectivoDeclarado'>,
    value: number
  ) => {
    setRows((prev) => prev.map((r) => r.itemId === itemId ? { ...r, [field]: value } : r))
  }

  const handleBlur = (itemId: string) => {
    const row = rows.find((r) => r.itemId === itemId)
    if (row) saveRow(row)
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    for (const row of rows) await saveRow(row)
    await db.execute(
      `UPDATE shifts SET status = 'pending_review', closed_at = ? WHERE id = ?`,
      [new Date().toISOString(), shiftId]
    )
    setSubmitting(false)
  }

  const handleExportPdf = () => {
    if (!business || !user) return
    const computedRows = rows.map((r) => ({ ...r, ...computeRow(r) }))
    exportShiftPdf({ business, user, date, rows: computedRows })
  }

  const totals = rows.reduce(
    (acc, row) => {
      const { efectivoEsperado, discrepancy } = computeRow(row)
      return {
        esperado: acc.esperado + efectivoEsperado,
        declarado: acc.declarado + row.efectivoDeclarado,
        discrepancy: acc.discrepancy + discrepancy,
      }
    },
    { esperado: 0, declarado: 0, discrepancy: 0 }
  )

  if (!initialized && items.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-8">Cargando cuadre...</p>
  }

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-2 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground whitespace-nowrap ${right ? 'text-right' : 'text-center'}`}>
      {children}
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {status === 'pending_review' && (
        <div className="bg-ember/10 border border-ember/30 rounded-xl px-4 py-3 text-sm text-ink/80">
          Turno enviado para revisión. Esperando aprobación del dueño.
        </div>
      )}
      {status === 'closed' && (
        <div className="bg-moss/10 border border-moss/30 rounded-xl px-4 py-3 text-sm text-ink/80">
          Turno cerrado y aprobado.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-0">
        <table className="min-w-max border-collapse">
          <thead className="bg-sand border-y border-border">
            <tr>
              <th className="sticky left-0 z-20 bg-sand px-4 py-2 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground min-w-[110px] border-r border-border">
                Producto
              </th>
              <TH>Inicio</TH>
              <TH>Entradas</TH>
              <TH>Salidas</TH>
              <TH>A/Venta</TH>
              <TH>Final</TH>
              <TH>Vendidas</TH>
              <TH right>Ef.Esp</TH>
              <TH right>Ef.Dec</TH>
              <TH right>Dif</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((row) => {
              const { aLaVenta, vendidas, efectivoEsperado, discrepancy } = computeRow(row)
              const hasDiff = Math.abs(discrepancy) > 0.01

              return (
                <tr key={row.itemId} className={hasDiff ? 'bg-destructive/5' : ''}>
                  <td className="sticky left-0 z-10 bg-card px-3 py-2 border-r border-border min-w-[110px]">
                    <div className="text-sm font-medium text-ink max-w-[100px] truncate leading-tight">
                      {row.productName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{row.priceAtShift} {row.currency}</div>
                  </td>

                  <td className="px-1 py-1 text-center">
                    <NumInput
                      value={row.inicio}
                      disabled={!isEditable}
                      onChange={(v) => updateField(row.itemId, 'inicio', v)}
                      onBlur={() => handleBlur(row.itemId)}
                    />
                  </td>

                  <td className="px-1 py-1 text-center">
                    <NumInput
                      value={row.entradas}
                      disabled={!isEditable}
                      onChange={(v) => updateField(row.itemId, 'entradas', v)}
                      onBlur={() => handleBlur(row.itemId)}
                    />
                  </td>

                  <td className="px-1 py-1 text-center">
                    <NumInput
                      value={row.salidas}
                      disabled={!isEditable}
                      onChange={(v) => updateField(row.itemId, 'salidas', v)}
                      onBlur={() => handleBlur(row.itemId)}
                    />
                  </td>

                  <td className="px-2 py-2 text-center text-sm text-ink/60 font-medium font-mono w-14">
                    {aLaVenta}
                  </td>

                  <td className="px-1 py-1 text-center">
                    <NumInput
                      value={row.final}
                      disabled={!isEditable}
                      onChange={(v) => updateField(row.itemId, 'final', v)}
                      onBlur={() => handleBlur(row.itemId)}
                    />
                  </td>

                  <td className="px-2 py-2 text-center text-sm text-ink/60 font-mono w-14">
                    {vendidas}
                  </td>

                  <td className="px-2 py-2 text-right text-sm text-muted-foreground font-mono w-16 whitespace-nowrap">
                    {efectivoEsperado.toFixed(0)}
                  </td>

                  <td className="px-1 py-1 text-right">
                    <NumInput
                      value={row.efectivoDeclarado}
                      disabled={!isEditable}
                      onChange={(v) => updateField(row.itemId, 'efectivoDeclarado', v)}
                      onBlur={() => handleBlur(row.itemId)}
                      right
                    />
                  </td>

                  <td className={`px-2 py-2 text-right text-sm font-medium font-mono w-16 whitespace-nowrap ${
                    hasDiff ? 'text-destructive' : 'text-ink/30'
                  }`}>
                    {discrepancy >= 0 ? '+' : ''}{discrepancy.toFixed(0)}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          <tfoot className="bg-sand border-t-2 border-border">
            <tr>
              <td className="sticky left-0 bg-sand px-3 py-2 text-xs font-semibold text-ink font-mono uppercase tracking-widest border-r border-border">
                TOTAL
              </td>
              <td colSpan={7} />
              <td className="px-2 py-2 text-right text-sm font-semibold text-ink font-mono whitespace-nowrap">
                {totals.esperado.toFixed(0)}
              </td>
              <td className="px-2 py-2 text-right text-sm font-semibold text-ink font-mono whitespace-nowrap">
                {totals.declarado.toFixed(0)}
              </td>
              <td className={`px-2 py-2 text-right text-sm font-bold font-mono whitespace-nowrap ${
                Math.abs(totals.discrepancy) > 0.01 ? 'text-destructive' : 'text-moss'
              }`}>
                {totals.discrepancy >= 0 ? '+' : ''}{totals.discrepancy.toFixed(0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-sand transition-colors"
          >
            PDF
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-terracotta text-cream py-2.5 rounded-xl font-medium text-sm hover:bg-ember disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Enviando...' : 'Enviar para revisión →'}
          </button>
        </div>
      )}

      {(status === 'pending_review' || status === 'closed') && (
        <button
          onClick={handleExportPdf}
          className="w-full px-4 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-sand transition-colors"
        >
          Exportar PDF
        </button>
      )}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  onBlur,
  disabled,
  right,
}: {
  value: number
  onChange: (v: number) => void
  onBlur: () => void
  disabled: boolean
  right?: boolean
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      step="0.01"
      min="0"
      value={value === 0 ? '' : value}
      placeholder="0"
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      onBlur={onBlur}
      className={`w-14 h-10 text-sm border border-transparent rounded-lg px-1 bg-transparent font-mono
        focus:outline-none focus:border-terracotta focus:bg-cream disabled:opacity-60
        ${right ? 'text-right' : 'text-center'}`}
    />
  )
}
