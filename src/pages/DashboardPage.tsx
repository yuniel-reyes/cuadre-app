import { useQuery } from '@powersync/react'
import { useAuthStore } from '../store/authStore'

interface CurrencyStat {
  currency: string
  revenue: number
  cogs: number
}

interface TopProduct {
  name: string
  currency: string
  units_sold: number
  revenue: number
  gross_profit: number
}

interface PendingShift {
  count: number
}

function toCup(amount: number, currency: string, mlcToCup: number, usdToCup: number) {
  if (currency === 'MLC') return amount * mlcToCup
  if (currency === 'USD') return amount * usdToCup
  return amount
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const { data: rates = [] } = useQuery<{ mlc_to_cup: number; usd_to_cup: number; updated_at: string }>(
    `SELECT mlc_to_cup, usd_to_cup, updated_at FROM exchange_rates WHERE business_id = ? LIMIT 1`,
    [user?.business_id]
  )
  const mlcToCup = rates[0]?.mlc_to_cup ?? 1
  const usdToCup = rates[0]?.usd_to_cup ?? 1
  const rateUpdatedDay = rates[0]?.updated_at?.split('T')[0] ?? null
  const rateIsStale = rateUpdatedDay !== null && rateUpdatedDay !== today

  const { data: stats = [] } = useQuery<CurrencyStat>(
    `SELECT si.currency,
            SUM(si.subtotal) as revenue,
            SUM(si.quantity * si.unit_cost_price) as cogs
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.business_id = ? AND DATE(s.created_at) = ?
     GROUP BY si.currency`,
    [user?.business_id, today]
  )

  const { data: topProducts = [] } = useQuery<TopProduct>(
    `SELECT p.name, p.currency,
            SUM(si.quantity) as units_sold,
            SUM(si.subtotal) as revenue,
            SUM(si.subtotal - si.quantity * si.unit_cost_price) as gross_profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.business_id = ? AND DATE(s.created_at) = ?
     GROUP BY p.id
     ORDER BY revenue DESC
     LIMIT 5`,
    [user?.business_id, today]
  )

  const { data: pendingData = [] } = useQuery<PendingShift>(
    `SELECT COUNT(*) as count FROM shifts WHERE business_id = ? AND status = 'pending_review'`,
    [user?.business_id]
  )
  const pendingCount = pendingData[0]?.count ?? 0

  const { data: lowStockData = [] } = useQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM products
     WHERE business_id = ? AND active = 1 AND min_stock > 0 AND current_stock <= min_stock`,
    [user?.business_id]
  )
  const lowStockCount = lowStockData[0]?.count ?? 0

  const totalRevenueCup = stats.reduce((s, r) => s + toCup(r.revenue, r.currency, mlcToCup, usdToCup), 0)
  const totalCogsCup = stats.reduce((s, r) => s + toCup(r.cogs, r.currency, mlcToCup, usdToCup), 0)
  const grossProfitCup = totalRevenueCup - totalCogsCup
  const marginPct = totalRevenueCup > 0 ? (grossProfitCup / totalRevenueCup) * 100 : 0

  const dateLabel = new Date().toLocaleDateString('es-CU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const noSalesYet = stats.length === 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink capitalize">{dateLabel}</h2>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Resumen de hoy</p>
        </div>
      </div>

      {/* Alerts */}
      {(rateIsStale || pendingCount > 0 || lowStockCount > 0) && (
        <div className="space-y-2">
          {rateIsStale && (
            <div className="bg-ember/10 border border-ember/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <svg className="w-4 h-4 text-ember shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-ink/80 flex-1">
                Tasa de cambio desactualizada — actualiza antes de vender
              </span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="bg-ember/10 border border-ember/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-ink/80">
                {pendingCount} turno{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de revisión
              </span>
              <span className="text-ember text-xs font-medium font-mono">Ver Turnos →</span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5">
              <span className="text-sm text-ink/80">
                {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          label="Ingresos"
          value={totalRevenueCup.toFixed(0)}
          unit="CUP"
          sub={stats.length > 1 ? stats.map((s) => `${s.revenue.toFixed(0)} ${s.currency}`).join(' · ') : undefined}
          variant="primary"
        />
        <KpiCard
          label="COGS"
          value={totalCogsCup.toFixed(0)}
          unit="CUP"
          variant="neutral"
        />
        <KpiCard
          label="Ganancia"
          value={grossProfitCup.toFixed(0)}
          unit="CUP"
          sub={totalRevenueCup > 0 ? `${marginPct.toFixed(1)}% margen` : undefined}
          variant={marginPct >= 30 ? 'good' : marginPct >= 15 ? 'warn' : 'bad'}
        />
      </div>

      {/* Top products */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          {noSalesYet ? 'Sin ventas hoy' : 'Top productos hoy'}
        </h3>

        {noSalesYet ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">
            Las ventas del día aparecerán aquí.
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {topProducts.map((p, i) => {
              const margin = p.revenue > 0 ? (p.gross_profit / p.revenue) * 100 : 0
              const marginColor = margin >= 30 ? 'text-moss' : margin >= 15 ? 'text-ember' : 'text-destructive'
              return (
                <div key={i} className={`flex items-center px-4 py-3 gap-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <span className="font-mono text-xs font-bold text-ink/20 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.units_sold.toFixed(0)} uds.</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink">
                      {p.revenue.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">{p.currency}</span>
                    </p>
                    <p className={`text-xs font-medium ${marginColor}`}>{margin.toFixed(0)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type KpiVariant = 'primary' | 'neutral' | 'good' | 'warn' | 'bad'

const KPI_STYLES: Record<KpiVariant, { bg: string; value: string; label: string }> = {
  primary: { bg: 'bg-terracotta/10', value: 'text-terracotta',   label: 'text-terracotta/70' },
  neutral: { bg: 'bg-sand',          value: 'text-ink/70',        label: 'text-muted-foreground' },
  good:    { bg: 'bg-moss/10',       value: 'text-moss',          label: 'text-moss/70' },
  warn:    { bg: 'bg-ember/10',      value: 'text-ember',         label: 'text-ember/70' },
  bad:     { bg: 'bg-destructive/10',value: 'text-destructive',   label: 'text-destructive/70' },
}

function KpiCard({ label, value, unit, sub, variant }: {
  label: string
  value: string
  unit: string
  sub?: string
  variant: KpiVariant
}) {
  const s = KPI_STYLES[variant]
  return (
    <div className={`${s.bg} rounded-xl p-3`}>
      <p className={`text-[10px] font-mono uppercase tracking-widest ${s.label} mb-1`}>{label}</p>
      <p className={`text-base font-bold ${s.value} leading-tight font-display`}>{value}</p>
      <p className={`text-[10px] font-mono ${s.label}`}>{unit}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
    </div>
  )
}
