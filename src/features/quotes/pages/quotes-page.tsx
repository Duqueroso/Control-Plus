import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QuoteDialog } from '../components/quote-dialog'

export default function QuotesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const lastQuoteNumber = localStorage.getItem('lastQuoteNumber') || 'Ninguna'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground">
            Crea cotizaciones para tus clientes
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          style={{ backgroundColor: '#0A4174' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nueva Cotización
          </CardTitle>
          <CardDescription>
            Genera una cotización en PDF con los productos de tu inventario o items personalizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Características:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Selecciona productos de tu inventario</li>
              <li>• Agrega items personalizados con nombre, descripción y precio</li>
              <li>• Datos del cliente: nombre, email y teléfono</li>
              <li>• Numeración automática (COT-001, COT-002, ...)</li>
              <li>• Validez de 8 días</li>
              <li>• Incluye logo e información de tu tienda</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última cotización generada:</span>
              <span className="font-mono font-medium">{lastQuoteNumber}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuoteDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
