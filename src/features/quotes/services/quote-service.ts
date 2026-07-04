import type { StoreSettings } from '@/features/settings/services/settings-service'
import type { QuoteCustomer } from '../schemas/quote-schema'

export interface QuoteItem {
  id: string
  name: string
  description?: string
  imageUrl?: string | null
  unitPrice: number
  quantity: number
  total: number
}

export interface QuoteData {
  quoteNumber: string
  date: string
  validUntil: string
  customer: QuoteCustomer
  items: QuoteItem[]
  subtotal: number
  total: number
  store: StoreSettings
}

function getNextQuoteNumber(): string {
  const last = localStorage.getItem('lastQuoteNumber') || 'COT-000'
  const num = parseInt(last.split('-')[1], 10) + 1
  const newNumber = `COT-${num.toString().padStart(3, '0')}`
  localStorage.setItem('lastQuoteNumber', newNumber)
  return newNumber
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
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

export function generateQuotePDF(items: QuoteItem[], customer: QuoteCustomer): {
  quoteNumber: string
  date: string
  validUntil: string
  total: number
  pdfContent: string
} {
  const quoteNumber = getNextQuoteNumber()
  const today = new Date()
  const validUntil = addDays(today, 8)
  const subtotal = items.reduce((acc, item) => acc + item.total, 0)

  const storeSettings = {
    store_name: 'Mi Tienda',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_logo: '',
    store_identification: '',
    currency: 'COP',
    tax_rate: 0,
  }

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
        ${customer.email ? `<div style="font-size: 13px; color: #666;">📧 ${customer.email}</div>` : ''}
        ${customer.phone ? `<div style="font-size: 13px; color: #666;">📞 ${customer.phone}</div>` : ''}
      </div>
    </div>
  `

  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cotización ${quoteNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #001D39; padding-bottom: 20px; }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .quote-info { text-align: right; }
        .quote-number { font-size: 24px; font-weight: bold; color: #001D39; }
        .quote-date { font-size: 13px; color: #666; margin-top: 4px; }
        .quote-valid { font-size: 12px; color: #888; margin-top: 2px; }
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
        <div class="quote-info">
          <div class="quote-number">${quoteNumber}</div>
          <div class="quote-date">Fecha: ${formatDate(today)}</div>
          <div class="quote-valid">Válida hasta: ${formatDate(validUntil)}</div>
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

      <div class="total-section">
        <div class="total-box">
          <div class="total-label">TOTAL</div>
          <div class="total-amount">${formatCurrency(subtotal)}</div>
        </div>
      </div>

      <div class="footer">
        Esta cotización tiene validez de 8 días. Los precios pueden variar sin previo aviso.
      </div>
    </body>
    </html>
  `

  return {
    quoteNumber,
    date: formatDate(today),
    validUntil: formatDate(validUntil),
    total: subtotal,
    pdfContent,
  }
}
