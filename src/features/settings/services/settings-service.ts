import { supabase } from '@/lib/supabase'

interface StoreSettings {
  store_name: string
  store_address: string
  store_phone: string
  store_email: string
  currency: string
  tax_rate: number
}

const defaultSettings: StoreSettings = {
  store_name: 'Control+ Papelería',
  store_address: '',
  store_phone: '',
  store_email: '',
  currency: 'COP',
  tax_rate: 0,
}

export const settingsService = {
  async getSetting(key: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data?.value as Record<string, unknown> || null
  },

  async setSetting(key: string, value: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('settings').upsert(
      { key, value },
      { onConflict: 'key' }
    )

    if (error) throw error
  },

  async getStoreSettings(): Promise<StoreSettings> {
    const result = await this.getSetting('store_settings')
    if (!result) return defaultSettings

    return {
      store_name: (result.store_name as string) || defaultSettings.store_name,
      store_address: (result.store_address as string) || defaultSettings.store_address,
      store_phone: (result.store_phone as string) || defaultSettings.store_phone,
      store_email: (result.store_email as string) || defaultSettings.store_email,
      currency: (result.currency as string) || defaultSettings.currency,
      tax_rate: (result.tax_rate as number) || defaultSettings.tax_rate,
    }
  },

  async saveStoreSettings(settings: StoreSettings): Promise<void> {
    await this.setSetting('store_settings', settings as unknown as Record<string, unknown>)
  },
}