import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2, Power, PowerOff, FileUp, Trash, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ProductDialog } from '../components/product-dialog'
import { CategoryDialog } from '../components/category-dialog'
import { ImportDialog } from '../components/import-dialog'
import { inventoryService } from '../services/inventory-service'
import { type ProductFormData, type CategoryFormData } from '../schemas/inventory-schema'
import type { Product, Category } from '@/types'
import { toast } from 'sonner'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [showInactive, setShowInactive] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const PRODUCTS_PER_PAGE = 50

  const { data: productsData = { products: [], total: 0 }, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', currentPage],
    queryFn: () => inventoryService.getProducts(currentPage, PRODUCTS_PER_PAGE),
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-all-count'],
    queryFn: inventoryService.getAllProductsCount,
    enabled: false,
  })

  const products = productsData.products
  const totalProducts = productsData.total
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE)

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: inventoryService.getCategories,
  })

  const createProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => {
      return inventoryService.createProduct({
        name: data.name,
        description: data.description || '',
        image_url: data.imageUrl || null,
        category_id: data.categoryId,
        purchase_price: data.purchasePrice,
        sale_price: data.salePrice,
        stock: data.stock,
        min_stock: data.minStock,
        code: '0',
        is_active: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-all-count'] })
      toast.success('Producto creado exitosamente')
      setIsProductDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) => {
      return inventoryService.updateProduct(id, {
        name: data.name,
        description: data.description,
        image_url: data.imageUrl || null,
        category_id: data.categoryId,
        purchase_price: data.purchasePrice,
        sale_price: data.salePrice,
        stock: data.stock,
        min_stock: data.minStock,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-all-count'] })
      toast.success('Producto actualizado')
      setIsProductDialogOpen(false)
      setEditingProduct(null)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: string; hardDelete: boolean }) => {
      return inventoryService.deleteProduct(id, hardDelete)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
      setIsDeleteDialogOpen(false)
      setSelectedProduct(null)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const reactivateProductMutation = useMutation({
    mutationFn: (id: string) => inventoryService.reactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto reactivado')
      setSelectedProduct(null)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => {
      return inventoryService.createCategory({
        name: data.name,
        description: data.description || '',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría creada')
      setIsCategoryDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) => {
      return inventoryService.updateCategory(id, {
        name: data.name,
        description: data.description,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría actualizada')
      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: inventoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría eliminada')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const deleteAllProductsMutation = useMutation({
    mutationFn: () => inventoryService.deleteAllProducts(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-all-count'] })
      setCurrentPage(1)
      toast.success(`Eliminados ${result.deleted} productos`)
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const filteredProducts = useMemo(() => {
    let filtered = showInactive ? products : products.filter((p) => p.is_active)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query)
      )
    }
    return filtered
  }, [products, searchQuery, showInactive])

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.min_stock)
  }, [products])

  const productColumns: ColumnDef<Product, unknown>[] = [
    {
      accessorKey: 'image_url',
      header: '',
      cell: ({ row }) => (
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {row.original.image_url ? (
            <img
              src={row.original.image_url}
              alt={row.original.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="h-4 w-4" />
            </div>
          )}
        </div>
      ),
      size: 60,
    },
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="font-medium">{row.original.name}</div>
          {!row.original.is_active && (
            <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category_id',
      header: 'Categoría',
      cell: ({ row }) => {
        const category = categories.find((c) => c.id === row.original.category_id)
        return category?.name || '-'
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const isLow = row.original.stock <= row.original.min_stock
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'text-destructive font-medium' : ''}>
              {row.original.stock}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: 'purchase_price',
      header: 'P. Compra',
      cell: ({ row }) => formatCurrency(row.original.purchase_price),
    },
    {
      accessorKey: 'sale_price',
      header: 'P. Venta',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.sale_price)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_active ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingProduct(row.original)
                  setIsProductDialogOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedProduct(row.original)
                  setIsDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => reactivateProductMutation.mutate(row.original.id)}
                title="Reactivar"
              >
                <Power className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedProduct(row.original)
                  setIsDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const categoryColumns: ColumnDef<Category, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => row.original.description || '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingCategory(row.original)
              setIsCategoryDialogOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('¿Estás seguro de eliminar esta categoría?')) {
                deleteCategoryMutation.mutate(row.original.id)
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const handleProductSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data })
    } else {
      createProductMutation.mutate(data)
    }
  }

  const handleCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data })
    } else {
      createCategoryMutation.mutate(data)
    }
  }

  const handleDelete = (hardDelete: boolean) => {
    if (!selectedProduct) return
    deleteProductMutation.mutate({ id: selectedProduct.id, hardDelete })
  }

  const totalValue = products.reduce((acc, p) => acc + p.stock * p.purchase_price, 0)
  const activeProducts = products.filter((p) => p.is_active).length
  const inactiveProducts = products.filter((p) => !p.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de productos, categorías y stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null)
              setIsCategoryDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Categoría
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('¿Eliminar TODOS los productos? Esta acción no se puede deshacer.')) {
                deleteAllProductsMutation.mutate()
              }
            }}
          >
            <Trash className="h-4 w-4 mr-2" />
            Eliminar Todo
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setIsProductDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Producto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="backdrop-blur-sm border-transparent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0A417415' }}>
              <Package className="h-4 w-4" style={{ color: '#0A4174' }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm border-transparent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm border-transparent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm border-transparent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {inactiveProducts > 0 && (
        <Card className="border-dashed backdrop-blur-sm">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PowerOff className="h-4 w-4" />
              {inactiveProducts} producto{inactiveProducts > 1 ? 's' : ''} inactivo{inactiveProducts > 1 ? 's' : ''}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? 'Ocultar' : 'Mostrar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-yellow-500/20">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
              </div>
              Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge key={product.id} variant="outline" className="border-yellow-500/50 bg-yellow-500/10">
                  {product.name} ({product.stock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>
      </div>

      <div className="flex gap-2 border-b pb-0">
        <Button
          variant={activeTab === 'products' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('products')}
          className="rounded-t-lg"
        >
          Productos
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('categories')}
          className="rounded-t-lg"
        >
          Categorías
        </Button>
      </div>

      {activeTab === 'products' ? (
        <>
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            isLoading={isLoadingProducts}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)} de {totalProducts} productos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <DataTable
          columns={categoryColumns}
          data={categories}
          isLoading={isLoadingCategories}
        />
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Producto</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedProduct && (
              <p className="text-muted-foreground">
                ¿Qué deseas hacer con <strong>{selectedProduct.name}</strong>?
              </p>
            )}
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => handleDelete(false)}
              >
                <PowerOff className="mr-3 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Desactivar</div>
                  <div className="text-xs text-muted-foreground">
                    El producto seguirá existiendo pero no aparecerá en ventas
                  </div>
                </div>
              </Button>
              <Button
                variant="destructive"
                className="justify-start h-auto py-3"
                onClick={() => handleDelete(true)}
              >
                <Trash2 className="mr-3 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Eliminar completamente</div>
                  <div className="text-xs text-muted-foreground/70">
                    Esta acción no se puede deshacer
                  </div>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDialog
        open={isProductDialogOpen}
        onOpenChange={(open) => {
          setIsProductDialogOpen(open)
          if (!open) setEditingProduct(null)
        }}
        product={editingProduct}
        categories={categories}
        onSubmit={handleProductSubmit}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open)
          if (!open) setEditingCategory(null)
        }}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
      />

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['categories'] })
        }}
      />
    </div>
  )
}