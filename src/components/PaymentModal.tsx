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

export default function PaymentModal({ cart, shiftId, onConfirm, onClose }: Props) {
  const { user, business } = useAuthStore()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null)

  const { data: rates = [] } = useQuery<ExchangeRate>(
    `SELECT mlc_to_cup, usd_to_cup FROM exchange_rates WHERE business_id = ? LIMIT 1`,
    [user?.business_id]
  )
  const rate = rates[0]
  const mlcToCup = rate?.mlc_to_cup ?? 1
  const usdToCup = rate?.usd_to_cup ?? 1

  const totalsByCurrency: Record<string, number> = {}
  for (const item of cart) {
    totalsByCurrency[item.currency] = (totalsByCurrency[item.currency] ?? 0) + item.subtotal
  }

  const totalCup =
    (totalsByCurrency['CUP'] ?? 0) +
    (totalsByCurrency['MLC'] ?? 0) * mlcToCup +
    (totalsByCurrency['USD'] ?? 0) * usdToCup

  const handleConfirm = async () => {
    if (!user || !business) return
    setConfirming(true)

    const saleId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO sales (id, business_id, shift_id, cashier_id, total_cup, total_mlc, total_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId, business.id, shiftId, user.id,
        totalsByCurrency['CUP'] ?? 0,
        totalsByCurrency['MLC'] ?? 0,
        totalsByCurrency['USD'] ?? 0,
        now,
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
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        currency: c.currency,
        subtotal: c.subtotal,
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
              Total: {totalCup.toFixed(0)} CUP equiv.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={sharing || !receiptBlob}
              className="flex-1 border border-border text-ink py-3 rounded-xl font-medium text-sm hover:bg-sand disabled:opacity-50 transition-colors"
            >
              {sharing ? 'Compartiendo...' : 'Compartir recibo'}
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl max-h-[90svh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-ink">Cobrar</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Cart items */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
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

        {/* Totals */}
        <div className="px-4 py-3 border-t border-border space-y-1">
          {Object.entries(totalsByCurrency).map(([currency, total]) => (
            <div key={currency} className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total {currency}</span>
              <span className="font-semibold text-ink font-mono">{total.toFixed(2)} {currency}</span>
            </div>
          ))}
          {Object.keys(totalsByCurrency).length > 1 && (
            <div className="flex justify-between text-xs text-muted-foreground pt-1 font-mono">
              <span>Equivalente CUP</span>
              <span>≈ {totalCup.toFixed(0)} CUP</span>
            </div>
          )}
          {shiftId && (
            <p className="text-xs text-moss pt-1">Venta vinculada al turno activo</p>
          )}
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
