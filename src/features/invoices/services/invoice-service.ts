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

export async function generateInvoicePDF(
  items: InvoiceItem[],
  customer: InvoiceCustomer,
  _paymentMethod: string,
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
    ? `<img src="${storeSettings.store_logo}" alt="Logo" style="width: 100%; max-width: 140px; height: auto;" />`
    : `<div style="width: 120px; height: 50px; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 700; font-size: 22px; color: #1877F2;">${storeSettings.store_name}</div>`

  const itemsRowsHtml = items
    .map(
      (item, index) => `
      <tr style="background: ${index % 2 === 0 ? '#FFFFFF' : '#F4F5F7'};">
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #111111; font-size: 13px;">${item.name}</div>
          ${item.description ? `<div style="font-size: 11px; color: #8E8E8E; margin-top: 4px; line-height: 1.4;">${item.description}</div>` : ''}
        </td>
        <td style="padding: 16px 12px; text-align: center; font-size: 12px; color: #111111;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 16px 12px; text-align: center; font-size: 12px; color: #111111;">${item.quantity}</td>
        <td style="padding: 16px 12px; text-align: center; font-size: 12px; color: #8E8E8E;">0%</td>
        <td style="padding: 16px 12px; text-align: center; font-size: 12px; color: #8E8E8E;">0%</td>
        <td style="padding: 16px 12px; text-align: right; font-weight: 600; color: #111111; font-size: 13px;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('')

  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
          color: #111111;
          background: #FFFFFF;
          line-height: 1.5;
          padding: 45px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 50px;
        }
        .logo-section {
          width: 20%;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h1 {
          font-size: 44px;
          font-weight: 700;
          color: #111111;
          letter-spacing: -1px;
        }
        .invoice-meta {
          margin-top: 12px;
          font-size: 11px;
          color: #8E8E8E;
        }
        .invoice-meta span {
          color: #111111;
          font-weight: 500;
        }
        .parties-section {
          display: grid;
          grid-template-columns: 1fr 80px 1fr;
          margin-bottom: 45px;
        }
        .party-box h4 {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #8E8E8E;
          margin-bottom: 12px;
        }
        .party-box .company-name {
          font-size: 18px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 8px;
        }
        .party-box p {
          font-size: 12px;
          color: #8E8E8E;
          line-height: 1.6;
        }
        .party-right {
          text-align: right;
        }
        .party-right .company-name {
          font-size: 18px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 8px;
        }
        .party-right p {
          font-size: 12px;
          color: #8E8E8E;
          line-height: 1.6;
        }
        .party-block {
          margin-bottom: 28px;
        }
        .table-section {
          margin-bottom: 45px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead tr {
          background: #1877F2;
        }
        thead th {
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 14px 12px;
          text-align: left;
        }
        thead th:nth-child(2),
        thead th:nth-child(3),
        thead th:nth-child(4),
        thead th:nth-child(5) {
          text-align: center;
        }
        thead th:last-child {
          text-align: right;
        }
        .tbody tr:first-child td {
          padding-top: 20px;
        }
        .tbody tr:last-child td {
          padding-bottom: 20px;
        }
        .footer-section {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 60px;
        }
        .payment-info h4,
        .notes h4 {
          font-size: 13px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 12px;
        }
        .payment-methods {
          margin-bottom: 24px;
        }
        .payment-methods p {
          font-size: 12px;
          color: #8E8E8E;
          margin-bottom: 4px;
        }
        .notes p {
          font-size: 11px;
          color: #8E8E8E;
          line-height: 1.6;
          max-width: 280px;
        }
        .summary-box {
          background: #F4F5F7;
          border-radius: 10px;
          padding: 24px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
        }
        .summary-row span:first-child {
          color: #8E8E8E;
        }
        .summary-row span:last-child {
          color: #111111;
          font-weight: 500;
        }
        .summary-row.total-row {
          background: #F4F5F7;
          margin: 12px -24px -24px;
          padding: 20px 24px;
          border-radius: 0 0 10px 10px;
        }
        .summary-row.total-row span:first-child {
          color: #111111;
          font-weight: 700;
          font-size: 14px;
        }
        .summary-row.total-row span:last-child {
          color: #111111;
          font-weight: 700;
          font-size: 22px;
        }
        .signature {
          margin-top: 50px;
          text-align: right;
        }
        .signature-line {
          font-family: 'Brush Script MT', cursive;
          font-size: 32px;
          color: #1877F2;
        }
        .signature-label {
          font-size: 10px;
          color: #8E8E8E;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHtml}
        </div>
        <div class="invoice-title">
          <h1>Factura PDF</h1>
          <div class="invoice-meta">
            <div>N° Orden: <span>${invoiceNumber}</span></div>
            <div>Fecha: <span>${formatDate(today)}</span></div>
          </div>
        </div>
      </div>

      <div class="parties-section">
        <div class="party-box">
          <h4>De</h4>
          <div class="company-name">${storeSettings.store_name}</div>
          <p>
            ${storeSettings.store_identification ? storeSettings.store_identification + '<br>' : ''}
            ${storeSettings.store_email || 'email@ejemplo.com'}<br>
            ${storeSettings.store_phone || '+57 300 000 0000'}<br>
            ${storeSettings.store_address || 'Dirección de la empresa'}
          </p>
        </div>
        <div></div>
        <div class="party-box party-right">
          <div class="party-block">
            <h4>Cobrar a</h4>
            <div class="company-name">${customer.name}</div>
            <p>
              ${customer.document}<br>
              ${customer.phone || ''}<br>
              ${customer.address || ''}
            </p>
          </div>
          <div class="party-block">
            <h4>Envíe a</h4>
            <p>
              ${customer.name}<br>
              ${customer.address || 'Dirección del cliente'}
            </p>
          </div>
        </div>
      </div>

      <div class="table-section">
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Descripción</th>
              <th style="width: 15%;">Precio unitario</th>
              <th style="width: 10%;">Cantidad</th>
              <th style="width: 12%;">Impuestos</th>
              <th style="width: 12%;">Descuento</th>
              <th style="width: 11%;">Total</th>
            </tr>
          </thead>
          <tbody class="tbody">
            ${itemsRowsHtml}
          </tbody>
        </table>
      </div>

      <div class="footer-section">
        <div>
          <div class="payment-info">
            <h4>Instrucciones de pago</h4>
            <div class="payment-methods">
              <p>Efectivo</p>
              <p>Transferencia bancaria</p>
              <p>Correo PayPal</p>
              <p>Cheque</p>
            </div>
          </div>
          <div class="notes">
            <h4>Notas</h4>
            <p>Gracias por su compra. Esta factura es un documento soporte de la transacción. Konserve el documento para cualquier reclamo o garantía.</p>
          </div>
        </div>
        <div>
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${discountAmount ? `
            <div class="summary-row">
              <span>Descuento ${discountPercent ? `(${discountPercent}%)` : ''}</span>
              <span>-${formatCurrency(discountAmount)}</span>
            </div>
            ` : ''}
            <div class="summary-row">
              <span>Envío</span>
              <span>${formatCurrency(0)}</span>
            </div>
            <div class="summary-row">
              <span>Impuestos</span>
              <span>${formatCurrency(0)}</span>
            </div>
            <div class="summary-row total-row">
              <span>Saldo pendiente</span>
              <span>${formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="signature">
        <div class="signature-line">Firma</div>
        <div class="signature-label">Authorized Signature</div>
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
