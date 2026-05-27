import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { supabase } from '@/lib/supabase'

export function useAuthInit() {
  const { setUser, setLoading, isLoading } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()

          const role = profileData?.role || session.user.user_metadata?.role || 'employee'

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: role as 'admin' | 'employee',
            createdAt: session.user.created_at,
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: 'employee' as const,
          createdAt: session.user.created_at,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return { isLoading }
}