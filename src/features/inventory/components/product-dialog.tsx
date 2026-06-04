import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '../schemas/inventory-schema'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect } from 'react'
import type { Product, Category } from '@/types'

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  onSubmit: (data: ProductFormData) => void
  isLoading?: boolean
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSubmit,
  isLoading,
}: ProductDialogProps) {
  const isEditing = !!product

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: null,
      categoryId: '',
      purchasePrice: 0,
      salePrice: 0,
      stock: 0,
      minStock: 5,
    },
  })

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        imageUrl: product.image_url || null,
        categoryId: product.category_id,
        purchasePrice: product.purchase_price,
        salePrice: product.sale_price,
        stock: product.stock,
        minStock: product.min_stock,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        imageUrl: null,
        categoryId: '',
        purchasePrice: 0,
        salePrice: 0,
        stock: 0,
        minStock: 5,
      })
    }
  }, [product, form])

  const purchasePrice = form.watch('purchasePrice')
  const salePrice = form.watch('salePrice')
  const suggestedMargin = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice * 100).toFixed(1) : '0'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <ImageUpload
          value={form.watch('imageUrl')}
          onChange={(url) => form.setValue('imageUrl', url)}
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="Nombre del producto"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              placeholder="Descripción opcional"
              {...form.register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría *</Label>
            <Select
              value={form.watch('categoryId')}
              onValueChange={(value) => form.setValue('categoryId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Precio Compra *</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register('purchasePrice', { valueAsNumber: true })}
              />
              {form.formState.errors.purchasePrice && (
                <p className="text-sm text-destructive">{form.formState.errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio Venta *</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register('salePrice', { valueAsNumber: true })}
              />
              {form.formState.errors.salePrice && (
                <p className="text-sm text-destructive">{form.formState.errors.salePrice.message}</p>
              )}
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <span className="text-sm text-muted-foreground">
              Margen sugerido:{' '}
              <span className="font-medium text-primary">{suggestedMargin}%</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                {...form.register('stock', { valueAsNumber: true })}
              />
              {form.formState.errors.stock && (
                <p className="text-sm text-destructive">{form.formState.errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Stock Mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                {...form.register('minStock', { valueAsNumber: true })}
              />
              {form.formState.errors.minStock && (
                <p className="text-sm text-destructive">{form.formState.errors.minStock.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}