import { column, Schema, Table } from '@powersync/web'

// Local SQLite schema — mirrors Supabase tables
// Note: Postgres GENERATED columns (a_la_venta, efectivo_esperado, discrepancy)
// are stored here as regular columns; values come from Supabase on sync.

const businesses = new Table({
  name: column.text,
  type: column.text,
  owner_id: column.text,
  created_at: column.text,
})

const users = new Table({
  name: column.text,
})

const user_businesses = new Table({
  user_id: column.text,
  business_id: column.text,
  role: column.text,
  active: column.integer,
  created_at: column.text,
})

const exchange_rates = new Table({
  business_id: column.text,
  mlc_to_cup: column.real,
  usd_to_cup: column.real,
  updated_at: column.text,
  updated_by: column.text,
})

const products = new Table({
  business_id: column.text,
  name: column.text,
  category: column.text,
  unit: column.text,
  sale_price: column.real,
  cost_price: column.real,
  currency: column.text,
  current_stock: column.real,
  min_stock: column.real,
  active: column.integer,
  barcode: column.text,
})

const shifts = new Table({
  business_id: column.text,
  dependiente_id: column.text,
  date: column.text,
  status: column.text,
  opened_at: column.text,
  closed_at: column.text,
  notes: column.text,
  approved_by: column.text,
})

const cuadre_items = new Table({
  shift_id: column.text,
  product_id: column.text,
  price_at_shift: column.real,
  cost_at_shift: column.real,
  inicio: column.real,
  entradas: column.real,
  salidas: column.real,
  a_la_venta: column.real,
  final: column.real,
  efectivo_esperado: column.real,
  efectivo_declarado: column.real,
  discrepancy: column.real,
})

const sales = new Table({
  business_id: column.text,
  shift_id: column.text,
  cashier_id: column.text,
  total_cup: column.real,
  total_mlc: column.real,
  total_usd: column.real,
  created_at: column.text,
  // Payment methods breakdown
  paid_cup: column.real,
  paid_usd: column.real,
  paid_mlc: column.real,
  paid_transfer: column.real,
})

const sale_items = new Table({
  sale_id: column.text,
  product_id: column.text,
  quantity: column.real,
  unit_price: column.real,
  unit_cost_price: column.real,
  currency: column.text,
  subtotal: column.real,
})

const stock_movements = new Table({
  business_id: column.text,
  product_id: column.text,
  type: column.text,
  quantity: column.real,
  note: column.text,
  user_id: column.text,
  created_at: column.text,
})

export const AppSchema = new Schema({
  businesses,
  users,
  user_businesses,
  exchange_rates,
  products,
  shifts,
  cuadre_items,
  sales,
  sale_items,
  stock_movements,
})
