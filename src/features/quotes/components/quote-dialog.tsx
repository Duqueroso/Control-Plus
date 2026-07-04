import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Trash2, FileText, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import html2pdf from 'html2pdf'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { generateQuotePDF, type QuoteItem } from '../services/quote-service'
import { quoteCustomerSchema, type QuoteCustomer, type CustomItem } from '../schemas/quote-schema'
import { toast } from 'sonner'

interface QuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SelectedProduct {
  id: string
  name: string
  description?: string
  imageUrl?: string | null
  unitPrice: number
  quantity: number
}

export function QuoteDialog({ open, onOpenChange }: QuoteDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customer, setCustomer] = useState<QuoteCustomer>({
    name: '',
    email: '',
    phone: '',
  })
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [newCustomItem, setNewCustomItem] = useState({
    name: '',
    description: '',
    unitPrice: 0,
    quantity: 1,
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-all'],
    queryFn: inventoryService.getAllProducts,
    enabled: open,
  })

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products.filter((p) => p.is_active && (p.inventory_tracked === false || p.stock > 0))
    const query = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.is_active &&
        (p.inventory_tracked === false || p.stock > 0) &&
        (p.name.toLowerCase().includes(query))
    )
  }, [products, searchQuery])

  const total = useMemo(() => {
    const productsTotal = selectedProducts.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
    const customTotal = customItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
    return productsTotal + customTotal
  }, [selectedProducts, customItems])

  const addProduct = (product: typeof products[0]) => {
    const existingItem = selectedProducts.find((item) => item.id === product.id)
    if (existingItem) {
      setSelectedProducts(
        selectedProducts.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.image_url,
          unitPrice: product.sale_price,
          quantity: 1,
        },
      ])
    }
  }

  const updateProductQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(id)
      return
    }
    setSelectedProducts(
      selectedProducts.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter((item) => item.id !== id))
  }

  const addCustomItem = () => {
    if (!newCustomItem.name.trim()) {
      toast.error('El nombre del item es requerido')
      return
    }
    if (newCustomItem.unitPrice <= 0) {
      toast.error('El precio debe ser mayor a 0')
      return
    }
    if (newCustomItem.quantity < 1) {
      toast.error('La cantidad debe ser al menos 1')
      return
    }

    const item: CustomItem = {
      id: `custom-${Date.now()}`,
      name: newCustomItem.name,
      description: newCustomItem.description,
      unitPrice: newCustomItem.unitPrice,
      quantity: newCustomItem.quantity,
    }

    setCustomItems([...customItems, item])
    setNewCustomItem({ name: '', description: '', unitPrice: 0, quantity: 1 })
  }

  const removeCustomItem = (id: string) => {
    setCustomItems(customItems.filter((item) => item.id !== id))
  }

  const updateCustomItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeCustomItem(id)
      return
    }
    setCustomItems(
      customItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleGeneratePDF = async () => {
    const customerValidation = quoteCustomerSchema.safeParse(customer)
    if (!customerValidation.success) {
      toast.error(customerValidation.error.issues[0].message)
      return
    }

    const allItems: QuoteItem[] = [
      ...selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        unitPrice: p.unitPrice,
        quantity: p.quantity,
        total: p.unitPrice * p.quantity,
      })),
      ...customItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        total: item.unitPrice * item.quantity,
      })),
    ]

    if (allItems.length === 0) {
      toast.error('Agrega al menos un producto o item personalizado')
      return
    }

    setIsGenerating(true)

    try {
      const { pdfContent, quoteNumber } = await generateQuotePDF(allItems, customer)

      const container = document.createElement('div')
      container.innerHTML = pdfContent
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      document.body.appendChild(container)

      await html2pdf().set({
        margin: 10,
        filename: `${quoteNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(container).save()

      document.body.removeChild(container)

      toast.success(`Cotización ${quoteNumber} generada`)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Error al generar la cotización')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setCustomer({ name: '', email: '', phone: '' })
    setSelectedProducts([])
    setCustomItems([])
    setSearchQuery('')
    setNewCustomItem({ name: '', description: '', unitPrice: 0, quantity: 1 })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Nueva Cotización
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6 p-6 pt-4">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredProducts.length} productos
              </span>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">No hay productos disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all overflow-hidden"
                      onClick={() => addProduct(product)}
                    >
                      <div className="h-24 w-full bg-muted/30 relative overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-muted">
                            <FileText className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <div className="font-medium text-sm truncate" title={product.name}>
                          {product.name}
                        </div>
                        <div className="flex items-end justify-between pt-1">
                          <span className="text-sm font-bold" style={{ color: '#0A4174' }}>
                            {formatCurrency(product.sale_price)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {product.inventory_tracked ? `${product.stock} und` : '∞'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Item Personalizado</h4>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <Input
                  placeholder="Nombre"
                  value={newCustomItem.name}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                  className="col-span-4 h-9"
                />
                <Input
                  placeholder="Descripción"
                  value={newCustomItem.description}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, description: e.target.value })}
                  className="col-span-4 h-9"
                />
                <Input
                  type="number"
                  placeholder="Precio"
                  min="0"
                  value={newCustomItem.unitPrice || ''}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="col-span-2 h-9"
                />
                <Input
                  type="number"
                  placeholder="Cant"
                  min="1"
                  value={newCustomItem.quantity}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, quantity: parseInt(e.target.value) || 1 })}
                  className="col-span-1 h-9"
                />
                <Button onClick={addCustomItem} size="sm" className="h-9 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="w-80 flex flex-col bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3">Datos del Cliente</h4>
            <div className="space-y-3 mb-4">
              <div className="space-y-1">
                <Label htmlFor="customerName" className="text-xs">Nombre *</Label>
                <Input
                  id="customerName"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerEmail" className="text-xs">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerPhone" className="text-xs">Teléfono</Label>
                <Input
                  id="customerPhone"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="300 123 4567"
                  className="h-9"
                />
              </div>
            </div>

            <div className="border-t pt-3 flex-1 overflow-auto">
              <h4 className="font-medium text-sm mb-3">Productos Seleccionados</h4>
              {selectedProducts.length === 0 && customItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin productos
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedProducts.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} x {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateProductQuantity(item.id, item.quantity - 1)}
                        >
                          <span className="text-xs">-</span>
                        </Button>
                        <span className="text-xs w-4 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateProductQuantity(item.id, item.quantity + 1)}
                        >
                          <span className="text-xs">+</span>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProduct(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {customItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} x {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateCustomItemQuantity(item.id, item.quantity - 1)}
                        >
                          <span className="text-xs">-</span>
                        </Button>
                        <span className="text-xs w-4 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateCustomItemQuantity(item.id, item.quantity + 1)}
                        >
                          <span className="text-xs">+</span>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCustomItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Total</span>
                <span className="text-lg font-bold" style={{ color: '#0A4174' }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            style={{ backgroundColor: '#0A4174' }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generar Cotización
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
