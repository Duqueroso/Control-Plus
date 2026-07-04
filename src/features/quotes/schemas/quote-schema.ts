import { z } from 'zod'

export const quoteCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').or(z.literal('')),
  phone: z.string(),
})

export type QuoteCustomer = z.infer<typeof quoteCustomerSchema>

export const customItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string(),
  unitPrice: z.number().min(0, 'El precio debe ser positivo'),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
})

export type CustomItem = z.infer<typeof customItemSchema>

export const quoteSchema = z.object({
  customer: quoteCustomerSchema,
  customItems: z.array(customItemSchema),
})

export type QuoteFormData = z.infer<typeof quoteSchema>
