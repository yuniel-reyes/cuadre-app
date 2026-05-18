import { db } from './powersync'

async function exec(sql: string, params: unknown[] = []) {
  await db.execute(sql, params)
}

export async function seedDemoData() {
  await db.waitForReady()

  // Idempotent — bail if already seeded
  const existing = await db.getAll<{ id: string }>(
    'SELECT id FROM businesses WHERE id = ?',
    ['demo-business']
  )
  if (existing.length > 0) return

  const now = new Date().toISOString()
  const d = (offset: number) => {
    const date = new Date(Date.now() - offset * 86400000)
    return date.toISOString().split('T')[0]
  }
  const today = d(0)
  const yesterday = d(1)
  const twoDaysAgo = d(2)
  const threeDaysAgo = d(3)

  // ── Business ──────────────────────────────────────────────────────────────
  await exec(
    `INSERT INTO businesses (id, name, type, owner_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['demo-business', 'Cafetería El Rincón', 'cafeteria', 'demo-owner', now]
  )

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = [
    ['demo-owner',       'Carlos Méndez',  'owner'],
    ['demo-supervisor',  'María García',   'supervisor'],
    ['demo-dependiente', 'Luis Torres',    'dependiente'],
  ]
  for (const [id, name, role] of users) {
    await exec(
      `INSERT INTO users (id, business_id, name, role, active) VALUES (?, ?, ?, ?, 1)`,
      [id, 'demo-business', name, role]
    )
  }

  // ── Tasas de cambio ───────────────────────────────────────────────────────
  await exec(
    `INSERT INTO exchange_rates (id, business_id, mlc_to_cup, usd_to_cup, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['demo-rate', 'demo-business', 120, 240, now, 'demo-owner']
  )

  // ── Productos ─────────────────────────────────────────────────────────────
  //           id            name                   category    unit       sale cost  curr  stock  min
  const products: [string, string, string, string, number, number, string, number, number][] = [
    ['demo-p1',  'Café solo',           'Bebidas',  'unidad',   15,   5,  'CUP', 80,  20],
    ['demo-p2',  'Café con leche',      'Bebidas',  'unidad',   25,   8,  'CUP', 60,  15],
    ['demo-p3',  'Refresco lata',       'Bebidas',  'unidad',   50,  20,  'CUP', 30,   8],
    ['demo-p4',  'Agua mineral',        'Bebidas',  'unidad',   20,   6,  'CUP', 40,  10],
    ['demo-p5',  'Jugo natural',        'Bebidas',  'unidad',   35,  10,  'CUP', 25,   5],
    ['demo-p6',  'Bocadito jamón',      'Comidas',  'unidad',   55,  18,  'CUP', 20,   5],
    ['demo-p7',  'Croqueta de pollo',   'Comidas',  'unidad',   25,   8,  'CUP', 40,  10],
    ['demo-p8',  'Pan con mantequilla', 'Comidas',  'unidad',   15,   4,  'CUP', 35,   8],
    ['demo-p9',  'Helado de vainilla',  'Postres',  'unidad',   40,  12,  'CUP', 15,   3],
    ['demo-p10', 'Flan',                'Postres',  'unidad',   30,   9,  'CUP',  8,   3],
  ]
  for (const [id, name, category, unit, sale_price, cost_price, currency, current_stock, min_stock] of products) {
    await exec(
      `INSERT INTO products (id, business_id, name, category, unit, sale_price, cost_price, currency, current_stock, min_stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, 'demo-business', name, category, unit, sale_price, cost_price, currency, current_stock, min_stock]
    )
  }

  // ── Turnos ────────────────────────────────────────────────────────────────
  // Hoy: abierto
  await exec(
    `INSERT INTO shifts (id, business_id, dependiente_id, date, status, opened_at, closed_at, notes, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
    ['demo-shift-today', 'demo-business', 'demo-dependiente', today, 'open', `${today}T08:00:00.000Z`]
  )
  // Ayer: cerrado y aprobado
  await exec(
    `INSERT INTO shifts (id, business_id, dependiente_id, date, status, opened_at, closed_at, notes, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['demo-shift-yesterday', 'demo-business', 'demo-dependiente', yesterday, 'closed',
     `${yesterday}T08:00:00.000Z`, `${yesterday}T22:00:00.000Z`, 'Sin novedad', 'demo-supervisor']
  )
  // Hace 2 días: pendiente revisión
  await exec(
    `INSERT INTO shifts (id, business_id, dependiente_id, date, status, opened_at, closed_at, notes, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ['demo-shift-2d', 'demo-business', 'demo-dependiente', twoDaysAgo, 'pending_review',
     `${twoDaysAgo}T08:00:00.000Z`, `${twoDaysAgo}T21:30:00.000Z`, 'Faltaron $15 en efectivo']
  )
  // Hace 3 días: cerrado
  await exec(
    `INSERT INTO shifts (id, business_id, dependiente_id, date, status, opened_at, closed_at, notes, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['demo-shift-3d', 'demo-business', 'demo-dependiente', threeDaysAgo, 'closed',
     `${threeDaysAgo}T08:00:00.000Z`, `${threeDaysAgo}T22:00:00.000Z`, null, 'demo-owner']
  )

  // ── Cuadre items (turno de hoy) ───────────────────────────────────────────
  // vendidas = a_la_venta - final  |  efectivo_esperado = vendidas * price  |  discrepancy = declarado - esperado
  const cuadreHoy: [string, string, number, number, number, number, number, number, number, number, number][] = [
    // id           product     price  cost  inicio  entr  sal  a_la_venta  final  ef_esp  ef_dec
    ['demo-ci-1', 'demo-p1',   15,    5,    80,     0,    0,   80,         65,    225,    220],
    ['demo-ci-2', 'demo-p2',   25,    8,    60,     0,    0,   60,         50,    250,    250],
    ['demo-ci-3', 'demo-p6',   55,   18,    20,     5,    0,   25,         17,    440,    440],
    ['demo-ci-4', 'demo-p7',   25,    8,    40,     0,    0,   40,         33,    175,    175],
    ['demo-ci-5', 'demo-p9',   40,   12,    15,     0,    0,   15,         11,    160,    150],
  ]
  for (const [id, product_id, price, cost, inicio, entradas, salidas, a_la_venta, final, ef_esp, ef_dec] of cuadreHoy) {
    await exec(
      `INSERT INTO cuadre_items
         (id, shift_id, product_id, price_at_shift, cost_at_shift, inicio, entradas, salidas,
          a_la_venta, final, efectivo_esperado, efectivo_declarado, discrepancy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'demo-shift-today', product_id, price, cost, inicio, entradas, salidas,
       a_la_venta, final, ef_esp, ef_dec, ef_dec - ef_esp]
    )
  }

  // ── Ventas del día de hoy ─────────────────────────────────────────────────
  const ventasHoy = [
    { id: 'demo-s1', time: '09:15', total: 40,  items: [['demo-p1', 2, 15], ['demo-p8', 1, 15]] as [string,number,number][] },
    { id: 'demo-s2', time: '10:30', total: 80,  items: [['demo-p2', 1, 25], ['demo-p6', 1, 55]] as [string,number,number][] },
    { id: 'demo-s3', time: '11:45', total: 55,  items: [['demo-p1', 1, 15], ['demo-p7', 1, 25], ['demo-p10', 0, 0]] as [string,number,number][] },
    { id: 'demo-s4', time: '13:10', total: 95,  items: [['demo-p3', 1, 50], ['demo-p6', 1, 55]] as [string,number,number][] },
    { id: 'demo-s5', time: '14:00', total: 65,  items: [['demo-p2', 1, 25], ['demo-p9', 1, 40]] as [string,number,number][] },
  ]
  for (const venta of ventasHoy) {
    await exec(
      `INSERT INTO sales (id, business_id, shift_id, cashier_id, total_cup, total_mlc, total_usd, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [venta.id, 'demo-business', 'demo-shift-today', 'demo-dependiente', venta.total, `${today}T${venta.time}:00.000Z`]
    )
    for (let i = 0; i < venta.items.length; i++) {
      const [product_id, qty, unit_price] = venta.items[i]
      if (qty === 0) continue
      const products_map: Record<string, number> = {
        'demo-p1': 5, 'demo-p2': 8, 'demo-p3': 20, 'demo-p6': 18,
        'demo-p7': 8, 'demo-p8': 4, 'demo-p9': 12, 'demo-p10': 9,
      }
      await exec(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, unit_cost_price, currency, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, 'CUP', ?)`,
        [`${venta.id}-si${i}`, venta.id, product_id, qty, unit_price, products_map[product_id] ?? 0, qty * unit_price]
      )
    }
  }

  // ── Ventas de ayer ────────────────────────────────────────────────────────
  const ventasAyer = [
    { id: 'demo-y1', time: '09:00', total: 50,  items: [['demo-p1', 2, 15], ['demo-p8', 1, 15]] as [string,number,number][] },
    { id: 'demo-y2', time: '10:15', total: 105, items: [['demo-p3', 1, 50], ['demo-p6', 1, 55]] as [string,number,number][] },
    { id: 'demo-y3', time: '12:00', total: 80,  items: [['demo-p2', 2, 25], ['demo-p7', 1, 25]] as [string,number,number][] },
    { id: 'demo-y4', time: '14:30', total: 40,  items: [['demo-p9', 1, 40]] as [string,number,number][] },
    { id: 'demo-y5', time: '16:00', total: 65,  items: [['demo-p5', 1, 35], ['demo-p7', 1, 25]] as [string,number,number][] },
    { id: 'demo-y6', time: '18:00', total: 110, items: [['demo-p6', 2, 55]] as [string,number,number][] },
  ]
  for (const venta of ventasAyer) {
    await exec(
      `INSERT INTO sales (id, business_id, shift_id, cashier_id, total_cup, total_mlc, total_usd, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [venta.id, 'demo-business', 'demo-shift-yesterday', 'demo-dependiente', venta.total, `${yesterday}T${venta.time}:00.000Z`]
    )
    for (let i = 0; i < venta.items.length; i++) {
      const [product_id, qty, unit_price] = venta.items[i]
      const products_map: Record<string, number> = {
        'demo-p1': 5, 'demo-p2': 8, 'demo-p3': 20, 'demo-p5': 10,
        'demo-p6': 18, 'demo-p7': 8, 'demo-p8': 4, 'demo-p9': 12,
      }
      await exec(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, unit_cost_price, currency, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, 'CUP', ?)`,
        [`${venta.id}-si${i}`, venta.id, product_id, qty, unit_price, products_map[product_id] ?? 0, qty * unit_price]
      )
    }
  }
}
