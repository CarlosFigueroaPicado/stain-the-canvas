# Análisis de Impacto - Refactorización Multimedia (product_media)

## Estado Actual del Sistema

### Tabla `productos` Actual
```sql
-- Estructura
id uuid primary key
nombre text
categoria text
descripcion text
precio numeric(10,2)
imagen_url text              -- Primera imagen / portada
gallery_urls jsonb array     -- Todas las imágenes [url1, url2, url3, ...]
video_url text               -- Video único
featured boolean
vistas integer
clicks integer
created_at timestamptz
updated_at timestamptz
```

### Cómo se Usa Actualmente

**Frontend (getProductImageUrls)**:
```javascript
// Combina imagen_url + gallery_urls en un array
const imageUrl = resolveProductImageUrl(productInput);  // imagen_url
const gallery = getProductGalleryUrls(productInput);     // gallery_urls array
const unique = Array.from(new Set([imageUrl, ...gallery].filter(Boolean)));
// Resultado: [imagen_url, ...gallery_urls] deduplicado
```

**Frontend (Carrusel)**:
```javascript
// Renderiza carrusel con todas las imágenes en orden
productImages.map((url, index) => {
  // Cada URL es un item del carrusel
});
```

**Admin (Upload)**:
```javascript
// Upload múltiples archivos
refs.imagen.files  // Múltiples archivos
// Se procesan y se guardan en galleryUrls array
// Primer archivo → imagen_url
// Todos → gallery_urls
```

**Admin (fillForm)**:
```javascript
setImagePreview(product.galleryUrls.length ? product.galleryUrls : [product.imagenUrl], product.nombre);
// Muestra preview del carrusel con todas las imágenes
```

**Payload al Guardar**:
```javascript
{
  nombre: "...",
  categoria: "...",
  imagenUrl: "primera-url",
  galleryUrls: ["primera-url", "segunda-url", "tercera-url"],
  videoUrl: "video-url"
  // ...
}
```

**Query Supabase**:
```javascript
// SELECT incluye directamente imagen_url y gallery_urls
.select("id,nombre,precio,imagen_url,gallery_urls,video_url")
```

---

## Propuesta: Tabla `product_media`

```sql
create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.productos(id) on delete cascade,
  
  -- Tipo de media
  type text not null check (type in ('image', 'video')),
  
  -- URL pública del media
  url text not null,
  
  -- Orden en galería/carrusel (0 = primera, 1 = segunda, etc.)
  position integer not null default 0,
  
  -- Primera imagen o video principal del carrusel
  is_primary boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  
  -- Unique constraint para evitar duplicados
  unique(product_id, url),
  
  -- Constraint: solo 1 media primaria por tipo
  constraint unique_primary_per_type unique(product_id, type) where is_primary = true
);

-- Indexes para performance
create index idx_product_media_product_id on public.product_media(product_id);
create index idx_product_media_product_position on public.product_media(product_id, position);
create index idx_product_media_product_primary on public.product_media(product_id) where is_primary = true;
create index idx_product_media_type on public.product_media(type);
```

---

## Análisis de Impacto

### 1️⃣ IMPACTO FRONTEND

#### Cambios en Queries

**Antes (Actual)**:
```javascript
// Una sola query, todo en 1 fila
SELECT id, nombre, precio, imagen_url, gallery_urls, video_url
FROM productos
WHERE id = $1;

// Datos en memoria
{
  id: "uuid",
  imagen_url: "url1",
  gallery_urls: ["url1", "url2", "url3"],  // JSONB array
  video_url: "video-url"
}
```

**Después (Nuevo)**:
```javascript
// Query principal (sin cambios)
SELECT id, nombre, precio
FROM productos
WHERE id = $1;

// Query separada (JOIN con product_media)
SELECT id, product_id, type, url, position, is_primary, created_at
FROM product_media
WHERE product_id = $1
ORDER BY position ASC;

// O en un solo query con JOIN:
SELECT 
  p.id, p.nombre, p.precio,
  pm.id as media_id, pm.type, pm.url, pm.position, pm.is_primary
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.product_id
WHERE p.id = $1
ORDER BY pm.position ASC;
```

#### Cambios en Normalización

**product-utils.js / normalizeProduct()**:
```javascript
// Antes
const imagenUrl = resolveProductImageUrl(safeRow);
const galleryUrls = getProductGalleryUrls(safeRow);
return {
  imagenUrl,
  galleryUrls,  // Array directo
  videoUrl
};

// Después (Backward compatible)
const media = safeRow.product_media || [];  // Array de objetos
const images = media.filter(m => m.type === 'image').sort((a,b) => a.position - b.position);
const videos = media.filter(m => m.type === 'video').sort((a,b) => a.position - b.position);

return {
  imagenUrl: images[0]?.url || resolveProductImageUrl(safeRow),  // fallback
  galleryUrls: images.map(m => m.url),  // Extraer URLs
  videoUrl: videos[0]?.url || safeRow.video_url,  // fallback
  media,  // Nuevo: array completo con metadata
};
```

#### Cambios en Helpers

**getProductImageUrls()**:
```javascript
// Antes
export function getProductImageUrls(productInput) {
  const imageUrl = resolveProductImageUrl(productInput);
  const gallery = getProductGalleryUrls(productInput);
  const unique = Array.from(new Set([imageUrl, ...gallery].filter(Boolean)));
  return unique.length > 0 ? unique : [...];
}

// Después
export function getProductImageUrls(productInput) {
  // Si viene con media array (Supabase JOIN)
  if (productInput.media && Array.isArray(productInput.media)) {
    const images = productInput.media
      .filter(m => m.type === 'image')
      .sort((a, b) => a.position - b.position);
    const urls = images.map(m => m.url).filter(Boolean);
    if (urls.length > 0) return urls;
  }
  
  // Fallback a sistema antiguo
  const imageUrl = resolveProductImageUrl(productInput);
  const gallery = getProductGalleryUrls(productInput);
  const unique = Array.from(new Set([imageUrl, ...gallery].filter(Boolean)));
  return unique.length > 0 ? unique : [...];
}
```

#### Cambios en Frontend UI

**Catálogo (catalog.js)**:
```javascript
// Antes
const productImages = getProductImageUrls(product, "900x700");

// Después (sin cambios en rendering, solo en origen de datos)
const productImages = getProductImageUrls(product, "900x700");
// getProductImageUrls ahora consume product.media si existe
```

**Carrusel**:
```javascript
// El renderizado del carrusel NO CAMBIA, solo el origen de datos
// Sigue siendo un array de URLs ordenadas
```

**Video**:
```javascript
// Antes
const videoUrl = getProductVideoUrl(product);

// Después
const videoUrl = product.media?.find(m => m.type === 'video' && m.is_primary)?.url
                 || getProductVideoUrl(product);  // fallback
```

#### ✅ Beneficios Frontend
- ✅ Mejor separación de concerns (image vs video)
- ✅ Metadata de media (position, is_primary)
- ✅ Preparado para drag-drop
- ✅ Backward compatible (fallback a antiguo)
- ✅ NO REQUIERE cambios en rendering (carrusel sigue igual)

#### ⚠️ Riesgos Frontend
- ❌ N+1 queries si se cargan productos sin JOIN
- ❌ Más datos transferidos si todos los medios se cargan
- ❌ Compilexidad en normalizeProduct()

---

### 2️⃣ IMPACTO ADMIN PANEL

#### Cambios en API

**Antes**:
```javascript
// GET - cargar producto para editar
SELECT id, nombre, imagen_url, gallery_urls, video_url FROM productos WHERE id = $1;

// POST/PUT - guardar
INSERT INTO productos (nombre, imagen_url, gallery_urls, video_url, ...)
VALUES ($1, $2, $3, $4, ...);
```

**Después**:
```javascript
// GET - cargar producto + medios
SELECT p.id, p.nombre, ..., pm.id, pm.type, pm.url, pm.position, pm.is_primary
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.product_id
WHERE p.id = $1
ORDER BY pm.position ASC;

// POST - guardar producto + crear medios
BEGIN;
  INSERT INTO productos (nombre, ...) VALUES ($1, ...);
  INSERT INTO product_media (product_id, type, url, position, is_primary)
  VALUES ($1, 'image', 'url1', 0, true),
         ($1, 'image', 'url2', 1, false),
         ($1, 'video', 'video-url', 0, true);
COMMIT;

// PUT - actualizar + actualizar medios
BEGIN;
  UPDATE productos SET nombre = $1, ... WHERE id = $2;
  DELETE FROM product_media WHERE product_id = $2;  -- O UPDATE con posición
  INSERT INTO product_media (product_id, type, url, position, is_primary)
  VALUES (...);
COMMIT;
```

#### Cambios en Admin UI

**Formulario**:
```javascript
// Antes
refs.imagen.files  // Upload múltiples
// Se procesan a galleryUrls array

// Después (podría mantener igual)
refs.imagen.files  // Upload múltiples
// Se procesan a array de {type: 'image', url, position}
```

**Preview**:
```javascript
// Antes: muestra carrusel de galleryUrls
setImagePreview(product.galleryUrls, product.nombre);

// Después
const images = product.media?.filter(m => m.type === 'image').sort((a,b) => a.position - b.position) || [];
const urls = images.map(m => m.url);
setImagePreview(urls, product.nombre);
```

**Reordenar (Preparación para Drag-Drop)**:
```javascript
// Nuevo: botones para reordenar (future)
// O UI de drag-drop directamente

// Datos guardarían position actualizado
```

#### ✅ Beneficios Admin
- ✅ Preparado para reordenar medios (drag-drop)
- ✅ Separación clara de types (image/video)
- ✅ Marcar media como primary
- ✅ Más flexible para futura expansión (3D models, etc)

#### ⚠️ Riesgos Admin
- ❌ Cambio en flujo de guardado (transaction, múltiples inserts)
- ❌ Más complejidad en handleSubmit()
- ❌ Necesario actualizar fillForm() y resetForm()
- ❌ Validación más compleja

---

### 3️⃣ IMPACTO SUPABASE

#### Schema Changes

**Nueva tabla + Constraints**:
```javascript
// Tabla nueva
product_media (
  id, product_id, type, url, position, is_primary, created_at
)

// Constraints
- Foreign key: product_id → productos(id) ON DELETE CASCADE
- Unique: (product_id, url) - no duplicados
- Unique: (product_id, type) where is_primary=true - solo 1 primario por tipo
- Check: type in ('image', 'video')
- Position: no negativo (CHECK position >= 0)
```

#### Indexes Requeridos

```javascript
// Primary
idx_product_media_product_id (product_id)

// Performance
idx_product_media_product_position (product_id, position)
idx_product_media_primary (product_id) where is_primary = true
idx_product_media_type (type)
```

#### RLS (Row-Level Security)

```javascript
// Lectura pública
create policy "product_media_select_public" on public.product_media
for select using (true);

// Escritura solo admins
create policy "product_media_write_admin" on public.product_media
for insert, update, delete
with check (
  auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
  or auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
);
```

#### Migration Script

```javascript
-- Fase 1: Crear tabla
create table if not exists product_media (...);

-- Fase 2: Migrar datos existentes
INSERT INTO product_media (product_id, type, url, position, is_primary)
SELECT 
  id,
  'image',
  imagen_url,
  0,  -- primera imagen es primary
  true
FROM productos
WHERE imagen_url IS NOT NULL;

INSERT INTO product_media (product_id, type, url, position, is_primary)
SELECT 
  id,
  'image',
  elem,
  row_number() OVER (PARTITION BY id ORDER BY elem) + 1 - 1,  -- posición
  false
FROM productos,
LATERAL jsonb_array_elements_text(gallery_urls) AS elem
WHERE gallery_urls IS NOT NULL AND jsonb_array_length(gallery_urls) > 0
AND elem != imagen_url;  -- evitar duplicados

INSERT INTO product_media (product_id, type, url, position, is_primary)
SELECT 
  id,
  'video',
  video_url,
  0,
  true
FROM productos
WHERE video_url IS NOT NULL;

-- Fase 3: Verificación
SELECT COUNT(*) as total_media FROM product_media;
SELECT product_id, type, COUNT(*) as count FROM product_media GROUP BY product_id, type;

-- Fase 4: Mantener columnas viejas (NO ELIMINAR por ahora)
-- Dejar imagen_url, gallery_urls, video_url para backward compatibility
```

#### ✅ Beneficios Supabase
- ✅ Normalización: 1 fila por media, no arrays JSONB
- ✅ Escalable: sin límite de medios por producto
- ✅ Queryable: filtrar por type, is_primary, etc
- ✅ Transaccional: migration puede ser rollback
- ✅ RLS granular: mejor seguridad

#### ⚠️ Riesgos Supabase
- ❌ Downtim potencial durante migración (depende de volumen)
- ❌ Más índices = más espacio storage
- ❌ JOINs más complejas
- ❌ DELETE CASCADE en borrar producto podría ser lento si muchos medios

---

### 4️⃣ IMPACTO PERFORMANCE

#### Queries

**Antes (Actual)**:
```javascript
// Tamaño de fila: pequeño
SELECT id, nombre, precio, imagen_url, gallery_urls, video_url
FROM productos;
// Resultado: 1 fila con JSONB array ~1KB

// Querys: 1 query
// Transfer: 1KB × N productos
```

**Después (Nuevo)**:
```javascript
// Query 1: productos
SELECT id, nombre, precio
FROM productos;
// Resultado: 1 fila pequeña

// Query 2: medios con JOIN
SELECT p.id, pm.id, pm.type, pm.url, pm.position, pm.is_primary
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.product_id
WHERE p.id = ANY($1::uuid[])
ORDER BY pm.position;
// Resultado: M filas (M medios)

// Querys: 2 queries (o 1 con JOIN)
// Transfer: 3KB total si tienen en promedio 3 medios por producto
```

#### Cálculos de Impacto

Asumiendo:
- 100 productos
- 3 medios promedio por producto
- URL promedio: 200 bytes
- Metadata: 100 bytes

**Antes**:
```
Tamaño fila: 
  - id: 36 bytes
  - nombre: 50 bytes
  - precio: 10 bytes
  - imagen_url: 200 bytes
  - gallery_urls (3 URLs): 600 bytes
  - video_url: 200 bytes
Total por fila: ~1100 bytes
× 100 productos = 110 KB
```

**Después**:
```
Tamaño fila productos: 100 bytes × 100 = 10 KB

Tamaño medios:
  - id: 36 bytes
  - product_id: 36 bytes
  - type: 10 bytes
  - url: 200 bytes
  - position: 10 bytes
  - is_primary: 5 bytes
Total por media: ~300 bytes
× 300 medios (3 × 100) = 90 KB

Total: 10 + 90 = 100 KB (5% menos)
```

**Conclusión**: Transfer similar, pero mejor performance en queries específicas.

#### Indexes

**Antes**:
```javascript
idx_productos_gallery_urls_gin (usando GIN para JSONB)
// Indexa el array JSONB entero
```

**Después**:
```javascript
idx_product_media_product_id (product_id)
// Buscar todos los medios de un producto: ✅ Rápido

idx_product_media_product_position (product_id, position)
// Ordenar por posición: ✅ Muy rápido

idx_product_media_primary (product_id) where is_primary = true
// Encontrar imagen principal: ✅ Muy rápido

idx_product_media_type (type)
// Filtrar por tipo: ✅ Rápido (para analytics futuro)
```

#### Complejidad de Queries

**Antes**:
```sql
-- Simple, 1 tabla
SELECT * FROM productos WHERE id = $1;  -- O(1)
```

**Después**:
```sql
-- Requiere JOIN
SELECT p.*, pm.*
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.product_id
WHERE p.id = $1
ORDER BY pm.position;
-- O(log n) para find product + O(log n) para find medios + O(m log m) para sort
-- m = medios por producto (típicamente 3-5)
```

#### ✅ Beneficios Performance
- ✅ Queries más específicas (filtrar por type, is_primary)
- ✅ Índices composites más eficientes
- ✅ Sin parsing de JSONB en servidor
- ✅ Escalable sin degradación

#### ⚠️ Riesgos Performance
- ❌ N+1 queries sin eager loading
- ❌ JOIN costo vs JSONB parse
- ❌ Más índices = más writes lento
- ❌ Sort por position requiere índice

#### 📊 Benchmarks Esperados

| Operación | Antes | Después | Delta |
|-----------|-------|---------|-------|
| Get 1 producto | 1-2ms | 2-4ms | +100% (2 queries) |
| Get 100 productos + medios | 50-100ms | 60-80ms | -30% (JOIN eficiente) |
| Sort por posición | N/A (array) | 1-2ms | ✅ Disponible |
| Find image primary | Variable | <1ms | ✅ Index |
| Write nuevo media | N/A | 5-10ms | Pequeño overhead |

---

## Estrategia de Migración (Sin Downtime)

### Fase 1: Preparación (Production Safe)

```javascript
// 1. Crear tabla product_media (sin datos)
// 2. Crear indexes
// 3. NO cambiar código frontend
// Status: Tablas viejas en uso, nuevas vacías
```

**Downtime**: 0
**Impact**: Ninguno

### Fase 2: Migración de Datos (Off-Peak)

```javascript
// 1. Ejecutar script de migración (background)
// 2. Verificar datos migrados correctamente
// 3. Mantener productos.imagen_url, gallery_urls, video_url intactos
// Status: Tablas viejas + nuevas sincronizadas
```

**Downtime**: 0 (migration async)
**Impact**: Pequeño (recursos de servidor)

### Fase 3: Deploy Código Nuevo (Rolling)

```javascript
// 1. Código nuevo sabe leer de product_media
// 2. Código nuevo fallback a imagen_url/gallery_urls si product_media vacío
// 3. Deploy gradual (canary)
// Status: Código nuevo + datos de ambas tablas
```

**Downtime**: 0 (backward compatible)
**Impact**: Ninguno (rollback posible)

### Fase 4: Switchover (Optional)

```javascript
// 1. Update admin para escribir a product_media (no gallery_urls)
// 2. Trigger: cuando se guarda producto, actualizar product_media automáticamente
// 3. Dejar código old como fallback
// Status: Lecturas de product_media, fallback a viejas
```

**Downtime**: 0
**Impact**: Admin cambia comportamiento, pero compatible

### Fase 5: Cleanup (Mucho Después)

```javascript
// 1. Deprecar imagen_url, gallery_urls, video_url (publicar aviso)
// 2. Código lejano ya no chequea viejas columnas
// 3. Posible: eliminar columnas viejas
// Status: Solo product_media en uso
```

**Downtime**: 0 (solo cambio interno)
**Impact**: Simplificación

---

## Recomendación Ejecutiva

### ✅ Pros de Migrar
- Mejor arquitectura para escalas futuras
- Soporte para múltiples tipos de media (3D, audio, etc)
- Preparado para reordenar/drag-drop
- Queries más eficientes
- Better normalization

### ⚠️ Contras de Migrar
- Complejidad temporal durante transición
- Cambios en admin panel
- Testing más exhaustivo requerido
- N+1 queries sin cuidado

### 📋 Recomendación
**GO**: Implementar con enfoque gradual (Fases 1-3 primero)
- Baja riesgo (backward compatible)
- Alto valor (mejor arquitectura)
- Posible rollback fácil

### 🎯 Prioridad
1. Crear tabla + migration script
2. Actualizar frontend helpers (backward compatible)
3. Actualizar admin panel
4. Testing completo
5. Deploy gradual
6. Monitoring de performance

---

## Conclusión

| Aspecto | Impacto | Severidad | Mitigación |
|---------|---------|-----------|-----------|
| **Frontend** | Cambios en normalización | Media | Backward compatible |
| **Admin** | Refactor en guardar | Media | Testing exhaustivo |
| **Supabase** | Nueva tabla + migration | Baja | Fase fuera de pico |
| **Performance** | Neutral-Positivo | Baja | Indexes bien diseñados |
| **Downtime** | 0 minutos | N/A | ✅ Zero downtime |
| **Rollback** | Posible en cualquier fase | Baja | ✅ Sin datos perdidos |

**Verdict**: SEGURO IMPLEMENTAR

---

Documento de Análisis
Fecha: 2026-05-03
Versión: 1.0 (Final)
