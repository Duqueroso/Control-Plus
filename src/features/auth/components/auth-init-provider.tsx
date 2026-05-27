import { useAuthInit } from '@/features/auth/hooks/use-auth-init'
import { Loader2 } from 'lucide-react'

interface AuthInitProviderProps {
  children: React.ReactNode
}

export function AuthInitProvider({ children }: AuthInitProviderProps) {
  const { isLoading } = useAuthInit()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}