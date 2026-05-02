# Plan de Migración: Agregar Soporte de Videos a Productos

**Documento de Análisis Técnico - Stain the Canvas**  
**Fecha:** 2 de Mayo de 2026  
**Estado:** Propuesta (No implementada)

---

## 📋 ÍNDICE

1. [Análisis de Arquitectura Actual](#análisis-de-arquitectura-actual)
2. [Limitaciones y Restricciones](#limitaciones-y-restricciones)
3. [Estrategias de Migración](#estrategias-de-migración)
4. [Riesgos y Mitigación](#riesgos-y-mitigación)
5. [Plan Incremental Recomendado](#plan-incremental-recomendado)

---

## 1. ANÁLISIS DE ARQUITECTURA ACTUAL

### 1.1 Estructura de Datos

```
┌─────────────────────────────────────────────────────────┐
│ TABLE: productos                                        │
├─────────────────────────────────────────────────────────┤
│ id (uuid) PRIMARY KEY                                  │
│ nombre (text) NOT NULL                                 │
│ categoria (text) NOT NULL                              │
│ categoria_id (uuid) FK → categorias.id                 │
│ subcategory_id (uuid) FK → subcategorias.id            │
│ descripcion (text) NOT NULL                            │
│ precio (numeric)                                       │
│ imagen_url (text)          ← CAMPO PRINCIPAL           │
│ gallery_urls (jsonb)       ← GALERÍA DE IMÁGENES      │
│ featured (boolean)                                     │
│ vistas (integer)                                       │
│ clicks (integer)                                       │
│ created_at, updated_at (timestamptz)                   │
└─────────────────────────────────────────────────────────┘

gallery_urls = [
  "https://storage.../catalogo/123-producto-1.jpg",
  "https://storage.../catalogo/123-producto-2.jpg",
  "https://storage.../catalogo/123-producto-3.jpg"
]

imagen_url = gallery_urls[0]  // Primera imagen = principal
```

### 1.2 Flujo de Datos: Backend (BD)

```
Base de Datos (Supabase PostgreSQL)
│
├─ Tabla: productos
│  ├─ imagen_url (campo legacy)
│  ├─ gallery_urls (JSONB array - imágenes solo)
│  ├─ categoria_id (FK)
│  └─ subcategory_id (FK)
│
├─ Tabla: categorias
│  └─ id, nombre, orden, is_active
│
└─ Tabla: subcategorias
   └─ id, nombre, categoria_id, descripcion, orden, is_active
```

### 1.3 Flujo de Datos: Frontend (Upload)

```
Admin Upload Flow:
│
├─ 1. Usuario selecciona 10 imágenes en input type="file"
│
├─ 2. JS valida cada archivo
│  ├─ MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 (5MB)
│  ├─ ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jfif']
│  └─ Rechaza cualquier tipo que no sea imagen
│
├─ 3. uploadFiles() en products/service.js
│  ├─ Itera secuencialmente (NO paralelo)
│  ├─ Para cada archivo:
│  │  ├─ Genera nombre: {batchId}-{producto}-{index}.{ext}
│  │  ├─ Sube a: storage.from('productos').upload(path, file)
│  │  ├─ Obtiene URL pública: getPublicUrl(path)
│  │  └─ Agrega a array: uploaded.push(publicUrl)
│  │
│  └─ Retorna array: [url1, url2, ..., url10]
│
├─ 4. Guardado en BD
│  ├─ imagen_url = uploaded[0]
│  ├─ gallery_urls = uploaded (array completo)
│  └─ INSERT/UPDATE productos
│
└─ 5. Respuesta al usuario
   └─ "Producto creado con 10 imágenes"
```

### 1.4 Flujo de Datos: Frontend (Display)

```
Página Inicio (home.js) / Catálogo (catalog.js)
│
├─ 1. getProductImageUrls(product, size)
│  ├─ Extrae: imagen_url + gallery_urls
│  ├─ Resuelve URLs (storage path → full URL)
│  ├─ Retorna array de URLs ordenadas
│  └─ [url1, url2, url3, ...]
│
├─ 2. shouldUseCarousel(urls)
│  ├─ if (urls.length > 1) → usar carrusel
│  └─ else → mostrar imagen única
│
├─ 3. Renderizado
│  ├─ Sin carrusel (1 imagen):
│  │  └─ <img src="url1" />
│  │
│  └─ Con carrusel (2+ imágenes):
│     ├─ <carousel>
│     ├─ <img src="url1" /> (activa)
│     ├─ <img src="url2" />
│     ├─ <img src="url3" />
│     └─ Botones prev/next
│
└─ 4. Eventos
   └─ Click → track evento analytics
```

### 1.5 Índices y Performance

```sql
-- Índices actuales
create index idx_productos_featured_created_at 
  on public.productos (featured desc, created_at desc);

create index idx_productos_gallery_urls_gin 
  on public.productos using gin (gallery_urls jsonb_path_ops);
  -- ↑ Permite búsquedas eficientes en el array JSONB

create index idx_productos_categoria_id_featured_created 
  on public.productos (categoria_id, featured, created_at desc);
```

### 1.6 Storage en Supabase

```
Bucket: 'productos' (public)
├─ Ruta: /catalogo/{batchId}-{nombre}-{index}.{ext}
├─ Ej: /catalogo/1746259200000-pulsera-1.jpg
├─ Políticas RLS:
│  ├─ SELECT: public
│  ├─ INSERT: admin only
│  ├─ UPDATE: admin only
│  └─ DELETE: admin only
│
└─ URL generada:
   https://{SUPABASE_URL}/storage/v1/object/public/productos/catalogo/...
```

---

## 2. LIMITACIONES Y RESTRICCIONES

### 2.1 Limitaciones Actuales

| Límite | Valor | Ubicación | Notas |
|--------|-------|-----------|-------|
| Tamaño por imagen | 5 MB | `admin.js:10` | MAX_IMAGE_SIZE_BYTES |
| Formatos permitidos | JPEG, PNG, WEBP, GIF, JFIF | `admin.js:12-17` | ALLOWED_IMAGE_TYPES |
| Tipos de media | Solo imágenes | Frontend validation | Rechaza videos |
| Galería | 1 array JSONB | `setup.sql:17` | gallery_urls es JSONB array |
| Orden | Secuencial de upload | `service.js:96` | Índice basado en position |

### 2.2 Restricciones de Diseño

**A. Acoplamiento tight del frontend a gallery_urls:**
```javascript
// Cualquier cambio en estructura afecta estos 3 lugares:
// 1. home.js:170 - getProductImageUrls(product, "900x700")
// 2. catalog.js:147 - getProductImageUrls(product, "900x700")
// 3. admin.js:233 - setImagePreview(product.galleryUrls)

// getProductImageUrls extrae SOLO de imagen_url + gallery_urls
// → No hay soporte para otros tipos de media
```

**B. Asunción hardcodeada de tipos en shared/product-utils.js:**
```javascript
// Línea 108-142: getProductGalleryUrls()
// Asume que todo lo que entra es una imagen
// No valida MIME type de URL
```

**C. Validación de tipos solo en frontend:**
```javascript
// admin.js:276-283
// Si el usuario sube un .mp4 con MIME type correcto,
// se rechaza en el frontend, pero no hay validación en BD
// → Si se modifica la DB directamente, puede haber inconsistencias
```

### 2.3 Problemas si Agregamos Videos sin Migración

| Problema | Impacto | Severidad |
|----------|--------|-----------|
| Mezclar imágenes + videos en gallery_urls | Carrusel rompe con `<video>` | 🔴 ALTO |
| Validar MIME type en URL | Carrusel renderiza `<img>` para video | 🔴 ALTO |
| Duplicate URLs (img + video) | gallery_urls crece sin control | 🟠 MEDIO |
| Performance JSONB grandes | Índice GIN se ralentiza | 🟠 MEDIO |
| Sin orden de media | UI ambigua (¿qué es primero?) | 🟡 BAJO |
| Sin relación con categoría | Analytics incompleto | 🟡 BAJO |

---

## 3. ESTRATEGIAS DE MIGRACIÓN

### 3.1 ESTRATEGIA A: Mínima (Quick Win)

**Filosofía:** Cambios mínimos, máxima compatibilidad.

```
Paso 1: Nueva columna video_url
├─ ALTER TABLE productos ADD COLUMN video_url text DEFAULT NULL;
├─ Almacena solo UN video por producto
├─ Orden: imagen_url primero, luego video_url
└─ ✓ Sin migración de datos existentes

Paso 2: Actualizar frontend
├─ admin.js: Permitir upload de video (checkbox opcional)
├─ admin.js: Mostrar input separado para video
├─ product-utils.js: Nueva función getProductVideoUrl()
└─ ✓ Gallery_urls sigue siendo solo imágenes

Paso 3: UI Display
├─ home.js/catalog.js: Detectar si hay video
├─ Renderizar: imágenes → video (o lado a lado)
├─ Modal: Alternar entre galería imágenes y video
└─ ✓ Sin romper carrusel existente

Ventajas:
✅ 0 migración de datos
✅ Backward compatible 100%
✅ Cambios localizados
✅ Fácil rollback
✅ Testing simple

Desventajas:
❌ Limitado a 1 video
❌ Dos campos separados (mantenimiento)
❌ No escalable a múltiples videos
❌ Gallery + video separados en UI
```

**Scope de Cambios:**
```
Archivos modificados:
├─ supabase/setup.sql (1 columna nueva)
├─ js/modules/products/api.js (2 líneas en SELECT)
├─ js/shared/product-utils.js (1 función nueva)
├─ js/modules/products/ui/admin.js (40-50 líneas)
├─ js/modules/products/ui/home.js (20 líneas)
└─ js/modules/products/ui/catalog.js (20 líneas)
```

---

### 3.2 ESTRATEGIA B: Escalable (Product Media Table)

**Filosofía:** Arquitectura futura-proof, flexible.

```
Paso 1: Nueva tabla product_media
├─ CREATE TABLE product_media
│  ├─ id (uuid) PRIMARY KEY
│  ├─ producto_id (uuid) FK → productos.id
│  ├─ media_type ('image' | 'video' | 'document')
│  ├─ media_url (text) NOT NULL
│  ├─ mime_type (text)
│  ├─ orden (integer) → Orden de visualización
│  ├─ duracion_segundos (integer) → Para videos
│  ├─ created_at, updated_at
│  └─ is_active (boolean)
│
└─ Índices:
   ├─ (producto_id, orden, media_type)
   ├─ (producto_id, is_active)
   └─ (media_type)

Paso 2: Migrar datos legacy
├─ Datos existentes en imagen_url + gallery_urls
├─ INSERT INTO product_media (producto_id, media_type, media_url, orden)
│  SELECT id, 'image', imagen_url, 0 FROM productos WHERE imagen_url IS NOT NULL
└─ Migraciones similares para gallery_urls

Paso 3: Actualizar BD
├─ Mantener imagen_url + gallery_urls por compatibilidad
├─ Agregar triggers para sincronizar (si se modifica product_media)
├─ O: Agregar columna producto_id a product_media como PK de referencia
└─ Views para compatibilidad:
   CREATE VIEW producto_gallery AS
   SELECT producto_id, array_agg(media_url) as gallery_urls
   FROM product_media WHERE media_type = 'image'
   ORDER BY orden

Paso 4: Actualizar frontend
├─ getProductMedia(producto_id) → retorna array de objetos
├─ Cada objeto: {type: 'image'|'video', url, orden, duracion}
├─ Renderizar dinámicamente según type
└─ Ordenar por campo orden

Paso 5: Admin UI
├─ Drag-and-drop reordenar media
├─ Quitar individual media items
├─ Marcar como 'imagen principal'
└─ Tipos de media con iconos

Ventajas:
✅ Escalable (N videos, imágenes, documentos)
✅ Flexible para futuros tipos (PDF, 360 photos, etc)
✅ Orden explícito en DB
✅ Performance: índice en producto_id + orden
✅ Analytics por tipo de media
✅ Sin duplicados de URLs

Desventajas:
❌ Migración compleja de datos legacy
❌ 3-4 semanas de trabajo
❌ Más puntos de ruptura posible
❌ Requiere testing exhaustivo
❌ Cambios en múltiples capas (DB, API, UI)
```

**Scope de Cambios:**
```
Archivos nuevos:
├─ supabase/migrations/create_product_media.sql
├─ supabase/migrations/migrate_legacy_media.sql
└─ js/modules/media/service.js (nuevo)

Archivos modificados:
├─ supabase/setup.sql (crear tabla + triggers)
├─ js/modules/products/api.js (queries nuevas)
├─ js/modules/products/service.js (exportar media service)
├─ js/shared/product-utils.js (deprecar getProductImageUrls, agregar getProductMedia)
├─ js/modules/products/ui/admin.js (completo rewrite)
├─ js/modules/products/ui/home.js (20-30 líneas)
├─ js/modules/products/ui/catalog.js (20-30 líneas)
└─ admin.html (agregar drag-drop UI)
```

---

## 4. RIESGOS Y MITIGACIÓN

### 4.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|--------|-----------|
| Carrusel rompe con video | 🔴 Alto | 🔴 Crítico | Validar MIME en renderizado |
| Performance JSONB degradada | 🟡 Bajo-Medio | 🟠 Medio | Testing con 100+ productos |
| Productos sin imagen principal | 🟠 Medio | 🟠 Medio | Default a primer media |
| Conflicto imagen_url vs product_media | 🔴 Alto | 🟠 Medio | Sincronización con triggers |
| URLs corruptas en migration | 🟠 Medio | 🟠 Medio | Validar URL en migration |
| Bucket storage sin espacio | 🟡 Bajo | 🔴 Crítico | Monitoreo cuota Supabase |

### 4.2 Riesgos de Regresión

```javascript
// Caso 1: Usuarios con productos legacy
// Problema: image_url vacío, gallery_urls con imágenes
// Solución: Fallback a gallery_urls[0] en getProductImageUrl()
// Testing: 100 productos con diferentes combinaciones

// Caso 2: Analytics events trackeando media_id
// Problema: No existe media_id en eventos históricos
// Solución: Mantener backward compatibility con nullable media_id
// Testing: Eventos históricos sin romper dashboards

// Caso 3: RLS policies con new table
// Problema: Heredar permisos de productos.id incorrectamente
// Solución: Crear políticas explícitas para product_media
// Testing: Intentos no autorizados de lectura/escritura

// Caso 4: Carrusel bootstrap con dinámico content
// Problema: Si agregamos video_tag a carrusel, bootstrap no reconoce <video>
// Solución: Renderizar como <div> con <img> o <video> adentro
// Testing: En todos los navegadores (Chrome, Safari, Firefox)
```

### 4.3 Riesgos de Performance

```sql
-- Query actual (simple)
SELECT id, nombre, imagen_url, gallery_urls, ...
FROM productos
WHERE featured = true;
-- ✓ Índice: idx_productos_featured_created_at (rápido)
-- ✓ Tamaño: 1 row = ~5KB (gallery_urls con 10 URLs)

-- Query con product_media (join)
SELECT p.id, p.nombre, pm.media_url, pm.media_type, pm.orden
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
WHERE p.featured = true
ORDER BY p.created_at DESC, pm.orden ASC;
-- ⚠ Tamaño: 1 producto con 20 media = 20 rows
-- ⚠ Problema: N+1 en frontend si iteramos por producto

-- Mitigación:
-- Usar query única con array_agg
SELECT p.id, p.nombre,
       array_agg(json_build_object(
         'url', pm.media_url,
         'type', pm.media_type,
         'orden', pm.orden
       ) ORDER BY pm.orden) as media
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
WHERE p.featured = true
GROUP BY p.id
ORDER BY p.created_at DESC;
-- ✓ 1 row por producto (mejor)
```

### 4.4 Riesgos de RLS / Seguridad

```sql
-- Actual (RLS en productos)
alter table public.productos enable row level security;
create policy "Public can read productos"
  on public.productos
  for select using (true);

-- Nuevo (RLS en product_media)
alter table public.product_media enable row level security;

-- ❌ INCORRECTO: Heredar de productos.id
create policy "Public can read media"
  on public.product_media
  for select using (
    producto_id IN (
      SELECT id FROM productos
    )
  );
-- ⚠ Problema: Circular reference, performance

-- ✓ CORRECTO: Independiente pero coherente
create policy "Public can read media"
  on public.product_media
  for select using (true);

create policy "Authenticated can insert media"
  on public.product_media
  for insert with check (
    public.is_admin_user() AND 
    producto_id IN (SELECT id FROM productos)
  );
```

---

## 5. PLAN INCREMENTAL RECOMENDADO

### 5.1 Fase 1: Preparación (1 semana)

**Objetivo:** Validar plan, preparar testing.

```
□ 1.1 Code Review de este documento
      └─ Team sign-off en arquitectura elegida

□ 1.2 Crear rama de feature: feature/add-video-support
      └─ Proteger main branch

□ 1.3 Preparar tests
      ├─ SQL migrations test (antes/después)
      ├─ API tests (upload de video válido/inválido)
      ├─ Frontend tests (renderizado de video)
      └─ RLS policy tests

□ 1.4 Backup de BD actual
      └─ Snapshot de Supabase antes de cambios

□ 1.5 Documentar cambios
      ├─ CHANGELOG.md
      ├─ API docs actualizados
      └─ Guía de migración para devs
```

### 5.2 Fase 2: Implementación de Backend (1.5 semanas)

**Elegir según estrategia:**

#### 5.2a. Si ESTRATEGIA A (Mínima)

```
□ 2.1 ALTER TABLE productos ADD COLUMN video_url
      ├─ Migration: add_video_url_column.sql
      ├─ Agregar índice si busca por video_url
      └─ Test: Verificar column agregada

□ 2.2 Actualizar API queries
      ├─ js/modules/products/api.js
      ├─ Agregar video_url a SELECT
      └─ Test: Verificar SELECT retorna video_url

□ 2.3 RLS policies (sin cambios si video_url sigue siendo text)
      └─ Test: Admin puede leer/escribir

□ 2.4 Validación en API
      ├─ Endpoint de validación de URL video
      ├─ Verificar MIME type desde headers
      └─ Test: URLs válidas/inválidas
```

#### 5.2b. Si ESTRATEGIA B (Escalable)

```
□ 2.1 CREATE TABLE product_media
      ├─ Campos: id, producto_id, media_type, media_url, mime_type, orden, etc
      ├─ Foreign key to productos.id
      ├─ Índices: (producto_id, orden), (media_type)
      ├─ RLS policies
      └─ Test: Estructura correcta

□ 2.2 Migrar datos legacy
      ├─ Migration: migrate_legacy_gallery_to_product_media.sql
      ├─ INSERT FROM imagen_url
      ├─ INSERT FROM gallery_urls (cada elemento)
      ├─ Validar orden
      └─ Test: N productos = N*M media rows

□ 2.3 Triggers para sincronización (opcional)
      ├─ Antes de DELETE product_media: copiar a imagen_url/gallery_urls
      ├─ O: Deprecar imagen_url, usar solo product_media
      └─ Test: Consistencia antes/después

□ 2.4 RLS policies específicas
      ├─ SELECT: public
      ├─ INSERT: admin
      ├─ UPDATE: admin (solo orden/is_active)
      ├─ DELETE: admin
      └─ Test: Intentos no autorizados rechazados

□ 2.5 API queries nuevas
      ├─ getProductMedia(productId) con JOINs optimizados
      ├─ Retornar array_agg de media objects
      └─ Test: Performance con 100+ media items
```

### 5.3 Fase 3: Implementación Frontend (1.5 semanas)

```
□ 3.1 Actualizar product-utils.js
      ├─ Deprecar getProductImageUrls() (mantener por compat)
      ├─ Agregar getProductMedia(product, filterByType)
      ├─ Función auxiliar: detectarMediaType(url, mimeType)
      └─ Test: Detección correcta de tipos

□ 3.2 Actualizar admin.js
      ├─ Agregar input para video (tipo file con accept="video/*")
      ├─ O: Agregar reordenamiento de media (Estrategia B)
      ├─ Validación: MAX_VIDEO_SIZE_BYTES = 100MB (configurable)
      ├─ Validación: ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
      └─ Test: Upload exitoso/fallido de videos

□ 3.3 Actualizar products/service.js uploadFiles()
      ├─ Agregar parámetro: mediaType ('image' | 'video')
      ├─ Validar tipos según mediaType
      ├─ Generar ruta diferente: /videos/{batchId}... vs /images/...
      ├─ Retornar objeto: {url, type, mimeType, orden}
      └─ Test: Uploads paralelos de imagen + video

□ 3.4 Actualizar home.js
      ├─ Extraer media con getProductMedia()
      ├─ Renderizar carrusel con <img> para images
      ├─ O: <video> para videos (si strateg B)
      ├─ Controlar: Click en video no abre modal
      └─ Test: Renderizado correcto en desktop/mobile

□ 3.5 Actualizar catalog.js
      ├─ Mismo que home.js
      ├─ Agregar icono de video si hay video
      └─ Test: Grid layout no rompe

□ 3.6 HTML actualizado (admin.html)
      ├─ Agregar input file para videos en formulario productos
      ├─ Vista previa: <video> controls
      ├─ O: Reordenador de media (drag-drop)
      └─ Test: UI accesible
```

### 5.4 Fase 4: Testing (1 semana)

```
□ 4.1 Tests unitarios
      ├─ product-utils.js: Detectar tipos media
      ├─ service.js: Validación de archivos
      ├─ admin.js: Lógica de formulario
      └─ Coverage: >80%

□ 4.2 Tests de integración
      ├─ Upload imagen + video al mismo producto
      ├─ Reordenar media (Estrategia B)
      ├─ Editar producto: remover/agregar media
      ├─ Eliminar producto: limpia product_media
      └─ Coverage: Casos principales

□ 4.3 Tests E2E
      ├─ Flow completo admin: crear → upload → guardar → ver
      ├─ Flow usuario: ver galería, cambiar imágenes, reproducir video
      ├─ Cross-browser: Chrome, Safari, Firefox
      └─ Mobile: iOS Safari, Chrome mobile

□ 4.4 Tests de performance
      ├─ BD: Query tiempo con 100+ media items
      ├─ Frontend: Renderizado carrusel con 50+ imágenes
      ├─ Storage: Upload archivo 100MB tarda <60s
      ├─ Network: Waterfall loading de media
      └─ Benchmarks: Antes vs después

□ 4.5 Tests de RLS/Security
      ├─ Usuario sin auth no puede escribir
      ├─ Admin puede CRUD
      ├─ Public puede leer
      ├─ SQL injection en mime_type
      └─ Path traversal en media_url

□ 4.6 Tests de regresión
      ├─ Productos legacy sin gallery_urls: funciona
      ├─ Búsqueda de productos: index performance OK
      ├─ Analytics events: no rompen
      ├─ Modal de productos: renderización OK
      └─ Checkout/payments (si aplica): OK
```

### 5.5 Fase 5: Deployment (1 semana)

```
□ 5.1 Deployment a staging
      ├─ Migrar SQL (con reversión preparada)
      ├─ Deploy código frontend
      ├─ Verificar E2E tests en staging
      └─ Load test: 100 usuarios simultáneos

□ 5.2 Documentación
      ├─ Release notes para usuarios
      ├─ API changelog
      ├─ Actualizar README.md
      ├─ Video tutorial de uso de videos
      └─ Troubleshooting guide

□ 5.3 Deployment a producción
      ├─ Backup BD antes
      ├─ Ejecutar migrations
      ├─ Deploy frontend (blue-green)
      ├─ Monitoreo de errores en vivo
      └─ Rollback plan (15min max)

□ 5.4 Post-deployment
      ├─ Monitorear performance (24h)
      ├─ Recolectar feedback
      ├─ Bug fixes si surgen
      └─ Comunicar a usuarios: feature lista
```

---

## 6. DECISIÓN RECOMENDADA

### 6.1 Análisis Costo-Beneficio

| Aspecto | Estrategia A | Estrategia B |
|--------|--------------|--------------|
| **Tiempo** | 2 semanas | 4-5 semanas |
| **Complejidad** | Baja | Alta |
| **Mantenimiento** | Bajo | Medio |
| **Escalabilidad** | 0% (1 video) | 100% (N media) |
| **Riesgo técnico** | Mínimo | Bajo-Medio |
| **Costo** | ~$800 USD (dev) | ~$2000 USD (dev) |
| **ROI** | Rápido | Largo plazo |

### 6.2 Recomendación

**➡️ COMENZAR CON ESTRATEGIA A (Mínima)**

**Razones:**
1. **Validación de mercado:** Primero aprendes si usuarios realmente quieren videos
2. **Quick win:** Feature lista en 2 semanas vs 4-5
3. **Bajo riesgo:** Cambios mínimos = menos bugs posibles
4. **Feedback:** Con A en producción, recolectas feedback para diseñar B mejor
5. **Pivot option:** Si usuarios piden múltiples videos, tienes datos para justificar B

**Timeline:**
- Semana 1 (May 9): Estrategia A en production
- Semanas 2-3 (May 16-23): Recolectar feedback de usuarios
- Si demanda comprobada: Planear Estrategia B para Jun
- Si no hay demanda: Pausa, reevaluar

---

## 7. CHECKLIST PRE-IMPLEMENTACIÓN

```
□ Team review del plan
□ BD backup actualizado
□ Rama feature creada
□ Tests scaffold preparado
□ Rollback procedure documentado
□ Performance benchmarks baseline
□ Load testing setup ready
□ Alertas monitoring configuradas
□ Comunicación a usuarios preparada
□ Documentación template pronto
```

---

## 8. CONTACTOS Y REFERENCIAS

**Archivos Críticos:**
- [supabase/setup.sql](supabase/setup.sql) - Estructura actual
- [js/modules/products/service.js](js/modules/products/service.js) - Upload logic
- [js/shared/product-utils.js](js/shared/product-utils.js) - Media utilities
- [js/modules/products/ui/admin.js](js/modules/products/ui/admin.js) - Admin form

**Documentación Supabase:**
- Storage: https://supabase.com/docs/guides/storage/quickstart
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- JSONB: https://www.postgresql.org/docs/current/datatype-json.html

---

**Próximos pasos:** Aguardando aprobación para proceder con Fase 1 (Preparación).
