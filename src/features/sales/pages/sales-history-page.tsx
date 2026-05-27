import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Package, ArrowRight, XCircle, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { salesService } from '../services/sales-service'
import type { Sale } from '@/types'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  qr: 'Código QR',
  card: 'Tarjeta',
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-red-500/10 text-red-600',
  refunded: 'bg-yellow-500/10 text-yellow-600',
}

export default function SalesHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: salesService.getSales,
  })

  const filteredSales = searchQuery
    ? sales.filter(
        (sale) =>
          sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.total.toString().includes(searchQuery)
      )
    : sales

  const totalSales = sales.filter((s) => s.status === 'completed').length
  const totalAmount = sales
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + Number(s.total), 0)
  const cancelledAmount = sales
    .filter((s) => s.status === 'cancelled')
    .reduce((acc, s) => acc + Number(s.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(cancelledAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todas las Ventas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID o total..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay ventas registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sale.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{paymentMethodLabels[sale.payment_method] || sale.payment_method}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(sale.total))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[sale.status]}>
                        {sale.status === 'completed' ? 'Completada' : sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSale(null)}>
          <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalle de Venta</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSale(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="font-mono text-xs">{selectedSale.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p>{formatDate(selectedSale.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Método de pago:</span>
                  <p>{paymentMethodLabels[selectedSale.payment_method]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge className={statusColors[selectedSale.status]}>
                    {selectedSale.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Productos</h4>
                <div className="space-y-2">
                  {(selectedSale.sale_items || []).map((item: { product_id: string; quantity: number; total: number }, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{item.product_id.slice(0, 8)}...</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">x{item.quantity}</span>
                        <span className="ml-2 font-medium">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(Number(selectedSale.total))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}