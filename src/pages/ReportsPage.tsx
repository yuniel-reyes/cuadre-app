import { useState, useMemo } from 'react'
import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'
import { exportReportPdf, exportReportCsv, exportDailySummaryPdf, type ReportRow } from '../lib/reportExports'

type Period = 'today' | 'week' | 'month' | 'custom'

function getDateRange(period: Period, customFrom: string, customTo: string) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  if (period === 'today') return { from: todayStr, to: todayStr }

  if (period === 'week') {
    const d = new Date(today)
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    return { from: d.toISOString().split('T')[0], to: todayStr }
  }

  if (period === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: first.toISOString().split('T')[0], to: todayStr }
  }

  return { from: customFrom || todayStr, to: customTo || todayStr }
}

function toCup(amount: number, currency: string, mlcToCup: number, usdToCup: number) {
  if (currency === 'MLC') return amount * mlcToCup
  if (currency === 'USD') return amount * usdToCup
  return amount
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week:  'Semana',
  month: 'Mes',
  custom: 'Personalizado',
}

export default function ReportsPage() {
  const { user, business } = useAuthStore()
  const [period, setPeriod] = useState<Period>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { from, to } = getDateRange(period, customFrom, customTo)

  const { data: rates = [] } = useQuery<{ mlc_to_cup: number; usd_to_cup: number }>(
    `SELECT mlc_to_cup, usd_to_cup FROM exchange_rates WHERE business_id = ? LIMIT 1`,
    [user?.business_id]
  )
  const mlcToCup = rates[0]?.mlc_to_cup ?? 1
  const usdToCup = rates[0]?.usd_to_cup ?? 1

  const { data: rows = [] } = useQuery<ReportRow>(
    `SELECT p.name, p.category, p.currency,
            SUM(si.quantity) as units_sold,
            SUM(si.subtotal) as revenue,
            SUM(si.quantity * si.unit_cost_price) as cogs,
            SUM(si.subtotal - si.quantity * si.unit_cost_price) as gross_profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.business_id = ?
       AND DATE(s.created_at) >= ?
       AND DATE(s.created_at) <= ?
     GROUP BY p.id
     ORDER BY revenue DESC`,
    [user?.business_id, from, to]
  )

  const totals = useMemo(() => {
    const revCup = rows.reduce((s, r) => s + toCup(r.revenue, r.currency, mlcToCup, usdToCup), 0)
    const cogsCup = rows.reduce((s, r) => s + toCup(r.cogs, r.currency, mlcToCup, usdToCup), 0)
    const gpCup = revCup - cogsCup
    const margin = revCup > 0 ? (gpCup / revCup) * 100 : 0
    return { revCup, cogsCup, gpCup, margin }
  }, [rows, mlcToCup, usdToCup])

  const periodLabel = period === 'custom'
    ? `${from} al ${to}`
    : `${PERIOD_LABELS[period]} (${from}${from !== to ? ` al ${to}` : ''})`

  const handlePdf = () => {
    if (!business) return
    exportReportPdf({ business, rows, period: periodLabel, mlcToCup, usdToCup })
  }

  const handleCsv = () => {
    if (!business) return
    exportReportCsv({ business, rows, period: periodLabel, mlcToCup, usdToCup })
  }

  const handleDailySummary = () => {
    if (!business) return
    exportDailySummaryPdf({ business, rows, period: periodLabel, mlcToCup, usdToCup })
  }

  const profitColor = totals.margin >= 30 ? 'text-moss' : totals.margin >= 15 ? 'text-ember' : 'text-destructive'
  const profitBg = totals.margin >= 30 ? 'bg-moss/10' : totals.margin >= 15 ? 'bg-ember/10' : 'bg-destructive/10'

  return (
    <div className="space-y-4">
      {/* Period tabs */}
      <div className="flex gap-1 bg-sand p-1 rounded-xl border border-border">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p
                ? 'bg-cream text-ink shadow-sm border border-border'
                : 'text-muted-foreground hover:text-ink'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
          />
          <span className="text-muted-foreground text-sm">al</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
          />
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-terracotta/10 rounded-xl p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-terracotta/70 mb-1">Ingresos</p>
          <p className="text-sm font-bold font-display text-terracotta">{totals.revCup.toFixed(0)}</p>
          <p className="text-[10px] font-mono text-terracotta/70">CUP equiv.</p>
        </div>
        <div className="bg-sand rounded-xl p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">COGS</p>
          <p className="text-sm font-bold font-display text-ink/70">{totals.cogsCup.toFixed(0)}</p>
          <p className="text-[10px] font-mono text-muted-foreground">CUP equiv.</p>
        </div>
        <div className={`rounded-xl p-3 ${profitBg}`}>
          <p className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${profitColor}`}>Ganancia</p>
          <p className={`text-sm font-bold font-display ${profitColor}`}>{totals.gpCup.toFixed(0)}</p>
          <p className={`text-[10px] font-mono ${profitColor}`}>{totals.margin.toFixed(1)}% margen</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDailySummary}
          disabled={rows.length === 0}
          className="flex-1 border border-border text-ink py-2 rounded-xl text-xs font-medium hover:bg-sand disabled:opacity-40 transition-colors"
        >
          Resumen PDF
        </button>
        <button
          onClick={handlePdf}
          disabled={rows.length === 0}
          className="flex-1 border border-border text-ink py-2 rounded-xl text-xs font-medium hover:bg-sand disabled:opacity-40 transition-colors"
        >
          COGS PDF
        </button>
        <button
          onClick={handleCsv}
          disabled={rows.length === 0}
          className="flex-1 border border-border text-ink py-2 rounded-xl text-xs font-medium hover:bg-sand disabled:opacity-40 transition-colors"
        >
          CSV
        </button>
      </div>

      {/* COGS table */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">
          No hay ventas en este período.
        </p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-sand border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground">Producto</th>
                  <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">Uds.</th>
                  <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">Ingresos</th>
                  <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">COGS</th>
                  <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">Ganancia</th>
                  <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const margin = r.revenue > 0 ? (r.gross_profit / r.revenue) * 100 : 0
                  const mc = margin >= 30 ? 'text-moss' : margin >= 15 ? 'text-ember' : 'text-destructive'
                  return (
                    <tr key={i} className="hover:bg-sand/50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-ink truncate max-w-[140px]">{r.name}</p>
                        {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
                      </td>
                      <td className="px-3 py-2 text-right text-ink/70 font-mono">{r.units_sold.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right text-ink font-medium whitespace-nowrap font-mono">
                        {r.revenue.toFixed(2)} <span className="text-xs text-muted-foreground">{r.currency}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap font-mono">
                        {r.cogs.toFixed(2)} <span className="text-xs">{r.currency}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap text-ink font-mono">
                        {r.gross_profit.toFixed(2)} <span className="text-xs text-muted-foreground">{r.currency}</span>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold font-mono ${mc}`}>
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-sand">
                <tr>
                  <td className="px-3 py-2 text-xs font-semibold text-ink font-mono uppercase tracking-widest">
                    TOTAL CUP equiv.
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-ink font-mono">
                    {rows.reduce((s, r) => s + r.units_sold, 0).toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-ink font-mono">
                    {totals.revCup.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground font-mono">
                    {totals.cogsCup.toFixed(0)}
                  </td>
                  <td className={`px-3 py-2 text-right text-xs font-bold font-mono ${totals.gpCup >= 0 ? 'text-moss' : 'text-destructive'}`}>
                    {totals.gpCup.toFixed(0)}
                  </td>
                  <td className={`px-3 py-2 text-right text-xs font-bold font-mono ${totals.margin >= 30 ? 'text-moss' : totals.margin >= 15 ? 'text-ember' : 'text-destructive'}`}>
                    {totals.margin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
