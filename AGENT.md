# AGENT.md

# Control+ — Sistema ERP/POS para Papelería

## Estado Actual: MVP Completo ✅

El sistema se encuentra en un estado funcional completo con todas las operaciones básicas implementadas.

---

## Stack Tecnológico

## Frontend

* React 18
* TypeScript (strict mode, no `any`)
* Vite
* TailwindCSS
* shadcn/ui
* React Router v7
* Zustand (sessionStorage persistence)
* TanStack Query
* Sonner (toasts)

## Backend / Infraestructura

* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security (RLS)

---

## Arquitectura del Proyecto

Arquitectura modular feature-based.

```
src/features/
├── auth/           # Login, store, hooks, services
├── cash-register/  # Pages, services
├── dashboard/      # Pages, components
├── expenses/       # Pages
├── inventory/       # Pages, components, services, schemas
├── sales/          # POS, history pages, services
├── settings/       # Pages, services
└── users/          # Pages, services
```

---

## Módulos Implementados

### 1. Dashboard
- Ventas del día/mes
- Utilidad estimada (~25%)
- **Caja actual en tiempo real** (inicial + ingresos - egresos)
- Stock bajo, productos destacados, últimas ventas

### 2. Inventario
- CRUD productos y categorías
- Soft delete (desactivar) / Hard delete (eliminar)
- Reactivar productos
- Control de stock

### 3. POS
- Carrito, búsqueda, métodos de pago
- **Validación: caja debe estar abierta**
- **Registro automático en caja como income**
- Actualización automática de stock

### 4. Caja
- Abrir/cerrar con monto inicial
- Movimientos (ingresos/egresos)
- Balance en tiempo real

### 5. Gastos
- Registro por categorías
- **Validación: caja debe estar abierta**
- **Registro automático en caja como expense**

### 6. Usuarios
- Lista con roles (admin/employee)

### 7. Configuración
- Placeholder

---

## Base de Datos

### Tablas
profiles, categories, products, sales, sale_items, cash_registers, cash_movements, expenses, settings

### Funciones RPC
- `decrement_stock(product_id, quantity)`
- `increment_stock(product_id, quantity)`
- `soft_delete_product(product_id)` → is_active = false
- `reactivate_product(product_id)` → is_active = true
- `hard_delete_product(p_id)` → elimina sale_items + producto

---

## Flujo de Caja

```
Abrir caja → inicial
Venta POS → + cash_movement (income)
Gasto → + cash_movement (expense)
Dashboard → balance actualizado
Cerrar caja → sesión terminada
```

---

## Autenticación

- Supabase Auth
- Roles: admin | employee (en profiles.role)
- sessionStorage para persistencia
- Cerrar navegador = logout automático
- Refrescar = sesión persiste

---

## Sesión y Seguridad

- **sessionStorage** (no localStorage)
- Al cerrar navegador: sesión se pierde
- Al hacer F5: sesión persiste
- `useAuthInit` sincroniza rol desde profiles.role

---

## Convenciones

* Variables: camelCase
* Componentes: PascalCase
* Carpetas: kebab-case
* Tipos DB: snake_case
* Imports: @/components, @/features, @/lib

---

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run lint     # Linting
```

---

## Problemas Resueltos

1. **RLS bloqueando** → Políticas configuradas
2. **Caja sin user_id** → openCashRegister recibe userId
3. **Rol no sincronizaba** → useAuthInit consulta profiles.role
4. **Sesión persistente** → Cambiado a sessionStorage
5. **hard_delete_product ambiguous** → parámetro p_id

---

## Backlog

- [ ] Reportes (PDF, Excel)
- [ ] Impresión de recibos POS
- [ ] Paginación en tablas
- [ ] Dashboard con gráficos
- [ ] Auditoría de cambios
- [ ] WhatsApp integración
- [ ] Facturación electrónica
- [ ] Tienda online
- [ ] App móvil

---

*Última actualización: Mayo 2026*