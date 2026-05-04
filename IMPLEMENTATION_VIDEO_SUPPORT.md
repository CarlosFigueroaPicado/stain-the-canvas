# Guía de Implementación - Soporte de Videos (Estrategia A)

## Resumen de Cambios

Este documento describe la implementación básica de soporte para videos en productos. Se mantiene compatibilidad total con el sistema de galerías de imágenes existente.

**Fecha**: 2026-05-03
**Estrategia**: A - Minimal Implementation
**Estado**: ✅ Implementado

---

## ¿Qué se Agregó?

### 1. Base de Datos (`20260503_add_complete_video_support.sql`)
- Column `video_url` (text, nullable) en tabla `productos`
- Index en `video_url` para queries optimizadas
- Comments documentando la columna

### 2. Backend

#### APIs (`js/modules/products/api.js`)
- ✅ Ya incluye `video_url` en todos los `SELECT`
- ✅ Ya maneja `video_url` en `INSERT` y `UPDATE`

#### Services (`js/modules/products/service.js`)
- ✅ Función `uploadVideo()` - sube archivos MP4/WEBM/MOV hasta 100MB
- ✅ Validación de tipos MIME
- ✅ Manejo de errores mejorado con mensajes específicos
- ✅ TODOs para futuras mejoras (transcoding, análisis)

#### Utilidades (`js/shared/product-utils.js`)
- ✅ `getProductVideoUrl()` - resuelve URLs de video (HTTP o storage)
- ✅ `buildProductPayload()` - **ACTUALIZADO** para incluir `video_url`
- ✅ `normalizeProduct()` - **ACTUALIZADO** para incluir `videoUrl`
- ✅ `validateProductInput()` - **ACTUALIZADO** para validar URLs de video

### 3. Frontend

#### Admin Panel (`js/modules/products/ui/admin.js`)
- ✅ Input file `#video` para seleccionar video
- ✅ Preview de video en el formulario (HTML5 `<video>` tag)
- ✅ Validación de archivo de video
- ✅ Manejo de errores con mensajes claros
- ✅ Actualización automática de video al editar producto
- ✅ Limpieza de video al resetear formulario

#### Catálogo Público (`js/modules/products/ui/catalog.js`)
- ✅ Muestra video debajo de la galería de imágenes
- ✅ Controles HTML5 nativos (play, pause, volumen, fullscreen)
- ✅ Carga lazy de videos
- ✅ Manejo de error si video no está disponible
- ✅ TODOs para futuras mejoras de player

#### Página de Inicio (`js/modules/products/ui/home.js`)
- ✅ Igual que catálogo - muestra video en modal
- ✅ Integración consistente

### 4. HTML

#### Admin (`admin.html`)
```html
<div id="videoPreviewContainer" class="admin-preview-container d-none"></div>
```
- Preview de video al seleccionar archivo

#### Catálogo (`catalogo.html`)
```html
<div id="modalProductVideo" class="mt-3 d-none">
  <video controls class="img-fluid rounded-4 w-100" style="max-height: 500px;">
    <source id="modalProductVideoSource" src="" type="video/mp4" />
    Tu navegador no soporta reproducción de videos HTML5.
  </video>
</div>
```
- Display de video en modal de detalle

#### Inicio (`index.html`)
- Idéntico al catálogo

---

## Cómo Usar

### Para Administradores

#### Subir un Video a un Producto

1. **Ir a Admin** → **Productos**
2. **Crear o editar un producto**
3. En "Video (subir archivo)":
   - Seleccionar archivo MP4, WEBM o MOV
   - Máximo 100MB
   - Primera frame será thumbnail automática
4. **Guardar producto**

#### Formatos Soportados

| Formato | MIME Type | Estado | Nota |
|---------|-----------|--------|------|
| MP4     | video/mp4 | ✅ | Recomendado (máxima compatibilidad) |
| WEBM    | video/webm | ✅ | Más comprimido |
| MOV     | video/quicktime | ✅ | iDevice compatible |
| OGG     | video/ogg | ✅ | Fallback |

#### Limitaciones Actuales

- **1 video por producto** (no múltiples videos)
- **100MB máximo** por video
- **Sin transcoding** (se almacena el archivo original)
- **Sin analytics** de reproducción
- **Sin subtítulos** o captions

### Para Usuarios

#### Ver Video

1. **Abrir detalle de producto**
2. **Video aparece debajo de imágenes** si el producto tiene uno
3. **Controles nativos**:
   - Play/Pause
   - Slider de progreso
   - Volumen
   - Fullscreen
   - Velocidad (en navegadores modernos)

#### Características

- ✅ Responsive (adapta a pantalla)
- ✅ Lazy-load (carga cuando se necesita)
- ✅ Funciona sin internet si está cacheado
- ✅ Soporta streaming

---

## Validaciones

### Client-Side (JavaScript)

**Archivo de video**:
```javascript
// Tamaño máximo: 100MB
if (file.size > 100 * 1024 * 1024) {
  error("El video supera 100MB. Sube un archivo más liviano.");
}

// Tipos permitidos
const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
if (!allowedTypes.includes(file.type)) {
  error("Formato no permitido. Usa MP4, WEBM, OGG o MOV.");
}
```

**URL de video** (en producto):
```javascript
// Debe ser HTTP(S) o null
if (videoUrl && !videoUrl.startsWith('http')) {
  error("La URL del video debe iniciar con http:// o https://");
}
```

### Server-Side

- ✅ RLS (Row-Level Security) protege datos
- ✅ Storage bucket con permisos públicos para lectura
- ✅ No hay validación de MIME en servidor (confiar en client + CORS)

---

## Estructura de Datos

### Tabla: `productos`

```sql
-- Nueva columna
video_url text default null -- URL pública del video

-- Index para queries
create index idx_productos_video_url on public.productos (video_url) 
where video_url is not null;
```

### Objeto JavaScript (normalizado)

```javascript
{
  id: "uuid...",
  nombre: "Pulsera de bisutería",
  categoria: "Bisutería",
  precio: 15.00,
  descripcion: "...",
  imagenUrl: "https://...",
  galleryUrls: ["https://...", "https://..."],
  videoUrl: "https://storage.../videos/...", // ← NUEVO
  featured: false,
  vistas: 10,
  clicks: 2,
  createdAt: "2026-05-03T...",
  // ... etc
}
```

---

## API Changes

### Endpoints Afectados

#### GET `/productos`
```javascript
// Antes
SELECT id, nombre, categoria, precio, imagen_url, gallery_urls, ...

// Después
SELECT id, nombre, categoria, precio, imagen_url, gallery_urls, video_url, ...
```

#### POST `/productos`
```javascript
// Payload ahora incluye
{
  nombre: "...",
  categoria: "...",
  video_url: "https://..." || null
}
```

#### PUT `/productos/:id`
```javascript
// Payload ahora incluye
{
  nombre: "...",
  categoria: "...",
  video_url: "https://..." || null
}
```

---

## Migración de Datos (si necesario)

**No se requiere migración de datos existentes**. Los videos son opcionales (`null`).

Si hay videos almacenados en otras columnas:
```javascript
// Verificar qué hay en columnas legacy
SELECT id, video_url, raw_data 
FROM productos 
WHERE video_url IS NOT NULL;
```

---

## Troubleshooting

### Problema: Video no reproduce

**Causas posibles**:
1. Navegador no soporta HTML5 video
   - **Solución**: Usar navegador moderno (Chrome, Firefox, Safari, Edge)

2. Formato no compatible
   - **Solución**: Convertir a MP4 con `ffmpeg`:
   ```bash
   ffmpeg -i input.mov -codec:v libx264 -codec:a aac output.mp4
   ```

3. URL de video está rota
   - **Solución**: Re-subir el video

4. CORS policy
   - **Solución**: Verificar que Supabase Storage permite CORS público

### Problema: Upload de video falla

**Causas posibles**:
1. Archivo > 100MB
   - **Solución**: Comprimir video o dividir en segmentos

2. Conexión de red interrumpida
   - **Solución**: Reintentar después de restaurar conexión

3. Tipo MIME no reconocido
   - **Solución**: Renombrar extensión (.mov → .mp4 si es realmente MP4)

4. Storage bucket lleno
   - **Solución**: Contactar administrador para liberar espacio

### Problema: Video aparece en admin pero no en catálogo

**Causas posibles**:
1. Producto no fue guardado correctamente
   - **Solución**: Guardar producto nuevamente

2. Cache de navegador
   - **Solución**: Limpiar cache o F5 refresh

3. Video URL no es accesible públicamente
   - **Solución**: Verificar permisos de bucket

---

## Testing

### Casos de Prueba

- [ ] Upload video MP4 - debe funcionar
- [ ] Upload video > 100MB - debe fallar con error claro
- [ ] Upload archivo JPG - debe fallar (tipo incorrecto)
- [ ] Editar producto y cambiar video - debe actualizar
- [ ] Eliminar video (dejar vacío) - debe permitir
- [ ] Ver video en catálogo - debe reproducirse
- [ ] Ver video en móvil - debe ser responsive
- [ ] Fullscreen video - debe funcionar
- [ ] Video con conexión lenta - debe buffear correctamente

---

## Performance Considerations

### Optimizaciones Actuales
- ✅ Lazy-load de videos (solo cargan en modal)
- ✅ Single request per video (no carga múltiples)
- ✅ Responsive sizing
- ✅ Index en database para queries rápidas

### Optimizaciones Futuras (Fase 2+)
- [ ] Video transcoding (múltiples calidades)
- [ ] CDN caching global
- [ ] Thumbnail generation
- [ ] Streaming adaptativo (HLS/DASH)
- [ ] Video analytics
- [ ] Progressive upload UI

---

## Compatibility Matrix

| Navegador | Windows | Mac | iOS | Android |
|-----------|---------|-----|-----|---------|
| Chrome    | ✅      | ✅  | ✅  | ✅      |
| Firefox   | ✅      | ✅  | ⚠️  | ✅      |
| Safari    | N/A     | ✅  | ✅  | N/A     |
| Edge      | ✅      | ✅  | ✅  | ✅      |
| IE 11     | ❌      | N/A | N/A | N/A     |

**Nota**: iOS Safari puede tener limitaciones de autoplay por política del navegador.

---

## Documentación Relacionada

- [MULTIMEDIA_ARCHITECTURE_TODOS.md](MULTIMEDIA_ARCHITECTURE_TODOS.md) - Futuro de multimedia
- [PLAN_MIGRACION_VIDEOS.md](PLAN_MIGRACION_VIDEOS.md) - Plan original (si existe)
- SQL: [20260503_add_complete_video_support.sql](supabase/20260503_add_complete_video_support.sql)

---

## FAQ

### P: ¿Puedo subir múltiples videos por producto?
R: No en esta versión. Fase 2 agregará soporte.

### P: ¿Qué pasa si elimino un producto con video?
R: El video permanece en storage (limpieza manual).
- TODO Fase 2: Garbage collection automático

### P: ¿Hay límite de almacenamiento total?
R: Sí, según plan Supabase. Contactar admin para detalles.

### P: ¿Cómo comprimo videos para que sean < 100MB?
R: ```bash
ffmpeg -i input.mp4 -vf scale=1280:-1 -c:v libx264 -crf 28 -c:a aac -b:a 128k output.mp4
```

### P: ¿Funciona en iPhone/iPad?
R: Sí, con algunas limitaciones (autoplay, fullscreen).

### P: ¿Puedo enlazar video desde URL externa?
R: Sí, pero requiere validación de URL. No se recomienda por velocidad.

---

## Contacto & Soporte

Para issues, ver:
- Código: `js/modules/products/`
- Migrations: `supabase/20260503_*.sql`
- Config: `js/core/config.js`

---

**Última actualización**: 2026-05-03
**Versión**: 1.0 (Estrategia A)
**Responsable**: Development Team
