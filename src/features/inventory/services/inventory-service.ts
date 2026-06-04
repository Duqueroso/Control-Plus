import { supabase } from '@/lib/supabase'
import type { Product, Category } from '@/types'
import type { ProductImport, ImportResult, ImportError } from '@/types'

export const inventoryService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')

    if (error) throw error
    return data || []
  },

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createProduct(product: {
    name: string
    description: string
    image_url?: string | null
    category_id: string
    purchase_price: number
    sale_price: number
    stock: number
    min_stock: number
    code: string
    is_active: boolean
  }): Promise<Product> {
    const { data: maxData } = await supabase
      .from('products')
      .select('code')
      .order('code', { ascending: false })
      .limit(1)
    
    const maxCode = maxData?.[0]?.code ? parseInt(maxData[0].code) : 0
    const newCode = (maxCode + 1).toString()
    
    const productWithCode = { ...product, code: newCode }
    
    const { data, error } = await supabase
      .from('products')
      .insert([productWithCode])
      .select()
      .single()

    if (error) {
      console.error('Create product error:', error)
      throw error
    }
    return data
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteProduct(id: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      const { error } = await supabase.rpc('hard_delete_product', { p_id: id })
      if (error) {
        throw new Error(error.message || 'No se pudo eliminar el producto')
      }
    } else {
      const { error } = await supabase.rpc('soft_delete_product', { product_id: id })
      if (error) {
        throw new Error(error.message || 'No se pudo desactivar el producto')
      }
    }
  },

  async deleteAllProducts(): Promise<{ deleted: number }> {
    const productIds = (await this.getProducts()).map((p) => p.id)
    if (productIds.length === 0) return { deleted: 0 }
    
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', productIds)

    if (error) throw error
    return { deleted: productIds.length }
  },

  async reactivateProduct(id: string): Promise<void> {
    const { error } = await supabase.rpc('reactivate_product', { product_id: id })
    if (error) {
      throw new Error(error.message || 'No se pudo reactivarel producto')
    }
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  },

  async createCategory(category: { name: string; description: string }): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single()

    if (error) {
      console.error('Create category error:', error)
      throw error
    }
    return data
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getLowStockProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lte('stock', 5)

    if (error) throw error
    return data || []
  },

  async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return data || []
  },

  async importProducts(
    products: ProductImport[],
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ImportResult> {
    const errors: ImportError[] = []
    const codeSet = new Set<string>()
    const BATCH_SIZE = 50

    onProgress?.(0, products.length, 'Validando productos...')

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const row = i + 2

      if (!p.nombre?.trim()) {
        errors.push({ row, field: 'nombre', message: 'Requerido', value: p.nombre })
      }
      if (typeof p.precio_compra !== 'number' || p.precio_compra <= 0) {
        errors.push({ row, field: 'precio_compra', message: 'Debe ser número mayor a 0', value: p.precio_compra })
      }
      if (typeof p.precio_venta !== 'number' || p.precio_venta <= 0) {
        errors.push({ row, field: 'precio_venta', message: 'Debe ser número mayor a 0', value: p.precio_venta })
      }
      if (typeof p.stock !== 'number' || p.stock < 0 || !Number.isInteger(p.stock)) {
        errors.push({ row, field: 'stock', message: 'Debe ser entero >= 0', value: p.stock })
      }
      if (!p.categoria?.trim()) {
        errors.push({ row, field: 'categoria', message: 'Requerido', value: p.categoria })
      }
      if (p.codigo?.trim()) {
        if (codeSet.has(p.codigo.trim())) {
          errors.push({ row, field: 'codigo', message: 'Código duplicado en archivo', value: p.codigo })
        }
        codeSet.add(p.codigo.trim())
      }
    }

    if (errors.length > 0) {
      return { success: false, created: 0, updated: 0, errors }
    }

    onProgress?.(0, products.length, 'Sincronizando categorías...')

    const categories = await this.getCategories()
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
    const newCategories: string[] = []

    for (const p of products) {
      const catLower = p.categoria.toLowerCase().trim()
      if (!categoryMap.has(catLower) && !newCategories.includes(catLower)) {
        newCategories.push(p.categoria.trim())
      }
    }

    for (const catName of newCategories) {
      try {
        const newCat = await this.createCategory({ name: catName, description: '' })
        categoryMap.set(catName.toLowerCase(), newCat.id)
      } catch (err) {
        console.error('Error creating category:', err)
      }
    }

    const existingProducts = await this.getProducts()
    const productMap = new Map(
      existingProducts.map((p) => [`${p.name.toLowerCase()}|${categories.find((c) => c.id === p.category_id)?.name.toLowerCase()}`, p])
    )

    const productsToCreate: Array<{
      name: string
      description: string
      image_url?: string | null
      category_id: string
      purchase_price: number
      sale_price: number
      stock: number
      min_stock: number
      code: string
      is_active: boolean
    }> = []

    const productsToUpdate: Array<{ id: string; stock: number }> = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const key = `${p.nombre.toLowerCase().trim()}|${p.categoria.toLowerCase().trim()}`
      const categoryId = categoryMap.get(p.categoria.toLowerCase().trim())

      if (!categoryId) {
        errors.push({ row: i + 2, field: 'categoria', message: `Categoría no encontrada: ${p.categoria}`, value: p.categoria })
        continue
      }

      const existingProduct = productMap.get(key)

      if (existingProduct) {
        productsToUpdate.push({
          id: existingProduct.id,
          stock: existingProduct.stock + p.stock,
        })
      } else {
        const code = p.codigo?.trim() || `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        productsToCreate.push({
          name: p.nombre.trim(),
          description: p.descripcion?.trim() || '',
          category_id: categoryId,
          purchase_price: p.precio_compra,
          sale_price: p.precio_venta,
          stock: p.stock,
          min_stock: p.stock_minimo || 5,
          code,
          is_active: true,
        })
      }
    }

    let batchCreated = 0
    let batchUpdated = 0
    const totalToProcess = productsToCreate.length + productsToUpdate.length
    let processed = 0

    if (productsToCreate.length > 0) {
      const totalBatches = Math.ceil(productsToCreate.length / BATCH_SIZE)
      for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
        const batch = productsToCreate.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        try {
          const { error } = await supabase.from('products').insert(batch)
          if (error) {
            errors.push({ row: 0, field: 'batch', message: `Batch ${batchNum}/${totalBatches} falló: ${error.message}`, value: null })
          } else {
            batchCreated += batch.length
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          errors.push({ row: 0, field: 'batch', message: `Batch ${batchNum}/${totalBatches} exception: ${errorMessage}`, value: null })
        }
        processed += batch.length
        onProgress?.(processed, totalToProcess, `Insertando productos batch ${batchNum}/${totalBatches}...`)
      }
    }

    if (productsToUpdate.length > 0) {
      for (let i = 0; i < productsToUpdate.length; i++) {
        try {
          const { error } = await supabase.from('products').update({ stock: productsToUpdate[i].stock }).eq('id', productsToUpdate[i].id)
          if (error) {
            errors.push({ row: 0, field: 'update', message: `Error actualizando producto ID ${productsToUpdate[i].id}: ${error.message}`, value: null })
          } else {
            batchUpdated++
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          errors.push({ row: 0, field: 'update', message: `Error actualizando producto: ${errorMessage}`, value: null })
        }
        processed++
        if (i % 50 === 0) {
          onProgress?.(processed, totalToProcess, `Actualizando ${processed}/${productsToUpdate.length} productos...`)
        }
      }
    }

    onProgress?.(totalToProcess, totalToProcess, 'Importación completada')

    return {
      success: errors.length === 0,
      created: batchCreated,
      updated: batchUpdated,
      errors
    }
  },
}