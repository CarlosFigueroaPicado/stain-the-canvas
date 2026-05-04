# STAIN THE CANVAS - AI CONTRACT

## Propósito
Este documento define el contrato arquitectónico para el desarrollo y mantenimiento de Stain the Canvas. Todas las futuras implementaciones deben adherirse a estos principios.

---

## 1. Arquitectura General

### Principios Fundamentales
- **Nunca duplicar lógica**: Si existe una función/componente que resuelve un problema, reutilizarla.
- **Nunca usar `any` innecesario**: Type safety es importante. Usar tipos específicos siempre.
- **No romper compatibilidad existente**: Mantener backward compatibility temporal en migraciones grandes.
- **Mantener Supabase como backend principal**: No agregar múltiples backends sin justificación.
- **No crear archivos innecesarios**: Cada archivo debe tener propósito claro.
- **Mantener estructura modular**: Separación de concerns (api, service, ui, shared).

### Estructura de Carpetas Permitida
```
js/
├── core/              # Configuración y conexión global
├── modules/           # Módulos funcionales (productos, auth, analytics, etc)
│   └── [module]/
│       ├── api.js     # Llamadas a Supabase
│       ├── service.js # Lógica de negocio
│       └── ui/        # Componentes de interfaz
├── shared/            # Utilidades y helpers compartidos
│   ├── product-utils.js
│   ├── chart-colors.js
│   └── ...
supabase/             # SQL migrations
css/                  # Estilos globales
assets/               # Imágenes y recursos estáticos
```

### Patrones de Desarrollo
- **API Layer**: Solo llamadas a Supabase, sin lógica.
- **Service Layer**: Lógica de negocio, validaciones, transformaciones.
- **UI Layer**: Renderizado y eventos de usuario.
- **Shared Layer**: Helpers, utilities, formatters reutilizables.

---

## 2. Base de Datos (Supabase/PostgreSQL)

### Diseño de Schema
- **Preferir relaciones normalizadas**: No denormalizar sin justificación explícita.
- **Evitar arrays para estructuras complejas**: Usar tablas separadas en lugar de JSONB arrays.
  - ❌ Malo: `gallery_urls jsonb[]` (estructura plana)
  - ✅ Bueno: Tabla separada `product_media` con foreign key
- **No usar datos redundantes**: Evitar duplicación de información en múltiples columnas.
  - ❌ Malo: `imagen_url` + `gallery_urls[]` + primera imagen en gallery
  - ✅ Bueno: `product_media` con `is_primary` flag
- **Timestamps siempre**: Incluir `created_at` y `updated_at` en tablas importantes.
- **Soft deletes considerar**: Para datos críticos (no obligatorio).

### Constraints y Indexes
- **Primary keys**: Siempre UUID con `gen_random_uuid()`.
- **Foreign keys**: Siempre con `ON DELETE CASCADE` o `SET NULL` según caso.
- **Unique constraints**: Para datos que deben ser únicos.
- **Indexes**: En columnas frecuentemente buscadas/ordenadas.
  - Mínimo: FK, timestamps, campos en WHERE clauses
  - Compuestos: `(product_id, position)` para ordenamiento
- **RLS (Row Level Security)**: Siempre activo, con policies claras.

### Migraciones SQL
- **Namespaced**: Filename format `YYYYMMDD_feature_description.sql`
- **Idempotent**: Usar `IF NOT EXISTS` para seguridad.
- **Documented**: Comentarios explicando cambios importantes.
- **Reversible**: Incluir rollback path si es posible.

### Datos Inválidos
```javascript
// ❌ PROHIBIDO: Datos que se contradicen
{
  imagen_url: "url1",
  gallery_urls: ["url1", "url2", "url3"]  // ¿cuál es la principal?
}

// ✅ PERMITIDO: Estructura clara
product_media [
  { id: 1, type: 'image', url: 'url1', position: 0, is_primary: true },
  { id: 2, type: 'image', url: 'url2', position: 1, is_primary: false },
  { id: 3, type: 'video', url: 'video-url', position: 0, is_primary: true }
]
```

---

## 3. Frontend (JavaScript/HTML/CSS)

### Responsive Design
- **Breakpoints Bootstrap**:
  - Mobile first (< 576px)
  - md: ≥ 768px
  - lg: ≥ 992px
  - xl: ≥ 1200px
- **Nunca hardcodear dimensiones**: Usar `rem`, `em`, o viewport units.
- **Test en móvil**: Mínimo iPhone SE (375px), máximo 1920px desktop.
- **Mantener consistencia visual**: Colores, tipografía, spacing coherentes.

### Componentes
- **Reutilizables**: Si un componente se repite 2+ veces, extraerlo.
- **Modular**: Cada componente independiente y sin efectos secundarios.
- **Composable**: Poder combinar componentes simples para crear complejos.

### Ejemplos
```javascript
// ❌ PROHIBIDO: Componente no reutilizable con lógica hardcodeada
function renderProductCard(product) {
  return `<div class="card">${product.nombre}</div>`;
  // Solo funciona para productos, no es genérico
}

// ✅ PERMITIDO: Componente reutilizable
function renderCard(item, config = {}) {
  const label = config.label || item.nombre;
  const imageUrl = config.imageUrl || item.imagenUrl;
  return `<div class="card">${label}</div>`;
  // Puede usarse para cualquier tipo de item
}
```

### Accesibilidad
- **ARIA labels**: En elementos interactivos importantes.
- **Keyboard navigation**: Todos los botones/links funcionales con teclado.
- **Contrast**: Mínimo WCAG AA (4.5:1 para texto).
- **Semantic HTML**: Usar `<button>`, `<nav>`, `<article>`, etc.

### No Romper Mobile
- ❌ Viewport no configurable
- ❌ Elementos que requieren hover (no existe en mobile)
- ❌ Drag-drop sin fallback
- ❌ Modals que no cierran en pantalla pequeña

---

## 4. Performance

### Rendering
- **Evitar renders innecesarios**: 
  - State management correcto
  - No crear elementos DOM si no se necesitan
  - Delegar eventos (event delegation)
- **Lazy loading para multimedia**:
  - Imágenes: `loading="lazy"`
  - Videos: Cargar solo cuando modal se abre
  - Scripts: No cargar si no se usan
- **Optimizar queries a Supabase**:
  - Usar `select()` para traer solo columnas necesarias
  - Usar `limit()` apropiadamente
  - Usar índices en database
  - Evitar N+1 queries (usar JOIN cuando sea posible)

### Métricas de Éxito
- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s

### Monitoreo
```javascript
// ✅ PERMITIDO: Loggear performance crítica
console.time("fetchProducts");
const result = await fetchProducts();
console.timeEnd("fetchProducts");
// Resultado: "fetchProducts: 234ms"
```

---

## 5. Seguridad

### Uploads de Archivos
```javascript
// Validar ANTES de enviar a Supabase
const MAX_SIZE = 100 * 1024 * 1024;  // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm'];

if (file.size > MAX_SIZE) {
  throw new Error("Archivo muy grande");
}
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error("Tipo de archivo no permitido");
}
// LUEGO enviar a Supabase
```

### Sanitización de Inputs
```javascript
// ❌ PROHIBIDO: Inyectar HTML sin sanitizar
element.innerHTML = userInput;

// ✅ PERMITIDO: Escapar o usar textContent
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
element.innerHTML = escapeHtml(userInput);

// O mejor aún, usar textContent
element.textContent = userInput;
```

### Keys y Secrets
- **Nunca commitear keys**: `.env`, `.env.local` en `.gitignore`
- **Usar config centralizado**: `js/core/config.js` para constantes públicas
- **Supabase keys**: Solo anon key en cliente (intentionally public)
- **Admin key**: Nunca en cliente, solo en servidor

### CORS y CSP
- **CORS**: Configurado en Supabase (solo dominios permitidos)
- **CSP**: No implementar headers restrictivos sin revisar

### Validación en Servidor
```javascript
// ❌ PROHIBIDO: Confiar solo en validación client-side
if (fileInput.files.length > 0) {
  await uploadFile(file);  // ¿Qué pasa si alguien manipula?
}

// ✅ PERMITIDO: Validar también en servidor (RLS)
// Backend valida mediante RLS en Supabase
alter table product_media enable row level security;
create policy "insert_own_products" on product_media
  for insert with check (
    exists (select 1 from productos where id = product_id 
            and created_by = auth.uid())
  );
```

---

## 6. Código (JavaScript/TypeScript)

### Comentarios
- **Mínimos y útiles**: No comentar código obvio.
- **Documentar el "por qué"**: No el "qué" (el código ya lo dice).
- **TODO/FIXME/HACK**: Solo si realmente hay deuda técnica.

```javascript
// ❌ PROHIBIDO: Comentario obvio
const name = "Carlos";  // Asigna "Carlos" a name

// ✅ PERMITIDO: Comentario útil
// TODO: Cuando hagamos autenticación con redes sociales, 
// este hardcode debe venir de auth.user().metadata
const whatsappNumber = "50589187562";

// ✅ PERMITIDO: Explicar decisión no obvia
// Se repite imagen_url en gallery_urls por compatibilidad temporal
// Fase 2 eliminará imagen_url cuando todos usen product_media
const hasImage = product.imagen_url || product.galleryUrls?.[0];
```

### Nombres Claros
```javascript
// ❌ PROHIBIDO: Nombres ambiguo
function proc(d) {
  return d.map(x => ({ n: x.nombre, p: x.precio }));
}

// ✅ PERMITIDO: Nombres descriptivos
function extractProductsForDisplay(products) {
  return products.map(product => ({
    name: product.nombre,
    price: product.precio
  }));
}
```

### Evitar Hacks Temporales
```javascript
// ❌ PROHIBIDO: Hacks que luego nadie recuerda
if (product.id === "uuid-especial-del-gerente") {
  // descuento especial para producto del gerente
  return price * 0.5;
}

// ✅ PERMITIDO: Implementar correctamente o documentar deuda
// TECHNICAL DEBT: Descuentos deberían ser en tabla discounts
// Por ahora, usar is_discounted flag
if (product.is_discounted) {
  return applyDiscount(price, product.discount_percentage);
}
```

### Patrones a Seguir

**Error Handling**:
```javascript
// ✅ PERMITIDO: Result pattern o try-catch coherente
export function ok(data) {
  return { success: true, data };
}
export function fail(error) {
  return { success: false, error };
}

// Uso
const result = await getProducts();
if (!result.success) {
  console.error(result.error);
  return;
}
// Usar result.data
```

**Async Operations**:
```javascript
// ✅ PERMITIDO: Estado de loading explícito
const state = {
  loading: false,
  data: null,
  error: null
};

async function fetchData() {
  state.loading = true;
  try {
    state.data = await api.getData();
  } catch (e) {
    state.error = e.message;
  } finally {
    state.loading = false;
  }
}
```

**Type Safety (incluso sin TypeScript)**:
```javascript
// ✅ PERMITIDO: JSDoc para documentar tipos
/**
 * @param {Object} product - El producto a normalizar
 * @param {string} product.nombre - Nombre del producto
 * @param {number} product.precio - Precio en NIO
 * @returns {{name: string, price: number}} Producto normalizado
 */
export function normalizeProduct(product) {
  return {
    name: String(product.nombre || ""),
    price: Number(product.precio || 0)
  };
}
```

---

## 7. Workflow y Versionado

### Git Commits
- **Atomic commits**: Un cambio lógico por commit.
- **Mensajes claros**: 
  - feat: Nueva funcionalidad
  - fix: Corrección de bug
  - refactor: Cambio de código sin funcionalidad nueva
  - perf: Optimización de performance
  - docs: Documentación
  - chore: Cambios de configuración/build

```
✅ BUENO: feat: Agregar soporte para drag-drop en media gallery
❌ MALO: fix things, update stuff
```

### Branches
- `main`: Production ready
- `feature/` o `feat/`: Nuevas features
- `fix/`: Correcciones
- `refactor/`: Refactorización
- `docs/`: Documentación

---

## 8. Migraciones Grandes

### Template para Refactores
```markdown
# Refactor: [Descripción]

## Impacto
- Frontend: ¿qué cambia?
- Admin: ¿qué cambia?
- Performance: ¿mejora/empeora?
- Downtime: ¿sí/no?

## Fases
1. Preparación (no breaking changes)
2. Migración de datos (if needed)
3. Deploy de código (gradual)
4. Cleanup (después de validar)

## Rollback
¿Cómo revertir si falla?
```

### Backward Compatibility Temporal
- Mantener columnas/funciones viejas durante transición
- Mapear datos nuevos → viejos automáticamente
- Deprecate en release notes (2+ sprints antes de eliminar)
- Código fallback explícito

---

## 9. Testing

### Testing Manual (Mínimo Requerido)
- [ ] Funcionalidad principal en desktop
- [ ] Funcionalidad principal en móvil
- [ ] Errores se manejan sin crashes
- [ ] Performance aceptable

### Testing Automated (Ideal)
- Unit tests: Lógica crítica (`product-utils.js`, `service.js`)
- Integration tests: Flujos end-to-end
- Visual tests: Screenshots en cambios UI

---

## 10. Documentación

### Obligatoria
- **README.md**: Setup y comandos básicos
- **Migrations**: Comentarios explicando cambios
- **Cambios breaking**: CHANGELOG o notas en PR

### Opcional pero Recomendada
- **Arquitectura**: Docs de decisiones importantes
- **API**: Documentación de funciones públicas
- **TODOs**: Trabajos futuros documentados

---

## 11. Checklist de Pull Request

Antes de mergear código, verificar:

- [ ] No hay duplicación de lógica
- [ ] No hay `any` innecesarios (si hay TypeScript)
- [ ] No se rompe compatibilidad existente
- [ ] El código sigue estructura modular
- [ ] Queries a Supabase son eficientes
- [ ] No hay datos duplicados/contradictorios
- [ ] Mobile no está roto
- [ ] Performance no se degrada
- [ ] Inputs se sanitizan correctamente
- [ ] No hay hardcoding de secrets
- [ ] Nombres de variables/funciones son claros
- [ ] Comentarios son útiles (no obvios)
- [ ] Tests pasan (si existen)
- [ ] Documentación está actualizada

---

## 12. Excepciones Permitidas

### Cuándo romper estas reglas
- **Backward compatibility**: Si los datos son inconsistentes y arreglarlo requiere breaking change
- **Performance**: Si la optimización requiere denormalización, documentar justificación
- **Seguridad**: Si una regla compromete seguridad, ignorarla y documentar
- **Deadline crítico**: Registrar como TECHNICAL DEBT, no como norma

### Cómo documentar excepciones
```javascript
// EXCEPTION: [Regla quebrada]
// REASON: [Por qué]
// DEBT: [Cómo arreglarlo]
// DEADLINE: [Cuándo hacerlo]

// EXCEPTION: Duplicamos lógica en dos lugares
// REASON: Admin UI y Catálogo usan diferentes imports
// DEBT: Extraer a shared/product-display.js
// DEADLINE: Sprint 2026-06
const imagenUrl = resolveProductImageUrl(productInput);
```

---

## Referencias en el Código

Usar este documento como referencia:
```javascript
// Ver AI_CONTRACT.md § 4 (Performance)
// Ver AI_CONTRACT.md § 5 (Seguridad)
// Ver AI_CONTRACT.md § 6 (Código)
```

---

**Última actualización**: 2026-05-03
**Versión**: 1.0 (Baseline)
**Responsable**: Development Team
**Revisión**: Anual o cuando cambien decisiones arquitectónicas
