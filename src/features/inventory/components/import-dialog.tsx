import { useState, useCallback } from 'react'
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, CircleDot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { inventoryService } from '../services/inventory-service'
import type { ProductImport, ImportError, ImportResult } from '@/types'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type RowStatus = 'pending' | 'new' | 'update' | 'error'

interface ParsedRow {
  data: ProductImport
  status: RowStatus
  error?: string
}

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<ImportError[]>([])
  const [fileName, setFileName] = useState<string>('')

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    setFileName(file.name)

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

        const headers = jsonData[0] as string[]
        const headerMap: Record<string, string> = {
          'nombre': 'nombre',
          'name': 'nombre',
          'precio_compra': 'precio_compra',
          'purchase_price': 'precio_compra',
          'preciocompra': 'precio_compra',
          'precio_venta': 'precio_venta',
          'sale_price': 'precio_venta',
          'precioventa': 'precio_venta',
          'stock': 'stock',
          'cantidad': 'stock',
          'categoria': 'categoria',
          'category': 'categoria',
          'categoría': 'categoria',
          'codigo': 'codigo',
          'code': 'codigo',
          'descripcion': 'descripcion',
          'description': 'descripcion',
          'stock_minimo': 'stock_minimo',
          'minimo': 'stock_minimo',
        }

        const normalizedHeaders = headers.map((h) => headerMap[h.toLowerCase()] || h.toLowerCase())

        const rows: ParsedRow[] = []
        const validationErrors: ImportError[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[]
          if (!row || row.length === 0 || !row.some((cell) => cell !== undefined && cell !== null && cell !== '')) {
            continue
          }

          const rowData: Record<string, unknown> = {}
          normalizedHeaders.forEach((header, index) => {
            rowData[header] = row[index]
          })

          const product: ProductImport = {
            nombre: String(rowData.nombre || '').trim(),
            precio_compra: parseFloat(String(rowData.precio_compra)) || 0,
            precio_venta: parseFloat(String(rowData.precio_venta)) || 0,
            stock: parseInt(String(rowData.stock)) || 0,
            categoria: String(rowData.categoria || '').trim(),
            codigo: rowData.codigo ? String(rowData.codigo).trim() : undefined,
            descripcion: rowData.descripcion ? String(rowData.descripcion).trim() : undefined,
            stock_minimo: rowData.stock_minimo ? parseInt(String(rowData.stock_minimo)) : undefined,
          }

          const rowNum = i + 1
          const rowErrors: string[] = []

          if (!product.nombre) rowErrors.push('nombre requerido')
          if (product.precio_compra <= 0) rowErrors.push('precio_compra debe ser > 0')
          if (product.precio_venta <= 0) rowErrors.push('precio_venta debe ser > 0')
          if (product.stock < 0 || !Number.isInteger(product.stock)) rowErrors.push('stock debe ser entero >= 0')
          if (!product.categoria) rowErrors.push('categoria requerido')

          if (rowErrors.length > 0) {
            rows.push({ data: product, status: 'error', error: rowErrors.join(', ') })
            validationErrors.push({ row: rowNum, field: 'row', message: rowErrors.join(', '), value: rowData })
          } else {
            rows.push({ data: product, status: 'pending', error: undefined })
          }
        }

        setParsedData(rows)
        setErrors(validationErrors)
      } catch (err) {
        console.error('Error parsing file:', err)
        toast.error('Error al procesar el archivo. Verifica el formato.')
      }
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        processFile(file)
      } else {
        toast.error('Solo se permiten archivos .xlsx o .xls')
      }
    },
    [processFile]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleImport = async () => {
    setIsProcessing(true)

    try {
      const products = parsedData.filter((r) => r.status !== 'error').map((r) => r.data)
      const result: ImportResult = await inventoryService.importProducts(products)

      if (result.success) {
        toast.success(`Importación exitosa: ${result.created} nuevos, ${result.updated} actualizados`)
        onImportComplete()
        handleClose()
      } else {
        setErrors(result.errors)
        toast.error(`Errores encontrados: ${result.errors.length}`)
      }
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Error al importar productos')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setParsedData([])
    setErrors([])
    setFileName('')
    setIsDragging(false)
    onOpenChange(false)
  }

  const stats = {
    new: parsedData.filter((r) => r.status === 'pending').length,
    errors: parsedData.filter((r) => r.status === 'error').length,
    total: parsedData.length,
  }

  const canImport = stats.errors === 0 && stats.total > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {parsedData.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Arrastra tu archivo .xlsx aquí
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Seleccionar archivo
                </label>
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm py-1">
                    {fileName}
                  </Badge>
                  {canImport && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Listo para importar
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CircleDot className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Nuevos:</span>
                  <span className="font-medium">{stats.new}</span>
                </div>
                {stats.errors > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">Errores:</span>
                    <span className="font-medium text-red-600">{stats.errors}</span>
                  </div>
                )}
              </div>

              {stats.errors > 0 && errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm font-medium text-red-600 mb-2">
                    Errores encontrados ({errors.length})
                  </p>
                  <ScrollArea className="h-20">
                    <div className="space-y-1">
                      {errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          Fila {err.row}: {err.message}
                        </p>
                      ))}
                      {errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          ...y {errors.length - 5} errores más
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Estado</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>P. Compra</TableHead>
                      <TableHead>P. Venta</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Categoría</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, i) => (
                      <TableRow key={i} className={row.status === 'error' ? 'bg-red-500/5' : ''}>
                        <TableCell>
                          {row.status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className={row.status === 'error' ? 'text-red-600' : ''}>
                          {row.data.nombre || '-'}
                        </TableCell>
                        <TableCell>{row.data.precio_compra}</TableCell>
                        <TableCell>{row.data.precio_venta}</TableCell>
                        <TableCell>{row.data.stock}</TableCell>
                        <TableCell>{row.data.categoria}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 50 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Mostrando 50 de {parsedData.length} productos
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isProcessing}
                >
                  {isProcessing ? 'Importando...' : `Importar ${stats.new} productos`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}