import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export const usersService = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async updateProfileRole(id: string, role: UserRole): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async toggleProfileStatus(id: string, isActive: boolean): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}