import { supabase } from '@/lib/supabase'
import type { User, UserRole } from '@/types'
import { useAuthStore } from '../store/auth-store'

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase auth error:', error)
      throw new Error(error.message)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role || 'employee'

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      role: role as UserRole,
      createdAt: data.user.created_at,
    }

    useAuthStore.getState().setUser(user)
    return user
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
    useAuthStore.getState().logout()
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'employee'

    const userData: User = {
      id: user.id,
      email: user.email!,
      role: role as UserRole,
      createdAt: user.created_at,
    }

    useAuthStore.getState().setUser(userData)
    return userData
  },

  async updateRole(role: UserRole): Promise<void> {
    useAuthStore.getState().setUser({
      ...useAuthStore.getState().user!,
      role,
    })
  },
}