import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string(),
  imageUrl: z.string().nullable(),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  purchasePrice: z.number().min(0, 'El precio de compra debe ser positivo'),
  salePrice: z.number().min(0, 'El precio de venta debe ser positivo'),
  stock: z.number().int().min(0, 'El stock debe ser un número entero').default(0),
  minStock: z.number().int().min(0, 'El stock mínimo debe ser un número entero').default(5),
  inventoryTracked: z.boolean().default(true),
})

export type ProductFormData = z.infer<typeof productSchema>

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string(),
})

export type CategoryFormData = z.infer<typeof categorySchema>