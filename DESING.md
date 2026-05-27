# DESIGN.md

# Control+ — Design System & UI Guidelines

## Objetivo del diseño

Control+ debe sentirse como una aplicación SaaS moderna, rápida, tecnológica e intuitiva.

La experiencia debe combinar:

* Minimalismo premium
* Productividad rápida
* Estética moderna
* Interfaces limpias
* Navegación eficiente
* Sensación tecnológica elegante

Inspiraciones visuales:

* Apple
* Discord
* Linear
* Stripe
* Vercel

La aplicación NO debe parecer:

* un ERP viejo,
* software corporativo anticuado,
* ni un dashboard saturado.

---

# Filosofía de diseño

## Principios principales

* Minimalismo funcional
* Jerarquía visual clara
* Mucho espacio en blanco
* Componentes reutilizables
* UI rápida y limpia
* Interfaces intuitivas
* Información importante visible primero
* Evitar ruido visual
* Microanimaciones modernas
* Experiencia fluida

---

# Identidad visual

## Estilo general

La aplicación debe verse como:

* SaaS premium
* Dashboard moderno
* Sistema tecnológico
* UI elegante y ligera

Nunca usar:

* sombras exageradas
* bordes pesados
* gradientes excesivos
* interfaces recargadas

---

# Paleta de colores

## Primary Colors

* #001D39
* #0A4174
* #49769F
* #4E84A2
* #6EA2B3
* #7BBDE8
* #BDD8E9

---

# Uso recomendado de colores

## Primario principal

`#0A4174`

Usar en:

* botones primarios
* links activos
* acciones importantes
* estados activos

---

## Fondo oscuro premium

`#001D39`

Usar en:

* sidebar
* navbar dark
* elementos premium
* fondos tecnológicos

---

## Colores secundarios

`#49769F`
`#4E84A2`

Usar en:

* hover
* cards destacadas
* gráficos
* badges

---

## Colores suaves

`#6EA2B3`
`#7BBDE8`
`#BDD8E9`

Usar en:

* backgrounds suaves
* estados hover
* elementos secundarios
* bordes sutiles

---

# Modo oscuro

El dark mode tendrá soporte básico.

No crear una UI completamente diferente.

Mantener:

* misma estructura
* misma jerarquía
* mismos componentes

Usar:

* fondos oscuros suaves
* contraste limpio
* evitar negro puro

---

# Layout general

## Estructura principal

* Sidebar izquierda compacta
* Navbar superior
* Contenido central limpio
* Dashboard modular

---

# Sidebar

## Características

* Compacta
* Moderna
* Con iconos
* Hover animations suaves
* Tooltips
* Colapsable

## Diseño

* Fondo oscuro premium
* Iconos minimalistas
* Estado activo elegante
* Transiciones suaves

## Debe sentirse como

* Discord
* Linear
* Vercel

---

# Navbar

## Contenido

* Breadcrumbs
* Búsqueda rápida
* Usuario
* Tema light/dark
* Notificaciones futuras

## Estilo

* Transparencia ligera
* Blur sutil
* Minimalista
* Altura pequeña

---

# Dashboard

## Sensación principal

El dashboard debe sentirse:

* rápido
* limpio
* moderno
* útil

No sobrecargar información.

---

# Componentes del dashboard

## Cards métricas

Mostrar:

* ventas del día
* utilidad mensual
* caja actual
* stock bajo
* movimientos recientes

## Diseño de cards

* Glassmorphism ligero
* Bordes suaves
* Blur sutil
* Sombras suaves
* Íconos minimalistas
* Mucho padding

---

# Tablas

## Estilo

Tablas estilo SaaS moderno.

Inspiración:

* Stripe
* Notion
* Linear

## Características

* Limpias
* Espaciadas
* Hover elegante
* Responsive
* Acciones rápidas
* Headers sticky

---

# Formularios

## Estilo

* Compactos
* Claros
* Muy intuitivos

## Inputs

* Bordes suaves
* Focus elegante
* Estados claros
* Labels flotantes opcionales

## Validaciones

Mostrar:

* mensajes limpios
* estados visuales claros

---

# Botones

## Estilo

* Modernos
* Suaves
* Premium

## Variantes

* primary
* secondary
* ghost
* destructive
* outline

## Animaciones

* hover suave
* scale mínimo
* transición rápida

---

# Animaciones

## Reglas

Usar animaciones modernas pero elegantes.

Evitar:

* animaciones exageradas
* efectos distractores

## Permitido

* fade
* slide suave
* hover transitions
* microinteracciones
* blur transitions

## Librería recomendada

Framer Motion

---

# POS / Ventas

## Sensación

La pantalla POS debe sentirse:

* extremadamente rápida
* simple
* eficiente
* optimizada para productividad

Inspiración:

* POS modernos tablet
* interfaces iPad

---

# Layout POS

## División recomendada

### Izquierda

* búsqueda productos
* categorías
* productos

### Derecha

* carrito
* resumen
* total
* métodos pago

---

# Productos POS

## Diseño

* cards rápidas
* compactas
* visuales
* fáciles de tocar

---

# Login

## Diseño recomendado

Pantalla dividida moderna.

### Lado izquierdo

* branding
* gradientes suaves
* mensaje visual

### Lado derecho

* formulario limpio
* login minimalista

Inspiración:

* Stripe
* Linear
* Notion

---

# Responsive

## Mobile

Responsive adaptativo simple.

No crear experiencia mobile separada.

---

# Reglas responsive

## Mobile

* sidebar collapsable
* tablas adaptables
* cards verticales
* spacing reducido

## Tablet

* layout híbrido

## Desktop

* experiencia completa

---

# Tipografía

## Fuente recomendada

Inter

Fallback:

* system-ui
* sans-serif

---

# Jerarquía tipográfica

## Títulos

* claros
* modernos
* semi-bold

## Texto

* limpio
* altamente legible

Evitar:

* fuentes decorativas
* exceso de tamaños

---

# Iconografía

## Librería

Lucide React

## Estilo

* lineal
* minimalista
* consistente

---

# Espaciado

## Regla general

Mucho aire visual.

No saturar componentes.

Usar spacing consistente.

---

# Componentes reutilizables

Crear sistema reutilizable para:

* buttons
* cards
* tables
* modals
* forms
* dialogs
* alerts
* badges
* stats cards
* charts wrappers

---

# Toasts y feedback

## Notificaciones

Usar toasts modernas y elegantes.

Características:

* animación suave
* posición discreta
* íconos minimalistas

---

# Estados vacíos

Todos los módulos deben tener:

* empty states
* skeleton loaders
* loading states
* error states

---

# UX Rules

## Reglas importantes

* Nunca saturar pantallas
* Priorizar velocidad de uso
* Mantener navegación intuitiva
* Acciones importantes visibles
* Minimizar clics
* Mantener consistencia visual
* Mantener consistencia de spacing
* Mantener feedback visual constante

---

# Librerías UI recomendadas

## Obligatorias

* TailwindCSS
* shadcn/ui
* Lucide React

## Recomendadas

* Framer Motion
* Recharts
* Sonner

---

# Reglas para OpenCode

## UI

* Nunca generar interfaces antiguas
* Nunca crear componentes visualmente saturados
* Mantener estética SaaS moderna
* Priorizar minimalismo premium
* Mantener consistencia visual

## Componentes

* Reutilizables
* Pequeños
* Escalables
* Responsive

## Diseño

* Mantener estética tecnológica
* Mucho espacio visual
* Animaciones suaves
* Glassmorphism ligero
* UI limpia

---

# Resultado esperado

La aplicación debe sentirse como:

* una startup SaaS premium
* un dashboard moderno
* una herramienta tecnológica rápida
* un sistema intuitivo y elegante

No debe sentirse como:

* software viejo
* ERP clásico
* sistema corporativo pesado
* aplicación genérica
