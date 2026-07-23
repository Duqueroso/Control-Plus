import { supabase } from '@/lib/supabase'
import type { StoreSettings } from '@/features/settings/services/settings-service'

export interface InvoiceItem {
  id: string
  name: string
  description?: string
  imageUrl?: string | null
  unitPrice: number
  quantity: number
  total: number
}

export interface InvoiceCustomer {
  name: string
  document: string
  address?: string
  phone?: string
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  customer: InvoiceCustomer
  items: InvoiceItem[]
  subtotal: number
  discountPercent: number | null
  discountAmount: number | null
  total: number
  paymentMethod: string
  store: StoreSettings
}

export interface Invoice {
  id: string
  invoice_number: string
  sale_id: string | null
  customer_name: string
  customer_document: string
  customer_address: string | null
  customer_phone: string | null
  subtotal: number
  discount_percent: number | null
  discount_amount: number | null
  total: number
  payment_method: string
  created_at: string
}

export interface InvoiceItemData {
  id: string
  invoice_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'store_settings')
    .single()

  if (error || !data) {
    return {
      store_name: 'Mi Tienda',
      store_address: '',
      store_phone: '',
      store_email: '',
      store_logo: '',
      store_identification: '',
      currency: 'COP',
      tax_rate: 0,
    }
  }

  return data.value as StoreSettings
}

export function getNextInvoiceNumber(): string {
  const last = localStorage.getItem('lastInvoiceNumber') || 'FV-000'
  const num = parseInt(last.split('-')[1], 10) + 1
  const newNumber = `FV-${num.toString().padStart(4, '0')}`
  localStorage.setItem('lastInvoiceNumber', newNumber)
  return newNumber
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    qr: 'Código QR',
    card: 'Tarjeta',
  }
  return labels[method] || method
}

export async function generateInvoicePDF(
  items: InvoiceItem[],
  customer: InvoiceCustomer,
  paymentMethod: string,
  discountPercent: number | null,
  discountAmount: number | null
): Promise<{
  invoiceNumber: string
  date: string
  total: number
  pdfContent: string
}> {
  const invoiceNumber = getNextInvoiceNumber()
  const today = new Date()
  const subtotal = items.reduce((acc, item) => acc + item.total, 0)
  const total = subtotal - (discountAmount || 0)

  const storeSettings = await getStoreSettings()

  const logoHtml = storeSettings.store_logo
    ? `<img src="${storeSettings.store_logo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />`
    : `<div style="width: 150px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-weight: bold; color: #001D39;">${storeSettings.store_name}</div>`

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />`
              : '<div style="width: 50px; height: 50px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999;">📦</div>'
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          <div style="font-weight: 500; color: #333;">${item.name}</div>
          ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.description}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center; color: #666;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; color: #333;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #333;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('')

  const customerHtml = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase;">Cliente</h3>
      <div style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${customer.name}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 2px;">CC/NIT: ${customer.document}</div>
        ${customer.address ? `<div style="font-size: 13px; color: #666;">📍 ${customer.address}</div>` : ''}
        ${customer.phone ? `<div style="font-size: 13px; color: #666;">📞 ${customer.phone}</div>` : ''}
      </div>
    </div>
  `

  const discountHtml = discountAmount
    ? `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
      <div style="background: #f9f9f9; padding: 10px 20px; border-radius: 6px; text-align: right;">
        <div style="font-size: 13px; color: #666;">Descuento ${discountPercent ? `(${discountPercent}%)` : ''}</div>
        <div style="font-size: 16px; font-weight: 600; color: #c73e3e;">-${formatCurrency(discountAmount)}</div>
      </div>
    </div>
  `
    : ''

  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #001D39; padding-bottom: 20px; }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 24px; font-weight: bold; color: #001D39; }
        .invoice-date { font-size: 13px; color: #666; margin-top: 4px; }
        .invoice-method { font-size: 12px; color: #888; margin-top: 2px; }
        .store-info { margin-top: 8px; font-size: 13px; color: #666; }
        .store-name { font-size: 18px; font-weight: bold; color: #001D39; }
        .store-id { font-size: 12px; color: #888; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #001D39; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
        th:last-child { text-align: right; }
        .total-section { display: flex; justify-content: flex-end; margin-top: 20px; }
        .total-box { background: #001D39; color: white; padding: 20px 30px; border-radius: 8px; text-align: right; min-width: 250px; }
        .total-label { font-size: 14px; opacity: 0.8; }
        .total-amount { font-size: 28px; font-weight: bold; margin-top: 4px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${logoHtml}
          <div>
            <div class="store-name">${storeSettings.store_name}</div>
            ${storeSettings.store_identification ? `<div class="store-id">${storeSettings.store_identification}</div>` : ''}
            <div class="store-info">
              ${storeSettings.store_address ? `📍 ${storeSettings.store_address}` : ''}
              ${storeSettings.store_phone ? ` 📞 ${storeSettings.store_phone}` : ''}
              ${storeSettings.store_email ? ` 📧 ${storeSettings.store_email}` : ''}
            </div>
          </div>
        </div>
        <div class="invoice-info">
          <div class="invoice-number">${invoiceNumber}</div>
          <div class="invoice-date">Fecha: ${formatDate(today)}</div>
          <div class="invoice-method">Pago: ${getPaymentMethodLabel(paymentMethod)}</div>
        </div>
      </div>

      ${customerHtml}

      <table>
        <thead>
          <tr>
            <th style="width: 70px;"></th>
            <th>Producto</th>
            <th style="width: 80px; text-align: center;">Cant.</th>
            <th style="width: 120px; text-align: right;">P. Unit.</th>
            <th style="width: 120px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${discountHtml}

      <div class="total-section">
        <div class="total-box">
          <div class="total-label">TOTAL</div>
          <div class="total-amount">${formatCurrency(total)}</div>
        </div>
      </div>

      <div class="footer">
        Factura de venta. Esta factura es un documento soporte de la transacción.
      </div>
    </body>
    </html>
  `

  return {
    invoiceNumber,
    date: formatDate(today),
    total,
    pdfContent,
  }
}

export async function saveInvoice(invoice: {
  invoiceNumber: string
  saleId: string | null
  customer: InvoiceCustomer
  items: InvoiceItem[]
  subtotal: number
  discountPercent: number | null
  discountAmount: number | null
  total: number
  paymentMethod: string
}): Promise<Invoice> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoice.invoiceNumber,
      sale_id: invoice.saleId,
      customer_name: invoice.customer.name,
      customer_document: invoice.customer.document,
      customer_address: invoice.customer.address || null,
      customer_phone: invoice.customer.phone || null,
      subtotal: invoice.subtotal,
      discount_percent: invoice.discountPercent,
      discount_amount: invoice.discountAmount,
      total: invoice.total,
      payment_method: invoice.paymentMethod,
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  const invoiceItems = invoice.items.map((item) => ({
    invoice_id: invoiceData.id,
    product_id: null,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total,
  }))

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems)

  if (itemsError) throw itemsError

  return invoiceData as Invoice
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItemData[]> {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)

  if (error) throw error
  return data || []
}
