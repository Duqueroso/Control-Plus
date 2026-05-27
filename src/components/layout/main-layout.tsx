import { Outlet } from 'react-router-dom'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, DollarSign } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'POS', icon: ShoppingCart },
  { path: '/inventory', label: 'Inventario', icon: Package },
  { path: '/sales', label: 'Ventas', icon: DollarSign },
]

export function MainLayout() {
  const location = useLocation()

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around md:hidden z-50">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={{
                  color: isActive ? '#7BBDE8' : undefined,
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </TooltipProvider>
  )
}