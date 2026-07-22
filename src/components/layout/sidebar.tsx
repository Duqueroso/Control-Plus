import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Receipt,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState } from 'react'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventario', icon: Package },
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/sales', label: 'Ventas', icon: DollarSign },
  { path: '/quotes', label: 'Cotizaciones', icon: FileText },
  { path: '/expenses', label: 'Gastos', icon: Receipt },
  { path: '/reinvestments', label: 'Reinversiones', icon: RefreshCw },
  { path: '/closures', label: 'Historial', icon: Calendar },
  { path: '/users', label: 'Usuarios', icon: Users },
  { path: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#001D39' }}
    >
      <div className="p-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#0A4174' }}
          >
            <span className="text-lg font-bold text-white">C+</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-white">Control+</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon

          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'rgba(74, 132, 162, 0.4)' : undefined,
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-white/60 hover:text-white hover:bg-white/5"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}