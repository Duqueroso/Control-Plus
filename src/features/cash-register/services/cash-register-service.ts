import { supabase } from '@/lib/supabase'
import type { CashRegister, CashMovement } from '@/types'

export const cashRegisterService = {
  async getCurrentCashRegister(): Promise<CashRegister | null> {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async openCashRegister(initialAmount: number, userId: string): Promise<CashRegister> {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert({
        initial_amount: initialAmount,
        status: 'open',
        opened_at: new Date().toISOString(),
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async closeCashRegister(id: string, closingAmount: number): Promise<CashRegister> {
    const { data, error } = await supabase
      .from('cash_registers')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_amount: closingAmount,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCashMovements(registerId: string): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('cash_register_id', registerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async addMovement(
    registerId: string,
    type: 'income' | 'expense',
    amount: number,
    description: string
  ): Promise<CashMovement> {
    const { data, error } = await supabase
      .from('cash_movements')
      .insert({
        cash_register_id: registerId,
        type,
        amount,
        description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAllCashRegisters(): Promise<CashRegister[]> {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getCashRegisterMovements(registerId: string): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('cash_register_id', registerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}