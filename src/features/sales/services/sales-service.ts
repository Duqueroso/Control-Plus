import { supabase } from '@/lib/supabase'
import type { Sale } from '@/types'

export const salesService = {
  async getSales(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name, purchase_price))')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getSale(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name, purchase_price))')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createSale(sale: {
    userId: string
    total: number
    subtotal: number
    discountPercent: number | null
    discountAmount: number | null
    paymentMethod: 'cash' | 'transfer' | 'qr' | 'card'
    items: {
      productId: string
      quantity: number
      unitPrice: number
      total: number
    }[]
  }): Promise<Sale> {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: sale.userId,
        subtotal: sale.subtotal,
        total: sale.total,
        discount_percent: sale.discountPercent,
        discount_amount: sale.discountAmount,
        payment_method: sale.paymentMethod,
        status: 'completed',
      })
      .select()
      .single()

    if (saleError) throw saleError

    const saleItems = sale.items.map((item) => ({
      sale_id: saleData.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) throw itemsError

    for (const item of sale.items) {
      const { data: product } = await supabase
        .from('products')
        .select('inventory_tracked')
        .eq('id', item.productId)
        .single()

      if (product?.inventory_tracked !== false) {
        const { error: updateError } = await supabase.rpc('decrement_stock', {
          product_id: item.productId,
          quantity: item.quantity,
        })

        if (updateError) {
          throw new Error(`Error decrementando stock: ${updateError.message}`)
        }
      }
    }

    return {
      ...saleData,
      items: saleItems as any,
    }
  },

  async getTodaySales(): Promise<Sale[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('status', 'completed')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getSalesByMonth(month: number, year: number): Promise<Sale[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)
    return this.getSalesByDateRange(startDate, endDate)
  },

  async cancelSale(saleId: string, items: { product_id: string; quantity: number }[]): Promise<void> {
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('inventory_tracked')
        .eq('id', item.product_id)
        .single()

      if (product?.inventory_tracked !== false) {
        const { error: rpcError } = await supabase.rpc('increment_stock', {
          product_id: item.product_id,
          quantity: item.quantity,
        })
        if (rpcError) throw new Error(`Error revertiendo stock: ${rpcError.message}`)
      }
    }

    const { error } = await supabase
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', saleId)

    if (error) throw error
  },
}