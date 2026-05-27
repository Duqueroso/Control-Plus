import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Receipt,
  Users,
  Settings,
  Banknote,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventario', icon: Package },
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/sales', label: 'Ventas', icon: DollarSign },
  { path: '/cash-register', label: 'Caja', icon: Banknote },
  { path: '/expenses', label: 'Gastos', icon: Receipt },
  { path: '/users', label: 'Usuarios', icon: Users },
  { path: '/settings', label: 'Configuración', icon: Settings },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const location = useLocation()

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-5 border-b">
          <SheetTitle className="m-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#0A4174' }}
              >
                <span className="text-lg font-bold text-white">C+</span>
              </div>
              <span className="font-bold text-lg" style={{ color: '#001D39' }}>
                Control+
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                )}
                style={{
                  backgroundColor: isActive ? '#7BBDE8' : undefined,
                  color: isActive ? '#001D39' : undefined,
                }}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
