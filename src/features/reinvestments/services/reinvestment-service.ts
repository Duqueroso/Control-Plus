import { supabase } from '@/lib/supabase'
import type { Reinvestment } from '@/types'

export const reinvestmentService = {
  async getReinvestments(): Promise<Reinvestment[]> {
    const { data, error } = await supabase
      .from('reinvestments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getReinvestment(id: string): Promise<Reinvestment | null> {
    const { data, error } = await supabase
      .from('reinvestments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createReinvestment(reinvestment: {
    userId: string
    amount: number
    description: string
  }): Promise<Reinvestment> {
    const { data, error } = await supabase
      .from('reinvestments')
      .insert({
        user_id: reinvestment.userId,
        amount: reinvestment.amount,
        description: reinvestment.description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteReinvestment(id: string): Promise<void> {
    const { error } = await supabase
      .from('reinvestments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getTotalReinvestments(): Promise<number> {
    const { data, error } = await supabase
      .from('reinvestments')
      .select('amount')

    if (error) throw error
    return data?.reduce((acc, r) => acc + Number(r.amount), 0) || 0
  },

  async getAvailableBalance(): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_available_balance')

    if (error) throw error
    return Number(data) || 0
  },
}
