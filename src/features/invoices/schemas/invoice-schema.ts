import { z } from 'zod'

export const invoiceCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  document: z.string().min(1, 'La cédula/NIT es requerida'),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export type InvoiceCustomerInput = z.infer<typeof invoiceCustomerSchema>

export const invoiceSchema = z.object({
  customer: invoiceCustomerSchema,
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>
