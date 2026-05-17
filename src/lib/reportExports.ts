import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import type { Business } from '../types'

export interface ReportRow {
  name: string
  category: string
  currency: string
  units_sold: number
  revenue: number
  cogs: number
  gross_profit: number
}

interface ExportParams {
  business: Business
  rows: ReportRow[]
  period: string
  mlcToCup: number
  usdToCup: number
}

function toCup(amount: number, currency: string, mlcToCup: number, usdToCup: number): number {
  if (currency === 'MLC') return amount * mlcToCup
  if (currency === 'USD') return amount * usdToCup
  return amount
}

export function exportReportPdf({ business, rows, period, mlcToCup, usdToCup }: ExportParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE COGS Y MARGEN', 14, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Negocio: ${business.name}`, 14, 24)
  doc.text(`Periodo: ${period}`, 14, 30)
  doc.text(`Generado: ${new Date().toLocaleString('es-CU')}`, 14, 36)
  if (mlcToCup !== 1) doc.text(`Tasas: 1 MLC = ${mlcToCup} CUP · 1 USD = ${usdToCup} CUP`, 14, 42)

  const totalRevenueCup = rows.reduce((s, r) => s + toCup(r.revenue, r.currency, mlcToCup, usdToCup), 0)
  const totalCogsCup = rows.reduce((s, r) => s + toCup(r.cogs, r.currency, mlcToCup, usdToCup), 0)
  const totalGpCup = totalRevenueCup - totalCogsCup
  const totalMargin = totalRevenueCup > 0 ? (totalGpCup / totalRevenueCup) * 100 : 0

  autoTable(doc, {
    startY: 48,
    head: [['Producto', 'Categoria', 'Moneda', 'Uds.', 'Ingresos', 'COGS', 'Ganancia', 'Margen %']],
    body: rows.map((r) => {
      const margin = r.revenue > 0 ? ((r.gross_profit / r.revenue) * 100).toFixed(1) + '%' : '—'
      const marginColor: [number, number, number] =
        r.revenue > 0 && (r.gross_profit / r.revenue) >= 0.3 ? [22, 163, 74] :
        r.revenue > 0 && (r.gross_profit / r.revenue) >= 0.15 ? [202, 138, 4] :
        [220, 38, 38]
      return [
        r.name,
        r.category || '—',
        r.currency,
        r.units_sold.toFixed(2),
        r.revenue.toFixed(2),
        r.cogs.toFixed(2),
        { content: r.gross_profit.toFixed(2), styles: { textColor: r.gross_profit >= 0 ? [17, 24, 39] : [220, 38, 38] } },
        { content: margin, styles: { textColor: marginColor } },
      ]
    }),
    foot: [[
      { content: 'TOTAL (CUP equiv.)', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: rows.reduce((s, r) => s + r.units_sold, 0).toFixed(0), styles: { fontStyle: 'bold' } },
      { content: totalRevenueCup.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalCogsCup.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalGpCup.toFixed(2), styles: { fontStyle: 'bold', textColor: totalGpCup >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: totalMargin.toFixed(1) + '%', styles: { fontStyle: 'bold' } },
    ]],
    headStyles: { fillColor: [15, 42, 29], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  const filename = `reporte_${business.name.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

export function exportReportCsv({ business, rows, period }: ExportParams) {
  const data = rows.map((r) => ({
    Producto: r.name,
    Categoria: r.category,
    Moneda: r.currency,
    'Unidades Vendidas': r.units_sold,
    'Ingresos': r.revenue.toFixed(2),
    'COGS': r.cogs.toFixed(2),
    'Ganancia Bruta': r.gross_profit.toFixed(2),
    'Margen %': r.revenue > 0 ? ((r.gross_profit / r.revenue) * 100).toFixed(1) : '0',
  }))

  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte_${business.name.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportDailySummaryPdf({
  business,
  rows,
  period,
  mlcToCup,
  usdToCup,
}: ExportParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const totalRevenueCup = rows.reduce((s, r) => s + toCup(r.revenue, r.currency, mlcToCup, usdToCup), 0)
  const totalCogsCup = rows.reduce((s, r) => s + toCup(r.cogs, r.currency, mlcToCup, usdToCup), 0)
  const totalGpCup = totalRevenueCup - totalCogsCup
  const totalMargin = totalRevenueCup > 0 ? (totalGpCup / totalRevenueCup) * 100 : 0

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(business.name, 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Resumen diario — ${period}`, 14, 26)
  doc.text(`Generado: ${new Date().toLocaleString('es-CU')}`, 14, 32)

  // KPI summary box
  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(14, 38, 182, 28, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('INGRESOS', 22, 46)
  doc.text('COGS', 82, 46)
  doc.text('GANANCIA BRUTA', 130, 46)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(`${totalRevenueCup.toFixed(0)} CUP`, 22, 56)
  doc.text(`${totalCogsCup.toFixed(0)} CUP`, 82, 56)
  doc.setTextColor(totalGpCup >= 0 ? 22 : 220, totalGpCup >= 0 ? 163 : 38, totalGpCup >= 0 ? 74 : 38)
  doc.text(`${totalGpCup.toFixed(0)} CUP (${totalMargin.toFixed(1)}%)`, 130, 56)

  doc.setTextColor(17, 24, 39)

  autoTable(doc, {
    startY: 72,
    head: [['Producto', 'Uds.', 'Ingresos', 'COGS', 'Ganancia', 'Margen']],
    body: rows.map((r) => {
      const margin = r.revenue > 0 ? ((r.gross_profit / r.revenue) * 100).toFixed(1) + '%' : '—'
      return [
        r.name,
        r.units_sold.toFixed(0),
        `${r.revenue.toFixed(2)} ${r.currency}`,
        `${r.cogs.toFixed(2)} ${r.currency}`,
        `${r.gross_profit.toFixed(2)} ${r.currency}`,
        margin,
      ]
    }),
    headStyles: { fillColor: [15, 42, 29], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  doc.save(`resumen_diario_${business.name.replace(/\s+/g, '_')}_${period}.pdf`)
}
