import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { reinvestmentService } from '@/features/reinvestments/services/reinvestment-service'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { toast } from 'sonner'

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
  }).format(new Date(date))
}

interface ReinvestmentForm {
  amount: string
  description: string
}

export default function ReinvestmentsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedReinvestment, setSelectedReinvestment] = useState<{ id: string; amount: number } | null>(null)
  const [form, setForm] = useState<ReinvestmentForm>({
    amount: '',
    description: '',
  })

  const { data: reinvestments = [], isLoading } = useQuery({
    queryKey: ['reinvestments'],
    queryFn: reinvestmentService.getReinvestments,
  })

  const { data: totalReinvestments = 0 } = useQuery({
    queryKey: ['reinvestments-total'],
    queryFn: reinvestmentService.getTotalReinvestments,
  })

  const { data: availableBalance = 0 } = useQuery({
    queryKey: ['available-balance'],
    queryFn: reinvestmentService.getAvailableBalance,
  })

  const { data: salesTotal = 0 } = useQuery({
    queryKey: ['sales-total'],
    queryFn: async () => {
      const { data } = await queryClient.getQueryData(['sales']) as { data?: Array<{ total: number; status: string }> }
      return data?.filter(s => s.status === 'completed').reduce((acc, s) => acc + Number(s.total), 0) || 0
    },
  })

  const createMutation = useMutation({
    mutationFn: async (reinvestment: { userId: string; amount: number; description: string }) => {
      return reinvestmentService.createReinvestment(reinvestment)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reinvestments'] })
      queryClient.invalidateQueries({ queryKey: ['reinvestments-total'] })
      queryClient.invalidateQueries({ queryKey: ['available-balance'] })
      toast.success('Reinversión registrada exitosamente')
      closeCreateDialog()
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return reinvestmentService.deleteReinvestment(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reinvestments'] })
      queryClient.invalidateQueries({ queryKey: ['reinvestments-total'] })
      queryClient.invalidateQueries({ queryKey: ['available-balance'] })
      toast.success('Reinversión eliminada')
      closeDeleteDialog()
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const filteredReinvestments = searchQuery
    ? reinvestments.filter((r) =>
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : reinvestments

  const monthlyReinvestments = reinvestments.filter((r) => {
    const date = new Date(r.created_at)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const monthlyTotal = monthlyReinvestments.reduce((acc, r) => acc + Number(r.amount), 0)

  const openCreateDialog = () => {
    setForm({
      amount: '',
      description: '',
    })
    setIsCreateDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setForm({ amount: '', description: '' })
  }

  const openDeleteDialog = (reinvestment: { id: string; amount: number }) => {
    setSelectedReinvestment(reinvestment)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setSelectedReinvestment(null)
  }

  const handleCreate = () => {
    if (!user) {
      toast.error('Usuario no autenticado')
      return
    }
    if (!form.amount || !form.description) {
      toast.error('Completa todos los campos')
      return
    }

    const amount = parseFloat(form.amount)
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a cero')
      return
    }

    if (amount > availableBalance) {
      toast.error('El monto no puede superar el saldo disponible')
      return
    }

    createMutation.mutate({
      userId: user.id,
      amount,
      description: form.description,
    })
  }

  const handleDelete = () => {
    if (!selectedReinvestment) return
    deleteMutation.mutate(selectedReinvestment.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reinversiones</h1>
          <p className="text-muted-foreground mt-1">
            Registro de reinversiones del negocio (nómina, inventario, etc.)
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Reinversión
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reinvertido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totalReinvestments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(availableBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reinvertido este Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(monthlyTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todas las Reinversiones</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción..."
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
          ) : filteredReinvestments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay reinversiones registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReinvestments.map((reinvestment) => (
                  <TableRow key={reinvestment.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(reinvestment.created_at)}
                    </TableCell>
                    <TableCell>{reinvestment.description}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatCurrency(Number(reinvestment.amount))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(reinvestment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Reinversión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Saldo disponible: {formatCurrency(availableBalance)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                placeholder="Ej: Pago de nómina, Compra de inventario"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Reinversión</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de eliminar esta reinversión? El monto se reintegrará al saldo disponible.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
