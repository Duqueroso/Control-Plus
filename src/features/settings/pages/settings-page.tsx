import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Store, Palette, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { settingsService } from '../services/settings-service'
import { toast } from 'sonner'

interface StoreSettings {
  store_name: string
  store_address: string
  store_phone: string
  store_email: string
  currency: string
  tax_rate: number
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    store_name: 'Control+ Papelería',
    store_address: '',
    store_phone: '',
    store_email: '',
    currency: 'COP',
    tax_rate: 0,
  })

  const { data: loadedSettings } = useQuery({
    queryKey: ['settings', 'store'],
    queryFn: () => settingsService.getStoreSettings(),
  })

  useEffect(() => {
    if (loadedSettings) {
      setStoreSettings(loadedSettings)
    }
  }, [loadedSettings])

  const saveMutation = useMutation({
    mutationFn: (settings: StoreSettings) => settingsService.saveStoreSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuración guardada')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const handleSave = () => {
    saveMutation.mutate(storeSettings)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Ajustes del sistema y preferencias
        </p>
      </div>

      <Tabs defaultValue="store" className="w-full">
        <TabsList>
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Tienda
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Tienda</CardTitle>
              <CardDescription>
                Configura la información básica de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Nombre de la tienda</Label>
                  <Input
                    id="store_name"
                    value={storeSettings.store_name}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, store_name: e.target.value })
                    }
                    placeholder="Mi Papelería"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_phone">Teléfono</Label>
                  <Input
                    id="store_phone"
                    value={storeSettings.store_phone}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, store_phone: e.target.value })
                    }
                    placeholder="300 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_email">Email</Label>
                  <Input
                    id="store_email"
                    type="email"
                    value={storeSettings.store_email}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, store_email: e.target.value })
                    }
                    placeholder="contacto@tienda.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_address">Dirección</Label>
                  <Input
                    id="store_address"
                    value={storeSettings.store_address}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, store_address: e.target.value })
                    }
                    placeholder="Calle 123 #45-67"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Input
                    id="currency"
                    value={storeSettings.currency}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, currency: e.target.value })
                    }
                    placeholder="COP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tasa de impuesto (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={storeSettings.tax_rate}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        tax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>
                Configura el aspecto visual del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  La apariencia del sistema está configurada con los colores de marca
                  predefined. El modo oscuro y claro se controla desde el sistema.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Colores de la marca</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-md border"
                        style={{ backgroundColor: '#001D39' }}
                      />
                      <span className="text-sm">Primario</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-md border"
                        style={{ backgroundColor: '#7BBDE8' }}
                      />
                      <span className="text-sm">Acento</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Modo de color</h4>
                  <p className="text-sm text-muted-foreground">
                    El sistema automáticamente detecta tu preferencia de color del sistema.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}