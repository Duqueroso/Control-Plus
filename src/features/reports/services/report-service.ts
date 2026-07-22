import * as XLSX from 'xlsx'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { salesService } from '@/features/sales/services/sales-service'
import { supabase } from '@/lib/supabase'

interface ReportOptions {
  startDate?: string
  endDate?: string
  includeSales: boolean
  includeExpenses: boolean
  includeInventory: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO')
}

export const reportService = {
  async generateReport(options: ReportOptions): Promise<void> {
    const {
      startDate,
      endDate,
      includeSales,
      includeExpenses,
      includeInventory,
    } = options

    const workbook = XLSX.utils.book_new()

    const dateRangeText = startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : 'Todos'

    const createdAt = formatDate(new Date().toISOString())

    // =====================
    // RESUMEN
    // =====================
    const summaryData: (string | number)[][] = [
      ['REPORTE CONTROL+', ''],
      ['', ''],
      ['Fecha de generación:', createdAt],
      ['Período:', dateRangeText],
      ['', ''],
    ]

    if (includeSales) {
      const sales = await salesService.getSales()
      const filteredSales = sales.filter((s) => {
        if (!startDate || !endDate) return true
        const saleDate = new Date(s.created_at)
        return saleDate >= new Date(startDate) && saleDate <= new Date(endDate)
      })
      const totalSales = filteredSales.reduce((acc, s) => acc + Number(s.total), 0)
      summaryData.push(['Total Ventas:', formatCurrency(totalSales)])
      summaryData.push(['Número de Ventas:', filteredSales.length])
    }

    if (includeExpenses) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      const filteredExpenses = (expenses || []).filter((e) => {
        if (!startDate || !endDate) return true
        const expDate = new Date(e.expense_date)
        return expDate >= new Date(startDate) && expDate <= new Date(endDate)
      })
      const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
      summaryData.push(['Total Gastos:', formatCurrency(totalExpenses)])
      summaryData.push(['Número de Gastos:', filteredExpenses.length])
    }

    if (includeInventory) {
      const products = await inventoryService.getAllProducts()
      const totalValue = products.reduce((acc, p) => acc + p.stock * Number(p.purchase_price), 0)
      summaryData.push(['Total Productos:', products.length])
      summaryData.push(['Valor Total Inventario:', formatCurrency(totalValue)])
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Resumen')

    // =====================
    // VENTAS
    // =====================
    if (includeSales) {
      const sales = await salesService.getSales()
      const filteredSales = sales.filter((s) => {
        if (!startDate || !endDate) return true
        const saleDate = new Date(s.created_at)
        return saleDate >= new Date(startDate) && saleDate <= new Date(endDate)
      })

      const salesHeaders = [['Fecha', 'Hora', 'Método', 'Subtotal', 'Descuento', 'Total']]
      const salesRows = filteredSales.map((s) => [
        formatDate(s.created_at),
        new Date(s.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        s.payment_method,
        formatCurrency(Number(s.subtotal) || Number(s.total)),
        s.discount_percent ? `${s.discount_percent}% (-${formatCurrency(Number(s.discount_amount))})` : '-',
        formatCurrency(Number(s.total)),
      ])

      const salesTotal = filteredSales.reduce((acc, s) => acc + Number(s.total), 0)
      const salesSubtotal = filteredSales.reduce((acc, s) => acc + Number(s.subtotal || s.total), 0)
      salesRows.push(['', '', '', formatCurrency(salesSubtotal), '', formatCurrency(salesTotal)])

      const salesData = [...salesHeaders, ...salesRows]
      const salesWs = XLSX.utils.aoa_to_sheet(salesData)
      salesWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, salesWs, 'Ventas')
    }

    // =====================
    // GASTOS
    // =====================
    if (includeExpenses) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      const filteredExpenses = (expenses || []).filter((e) => {
        if (!startDate || !endDate) return true
        const expDate = new Date(e.expense_date)
        return expDate >= new Date(startDate) && expDate <= new Date(endDate)
      })

      const expensesHeaders = [['Fecha', 'Categoría', 'Descripción', 'Monto']]
      const expensesRows = filteredExpenses.map((e) => [
        formatDate(e.expense_date),
        e.category,
        e.description || '-',
        formatCurrency(Number(e.amount)),
      ])

      const expensesTotal = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
      expensesRows.push(['', '', 'TOTAL:', formatCurrency(expensesTotal)])

      const expensesData = [...expensesHeaders, ...expensesRows]
      const expensesWs = XLSX.utils.aoa_to_sheet(expensesData)
      expensesWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(workbook, expensesWs, 'Gastos')
    }

    // =====================
    // INVENTARIO
    // =====================
    if (includeInventory) {
      const products = await inventoryService.getAllProducts()
      const categories = await inventoryService.getCategories()
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

      const invHeaders = [['Código', 'Nombre', 'Categoría', 'Stock', 'Stock Mín', 'P. Compra', 'P. Venta', 'Valor Total']]
      const invRows = products.map((p) => [
        p.code,
        p.name,
        categoryMap.get(p.category_id) || '-',
        p.stock,
        p.min_stock,
        formatCurrency(Number(p.purchase_price)),
        formatCurrency(Number(p.sale_price)),
        formatCurrency(p.stock * Number(p.purchase_price)),
      ])

      const totalValue = products.reduce((acc, p) => acc + p.stock * Number(p.purchase_price), 0)
      invRows.push(['', '', '', '', '', '', 'TOTAL:', formatCurrency(totalValue)])

      const invData = [...invHeaders, ...invRows]
      const invWs = XLSX.utils.aoa_to_sheet(invData)
      invWs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(workbook, invWs, 'Inventario')
    }

    // Generate and download
    const fileName = `ControlPlus_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    // Download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    // Open in new tab
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  },
}