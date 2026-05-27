# Control+ — Sistema ERP/POS para Papelería

Sistema de administración integral para papelería y negocio comercial, construido con React, TypeScript, Supabase y shadcn/ui.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **UI** | shadcn/ui, Lucide Icons, Sonner (toasts) |
| **Estado** | Zustand (global), TanStack Query (server) |
| **Routing** | React Router v7 |
| **Backend** | Supabase (PostgreSQL, Auth, RLS) |
| **Deployment** | Vercel (preparado) |

---

## Módulos Implementados

### 1. Dashboard
- Ventas del día y del mes
- Utilidad estimada (~25% margen)
- **Caja actual en tiempo real** (balance = inicial + ingresos - egresos)
- Stock bajo (productos con alerta)
- Productos destacados
- Últimas ventas
- Resumen del mes

### 2. Inventario
- CRUD completo de productos
- CRUD de categorías
- Código único automático
- Control de stock (no permite ventas sin stock)
- Precio de compra / venta
- **Soft delete** (desactivar producto)
- **Hard delete** (eliminación completa)
- Reactivar producto
- Filtro por activo/inactivo

### 3. Punto de Venta (POS)
- Carrito de compras
- Búsqueda por nombre o código
- Métodos de pago: Efectivo, Transferencia, QR, Tarjeta
- Confirmación de venta con resumen
- **Validación de caja abierta** (no permite vender si caja cerrada)
- **Registro automático de venta en caja** (movimiento tipo `income`)
- Actualización automática de inventario
- Descuento de stock por venta

### 4. Caja
- Abrir caja con monto inicial
- Cerrar caja
- Agregar movimientos (ingresos/egresos)
- Historial de movimientos
- **Balance en tiempo real** (inicial + ingresos - egresos)
- Badge de estado (abierta/cerrada)

### 5. Gastos
- Registro de gastos por categoría
- Categorías: Arriendo, Servicios, Nómina, Inventario, Transporte, Marketing, Impuestos, Útiles, Mantenimiento, Otros
- Historial con búsqueda
- Totales (general y mensual)
- **Validación de caja abierta** (no permite crear gasto si caja cerrada)
- **Registro automático en caja** (movimiento tipo `expense`)

### 6. Usuarios
- Lista de usuarios
- Roles: Admin / Empleado
- Estado activo/inactivo

### 7. Configuración
- Placeholder para configuraciones futuras

---

## Base de Datos (PostgreSQL)

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (extiende auth.users) |
| `categories` | Categorías de productos |
| `products` | Productos del inventario |
| `sales` | Ventas realizadas |
| `sale_items` | Items de cada venta |
| `cash_registers` | Sesiones de caja |
| `cash_movements` | Movimientos de caja (ingresos/egresos) |
| `expenses` | Gastos registrados |
| `settings` | Configuraciones del sistema |

### Funciones RPC

| Función | Uso |
|---------|-----|
| `decrement_stock` | Descuenta stock al realizar venta |
| `increment_stock` | Restaura stock al cancelar venta |
| `soft_delete_product` | Desactiva producto (is_active = false) |
| `reactivate_product` | Reactiva producto (is_active = true) |
| `hard_delete_product` | Elimina producto y sus sale_items |

---

## Flujo de Caja

```
1. Abrir caja → initial_amount → balance = inicial
2. Venta en POS → cash_movement (income) → balance aumenta
3. Gasto creado → cash_movement (expense) → balance disminuye
4. Dashboard → Balance actualizado en tiempo real
5. Cerrar caja → Sesión terminada, balance queda en historial
```

**Restricciones:**
- POS: Solo permite ventas si la caja está abierta
- Gastos: Solo permite registrar si la caja está abierta

---

## Autenticación y Autorización

- **Supabase Auth** para autenticación
- **Row Level Security (RLS)** para control de acceso
- Roles: `admin` | `employee`
- Perfil de usuario almacenado en tabla `profiles.role`

### Políticas RLS

| Tabla | Lectura | Escritura |
|-------|---------|-----------|
| profiles | Todos autenticados | Solo admins |
| categories | Todos | Solo admins |
| products | Todos | Solo admins |
| sales | Propias + admins | Propias |
| cash_registers | Propias + admins | Propias + admins |
| cash_movements | Según caja | Según caja |
| expenses | Todos | Todos |

---

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Primary | `#0A4174` | Botones, acciones |
| Sidebar Dark | `#001D39` | Fondo sidebar |
| Secondary | `#49769F` | Acentos |
| Accent | `#4E84A2` | Cards destacadas |
| Soft | `#7BBDE8` | Estados hover |
| Light | `#BDD8E9` | Fondos suaves |

---

## Arquitectura

```
src/
├── components/
│   ├── layout/        # Sidebar, Navbar, MainLayout, ProtectedRoute
│   └── ui/            # shadcn/ui components
├── features/
│   ├── auth/          # Login, auth-service, auth-store, use-auth-init
│   ├── cash-register/ # Caja (pages, services)
│   ├── dashboard/     # Dashboard (pages, components)
│   ├── expenses/      # Gastos (pages)
│   ├── inventory/     # Inventario (pages, components, services, schemas)
│   ├── sales/         # POS y historial (pages, services)
│   ├── settings/      # Configuración (pages, services)
│   └── users/         # Usuarios (pages, services)
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   └── utils.ts       # Utilidades
├── types/
│   └── index.ts       # Tipos TypeScript
├── router/
│   └── index.tsx      # Configuración de rutas
├── App.tsx
├── main.tsx
└── index.css          # Variables CSS, temas
```

---

## Sesión y Seguridad

- **sessionStorage** para persistencia de sesión
- Al cerrar navegador → sesión se pierde → pide login
- Al refrescar (F5) → sesión persiste → sigue logueado
- `useAuthInit` sincroniza el rol desde `profiles.role` en cada carga

---

## Convenciones de Código

| Convention | Ejemplo |
|------------|---------|
| Variables | `camelCase` |
| Componentes | `PascalCase` |
| Carpetas | `kebab-case` |
| Tipos TypeScript | `snake_case` (para coincidir con PostgreSQL) |
| Imports | `@/components`, `@/features`, `@/lib` |

### Tipos principales (snake_case para DB)

```typescript
interface Product {
  id: string
  code: string
  name: string
  description: string
  category_id: string
  purchase_price: number
  sale_price: number
  stock: number
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## Scripts Disponibles

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview build
npm run lint     # Linting
```

---

## Próximos Pasos (Backlog)

- [ ] Reportes avanzados (PDF, Excel)
- [ ] Impresión de recibos POS
- [ ] Paginación en tablas grandes
- [ ] Auditoría de cambios
- [ ] Dashboard con gráficos
- [ ] Integración WhatsApp
- [ ] Facturación electrónica
- [ ] Tienda online
- [ ] App móvil

---

## Notas de Desarrollo

### Problemas resueltos

1. **RLS bloqueando acceso** → Políticas configuradas para permitir lectura/escritura según rol
2. **Caja no vinculada a usuario** → `openCashRegister` ahora recibe `userId`
3. **Rol no sincronizaba** → `useAuthInit` consulta `profiles.role` en cada carga
4. **Sesión persistente en localStorage** → Cambiado a `sessionStorage` para cerrar al cerrar navegador
5. **Ambiguous column en hard_delete_product** → Parámetro renombrado a `p_id`

### HardDelete vs SoftDelete

| Método | Función | Uso |
|--------|---------|-----|
| **Soft Delete** | `soft_delete_product` | Desactiva producto (is_active=false), сохраняет historial |
| **Hard Delete** | `hard_delete_product` | Elimina sale_items y producto completo |

---

## Contacto / Soporte

Para este proyecto: **duquetb101@gmail.com**

---

*Última actualización: Mayo 2026*