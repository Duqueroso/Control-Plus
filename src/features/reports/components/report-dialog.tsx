import { useState } from 'react'
import { FileSpreadsheet, Download, Calendar } from 'lucide-react'
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
import { reportService } from '../services/report-service'
import { toast } from 'sonner'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Checkbox({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
    />
  )
}

export function ReportDialog({ open, onOpenChange }: ReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeSales, setIncludeSales] = useState(true)
  const [includeExpenses, setIncludeExpenses] = useState(true)
  const [includeInventory, setIncludeInventory] = useState(true)

  const handleGenerate = async () => {
    if (!includeSales && !includeExpenses && !includeInventory) {
      toast.error('Selecciona al menos una sección para incluir')
      return
    }

    setIsGenerating(true)

    try {
      await reportService.generateReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeSales,
        includeExpenses,
        includeInventory,
      })
      toast.success('Reporte generado exitosamente')
      onOpenChange(false)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Error al generar el reporte')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    setStartDate('')
    setEndDate('')
    setIncludeSales(true)
    setIncludeExpenses(true)
    setIncludeInventory(true)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Generar Reporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Rango de Fechas
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sin fechas = se incluirán todos los registros
            </p>
          </div>

          <div className="space-y-3">
            <Label>Incluir en el reporte</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sales"
                  checked={includeSales}
                  onCheckedChange={(checked) => setIncludeSales(checked as boolean)}
                />
                <label htmlFor="sales" className="text-sm cursor-pointer">
                  Ventas
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expenses"
                  checked={includeExpenses}
                  onCheckedChange={(checked) => setIncludeExpenses(checked as boolean)}
                />
                <label htmlFor="expenses" className="text-sm cursor-pointer">
                  Gastos
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inventory"
                  checked={includeInventory}
                  onCheckedChange={(checked) => setIncludeInventory(checked as boolean)}
                />
                <label htmlFor="inventory" className="text-sm cursor-pointer">
                  Inventario
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              El reporte se descargará como archivo Excel y se abrirá en una nueva pestaña.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              'Generando...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}