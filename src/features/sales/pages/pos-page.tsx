import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ShoppingCart, CreditCard, Banknote, QrCode, Plus, Minus, X, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { salesService } from '@/features/sales/services/sales-service'
import { cashRegisterService } from '@/features/cash-register/services/cash-register-service'
import { useAuthStore } from '@/features/auth/store/auth-store'
import type { Product } from '@/types'
import { toast } from 'sonner'

interface CartItem {
  product: Product
  quantity: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const paymentMethods = [
  { id: 'cash', label: 'Efectivo', icon: Banknote },
  { id: 'transfer', label: 'Transferencia', icon: Banknote },
  { id: 'qr', label: 'Código QR', icon: QrCode },
  { id: 'card', label: 'Tarjeta', icon: CreditCard },
]

export default function POSPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [isCartOpen, setIsCartOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-all'],
    queryFn: inventoryService.getAllProducts,
  })

  const { data: currentCashRegister } = useQuery({
    queryKey: ['cash-register'],
    queryFn: cashRegisterService.getCurrentCashRegister,
  })

  const isCashRegisterOpen = !!currentCashRegister

  const createSaleMutation = useMutation({
    mutationFn: salesService.createSale,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products-all'] })
      await queryClient.refetchQueries({ queryKey: ['products-all'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-movements'] })
      toast.success('Venta realizada exitosamente')
      setCart([])
      setDiscountPercent(0)
      setIsCheckoutOpen(false)
      setIsCartOpen(false)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products.filter((p) => p.is_active && p.stock > 0)
    const query = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.is_active &&
        p.stock > 0 &&
        (p.name.toLowerCase().includes(query))
    )
  }, [products, searchQuery])

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.sale_price * item.quantity, 0)
  }, [cart])

  const discountAmount = useMemo(() => {
    return Math.round(cartTotal * (discountPercent / 100))
  }, [cartTotal, discountPercent])

  const finalTotal = useMemo(() => {
    return cartTotal - discountAmount
  }, [cartTotal, discountAmount])

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.warning('No hay más stock disponible')
        return
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && quantity > product.stock) {
      toast.warning('No hay suficiente stock')
      return
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscountPercent(0)
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Agrega productos al carrito')
      return
    }

    if (!user) {
      toast.error('Usuario no autenticado')
      return
    }

    setIsProcessing(true)
    createSaleMutation.mutate({
      userId: user.id,
      total: finalTotal,
      subtotal: cartTotal,
      discountPercent: discountPercent > 0 ? discountPercent : null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      paymentMethod: paymentMethod as 'cash' | 'transfer' | 'qr' | 'card',
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.sale_price,
        total: item.product.sale_price * item.quantity,
      })),
    })
    setIsProcessing(false)
  }

  return (
    <div className="h-[calc(100vh-7rem)] relative">
      <div className="flex items-center gap-4 mb-5 p-1">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">
          {filteredProducts.length} productos
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        {!isCashRegisterOpen ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Caja cerrada</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              La caja se encuentra cerrada. Abre la caja para comenzar a registrar ventas.
            </p>
            <Button
              style={{ backgroundColor: '#0A4174' }}
              onClick={() => window.location.href = '/cash-register'}
            >
              Abrir Caja
            </Button>
          </div>
        ) : isLoadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="h-56 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8" />
            </div>
            <p className="text-base">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 overflow-hidden ${!isCashRegisterOpen ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square w-full bg-muted/30 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium text-sm truncate" title={product.name}>{product.name}</div>
                  <div className="flex items-end justify-between pt-1">
                    <span className="text-base font-bold" style={{ color: '#0A4174' }}>
                      {formatCurrency(product.sale_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.stock} und
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <div
        className="fixed top-20 right-6 z-50 flex flex-col items-end gap-2"
      >
        <Button
          onClick={() => setIsCartOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg relative"
          style={{ backgroundColor: '#0A4174' }}
        >
          <ShoppingCart className="h-5 w-5" />
          {cart.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs"
              style={{ backgroundColor: '#F97316', color: 'white' }}
            >
              {cart.length}
            </Badge>
          )}
        </Button>
        {cart.length > 0 && (
          <div
            className="px-3 py-1.5 rounded-full shadow-md text-sm font-medium bg-card border"
            style={{ backgroundColor: 'var(--card)' }}
          >
            {formatCurrency(cartTotal)}
          </div>
        )}
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#0A417415' }}
              >
                <ShoppingCart className="h-4 w-4" style={{ color: '#0A4174' }} />
              </div>
              Carrito
              {cart.length > 0 && (
                <Badge style={{ backgroundColor: '#0A4174', color: 'white' }}>
                  {cart.length}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Carrito de compras
            </SheetDescription>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Tu carrito está vacío</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecciona productos para agregar
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto py-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ShoppingCart className="h-5 w-5 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm" title={item.product.name}>
                          {item.product.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                          <span>{formatCurrency(item.product.sale_price)}</span>
                          <span>/ und</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-background rounded-lg px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-semibold w-20 text-right">
                        {formatCurrency(item.product.sale_price * item.quantity)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(cartTotal)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Descuento ({discountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: '#0A4174' }}>{formatCurrency(finalTotal)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="flex-1"
                  >
                    Limpiar
                  </Button>
                  <Button
                    className="flex-1 h-11"
                    style={{ backgroundColor: '#0A4174' }}
                    onClick={() => setIsCheckoutOpen(true)}
                    disabled={!isCashRegisterOpen}
                  >
                    Cobrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmar Venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: '#0A417415' }}
            >
              <p className="text-sm text-muted-foreground mb-1">Total a cobrar</p>
              <p className="text-3xl font-bold tracking-tight" style={{ color: '#0A4174' }}>
                {formatCurrency(finalTotal)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aplicar descuento (%)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
                {discountPercent > 0 && (
                  <span className="text-sm text-green-600 ml-auto">
                    -{formatCurrency(discountAmount)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Método de pago</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resumen</label>
              <div className="rounded-lg p-4 bg-muted/50 space-y-2 max-h-48 overflow-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.product.sale_price * item.quantity)}
                    </span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento ({discountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsCheckoutOpen(false)
              setDiscountPercent(0)
            }}>
              Cancelar
            </Button>
            <Button
              style={{ backgroundColor: '#0A4174' }}
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? 'Procesando...' : `Confirmar ${formatCurrency(finalTotal)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}