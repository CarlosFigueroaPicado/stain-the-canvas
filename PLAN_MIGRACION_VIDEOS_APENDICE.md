# Análisis Técnico Detallado: Arquitectura de Media en Stain the Canvas

## APÉNDICE A: Diagramas de Flujo

### A.1 Arquitectura Actual

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENTE (Frontend)                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Input type="file" (múltiple)                               │
│        ↓                                                     │
│  [1.jpg, 2.jpg, 3.jpg, ... 10.jpg]                          │
│        ↓                                                     │
│  Validación (size, type)  ← MAX_IMAGE_SIZE = 5MB            │
│  ✓ Solo imagen (rechaza video)                              │
│        ↓                                                     │
│  uploadFiles() - SECUENCIAL                                 │
│  ├─ FOR i = 0 to 9:                                         │
│  │  ├─ Genera: batchId-producto-{i}.jpg                     │
│  │  ├─ Upload: /catalogo/{path}                             │
│  │  ├─ GetPublicUrl                                         │
│  │  └─ Array.push(url) ← SE APILAN AQUÍ                     │
│  │                                                          │
│  └─ Retorna: [url0, url1, ... url9]                         │
│        ↓                                                     │
│  payload = {                                                │
│    imagen_url: url[0],        ← Primera imagen              │
│    gallery_urls: [url0...9]   ← Array JSONB                 │
│  }                                                          │
│        ↓                                                     │
│  INSERT/UPDATE productos SET ...                            │
│        ↓                                                     │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────┐
│                   BD (Supabase PostgreSQL)                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  INSERT INTO productos (                                    │
│    id, nombre, categoria, imagen_url, gallery_urls, ...     │
│  ) VALUES (                                                 │
│    uuid, 'Collar', 'Bisutería', 'url0', '[url0...url9]', ...|
│  )                                                          │
│                                                              │
│  ← ÚNICO REGISTRO con JSONB array                           │
│        ↓                                                     │
│  Storage: /catalogo/*.jpg files                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────┐
│              Cliente (Display - home.js)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SELECT * FROM productos WHERE featured = true              │
│  ↓                                                           │
│  getProductImageUrls(product)                               │
│  ├─ image_url = url0                                        │
│  ├─ gallery_urls = [url0, url1, ... url9]                   │
│  ├─ unique = [url0, url1, ... url9]                         │
│  └─ return [url0...url9]                                    │
│  ↓                                                           │
│  shouldUseCarousel([url0...url9])  ← true (>1 image)        │
│  ↓                                                           │
│  <div class="carousel">                                      │
│    <img src="url0" />                                        │
│    <img src="url1" />                                        │
│    ...                                                      │
│    <button>Next</button>                                     │
│  </div>                                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### A.2 Estrategia A: Con video_url (Mínima)

```
ANTES (actual):
┌────────────────────────────┐
│  productos                 │
├────────────────────────────┤
│ id                         │
│ nombre                     │
│ imagen_url     ← 1 imagen  │
│ gallery_urls   ← array de  │
│                  imágenes  │
└────────────────────────────┘

DESPUÉS (Estrategia A):
┌────────────────────────────┐
│  productos                 │
├────────────────────────────┤
│ id                         │
│ nombre                     │
│ imagen_url     ← imagen    │
│ gallery_urls   ← imágenes  │
│ video_url      ← UN video  │  ← NUEVA COLUMNA
│                             │
└────────────────────────────┘

Upload Flow:
├─ Si sube imágenes:
│  └─ imagen_url + gallery_urls (como antes)
│
├─ Si sube video (checkbox):
│  ├─ Validar: MIME type video/* 
│  ├─ Max: 100 MB
│  ├─ Upload a /videos/... (ruta diferente)
│  └─ video_url = url
│
└─ Si sube ambos:
   ├─ gallery_urls = imágenes
   ├─ video_url = video
   └─ Order: imágenes primero, luego video
```

### A.3 Estrategia B: Con product_media Table (Escalable)

```
ANTES (actual):
┌────────────────────────────┐       ┌─────────────────┐
│  productos                 │       │ Storage (Files) │
├────────────────────────────┤       ├─────────────────┤
│ id                         │  ←→   │ /catalogo/*.jpg │
│ nombre                     │       │ /catalogo/*.png │
│ imagen_url                 │       │ /videos/*.mp4   │
│ gallery_urls [url...]      │       └─────────────────┘
└────────────────────────────┘

DESPUÉS (Estrategia B):
┌────────────────────────────┐
│  productos                 │
├────────────────────────────┤
│ id          (PK)           │
│ nombre                     │
│ imagen_url  (legacy, null) │
│ gallery_urls (legacy, null)│
└────────────────────────────┘
       │  ↑
       │  │ (view para compatibilidad)
       │  │
       ↓  │
┌─────────────────────────────────────────┐    ┌──────────────────┐
│  product_media (NEW)                    │←→  │ Storage (Files)  │
├─────────────────────────────────────────┤    ├──────────────────┤
│ id (PK, uuid)                           │    │ /catalogo/*.jpg  │
│ producto_id (FK → productos.id)         │    │ /catalogo/*.png  │
│ media_type ('image'|'video'|'doc')      │    │ /videos/*.mp4    │
│ media_url (text)                        │    │ /videos/*.webm   │
│ mime_type (varchar)                     │    │ /docs/*.pdf      │
│ orden (integer)         ← KEY!          │    └──────────────────┘
│ duracion_segundos (int, nullable)       │
│ tamaño_bytes (int, nullable)            │
│ is_active (bool)                        │
│ created_at, updated_at                  │
├─────────────────────────────────────────┤
│ ÍNDICES:                                │
│ - (producto_id, orden)                  │
│ - (producto_id, is_active)              │
│ - (media_type)                          │
│ - (producto_id, media_type, orden)      │
└─────────────────────────────────────────┘

Upload Flow:
├─ Sube imagen:
│  └─ INSERT product_media (producto_id, 'image', url, 0, null, ...)
│
├─ Sube video:
│  └─ INSERT product_media (producto_id, 'video', url, 1, 125, ...)
│
├─ Sube múltiples:
│  ├─ INSERT media (imagen, orden=0)
│  ├─ INSERT media (imagen, orden=1)
│  ├─ INSERT media (video, orden=2)
│  └─ INSERT media (pdf, orden=3)
│
└─ Reordenar:
   └─ UPDATE product_media SET orden = ? WHERE id = ?

Query:
SELECT p.id, p.nombre,
       array_agg(
         json_build_object(
           'id', pm.id,
           'type', pm.media_type,
           'url', pm.media_url,
           'mime', pm.mime_type,
           'orden', pm.orden,
           'duracion', pm.duracion_segundos
         ) ORDER BY pm.orden
       ) as media
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
WHERE p.featured = true
GROUP BY p.id;
```

---

## APÉNDICE B: Validación de Archivos

### B.1 Matriz de Validación (Actual vs Propuesto)

```javascript
// ACTUAL (admin.js línea 10-17)
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jfif"
]);

// PROPUESTO (Estrategia A)
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jfif"
]);
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;    // ← NUEVO
const ALLOWED_VIDEO_TYPES = new Set([               // ← NUEVO
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime"                                 // .mov
]);

function validateFile(file, type = 'image') {
  if (type === 'image') {
    return file.size <= MAX_IMAGE_SIZE_BYTES &&
           ALLOWED_IMAGE_TYPES.has(file.type);
  } else if (type === 'video') {
    return file.size <= MAX_VIDEO_SIZE_BYTES &&
           ALLOWED_VIDEO_TYPES.has(file.type);
  }
  return false;
}

// PROPUESTO (Estrategia B)
// Más flexible, validar por base de datos
const MEDIA_VALIDATORS = {
  image: {
    max_size: 5 * 1024 * 1024,
    allowed_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    storage_path: 'images/'
  },
  video: {
    max_size: 100 * 1024 * 1024,
    allowed_types: ['video/mp4', 'video/webm'],
    storage_path: 'videos/'
  },
  document: {
    max_size: 50 * 1024 * 1024,
    allowed_types: ['application/pdf', 'application/msword'],
    storage_path: 'docs/'
  }
};

function validateMedia(file, mediaType) {
  const config = MEDIA_VALIDATORS[mediaType];
  if (!config) return false;
  return file.size <= config.max_size &&
         config.allowed_types.includes(file.type);
}
```

### B.2 Tabla de Límites Sugeridos

| Tipo Media | Tamaño Max | Formatos | Ubicación Storage | Notas |
|-----------|-----------|----------|-------------------|-------|
| Imagen | 5 MB | JPEG, PNG, WEBP, GIF | `/catalogo/` | Actual |
| Video | 100 MB | MP4, WEBM | `/videos/` | Nuevo (A) |
| PDF | 50 MB | PDF | `/docs/` | Futuro (B) |

---

## APÉNDICE C: Impacto en Queries

### C.1 Query Actual (Simple)

```sql
-- Productos destacados (sin media detalles)
SELECT id, nombre, categoria, imagen_url, gallery_urls, precio, featured
FROM productos
WHERE featured = true
ORDER BY created_at DESC
LIMIT 3;

-- Análisis:
-- Rows: 3
-- Tamaño: ~15 KB (3 * ~5KB con 10 URLs en gallery_urls)
-- Tiempo: <10ms
-- Índice usado: idx_productos_featured_created_at

-- Problema actual (si agregamos video_url):
SELECT id, nombre, categoria, imagen_url, gallery_urls, video_url, precio
FROM productos
WHERE featured = true;

-- Cambio de tamaño: +1-5 KB por row (video URL)
-- Impacto: Mínimo (<5% por row)
```

### C.2 Query Estrategia B (Con product_media)

```sql
-- VERSIÓN 1: Simple (Compatible)
SELECT p.id, p.nombre, p.categoria, 
       COALESCE(p.imagen_url, pm.media_url) as imagen_url,
       array_agg(pm.media_url) FILTER (WHERE pm.media_type='image') as gallery_urls
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id AND pm.media_type='image'
WHERE p.featured = true
GROUP BY p.id
ORDER BY p.created_at DESC;

-- Análisis:
-- Rows: 3 (productosn)
-- Joins: 1
-- Tamaño: ~15 KB (más información ahora)
-- Tiempo: ~15-20ms (JOIN overhead)
-- Índice usado: (producto_id, media_type)

-- VERSIÓN 2: Completa (Recomendada)
SELECT p.id, p.nombre, p.categoria, p.precio, p.featured,
       array_agg(
         json_build_object(
           'id', pm.id,
           'type', pm.media_type,
           'url', pm.media_url,
           'mime', pm.mime_type,
           'orden', pm.orden,
           'duracion', COALESCE(pm.duracion_segundos, 0)
         ) ORDER BY pm.orden
       ) as media_items
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
WHERE p.featured = true
GROUP BY p.id
ORDER BY p.created_at DESC;

-- Análisis:
-- Rows: 3 (productos)
-- Joins: 1
-- Tamaño: ~20 KB (JSON objects)
-- Tiempo: ~20-25ms (más columnas en JSON)
-- Índice usado: (producto_id, orden)

-- OPTIMIZACIÓN: Si necesitamos N productos con media
-- Usar cursor para paginar:
SELECT p.id, p.nombre,
       array_agg(json_build_object(...)) as media
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
WHERE featured = true
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 12 OFFSET 0;

-- Resultado: 12 productos con sus media
-- Tamaño: ~60 KB
-- Tiempo: ~30ms
```

### C.3 Performance Benchmark (Teórico)

```
TEST 1: 100 productos, 10 imágenes cada uno
───────────────────────────────────────────

Actual:
- Query: SELECT * FROM productos
- Rows: 100
- gallery_urls size: 10 URLs * ~60 bytes = ~600 bytes
- Total: 100 rows * (~5KB base + 600B gallery) = ~500 KB
- Tiempo: ~50ms

Estrategia A (agregar video_url):
- Query: SELECT *, video_url FROM productos
- Rows: 100
- video_url size: 0 (null) o ~80 bytes
- Total: 100 rows * (~5KB base + 680B gallery + 80B video) = ~510 KB
- Tiempo: ~55ms
- Impacto: +10% (ACEPTABLE)

Estrategia B (product_media):
- Query: SELECT p.id, array_agg(...) FROM productos p
        LEFT JOIN product_media pm ON p.id = pm.producto_id
- Rows: 100 * (10 + N) = 1100+ rows antes de GROUP BY
- JSON objects: ~150 bytes cada
- Total: ~100 rows * ~2KB (JSON agg) = ~200 KB
- Tiempo: ~80ms (JOIN overhead)
- Impacto: +60% (TOLERABLE, pero observable)

TEST 2: Renderizado frontend (100 productos, 12 visibles)
──────────────────────────────────────────────────────────

Actual (gallery_urls):
- JS: getProductImageUrls() × 12 = 12 llamadas
- Cada: Parsear array JSONB, resolverstorageURLs
- Tiempo total: ~5ms

Estrategia A (video_url):
- JS: getProductImageUrls() + getProductVideoUrl() × 12
- Tiempo total: ~8ms
- Impacto: +60% (aceptable por más info)

Estrategia B (product_media):
- JS: getProductMedia() × 12
- Cada: Iterar sobre 10+ objects, renderizar dinámicamente
- Tiempo total: ~12ms
- Impacto: +140% (pero en browser, no crítico)
```

---

## APÉNDICE D: Riesgos de Renderizado

### D.1 Problema: Carrusel con Tipos Mixtos

```javascript
// ACTUAL: shouldUseCarousel() solo cuenta imágenes
export function shouldUseCarousel(images) {
  const totalImages = images
    .map(item => String(item || "").trim())
    .filter(Boolean).length;
  return totalImages > 1;  // ← Asume todas son imágenes
}

// Si agregamos video al array sin cambios:
const media = ['image.jpg', 'video.mp4', 'image.png'];
shouldUseCarousel(media);  // → true
// Problema: Renderiza <img src="video.mp4"> ← ¡ROTO!

// FIX 1 (Simple):
export function shouldUseCarouselMedia(media, filter = 'image') {
  const filtered = media.filter(m => m.type === filter);
  return filtered.length > 1;
}

// FIX 2 (Mejor):
export function renderMedia(media) {
  const images = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');
  
  if (images.length > 1) {
    // Carrusel de imágenes
    return `<carousel>${renderImages(images)}</carousel>`;
  } else if (images.length === 1 && videos.length > 0) {
    // Imagen + video lado a lado
    return `<div class="row">
              <div>${renderImages(images)}</div>
              <div>${renderVideos(videos)}</div>
            </div>`;
  } else if (videos.length > 0) {
    // Solo video
    return `<video>${renderVideos(videos)}</video>`;
  }
}
```

### D.2 Renderizado de Video

```html
<!-- INCORRECTO (rompe carrusel): -->
<div class="carousel">
  <img src="https://...video.mp4" />  ← Error!
</div>

<!-- CORRECTO (Opción 1 - Separado): -->
<div class="carousel">
  <img src="image1.jpg" />
  <img src="image2.jpg" />
</div>
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>

<!-- CORRECTO (Opción 2 - Control de tipo): -->
<div class="carousel">
  <div class="carousel-item active">
    <img src="image1.jpg" />
  </div>
  <div class="carousel-item">
    <video controls>
      <source src="video.mp4" type="video/mp4">
    </video>
  </div>
</div>

<!-- CORRECTO (Opción 3 - Tabs): -->
<ul class="nav nav-tabs">
  <li class="nav-item"><button data-tab="images">Imágenes (3)</button></li>
  <li class="nav-item"><button data-tab="videos">Videos (1)</button></li>
</ul>
<div id="tab-images">
  <carousel>...</carousel>
</div>
<div id="tab-videos">
  <video>...</video>
</div>
```

---

## APÉNDICE E: Sincronización de Datos (Estrategia B)

### E.1 Durante Migración Legacy → Product Media

```sql
-- PASO 1: Respaldar datos actuales
CREATE TABLE productos_backup AS SELECT * FROM productos;
CREATE TABLE product_media_backup AS SELECT * FROM product_media;

-- PASO 2: Migrar imagen_url
INSERT INTO product_media (producto_id, media_type, media_url, orden, mime_type, is_active)
SELECT 
  id,
  'image'::text,
  imagen_url,
  0,                    -- orden primero
  'image/jpeg'::text,   -- default (corregir después si es necesario)
  true
FROM productos
WHERE imagen_url IS NOT NULL AND imagen_url != ''
ON CONFLICT DO NOTHING;

-- PASO 3: Migrar gallery_urls (cada elemento del array)
INSERT INTO product_media (producto_id, media_type, media_url, orden, mime_type, is_active)
SELECT 
  id,
  'image'::text,
  jsonb_array_elements(gallery_urls)::text,
  row_number() OVER (PARTITION BY id ORDER BY gallery_urls) - 1,  -- orden 0, 1, 2...
  'image/jpeg'::text,
  true
FROM productos
WHERE gallery_urls IS NOT NULL 
  AND jsonb_typeof(gallery_urls) = 'array'
  AND jsonb_array_length(gallery_urls) > 0
ON CONFLICT DO NOTHING;

-- PASO 4: Verificación
SELECT 
  p.id,
  p.nombre,
  COUNT(pm.id) as media_count,
  COUNT(CASE WHEN pm.media_type='image' THEN 1 END) as image_count
FROM productos p
LEFT JOIN product_media pm ON p.id = pm.producto_id
GROUP BY p.id
ORDER BY media_count DESC;

-- PASO 5: Validación de URLs
SELECT pm.id, pm.media_url
FROM product_media pm
WHERE pm.media_url IS NULL 
   OR pm.media_url = ''
   OR pm.media_url NOT LIKE 'http%'
LIMIT 100;

-- PASO 6: Si todo OK, deprecar columnas antiguas
ALTER TABLE productos DROP COLUMN gallery_urls;
ALTER TABLE productos DROP COLUMN imagen_url;
-- ↑ O solo NULL-ificar para compatibilidad temporal

-- PASO 7: Crear VIEW para compatibilidad (si decides mantener)
CREATE OR REPLACE VIEW productos_with_legacy_gallery AS
SELECT 
  p.*,
  COALESCE(
    (SELECT media_url FROM product_media 
     WHERE producto_id = p.id AND media_type='image'
     ORDER BY orden LIMIT 1),
    NULL
  ) as imagen_url,
  (SELECT array_agg(media_url ORDER BY orden)
   FROM product_media
   WHERE producto_id = p.id AND media_type='image') as gallery_urls
FROM productos p;

-- USO:
SELECT id, nombre, imagen_url, gallery_urls FROM productos_with_legacy_gallery;
```

### E.2 Sincronización con Triggers

```sql
-- TRIGGER 1: Cuando se INSERT/UPDATE producto, actualizar view-derived data
-- (No es necesario si usas product_media como source of truth)

-- TRIGGER 2: Cuando se DELETE producto_media, validar consistencia
CREATE OR REPLACE FUNCTION validate_product_media_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar que se elimine el último media
  IF (SELECT COUNT(*) FROM product_media 
      WHERE producto_id = OLD.producto_id AND id != OLD.id) = 0
  THEN
    RAISE EXCEPTION 'No puedes eliminar el último media del producto';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_media_delete ON product_media;
CREATE TRIGGER trg_validate_media_delete
BEFORE DELETE ON product_media
FOR EACH ROW EXECUTE FUNCTION validate_product_media_delete();

-- TRIGGER 3: Auto-reordenar cuando se DELETE un media
CREATE OR REPLACE FUNCTION reorder_product_media_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE product_media 
  SET orden = orden - 1
  WHERE producto_id = OLD.producto_id AND orden > OLD.orden;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reorder_media_after_delete ON product_media;
CREATE TRIGGER trg_reorder_media_after_delete
AFTER DELETE ON product_media
FOR EACH ROW EXECUTE FUNCTION reorder_product_media_after_delete();
```

---

## APÉNDICE F: Matriz de Compatibilidad

### F.1 Navegadores (Video)

| Navegador | HTML5 Video | MP4 | WEBM | OGG | Soporte |
|-----------|-------------|-----|------|-----|---------|
| Chrome 90+ | ✅ | ✅ | ✅ | ❌ | 100% |
| Firefox 88+ | ✅ | ✅ | ✅ | ✅ | 100% |
| Safari 14+ | ✅ | ✅ | ❌ | ❌ | 100% (MP4 only) |
| Edge 90+ | ✅ | ✅ | ✅ | ❌ | 100% |
| Mobile Safari | ✅ | ✅ | ❌ | ❌ | 100% (MP4 only) |
| Chrome Mobile | ✅ | ✅ | ✅ | ❌ | 100% |

**Recomendación:** Servir MP4 (máxima compatibilidad). WEBM como fallback.

### F.2 Mobile Considerations

```
PROBLEMA: Video autoplay on mobile
├─ iOS: Requiere interacción del usuario (no autoplay)
├─ Android: Más flexible, pero aún requiere muted para autoplay
└─ Solución: controls=true, muted, no autoplay

PROBLEMA: Ancho de banda
├─ 4G: 500MB en 20 minutos (alerta para usuarios)
├─ WiFi: Descarga más rápida
└─ Solución: Implementar quality selector, preview thumbnail

PROBLEMA: Almacenamiento caché
├─ iOS: Límite de caché del navegador
├─ Android: Similar
└─ Solución: Usar service workers con caché inteligente
```

---

## APÉNDICE G: Costos Supabase

### G.1 Estimación de Costos

```
ACTUAL (10,000 productos, 10 imágenes cada uno):
├─ Storage: 10,000 × 10 × 500KB = 50 GB
├─ Costo Supabase: $5 (free) a $100 (1TB plan)
├─ Bandwidth salida: 50GB × $0.12/GB = ~$6/mes
└─ Total: $6-100/mes

ESTRATEGIA A (agregar video_url):
├─ Storage: 50GB (imágenes) + 5,000 videos × 100MB = 50 + 500 = 550 GB
├─ Costo Supabase: $100 (500GB plan)
├─ Bandwidth salida: 550GB × $0.12/GB = ~$66/mes
└─ Total: $166/mes

ESTRATEGIA B (product_media):
├─ Storage: Igual a Estrategia A (550 GB)
├─ DB size: +50 MB (10,000 productos × 5KB product_media entries)
├─ Costo Supabase: $100 (500GB plan)
├─ Bandwidth salida: 550GB × $0.12/GB = ~$66/mes
└─ Total: $166/mes

⚠ NOTA: Supabase tiene descuentos para proyectos grandes.
         Consultar: https://supabase.com/pricing
```

---

## Preguntas Frecuentes (FAQ)

**P: ¿Qué pasa si un producto tiene 0 imágenes pero 1 video?**  
R: Mostrar placeholder (first frame del video) o icono de video.

**P: ¿Se pueden reordenar las imágenes después de crear producto?**  
R: Con Estrategia A: No (complicado). Con Estrategia B: Sí (actualizar orden en product_media).

**P: ¿Qué formatos de video recomiendas?**  
R: MP4 (H.264, AAC) para máxima compatibilidad. WEBM como alternativa.

**P: ¿Cuánto tarda subir un video de 100 MB?**  
R: Depende ancho de banda. 4G: ~20 minutos. WiFi: ~2-5 minutos.

**P: ¿Qué pasa si Supabase se cae durante upload?**  
R: Usuario ve error. File en storage pero no en BD. Cleanup necesario.

**P: ¿Puedo comprimir videos automáticamente?**  
R: Requiere worker cloud (ej: AWS Lambda). Out of scope por ahora.

---

**Fin del Documento Técnico**
