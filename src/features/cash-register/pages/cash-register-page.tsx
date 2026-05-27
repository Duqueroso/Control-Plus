import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Plus, ArrowUpRight, ArrowDownRight, Lock, Unlock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { cashRegisterService } from '../services/cash-register-service'
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function CashRegisterPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false)
  const [initialAmount, setInitialAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')

  const { data: currentRegister, isLoading: isLoadingRegister } = useQuery({
    queryKey: ['cash-register'],
    queryFn: cashRegisterService.getCurrentCashRegister,
  })

  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['cash-register-movements', currentRegister?.id],
    queryFn: () => cashRegisterService.getCashMovements(currentRegister!.id),
    enabled: !!currentRegister,
  })

  const openMutation = useMutation({
    mutationFn: (data: { amount: number; userId: string }) =>
      cashRegisterService.openCashRegister(data.amount, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      toast.success('Caja abierta exitosamente')
      setIsOpenDialogOpen(false)
      setInitialAmount('')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const closeMutation = useMutation({
    mutationFn: (data: { id: string; amount: number }) =>
      cashRegisterService.closeCashRegister(data.id, data.amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      toast.success('Caja cerrada exitosamente')
      setIsCloseDialogOpen(false)
      setClosingAmount('')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const movementMutation = useMutation({
    mutationFn: (data: { type: 'income' | 'expense'; amount: number; description: string }) =>
      cashRegisterService.addMovement(
        currentRegister!.id,
        data.type,
        data.amount,
        data.description
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-movements'] })
      toast.success('Movimiento registrado')
      setIsMovementDialogOpen(false)
      setMovementAmount('')
      setMovementDescription('')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const handleOpen = () => {
    if (!user) {
      toast.error('Usuario no autenticado')
      return
    }
    const amount = parseFloat(initialAmount) || 0
    openMutation.mutate({ amount, userId: user.id })
  }

  const handleClose = () => {
    if (!currentRegister) return
    const amount = parseFloat(closingAmount) || 0
    closeMutation.mutate({ id: currentRegister.id, amount })
  }

  const handleAddMovement = () => {
    if (!currentRegister) return
    const amount = parseFloat(movementAmount) || 0
    if (amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    movementMutation.mutate({
      type: movementType,
      amount,
      description: movementDescription,
    })
  }

  const totalIncome = movements
    .filter((m) => m.type === 'income')
    .reduce((acc, m) => acc + Number(m.amount), 0)

  const totalExpenses = movements
    .filter((m) => m.type === 'expense')
    .reduce((acc, m) => acc + Number(m.amount), 0)

  const currentBalance = currentRegister
    ? Number(currentRegister.initial_amount) + totalIncome - totalExpenses
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caja</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de caja, movimientos y cierres
          </p>
        </div>
        {currentRegister ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 bg-green-500/10">
              <Unlock className="h-3 w-3 mr-1" />
              Abierta desde {formatDate(currentRegister.opened_at)}
            </Badge>
            <Button
              variant="outline"
              onClick={() => setIsMovementDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
            <Button
              variant="default"
              onClick={() => setIsCloseDialogOpen(true)}
            >
              <Lock className="h-4 w-4 mr-1" />
              Cerrar Caja
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsOpenDialogOpen(true)}>
            <Unlock className="h-4 w-4 mr-1" />
            Abrir Caja
          </Button>
        )}
      </div>

      {isLoadingRegister ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : currentRegister ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monto Inicial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(currentRegister.initial_amount))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{formatCurrency(totalIncome)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Egresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Balance Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(currentBalance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMovements ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay movimientos registrados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(movement.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              movement.type === 'income'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            }
                          >
                            {movement.type === 'income' ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {movement.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </TableCell>
                        <TableCell>{movement.description || '-'}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            movement.type === 'income'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {movement.type === 'income' ? '+' : '-'}
                          {formatCurrency(Number(movement.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Caja cerrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              La caja se encuentra cerrada. Abre la caja para comenzar a registrar
              movimientos.
            </p>
            <Button onClick={() => setIsOpenDialogOpen(true)}>
              <Unlock className="h-4 w-4 mr-1" />
              Abrir Caja
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="initial-amount">Monto inicial</Label>
              <Input
                id="initial-amount"
                type="number"
                placeholder="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpen} disabled={openMutation.isPending}>
              {openMutation.isPending ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Monto inicial:</span>
                  <p className="font-medium">
                    {formatCurrency(Number(currentRegister?.initial_amount || 0))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance actual:</span>
                  <p className="font-medium text-primary">
                    {formatCurrency(currentBalance)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="closing-amount">Monto en caja (cierre)</Label>
              <Input
                id="closing-amount"
                type="number"
                placeholder={currentBalance.toString()}
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleClose}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={movementType === 'income' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setMovementType('income')}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={movementType === 'expense' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setMovementType('expense')}
                >
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Egreso
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movement-amount">Monto</Label>
              <Input
                id="movement-amount"
                type="number"
                placeholder="0"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movement-description">Descripción (opcional)</Label>
              <Input
                id="movement-description"
                placeholder="Ej: Pago a proveedor"
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMovement} disabled={movementMutation.isPending}>
              {movementMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}