import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Business, AppUser } from '../types'

interface PdfRow {
  productName: string
  priceAtShift: number
  currency: string
  inicio: number
  entradas: number
  salidas: number
  aLaVenta: number
  final: number
  vendidas: number
  efectivoEsperado: number
  efectivoDeclarado: number
  discrepancy: number
}

interface ExportParams {
  business: Business
  user: AppUser
  date: string
  rows: PdfRow[]
}

export function exportShiftPdf({ business, user, date, rows }: ExportParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-CU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CUADRE DE TURNO', 14, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Negocio: ${business.name}`, 14, 24)
  doc.text(`Fecha: ${dateFormatted}`, 14, 30)
  doc.text(`Dependiente: ${user.name}`, 14, 36)
  doc.text(`Generado: ${new Date().toLocaleString('es-CU')}`, 14, 42)

  const totalEsperado = rows.reduce((s, r) => s + r.efectivoEsperado, 0)
  const totalDeclarado = rows.reduce((s, r) => s + r.efectivoDeclarado, 0)
  const totalDiff = rows.reduce((s, r) => s + r.discrepancy, 0)

  autoTable(doc, {
    startY: 48,
    head: [[
      'Producto', 'Precio', 'Inicio', 'Entradas', 'Salidas',
      'A/Venta', 'Final', 'Vendidas', 'Ef. Esperado', 'Ef. Declarado', 'Diferencia',
    ]],
    body: rows.map((r) => [
      r.productName,
      `${r.priceAtShift.toFixed(2)} ${r.currency}`,
      r.inicio,
      r.entradas,
      r.salidas,
      r.aLaVenta,
      r.final,
      r.vendidas,
      r.efectivoEsperado.toFixed(2),
      r.efectivoDeclarado.toFixed(2),
      { content: r.discrepancy >= 0 ? `+${r.discrepancy.toFixed(2)}` : r.discrepancy.toFixed(2),
        styles: { textColor: Math.abs(r.discrepancy) > 0.01 ? [220, 38, 38] : [107, 114, 128] } },
    ]),
    foot: [[
      { content: 'TOTAL', colSpan: 8, styles: { fontStyle: 'bold' } },
      { content: totalEsperado.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: totalDeclarado.toFixed(2), styles: { fontStyle: 'bold' } },
      {
        content: totalDiff >= 0 ? `+${totalDiff.toFixed(2)}` : totalDiff.toFixed(2),
        styles: { fontStyle: 'bold', textColor: Math.abs(totalDiff) > 0.01 ? [220, 38, 38] : [22, 163, 74] },
      },
    ]],
    headStyles: { fillColor: [15, 42, 29], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data) => {
      // Highlight rows with discrepancy
      if (data.section === 'body' && data.column.index === 10) {
        const row = rows[data.row.index]
        if (row && Math.abs(row.discrepancy) > 0.01) {
          data.cell.styles.fillColor = [254, 242, 242]
        }
      }
    },
  })

  const filename = `cuadre_${business.name.replace(/\s+/g, '_')}_${date}.pdf`
  doc.save(filename)
}
