import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { FileText, Loader2 } from 'lucide-react'
import { invoiceCustomerSchema, type InvoiceCustomerInput } from '../schemas/invoice-schema'
import { generateInvoicePDF, saveInvoice, type InvoiceItem } from '../services/invoice-service'
import { toast } from 'sonner'
import { z } from 'zod'

interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string | null
  items: {
    productId: string
    name: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  paymentMethod: string
  subtotal: number
  discountPercent: number | null
  discountAmount: number | null
  total: number
}

export function InvoiceDialog({
  open,
  onOpenChange,
  saleId,
  items,
  paymentMethod,
  subtotal,
  discountPercent,
  discountAmount,
  total,
}: InvoiceDialogProps) {
  const [customer, setCustomer] = useState<InvoiceCustomerInput>({
    name: '',
    document: '',
    address: '',
    phone: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceCustomerInput, string>>>({})

  const handleClose = () => {
    setCustomer({ name: '', document: '', address: '', phone: '' })
    setErrors({})
    onOpenChange(false)
  }

  const handleGenerate = async () => {
    try {
      invoiceCustomerSchema.parse(customer)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof InvoiceCustomerInput, string>> = {}
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof InvoiceCustomerInput
          newErrors[field] = issue.message
        })
        setErrors(newErrors)
        return
      }
    }

    setIsGenerating(true)

    try {
      const invoiceItems: InvoiceItem[] = items.map((item) => ({
        id: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        total: item.total,
      }))

      const { pdfContent } = await generateInvoicePDF(
        invoiceItems,
        customer,
        paymentMethod,
        discountPercent,
        discountAmount
      )

      await saveInvoice({
        invoiceNumber: pdfContent.match(/FV-\d{4}/)?.[0] || 'FV-0000',
        saleId,
        customer,
        items: invoiceItems,
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMethod,
      })

      const container = document.createElement('div')
      container.innerHTML = pdfContent
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.padding = '20px'
      container.style.background = 'white'
      container.style.fontFamily = 'Arial, sans-serif'
      document.body.appendChild(container)

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      pdf.save(`Factura_${customer.document}.pdf`)

      document.body.removeChild(container)

      toast.success('Factura generada exitosamente')
      handleClose()
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Error al generar la factura')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Factura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Ingresá los datos del cliente para generar la factura de venta.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="customerName">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Nombre del cliente"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerDocument">
                Cédula / NIT <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerDocument"
                placeholder="CC o NIT del cliente"
                value={customer.document}
                onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
              />
              {errors.document && (
                <p className="text-xs text-destructive">{errors.document}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerAddress">Dirección</Label>
              <Input
                id="customerAddress"
                placeholder="Dirección del cliente"
                value={customer.address || ''}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerPhone">Teléfono</Label>
              <Input
                id="customerPhone"
                placeholder="Teléfono del cliente"
                value={customer.phone || ''}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-medium">Resumen de la venta</p>
            <p className="text-sm text-muted-foreground">
              {items.length} producto{items.length !== 1 ? 's' : ''} - Total:{' '}
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(total)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generar Factura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
