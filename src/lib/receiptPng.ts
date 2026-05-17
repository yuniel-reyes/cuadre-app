import type { Business } from '../types'

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  currency: string
  subtotal: number
}

interface ReceiptParams {
  business: Business
  cashierName: string
  items: ReceiptItem[]
  totalsByCurrency: Record<string, number>
  totalCup: number
  mlcToCup: number
  usdToCup: number
}

const W = 400
const PAD = 24
const LINE_H = 22
const FONT = '14px system-ui, sans-serif'
const FONT_SM = '12px system-ui, sans-serif'
const FONT_BOLD = 'bold 14px system-ui, sans-serif'
const FONT_TITLE = 'bold 20px system-ui, sans-serif'

function measureHeight(params: ReceiptParams): number {
  let h = 80 // header
  h += 20   // separator
  h += params.items.length * LINE_H + 16
  h += 20   // separator
  h += Object.keys(params.totalsByCurrency).length * LINE_H
  h += LINE_H * 2 // CUP total + padding
  h += 40   // footer
  return h + PAD * 2
}

export async function generateReceiptPng(params: ReceiptParams): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = measureHeight(params)
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, canvas.height)

  let y = PAD

  // Business name
  ctx.font = FONT_TITLE
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'center'
  ctx.fillText(params.business.name, W / 2, y + 24)
  y += 32

  // Date + cashier
  ctx.font = FONT_SM
  ctx.fillStyle = '#6b7280'
  ctx.fillText(
    new Date().toLocaleString('es-CU', { dateStyle: 'medium', timeStyle: 'short' }),
    W / 2, y + 16
  )
  y += 22
  ctx.fillText(`Cajero: ${params.cashierName}`, W / 2, y + 14)
  y += 22

  // Separator
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 16

  // Items
  ctx.textAlign = 'left'
  for (const item of params.items) {
    ctx.font = FONT
    ctx.fillStyle = '#111827'
    const nameMax = 200
    let name = item.name
    ctx.font = FONT
    while (ctx.measureText(name).width > nameMax && name.length > 4) {
      name = name.slice(0, -1)
    }
    if (name !== item.name) name += '…'
    ctx.fillText(name, PAD, y + 16)

    ctx.font = FONT_SM
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`${item.quantity} × ${item.unitPrice.toFixed(2)} ${item.currency}`, PAD, y + 30)

    ctx.font = FONT_BOLD
    ctx.fillStyle = '#111827'
    ctx.textAlign = 'right'
    ctx.fillText(`${item.subtotal.toFixed(2)} ${item.currency}`, W - PAD, y + 22)
    ctx.textAlign = 'left'
    y += LINE_H + 10
  }

  // Separator
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 14

  // Totals by currency
  for (const [currency, total] of Object.entries(params.totalsByCurrency)) {
    ctx.font = FONT_BOLD
    ctx.fillStyle = '#111827'
    ctx.textAlign = 'left'
    ctx.fillText(`Total ${currency}`, PAD, y + 16)
    ctx.textAlign = 'right'
    ctx.fillText(`${total.toFixed(2)} ${currency}`, W - PAD, y + 16)
    ctx.textAlign = 'left'
    y += LINE_H
  }

  // CUP equivalent (if multi-currency)
  if (Object.keys(params.totalsByCurrency).length > 1 || !params.totalsByCurrency['CUP']) {
    ctx.font = FONT_SM
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'right'
    ctx.fillText(`≈ ${params.totalCup.toFixed(0)} CUP total`, W - PAD, y + 14)
    ctx.textAlign = 'left'
    y += LINE_H
  }

  // Footer
  y += 16
  ctx.font = FONT_SM
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'center'
  ctx.fillText('Cuadre — cuadreapp.com', W / 2, y + 14)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/png')
  })
}

export async function shareReceipt(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Recibo de venta' })
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
