import { useQuery } from '@tanstack/react-query'
import { FileText, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useNavigate } from 'react-router-dom'

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

export default function MonthlyClosuresPage() {
  const navigate = useNavigate()

  const { data: closures = [], isLoading } = useQuery({
    queryKey: ['monthly-closures'],
    queryFn: monthlyClosureService.getClosures,
  })

  const handleViewReport = (month: number, year: number) => {
    navigate(`/reports?month=${month}&year=${year}`)
  }

  const totalSalesAll = closures.reduce((acc, c) => acc + Number(c.total_sales), 0)
  const totalExpensesAll = closures.reduce((acc, c) => acc + Number(c.expenses_total), 0)
  const totalReinvestmentsAll = closures.reduce((acc, c) => acc + Number(c.reinvestments_total), 0)
  const totalClosingBalance = closures.reduce((acc, c) => acc + Number(c.closing_balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Cierres Mensuales</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de ventas por mes
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalesAll)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totalExpensesAll)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reinversiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              -{formatCurrency(totalReinvestmentsAll)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalClosingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Cierres</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : closures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cierres mensuales registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Reinversiones</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((closure) => (
                  <TableRow key={closure.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {getMonthName(closure.month)} {closure.year}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {formatCurrency(Number(closure.total_sales))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-600">
                        -{formatCurrency(Number(closure.expenses_total))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-orange-600">
                        -{formatCurrency(Number(closure.reinvestments_total))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={Number(closure.closing_balance) >= 0 ? 'default' : 'destructive'}
                        className="font-medium"
                      >
                        {formatCurrency(Number(closure.closing_balance))}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewReport(closure.month, closure.year)}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver reporte
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
