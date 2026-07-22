import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Package, AlertTriangle, FileSpreadsheet, Receipt, RefreshCw, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { salesService } from '@/features/sales/services/sales-service'
import { cashRegisterService } from '@/features/cash-register/services/cash-register-service'
import { ReportDialog } from '@/features/reports/components/report-dialog'
import { reinvestmentService } from '@/features/reinvestments/services/reinvestment-service'
import { monthlyClosureService } from '@/features/monthly-closures/services/monthly-closure-service'
import { supabase } from '@/lib/supabase'
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

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1]
}

export default function DashboardPage() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: inventoryService.getAllProducts,
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

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: availableBalance = 0 } = useQuery({
    queryKey: ['available-balance'],
    queryFn: reinvestmentService.getAvailableBalance,
  })

  const { data: closures = [] } = useQuery({
    queryKey: ['monthly-closures'],
    queryFn: monthlyClosureService.getClosures,
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

  const monthlyProfit = monthSales.reduce((acc, sale) => {
    return acc + (sale.sale_items || []).reduce((itemAcc, item) => {
      const purchasePrice = (item as { products?: { purchase_price: number } }).products?.purchase_price || 0
      const salePrice = Number(item.unit_price)
      const quantity = Number(item.quantity)
      return itemAcc + ((salePrice - purchasePrice) * quantity)
    }, 0)
  }, 0)

  const profitMargin = monthTotal > 0 ? ((monthlyProfit / monthTotal) * 100).toFixed(1) : '0'

  const totalSalesAmount = sales
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + Number(s.total), 0)

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0)

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
          trend={`Margen ${profitMargin}%`}
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

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas totales"
          value={formatCurrency(totalSalesAmount)}
          icon={DollarSign}
          trend={`${sales.filter((s) => s.status === 'completed').length} ventas`}
          isLoading={isLoadingSales}
          accentColor="#0D7C3E"
        />
        <StatCard
          title="Saldo disponible"
          value={formatCurrency(availableBalance)}
          icon={RefreshCw}
          trend="Después de reinversiones"
          isLoading={isLoadingSales}
          accentColor="#059669"
        />
        <StatCard
          title="Gastos totales"
          value={formatCurrency(totalExpenses)}
          icon={Receipt}
          trend={`${expenses.length} gastos`}
          isLoading={isLoadingExpenses}
          accentColor="#C73E3E"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen de Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">
                    {today.toLocaleDateString('es-CO', { month: 'short' }).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + 
                     today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).slice(1)}
                  </p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400 mt-1">
                    Mes actual - Abierto
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">{formatCurrency(monthTotal)}</p>
                <p className="text-xs text-muted-foreground">{monthSales.length} ventas</p>
              </div>
            </div>

            {closures.slice(0, 6).map((closure) => (
              <div
                key={closure.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">
                      {getMonthName(closure.month).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {getMonthName(closure.month)} {closure.year}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      Cerrado
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(Number(closure.total_sales))}</p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {formatCurrency(Number(closure.closing_balance))}
                  </p>
                </div>
              </div>
            ))}

            {closures.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay meses cerrados aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />
    </div>
  )
}