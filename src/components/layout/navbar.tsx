import { Bell, Moon, Sun, LogOut, ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { authService } from '@/features/auth/services/auth-service'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useTheme } from '@/components/theme-provider'
import { MobileNav } from './mobile-nav'
import { useState } from 'react'

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventario',
  '/pos': 'Punto de Venta',
  '/sales': 'Ventas',
  '/cash-register': 'Caja',
  '/expenses': 'Gastos',
  '/users': 'Usuarios',
  '/settings': 'Configuración',
}

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authService.logout()
      toast.success('Sesión cerrada')
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const currentRoute = routeNames[location.pathname] || 'Panel'

  return (
    <div className="contents">
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <header
        className="h-14 border-b border-border backdrop-blur-md bg-background/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Control+</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-sm font-medium">{currentRoute}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 ml-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <span className="text-sm font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium hidden md:inline">
                {user?.email?.split('@')[0] || 'Usuario'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </div>
  )
}