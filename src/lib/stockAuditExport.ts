import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import type { Business } from '../types'

export interface AuditProduct {
  id: string
  name: string
  category: string
  unit: string
  sale_price: number
  cost_price: number
  currency: string
  current_stock: number
  min_stock: number
}

export interface DayMovement {
  product_id: string
  day: string
  entradas_stock: number   // from stock_movements (supervisor)
  salidas_stock: number    // from stock_movements (supervisor)
  entradas_cuadre: number  // from cuadre_items shifts
  salidas_cuadre: number   // from cuadre_items shifts
  vendidas: number         // from sale_items
  notas: string[]          // movement notes for that day
}

export interface AuditParams {
  business: Business
  products: AuditProduct[]
  movements: DayMovement[]
  dateFrom: string
  dateTo: string
}

// Aggregate movements per product over the full period
function sumForProduct(movements: DayMovement[], productId: string) {
  const rows = movements.filter((m) => m.product_id === productId)
  return rows.reduce(
    (acc, m) => ({
      entradas: acc.entradas + m.entradas_stock + m.entradas_cuadre,
      salidas:  acc.salidas  + m.salidas_stock  + m.salidas_cuadre,
      vendidas: acc.vendidas + m.vendidas,
    }),
    { entradas: 0, salidas: 0, vendidas: 0 }
  )
}

export function exportStockAuditPdf({ business, products, movements, dateFrom, dateTo }: AuditParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const period = dateFrom === dateTo ? dateFrom : `${dateFrom} al ${dateTo}`
  const generated = new Date().toLocaleString('es-CU')

  // ── Portada / encabezado ───────────────────────────────────────────────────
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('AUDITORÍA DE STOCK', 14, 15)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Negocio: ${business.name}`, 14, 22)
  doc.text(`Período: ${period}`, 14, 28)
  doc.text(`Generado: ${generated}`, 14, 34)
  doc.text(`Tipo negocio: ${business.type}`, 14, 40)

  // Leyenda columnas en blanco
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Las columnas "Conteo Físico" y "Diferencia" están en blanco para completar manualmente durante la auditoría.', 14, 46)
  doc.setTextColor(0, 0, 0)

  // ── Tabla resumen ─────────────────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMEN DE INVENTARIO', 14, 55)

  const summaryBody = products.map((p) => {
    const { entradas, salidas, vendidas } = sumForProduct(movements, p.id)
    const lowStock = p.min_stock > 0 && p.current_stock <= p.min_stock
    return [
      p.name,
      p.category || '—',
      p.unit,
      `${p.sale_price.toFixed(2)} ${p.currency}`,
      `${p.cost_price.toFixed(2)} ${p.currency}`,
      p.min_stock > 0 ? String(p.min_stock) : '—',
      { content: String(p.current_stock), styles: { fontStyle: 'bold' as const, textColor: lowStock ? [220, 38, 38] as [number,number,number] : [17, 24, 39] as [number,number,number] } },
      entradas > 0 ? `+${entradas}` : '—',
      salidas > 0  ? `-${salidas}`  : '—',
      vendidas > 0 ? String(vendidas) : '—',
      '',  // Conteo físico — en blanco
      '',  // Diferencia — en blanco
    ]
  })

  autoTable(doc, {
    startY: 58,
    head: [[
      'Producto', 'Categoría', 'Unidad',
      'P.Venta', 'P.Costo', 'Mín.',
      'Stock\nActual',
      'Entradas\nPeríodo', 'Salidas\nPeríodo', 'Vendidas\nPeríodo',
      'Conteo\nFísico', 'Diferencia',
    ]],
    body: summaryBody,
    headStyles: { fillColor: [30, 58, 30], textColor: 255, fontSize: 7, halign: 'center' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 26 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 13, halign: 'center' },
      6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 18, halign: 'center' },
      9: { cellWidth: 18, halign: 'center' },
      10: { cellWidth: 22, halign: 'center', fillColor: [250, 250, 220] },
      11: { cellWidth: 22, halign: 'center', fillColor: [250, 250, 220] },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    foot: [[
      { content: `Total: ${products.length} productos`, colSpan: 6, styles: { fontStyle: 'bold' } },
      {
        content: String(products.reduce((s, p) => s + p.current_stock, 0).toFixed(0)),
        styles: { fontStyle: 'bold', halign: 'center' },
      },
      {
        content: `+${movements.reduce((s, m) => s + m.entradas_stock + m.entradas_cuadre, 0)}`,
        styles: { fontStyle: 'bold', halign: 'center' },
      },
      {
        content: `-${movements.reduce((s, m) => s + m.salidas_stock + m.salidas_cuadre, 0)}`,
        styles: { fontStyle: 'bold', halign: 'center' },
      },
      {
        content: String(movements.reduce((s, m) => s + m.vendidas, 0).toFixed(0)),
        styles: { fontStyle: 'bold', halign: 'center' },
      },
      { content: '', colSpan: 2 },
    ]],
    footStyles: { fillColor: [235, 235, 235], fontSize: 7.5 },
  })

  // ── Detalle de movimientos por día ────────────────────────────────────────
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const hasMovements = movements.length > 0

  if (hasMovements) {
    // Get all days in range
    const days = [...new Set(movements.map((m) => m.day))].sort()

    let startY = finalY + 10
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')

    // Check if we need a new page
    if (startY > 175) {
      doc.addPage()
      startY = 14
    }

    doc.text('DETALLE DE MOVIMIENTOS POR DÍA', 14, startY)

    const detailBody: (string | { content: string; styles: object })[][] = []

    for (const day of days) {
      const dayMovements = movements.filter((m) => m.day === day)
      if (dayMovements.length === 0) continue

      // Day header row
      detailBody.push([
        {
          content: `— ${new Date(day + 'T12:00:00').toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' })} —`,
          colSpan: 7,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [30, 30, 30] },
        } as unknown as string,
        '', '', '', '', '', '',
      ])

      for (const m of dayMovements) {
        const prod = products.find((p) => p.id === m.product_id)
        if (!prod) continue

        const entradasTotal = m.entradas_stock + m.entradas_cuadre
        const salidasTotal  = m.salidas_stock  + m.salidas_cuadre
        const notas = m.notas.filter(Boolean).join(' · ')

        if (entradasTotal === 0 && salidasTotal === 0 && m.vendidas === 0) continue

        detailBody.push([
          prod.name,
          prod.category || '—',
          entradasTotal > 0 ? { content: `+${entradasTotal}`, styles: { textColor: [22, 163, 74] } } : '—',
          salidasTotal > 0  ? { content: `-${salidasTotal}`,  styles: { textColor: [220, 38, 38] } } : '—',
          m.vendidas > 0    ? String(m.vendidas) : '—',
          m.entradas_cuadre > 0 || m.salidas_cuadre > 0 ? 'Cuadre' : m.entradas_stock > 0 || m.salidas_stock > 0 ? 'Stock manual' : '—',
          notas || '—',
        ])
      }
    }

    autoTable(doc, {
      startY: startY + 4,
      head: [['Producto', 'Categoría', 'Entradas', 'Salidas', 'Vendidas', 'Origen', 'Nota']],
      body: detailBody,
      headStyles: { fillColor: [30, 58, 30], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 28 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 28 },
        6: { cellWidth: 'auto' as unknown as number },
      },
    })
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `${business.name} · Auditoría de Stock · ${period} · Pág. ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
  }
  doc.setTextColor(0)

  const filename = `auditoria_stock_${business.name.replace(/\s+/g, '_')}_${dateFrom}.pdf`
  doc.save(filename)
}

export function exportStockAuditCsv({ business, products, movements, dateFrom, dateTo }: AuditParams) {
  const period = `${dateFrom}_${dateTo}`
  const rows: Record<string, string | number>[] = []

  for (const p of products) {
    const { entradas, salidas, vendidas } = sumForProduct(movements, p.id)

    // Summary row
    rows.push({
      Tipo: 'RESUMEN',
      Producto: p.name,
      Categoría: p.category || '',
      Unidad: p.unit,
      'Precio Venta': p.sale_price,
      'Precio Costo': p.cost_price,
      Moneda: p.currency,
      'Stock Mínimo': p.min_stock,
      'Stock Actual': p.current_stock,
      [`Entradas (${period})`]: entradas,
      [`Salidas (${period})`]: salidas,
      [`Vendidas (${period})`]: vendidas,
      'Conteo Físico': '',
      Diferencia: '',
      Día: '',
      Origen: '',
      Nota: '',
    })

    // Daily detail rows
    const productMovements = movements.filter((m) => m.product_id === p.id)
    for (const m of productMovements) {
      const entradasDay = m.entradas_stock + m.entradas_cuadre
      const salidasDay  = m.salidas_stock  + m.salidas_cuadre
      if (entradasDay === 0 && salidasDay === 0 && m.vendidas === 0) continue
      rows.push({
        Tipo: 'DETALLE',
        Producto: p.name,
        Categoría: p.category || '',
        Unidad: p.unit,
        'Precio Venta': '',
        'Precio Costo': '',
        Moneda: p.currency,
        'Stock Mínimo': '',
        'Stock Actual': '',
        [`Entradas (${period})`]: entradasDay || '',
        [`Salidas (${period})`]: salidasDay || '',
        [`Vendidas (${period})`]: m.vendidas || '',
        'Conteo Físico': '',
        Diferencia: '',
        Día: m.day,
        Origen: entradasDay > 0 || salidasDay > 0 ? (m.entradas_stock > 0 || m.salidas_stock > 0 ? 'Stock manual' : 'Cuadre') : 'Venta',
        Nota: m.notas.filter(Boolean).join(' | '),
      })
    }
  }

  const csv = Papa.unparse(rows)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `auditoria_stock_${business.name.replace(/\s+/g, '_')}_${period}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
