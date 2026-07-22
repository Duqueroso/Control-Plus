import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, DollarSign, RefreshCw, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { monthlyClosureService } from '@/features/monthly-closures/services/monthly-closure-service'
import { reinvestmentService } from '@/features/reinvestments/services/reinvestment-service'
import { supabase } from '@/lib/supabase'

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

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    qr: 'QR',
    card: 'Tarjeta',
  }
  return labels[method] || method
}

export default function ReportsPage() {
  const [searchParams] = useSearchParams()
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')

  const now = new Date()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()

  const { data: _closure } = useQuery({
    queryKey: ['monthly-closure', month, year],
    queryFn: () => monthlyClosureService.getClosureByMonthYear(month, year),
  })

  const { data: reinvestments = [] } = useQuery({
    queryKey: ['reinvestments'],
    queryFn: reinvestmentService.getReinvestments,
  })

  const monthReinvestments = reinvestments.filter((r) => {
    const date = new Date(r.created_at)
    return date.getMonth() + 1 === month && date.getFullYear() === year
  })

  const monthExpenses = useQuery({
    queryKey: ['expenses-month', month, year],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0])
      if (error) throw error
      return data || []
    },
  })

  const monthSales = useQuery({
    queryKey: ['sales-month', month, year],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
      if (error) throw error
      return data || []
    },
  })

  const expensesData = monthExpenses.data || []
  const salesData = monthSales.data || []

  const totalSalesByMethod: Record<string, number> = {}
  salesData.forEach((sale) => {
    const method = sale.payment_method
    totalSalesByMethod[method] = (totalSalesByMethod[method] || 0) + Number(sale.total)
  })

  const expenseCategories: Record<string, number> = {}
  expensesData.forEach((expense) => {
    expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + Number(expense.amount)
  })

  const expensesTotal = expensesData.reduce((acc, e) => acc + Number(e.amount), 0)
  const reinvestmentsTotal = monthReinvestments.reduce((acc, r) => acc + Number(r.amount), 0)
  const salesTotal = salesData.reduce((acc, s) => acc + Number(s.total), 0)
  const balance = salesTotal - expensesTotal - reinvestmentsTotal

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/closures">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Reporte Mensual</h1>
            <p className="text-muted-foreground mt-1">
              {getMonthName(month)} {year}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {salesData.length} transacciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(expensesTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expensesData.length} gastos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reinversiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              -{formatCurrency(reinvestmentsTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthReinvestments.length} reinversiones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(totalSalesByMethod).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Sin ventas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(totalSalesByMethod).map(([method, amount]) => (
                    <TableRow key={method}>
                      <TableCell>
                        <Badge variant="outline">{formatPaymentMethod(method)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(expenseCategories).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Sin gastos en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(expenseCategories).map(([category, amount]) => (
                    <TableRow key={category}>
                      <TableCell>
                        <Badge variant="outline">{category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de Reinversiones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthReinvestments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Sin reinversiones en este período
                  </TableCell>
                </TableRow>
              ) : (
                monthReinvestments.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      -{formatCurrency(Number(r.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
