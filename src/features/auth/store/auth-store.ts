import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, UserRole } from '@/types'

interface AuthStore {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

const sessionOnlyStorage = {
  getItem: (name: string): string | null => {
    try {
      return window.sessionStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      window.sessionStorage.setItem(name, value)
    } catch {
      console.error('sessionStorage not available')
    }
  },
  removeItem: (name: string): void => {
    try {
      window.sessionStorage.removeItem(name)
    } catch {
      console.error('sessionStorage not available')
    }
  },
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionOnlyStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)

interface PermisosStore {
  role: UserRole | null
  setRole: (role: UserRole | null) => void
}

export const usePermisosStore = create<PermisosStore>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
    }),
    {
      name: 'permisos-storage',
    }
  )
)