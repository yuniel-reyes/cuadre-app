import { useState } from 'react'
import { useQuery } from '@powersync/react'
import { db } from '../lib/powersync'
import { useAuthStore } from '../store/authStore'
import { generateReceiptPng, shareReceipt } from '../lib/receiptPng'
import type { CartItem } from './QuantityModal'

interface Props {
  cart: CartItem[]
  shiftId: string | null
  onConfirm: () => void
  onClose: () => void
}

interface ExchangeRate {
  mlc_to_cup: number
  usd_to_cup: number
}

interface PaymentState {
  cup: string
  usd: string
  mlc: string
  transfer: string
}

const METHODS = [
  { key: 'cup',      label: 'Efectivo CUP',   currency: 'CUP', cash: true  },
  { key: 'usd',      label: 'Efectivo USD',   currency: 'USD', cash: true  },
  { key: 'mlc',      label: 'MLC',            currency: 'MLC', cash: false },
  { key: 'transfer', label: 'Transferencia',  currency: 'CUP', cash: false },
] as const

type MethodKey = typeof METHODS[number]['key']

export default function PaymentModal({ cart, shiftId, onConfirm, onClose }: Props) {
  const { user, business } = useAuthStore()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null)
  const [payments, setPayments] = useState<PaymentState>({ cup: '', usd: '', mlc: '', transfer: '' })
  const [vueltoSnap, setVueltoSnap] = useState<{ amount: number; inUsd: boolean } | null>(null)

  const { data: rates = [] } = useQuery<ExchangeRate>(
    `SELECT mlc_to_cup, usd_to_cup FROM exchange_rates WHERE business_id = ? LIMIT 1`,
    [user?.business_id]
  )
  const rate = rates[0]
  const mlcToCup = rate?.mlc_to_cup ?? 1
  const usdToCup = rate?.usd_to_cup ?? 1

  // Product price totals by currency (for DB storage + display breakdown)
  const totalsByCurrency: Record<string, number> = {}
  for (const item of cart) {
    totalsByCurrency[item.currency] = (totalsByCurrency[item.currency] ?? 0) + item.subtotal
  }

  // Total owed — everything in CUP
  const totalCup =
    (totalsByCurrency['CUP'] ?? 0) +
    (totalsByCurrency['MLC'] ?? 0) * mlcToCup +
    (totalsByCurrency['USD'] ?? 0) * usdToCup

  // Helpers
  const toCup = (key: MethodKey, val: number) => {
    if (key === 'usd') return val * usdToCup
    if (key === 'mlc') return val * mlcToCup
    return val
  }
  const val = (key: MethodKey) => parseFloat(payments[key]) || 0
  const totalEntregadoCup = METHODS.reduce((s, m) => s + toCup(m.key, val(m.key)), 0)
  const vueltoCup = totalEntregadoCup > totalCup + 0.005 ? totalEntregadoCup - totalCup : 0

  // Give change in USD if paid entirely in USD cash (no other method used)
  const onlyUsd = val('usd') > 0 && val('cup') === 0 && val('mlc') === 0 && val('transfer') === 0
  const vueltoUsd = onlyUsd && vueltoCup > 0 ? vueltoCup / usdToCup : 0

  const setPayment = (key: MethodKey, v: string) =>
    setPayments((p) => ({ ...p, [key]: v }))

  const handleConfirm = async () => {
    if (!user || !business) return
    setConfirming(true)

    setVueltoSnap(
      vueltoCup > 0.005
        ? { amount: vueltoUsd > 0.005 ? vueltoUsd : vueltoCup, inUsd: vueltoUsd > 0.005 }
        : null
    )

    const saleId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO sales
         (id, business_id, shift_id, cashier_id,
          total_cup, total_mlc, total_usd, created_at,
          paid_cup, paid_usd, paid_mlc, paid_transfer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId, business.id, shiftId, user.id,
        totalsByCurrency['CUP'] ?? 0,
        totalsByCurrency['MLC'] ?? 0,
        totalsByCurrency['USD'] ?? 0,
        now,
        val('cup'), val('usd'), val('mlc'), val('transfer'),
      ]
    )

    for (const item of cart) {
      await db.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, unit_cost_price, currency, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), saleId, item.product.id,
          item.quantity, item.unitPrice, item.product.cost_price,
          item.currency, item.subtotal,
        ]
      )
      await db.execute(
        `UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?`,
        [item.quantity, item.product.id]
      )
    }

    const blob = await generateReceiptPng({
      business,
      cashierName: user.name,
      items: cart.map((c) => ({
        name: c.product.name, quantity: c.quantity,
        unitPrice: c.unitPrice, currency: c.currency, subtotal: c.subtotal,
      })),
      totalsByCurrency,
      totalCup,
      mlcToCup,
      usdToCup,
    })

    setReceiptBlob(blob)
    setConfirming(false)
    setDone(true)
  }

  const handleShare = async () => {
    if (!receiptBlob || !business) return
    setSharing(true)
    const filename = `venta_${business.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`
    await shareReceipt(receiptBlob, filename)
    setSharing(false)
  }

  const handlePrint = () => {
    if (!receiptBlob) return
    const url = URL.createObjectURL(receiptBlob)
    const win = window.open(url, '_blank')
    if (win) win.onload = () => { win.print(); URL.revokeObjectURL(url) }
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-5 text-center border border-border">
          <div className="w-16 h-16 bg-moss/15 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <p className="font-display font-bold text-ink text-lg">Venta registrada</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Total: {totalCup.toFixed(0)} CUP
            </p>
          </div>

          {vueltoSnap && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-mono uppercase tracking-widest text-amber-700">Vuelto a entregar</p>
              <p className="text-2xl font-display font-bold text-amber-800">
                {vueltoSnap.amount.toFixed(vueltoSnap.inUsd ? 2 : 0)}{' '}
                <span className="text-base font-normal">{vueltoSnap.inUsd ? 'USD' : 'CUP'}</span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!receiptBlob}
              className="px-3 py-3 border border-border text-ink rounded-xl hover:bg-sand disabled:opacity-50 transition-colors"
              title="Imprimir tiket"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            </button>
            <button
              onClick={handleShare}
              disabled={sharing || !receiptBlob}
              className="flex-1 border border-border text-ink py-3 rounded-xl font-medium text-sm hover:bg-sand disabled:opacity-50 transition-colors"
            >
              {sharing ? 'Compartiendo...' : 'Compartir'}
            </button>
            <button
              onClick={() => { onConfirm(); onClose() }}
              className="flex-1 bg-terracotta text-cream py-3 rounded-xl font-medium text-sm hover:bg-ember transition-colors"
            >
              Nueva venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Payment screen ───────────────────────────────────────────────────────
  const hasMlcItems = (totalsByCurrency['MLC'] ?? 0) > 0
  const hasUsdItems = (totalsByCurrency['USD'] ?? 0) > 0

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl max-h-[90svh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-ink">Cobrar</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Cart items */}
          <div className="p-4 space-y-2">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.quantity} × {item.unitPrice.toFixed(2)} {item.currency}
                  </p>
                </div>
                <span className="text-sm font-medium text-ink shrink-0 ml-3 font-mono">
                  {item.subtotal.toFixed(2)} {item.currency}
                </span>
              </div>
            ))}
          </div>

          {/* Total a cobrar */}
          <div className="px-4 pb-3 border-t border-border pt-3 space-y-1">
            {(hasMlcItems || hasUsdItems) && (
              <div className="space-y-0.5 mb-2">
                {hasMlcItems && (
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{(totalsByCurrency['MLC'] ?? 0).toFixed(2)} MLC × {mlcToCup} =</span>
                    <span>{((totalsByCurrency['MLC'] ?? 0) * mlcToCup).toFixed(0)} CUP</span>
                  </div>
                )}
                {hasUsdItems && (
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{(totalsByCurrency['USD'] ?? 0).toFixed(2)} USD × {usdToCup} =</span>
                    <span>{((totalsByCurrency['USD'] ?? 0) * usdToCup).toFixed(0)} CUP</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-ink">Total a cobrar</span>
              <span className="text-xl font-display font-bold text-terracotta font-mono">
                {totalCup.toFixed(0)} CUP
              </span>
            </div>
            {shiftId && <p className="text-xs text-moss">Vinculado al turno activo</p>}
          </div>

          {/* Métodos de pago */}
          <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Método de pago
            </p>

            {METHODS.map((m) => {
              const amount = val(m.key)
              const cupEquiv = toCup(m.key, amount)
              const showConversion = amount > 0 && (m.key === 'usd' || m.key === 'mlc')

              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink w-32 shrink-0">{m.label}</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step={m.key === 'cup' || m.key === 'transfer' ? '1' : '0.01'}
                        min="0"
                        placeholder="0"
                        value={payments[m.key]}
                        onChange={(e) => setPayment(m.key, e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-terracotta font-mono text-right pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {m.currency}
                      </span>
                    </div>
                  </div>
                  {showConversion && (
                    <p className="text-xs text-muted-foreground font-mono text-right">
                      = {cupEquiv.toFixed(0)} CUP
                    </p>
                  )}
                </div>
              )
            })}

            {/* Totals summary */}
            {totalEntregadoCup > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total entregado</span>
                  <span className="font-mono font-medium text-ink">{totalEntregadoCup.toFixed(0)} CUP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendiente</span>
                  <span className={`font-mono font-medium ${totalEntregadoCup >= totalCup - 0.005 ? 'text-moss' : 'text-destructive'}`}>
                    {Math.max(0, totalCup - totalEntregadoCup).toFixed(0)} CUP
                  </span>
                </div>
              </div>
            )}

            {/* Vuelto — solo CUP o USD, nunca MLC */}
            {vueltoCup > 0.005 && (
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-amber-700">Vuelto</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Solo en CUP o USD</p>
                </div>
                <div className="text-right">
                  {vueltoUsd > 0.005 ? (
                    <>
                      <p className="text-xl font-display font-bold text-amber-800">
                        {vueltoUsd.toFixed(2)} <span className="text-sm font-normal">USD</span>
                      </p>
                      <p className="text-xs text-amber-600 font-mono">≈ {vueltoCup.toFixed(0)} CUP</p>
                    </>
                  ) : (
                    <p className="text-xl font-display font-bold text-amber-800">
                      {vueltoCup.toFixed(0)} <span className="text-sm font-normal">CUP</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-terracotta text-cream py-3 rounded-xl font-bold text-base hover:bg-ember disabled:opacity-50 transition-colors"
          >
            {confirming ? 'Registrando...' : 'Confirmar venta →'}
          </button>
        </div>
      </div>
    </div>
  )
}
