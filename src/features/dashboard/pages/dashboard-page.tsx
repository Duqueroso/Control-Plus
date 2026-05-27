import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Package, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { salesService } from '@/features/sales/services/sales-service'
import { cashRegisterService } from '@/features/cash-register/services/cash-register-service'
import { ReportDialog } from '@/features/reports/components/report-dialog'
import { useState } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: string
  trendUp?: boolean
  isLoading?: boolean
  accentColor?: string
}

function StatCard({ title, value, icon: Icon, trend, trendUp, isLoading, accentColor = '#0A4174' }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="backdrop-blur-sm border-transparent shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className={`flex items-center text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${!trendUp && 'rotate-180'}`} />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function DashboardPage() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: inventoryService.getProducts,
  })

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: salesService.getSales,
  })

  const { data: cashRegister } = useQuery({
    queryKey: ['cash-register'],
    queryFn: cashRegisterService.getCurrentCashRegister,
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['cash-register-movements', cashRegister?.id],
    queryFn: () => cashRegisterService.getCashMovements(cashRegister!.id),
    enabled: !!cashRegister,
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todaySales = sales.filter((s) => {
    const saleDate = new Date(s.created_at)
    saleDate.setHours(0, 0, 0, 0)
    return saleDate.getTime() === today.getTime() && s.status === 'completed'
  })

  const todayTotal = todaySales.reduce((acc, s) => acc + Number(s.total), 0)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthSales = sales.filter((s) => {
    const saleDate = new Date(s.created_at)
    return saleDate >= monthStart && s.status === 'completed'
  })
  const monthTotal = monthSales.reduce((acc, s) => acc + Number(s.total), 0)

  const monthlyProfit = monthTotal * 0.25

  const lowStockProducts = products.filter((p) => p.stock <= p.min_stock)

  const totalCashIncome = movements
    .filter((m) => m.type === 'income')
    .reduce((acc, m) => acc + Number(m.amount), 0)

  const totalCashExpenses = movements
    .filter((m) => m.type === 'expense')
    .reduce((acc, m) => acc + Number(m.amount), 0)

  const currentCashBalance = cashRegister
    ? Number(cashRegister.initial_amount) + totalCashIncome - totalCashExpenses
    : 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de actividad de tu negocio
          </p>
        </div>
        <Button onClick={() => setIsReportDialogOpen(true)} variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Reportes
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas del día"
          value={formatCurrency(todayTotal)}
          icon={DollarSign}
          trend={todaySales.length > 0 ? `${todaySales.length} ventas` : undefined}
          isLoading={isLoadingSales}
          accentColor="#0A4174"
        />
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(monthTotal)}
          icon={TrendingUp}
          trend={`${monthSales.length} ventas`}
          trendUp
          isLoading={isLoadingSales}
          accentColor="#49769F"
        />
        <StatCard
          title="Utilidad estimada"
          value={formatCurrency(monthlyProfit)}
          icon={TrendingUp}
          trend="Margen ~25%"
          trendUp
          isLoading={isLoadingSales}
          accentColor="#7BBDE8"
        />
        <StatCard
          title="Caja actual"
          value={cashRegister ? formatCurrency(currentCashBalance) : 'Caja cerrada'}
          icon={Package}
          isLoading={false}
          accentColor="#4E84A2"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="backdrop-blur-sm border-transparent shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Todo bien con el inventario</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-sm font-semibold text-yellow-600">{product.stock} und</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />
    </div>
  )
}