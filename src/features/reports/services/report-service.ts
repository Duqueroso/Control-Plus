import * as XLSX from 'xlsx'
import { inventoryService } from '@/features/inventory/services/inventory-service'
import { salesService } from '@/features/sales/services/sales-service'
import { cashRegisterService } from '@/features/cash-register/services/cash-register-service'
import { supabase } from '@/lib/supabase'
import type { CashMovement } from '@/types'

interface ReportOptions {
  startDate?: string
  endDate?: string
  includeSales: boolean
  includeExpenses: boolean
  includeCashMovements: boolean
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
      includeCashMovements,
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

    if (includeCashMovements) {
      const cashRegisters = await cashRegisterService.getAllCashRegisters()
      let totalIncome = 0
      let totalExpense = 0

      for (const cr of cashRegisters) {
        if (cr.status === 'open') continue
        const movements = await cashRegisterService.getCashMovements(cr.id)
        const filteredMovs = movements.filter((m) => {
          if (!startDate || !endDate) return true
          const movDate = new Date(m.created_at)
          return movDate >= new Date(startDate) && movDate <= new Date(endDate)
        })
        totalIncome += filteredMovs.filter((m) => m.type === 'income').reduce((acc, m) => acc + Number(m.amount), 0)
        totalExpense += filteredMovs.filter((m) => m.type === 'expense').reduce((acc, m) => acc + Number(m.amount), 0)
      }
      summaryData.push(['Total Ingresos de Caja:', formatCurrency(totalIncome)])
      summaryData.push(['Total Egresos de Caja:', formatCurrency(totalExpense)])
      summaryData.push(['Balance de Caja:', formatCurrency(totalIncome - totalExpense)])
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
    // MOVIMIENTOS DE CAJA
    // =====================
    if (includeCashMovements) {
      const cashRegisters = await cashRegisterService.getAllCashRegisters()
      const allMovements: (CashMovement & { registerId: string; registerOpenedAt: string })[] = []

      for (const cr of cashRegisters) {
        const movements = await cashRegisterService.getCashMovements(cr.id)
        const filtered = movements.filter((m) => {
          if (!startDate || !endDate) return true
          const movDate = new Date(m.created_at)
          return movDate >= new Date(startDate) && movDate <= new Date(endDate)
        })
        allMovements.push(...filtered.map((m) => ({ ...m, registerId: cr.id, registerOpenedAt: cr.opened_at })))
      }

      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const movHeaders = [['Fecha', 'Hora', 'Tipo', 'Descripción', 'Monto']]
      const movRows = allMovements.map((m) => [
        formatDate(m.created_at),
        new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        m.type === 'income' ? 'Ingreso' : 'Egreso',
        m.description || '-',
        `${m.type === 'income' ? '+' : '-'}${formatCurrency(Number(m.amount))}`,
      ])

      const totalIncome = allMovements.filter((m) => m.type === 'income').reduce((acc, m) => acc + Number(m.amount), 0)
      const totalExpense = allMovements.filter((m) => m.type === 'expense').reduce((acc, m) => acc + Number(m.amount), 0)
      movRows.push(['', '', '', 'TOTAL INGRESOS:', `+${formatCurrency(totalIncome)}`])
      movRows.push(['', '', '', 'TOTAL EGRESOS:', `-${formatCurrency(totalExpense)}`])
      movRows.push(['', '', '', 'BALANCE:', formatCurrency(totalIncome - totalExpense)])

      const movData = [...movHeaders, ...movRows]
      const movWs = XLSX.utils.aoa_to_sheet(movData)
      movWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(workbook, movWs, 'Movimientos Caja')
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