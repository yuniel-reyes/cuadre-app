export type BusinessType = 'tienda' | 'cafeteria' | 'mercado'
export type UserRole = 'owner' | 'supervisor' | 'dependiente'
export type ShiftStatus = 'open' | 'pending_review' | 'closed'
export type Currency = 'CUP' | 'MLC' | 'USD'

export interface Business {
  id: string
  name: string
  type: BusinessType
  owner_id: string
  created_at: string
}

export interface AppUser {
  id: string
  business_id: string
  name: string
  role: UserRole
  active: boolean
}

export interface ExchangeRate {
  id: string
  business_id: string
  mlc_to_cup: number
  usd_to_cup: number
  updated_at: string
  updated_by: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  category: string
  unit: string
  sale_price: number
  cost_price: number
  currency: Currency
  current_stock: number
  min_stock: number
  active: boolean
}

export interface Shift {
  id: string
  business_id: string
  dependiente_id: string
  date: string
  status: ShiftStatus
  opened_at: string
  closed_at: string | null
  notes: string | null
  approved_by: string | null
}

export interface CuadreItem {
  id: string
  shift_id: string
  product_id: string
  price_at_shift: number
  cost_at_shift: number
  inicio: number
  entradas: number
  salidas: number
  a_la_venta: number       // GENERATED: inicio + entradas - salidas
  final: number
  efectivo_esperado: number // GENERATED: vendidas * price_at_shift
  efectivo_declarado: number
  discrepancy: number       // GENERATED: efectivo_declarado - efectivo_esperado
}

export interface Sale {
  id: string
  business_id: string
  shift_id: string
  cashier_id: string
  total_cup: number
  total_mlc: number
  total_usd: number
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  unit_cost_price: number
  currency: Currency
  subtotal: number
}
