export type UserRole = 'admin' | 'employee'

export interface Profile extends BaseEntity {
  email: string
  role: UserRole
  is_active: boolean
}

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: string
}

export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface Product extends BaseEntity {
  code: string
  name: string
  description: string
  image_url: string | null
  category_id: string
  purchase_price: number
  sale_price: number
  stock: number
  min_stock: number
  is_active: boolean
}

export interface Category extends BaseEntity {
  name: string
  description: string
}

export interface Sale extends BaseEntity {
  user_id: string
  total: number
  subtotal: number | null
  payment_method: 'cash' | 'transfer' | 'qr' | 'card'
  status: 'completed' | 'cancelled' | 'refunded'
  discount_percent: number | null
  discount_amount: number | null
  sale_items?: SaleItem[]
}

export interface SaleItem extends BaseEntity {
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
}

export interface CashRegister extends BaseEntity {
  user_id: string
  initial_amount: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
}

export interface CashMovement extends BaseEntity {
  cash_register_id: string
  type: 'income' | 'expense'
  amount: number
  description: string
}

export interface Expense extends BaseEntity {
  user_id: string
  category: string
  amount: number
  description: string
  expense_date: string
}

export interface ProductImport {
  nombre: string
  precio_compra: number
  precio_venta: number
  stock: number
  categoria: string
  codigo?: string
  descripcion?: string
  stock_minimo?: number
}

export interface ImportError {
  row: number
  field: string
  message: string
  value: unknown
}

export interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: ImportError[]
}