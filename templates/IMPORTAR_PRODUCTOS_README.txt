// Template para importar productos a Control+
// =============================================
//
// INSTRUCCIONES:
// 1. Abre este archivo con Excel o Google Sheets
// 2. Agrega tus productos en las filas siguientes (desde la fila 2)
// 3. Guarda como .xlsx
// 4. Importa desde Inventario > Importar
//
// COLUMNAS:
// - nombre: REQUIRED - Nombre del producto (ej: "Lapicero Azul")
// - precio_compra: REQUIRED - Precio de compra (número)
// - precio_venta: REQUIRED - Precio de venta (número)
// - stock: REQUIRED - Cantidad en stock (número entero >= 0)
// - categoria: REQUIRED - Nombre de la categoría (si no existe, se crea automáticamente)
// - codigo: OPTIONAL - Código único. Si está vacío se genera automáticamente
// - descripcion: OPTIONAL - Descripción del producto
// - stock_minimo: OPTIONAL - Stock mínimo para alerta. Default: 5
//
// CATEGORIAS PREDEFINIDAS:
// Papelería, Tecnología, Oficina, Otros
//
// VALIDACIONES:
// - Si hay 1 error en cualquier fila, NO se importará nada
// - Stock se SUMA al existente si el producto ya existe (por nombre + categoría)
// - Códigos duplicados en el archivo causarán error
//
// EJEMPLO:
nombre,precio_compra,precio_venta,stock,categoria,codigo,descripcion,stock_minimo
Lapicero Azul,1500,3000,50,Papelería,LAP001,Lapicero de tinta azul,5
Lapicero Rojo,1500,3000,50,Papelería,LAP002,Lapicero de tinta roja,5