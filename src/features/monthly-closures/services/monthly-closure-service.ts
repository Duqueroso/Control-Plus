import { supabase } from '@/lib/supabase'
import type { MonthlyClosure } from '@/types'

export const monthlyClosureService = {
  async getClosures(): Promise<MonthlyClosure[]> {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getClosureByMonthYear(month: number, year: number): Promise<MonthlyClosure | null> {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async createClosure(month: number, year: number): Promise<MonthlyClosure> {
    const { data, error } = await supabase.rpc('create_monthly_closure', {
      p_month: month,
      p_year: year,
    })

    if (error) throw error

    const closure = await this.getClosureByMonthYear(month, year)
    if (!closure) throw new Error('Error al crear el cierre mensual')
    return closure
  },

  async getOrCreateCurrentMonthClosure(): Promise<MonthlyClosure | null> {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const existing = await this.getClosureByMonthYear(month, year)
    if (existing) return existing

    try {
      return await this.createClosure(month, year)
    } catch {
      return null
    }
  },
}
