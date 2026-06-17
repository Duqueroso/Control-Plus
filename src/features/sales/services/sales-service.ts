import { supabase } from '@/lib/supabase'
import type { Sale } from '@/types'

async function getCurrentCashRegister() {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

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
      const { error: updateError } = await supabase.rpc('decrement_stock', {
        product_id: item.productId,
        quantity: item.quantity,
      })

      if (updateError) {
        throw new Error(`Error decrementando stock: ${updateError.message}`)
      }
    }

    const cashRegister = await getCurrentCashRegister()
    if (cashRegister) {
      await supabase.from('cash_movements').insert({
        cash_register_id: cashRegister.id,
        sale_id: saleData.id,
        type: 'income',
        amount: sale.total,
        description: 'Venta',
      })
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

  async cancelSale(saleId: string, items: { product_id: string; quantity: number }[]): Promise<void> {
    for (const item of items) {
      const { error: rpcError } = await supabase.rpc('increment_stock', {
        product_id: item.product_id,
        quantity: item.quantity,
      })
      if (rpcError) throw new Error(`Error revertiendo stock: ${rpcError.message}`)
    }

    await supabase
      .from('cash_movements')
      .delete()
      .eq('sale_id', saleId)

    const { error } = await supabase
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', saleId)

    if (error) throw error
  },
}