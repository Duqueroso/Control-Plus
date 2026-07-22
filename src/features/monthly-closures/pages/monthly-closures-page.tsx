import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Calendar, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { salesService } from '@/features/sales/services/sales-service'
import { reinvestmentService } from '@/features/reinvestments/services/reinvestment-service'
import { supabase } from '@/lib/supabase'
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

interface MonthData {
  month: number
  year: number
  totalSales: number
  totalExpenses: number
  totalReinvestments: number
  closingBalance: number
  salesCount: number
  isCurrentMonth: boolean
}

export default function MonthlyClosuresPage() {
  const navigate = useNavigate()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data: firstSale } = useQuery({
    queryKey: ['first-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (error) return null
      return data
    },
  })

  const { data: reinvestments = [] } = useQuery({
    queryKey: ['reinvestments'],
    queryFn: reinvestmentService.getReinvestments,
  })

  const startYear = firstSale
    ? new Date(firstSale.created_at).getFullYear()
    : currentYear

  const monthsData: MonthData[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const isCurrentMonth = month === currentMonth && selectedYear === currentYear

      const monthReinvestments = reinvestments.filter((r) => {
        const date = new Date(r.created_at)
        return date.getMonth() + 1 === month && date.getFullYear() === selectedYear
      })

      return {
        month,
        year: selectedYear,
        totalSales: 0,
        totalExpenses: 0,
        totalReinvestments: monthReinvestments.reduce((acc, r) => acc + Number(r.amount), 0),
        closingBalance: 0,
        salesCount: 0,
        isCurrentMonth,
      }
    })
  }, [selectedYear, currentMonth, currentYear, reinvestments])

  const { data: salesData = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-months', selectedYear],
    queryFn: async () => {
      const result: { month: number; total: number; count: number }[] = []
      for (let m = 1; m <= 12; m++) {
        const sales = await salesService.getSalesByMonth(m, selectedYear)
        result.push({
          month: m,
          total: sales.reduce((acc, s) => acc + Number(s.total), 0),
          count: sales.length,
        })
      }
      return result
    },
  })

  const { data: expensesData = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses-months', selectedYear],
    queryFn: async () => {
      const result: { month: number; total: number }[] = []
      for (let m = 1; m <= 12; m++) {
        const startDate = new Date(selectedYear, m - 1, 1)
        const endDate = new Date(selectedYear, m, 0)
        const { data } = await supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', startDate.toISOString().split('T')[0])
          .lte('expense_date', endDate.toISOString().split('T')[0])
        result.push({
          month: m,
          total: data?.reduce((acc, e) => acc + Number(e.amount), 0) || 0,
        })
      }
      return result
    },
  })

  const enrichedMonthsData: MonthData[] = monthsData.map((m) => {
    const salesInfo = salesData.find((s) => s.month === m.month)
    const expensesInfo = expensesData.find((e) => e.month === m.month)

    const totalSales = salesInfo?.total || 0
    const totalExpenses = expensesInfo?.total || 0
    const closingBalance = totalSales - totalExpenses - m.totalReinvestments

    return {
      ...m,
      totalSales,
      totalExpenses,
      closingBalance,
      salesCount: salesInfo?.count || 0,
    }
  })

  const totals = enrichedMonthsData.reduce(
    (acc, m) => ({
      sales: acc.sales + m.totalSales,
      expenses: acc.expenses + m.totalExpenses,
      reinvestments: acc.reinvestments + m.totalReinvestments,
      balance: acc.balance + m.closingBalance,
    }),
    { sales: 0, expenses: 0, reinvestments: 0, balance: 0 }
  )

  const handlePrevYear = () => {
    if (selectedYear > startYear) {
      setSelectedYear(selectedYear - 1)
    }
  }

  const handleNextYear = () => {
    if (selectedYear < currentYear) {
      setSelectedYear(selectedYear + 1)
    }
  }

  const handleViewReport = (month: number, year: number) => {
    navigate(`/reports?month=${month}&year=${year}`)
  }

  const isLoading = isLoadingSales || isLoadingExpenses

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Cierres Mensuales</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de ventas y cierre por mes
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevYear}
          disabled={selectedYear <= startYear}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xl font-bold min-w-[100px] text-center">{selectedYear}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextYear}
          disabled={selectedYear >= currentYear}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del Año
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.sales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos del Año
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reinversiones del Año
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              -{formatCurrency(totals.reinvestments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Año
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
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
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedMonthsData.map((m) => (
                  <TableRow
                    key={`${m.year}-${m.month}`}
                    className={m.isCurrentMonth ? 'bg-green-50 dark:bg-green-950/20' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {getMonthName(m.month)} {m.year}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {formatCurrency(m.totalSales)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-600">
                        {m.totalExpenses > 0 ? `-${formatCurrency(m.totalExpenses)}` : formatCurrency(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-orange-600">
                        {m.totalReinvestments > 0 ? `-${formatCurrency(m.totalReinvestments)}` : formatCurrency(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={m.closingBalance >= 0 ? 'default' : 'destructive'}
                        className="font-medium"
                      >
                        {formatCurrency(m.closingBalance)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.isCurrentMonth ? 'default' : 'secondary'}
                        className={m.isCurrentMonth ? 'bg-green-500' : ''}
                      >
                        {m.isCurrentMonth ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewReport(m.month, m.year)}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver
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
