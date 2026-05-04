# TODOs - Arquitectura Multimedia Futura (Stain the Canvas)

## Estrategia Actual (A - Minimal Implementation)
- **Estado**: ✅ Implementado
- **Alcance**: Single video per product, HTML5 video player, basic validation
- **Limitaciones**: No hay transcoding, streaming adaptativo, analytics, o gestión de metadatos

---

## Fase 2: Arquitectura Mejorada (Estrategia B - Enhanced Video Management)

### 2.1 Base de Datos - Multimedia Assets Table
**Objetivo**: Separar la gestión de medios de la tabla de productos

```sql
-- Nueva tabla para gestionar todos los activos multimedia
create table public.multimedia_assets (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  
  -- Tipo de medio (video, image, 3d_model)
  type text not null check (type in ('video', 'image', '3d_model')),
  
  -- Información de almacenamiento
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  
  -- Metadatos de video
  video_duration_seconds integer,
  video_width integer,
  video_height integer,
  video_codec text,
  video_bitrate_kbps integer,
  
  -- Metadatos de imagen
  image_width integer,
  image_height integer,
  
  -- Orden en galería/carrusel
  position_order integer default 0,
  
  -- Control
  is_primary boolean default false,
  is_featured boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_multimedia_assets_producto_id on public.multimedia_assets(producto_id);
create index idx_multimedia_assets_type on public.multimedia_assets(type);
create index idx_multimedia_assets_position_order on public.multimedia_assets(producto_id, position_order);
```

**TODOs**:
- [ ] Crear migration para tabla `multimedia_assets`
- [ ] Crear trigger para `updated_at`
- [ ] Crear RLS policies para lectura pública
- [ ] Crear stored procedures para gestionar múltiples medios

### 2.2 Video Transcoding & Adaptive Bitrate
**Objetivo**: Soportar múltiples formatos y calidades de video

```sql
create table public.video_transcoding_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  
  -- Estado del job
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  
  -- Formatos transcodificados
  -- Ejemplo: ['hls', 'dash', 'mp4_720p', 'mp4_1080p', 'webm_720p']
  output_formats text[] default '{}',
  
  -- Calidades disponibles (bitrate levels)
  quality_levels jsonb not null default '{}',
  
  -- Información de error
  error_message text,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index idx_video_transcoding_jobs_asset_id on public.video_transcoding_jobs(asset_id);
create index idx_video_transcoding_jobs_status on public.video_transcoding_jobs(status);
```

**TODOs**:
- [ ] Integración con servicio de transcoding (FFmpeg en servidor o servicio externo)
- [ ] Job queue para procesar videos asincronamente
- [ ] Webhooks para notificar completación de transcoding
- [ ] Fallback a video original si transcoding falla

### 2.3 Video Analytics
**Objetivo**: Rastrear engagement de video

```sql
create table public.video_analytics (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  session_id text not null,
  
  -- Eventos
  event_type text not null check (event_type in ('play', 'pause', 'resume', 'complete', 'seek')),
  
  -- Información contextual
  watched_duration_seconds integer,
  watched_percentage numeric(5,2),
  timestamp_seconds integer,
  
  created_at timestamptz not null default now()
);

create index idx_video_analytics_asset_id on public.video_analytics(asset_id);
create index idx_video_analytics_session_id on public.video_analytics(session_id);
create index idx_video_analytics_created_at on public.video_analytics(created_at desc);
```

**TODOs**:
- [ ] Implementar client-side tracking de eventos de video
- [ ] Dashboard para visualizar engagement metrics
- [ ] Heatmap de puntos abandonados en videos
- [ ] Recomendaciones basadas en engagement

### 2.4 Subtítulos & Captions
**Objetivo**: Soportar múltiples idiomas y accesibilidad

```sql
create table public.video_subtitles (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  
  language_code text not null, -- 'es', 'en', 'fr', etc.
  subtitle_type text not null check (subtitle_type in ('subtitles', 'captions')), -- captions incluyen sonidos
  
  storage_path text not null unique,
  mime_type text not null, -- 'text/vtt', 'application/x-subrip'
  
  is_auto_generated boolean default false,
  source text, -- 'manual', 'speech_to_text', 'translation'
  
  created_at timestamptz not null default now()
);

create index idx_video_subtitles_asset_id on public.video_subtitles(asset_id);
create index idx_video_subtitles_language on public.video_subtitles(language_code);
```

**TODOs**:
- [ ] Speech-to-text automático para generar subtítulos
- [ ] Editor UI para corregir subtítulos auto-generados
- [ ] Soporte para múltiples idiomas (traducción automática)
- [ ] Almacenamiento de archivos .vtt en storage

---

## Fase 3: Búsqueda y Descubrimiento Avanzado (Estrategia C - Advanced Discovery)

### 3.1 Video Search by Transcript
**Objetivo**: Permitir búsqueda dentro del contenido de videos

```sql
create table public.video_transcripts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  language_code text not null,
  
  -- Texto completo transcodificado
  full_text text not null,
  
  -- Array de segmentos timestamped
  segments jsonb not null, -- [{"text": "...", "start_ms": 0, "end_ms": 5000}, ...]
  
  -- Full-text search index
  search_vector tsvector,
  
  created_at timestamptz not null default now()
);

-- Full-text search index
create index idx_video_transcripts_search_vector on public.video_transcripts using gin(search_vector);
create index idx_video_transcripts_asset_id on public.video_transcripts(asset_id);
```

**TODOs**:
- [ ] Integración con servicio speech-to-text
- [ ] Generación de transcripts para todos los videos
- [ ] Full-text search en transcripts
- [ ] Búsqueda fuzzy (tolerancia a errores de OCR)
- [ ] Linking de resultados de búsqueda a timestamps específicos

### 3.2 Computer Vision - Objeto Recognition
**Objetivo**: Auto-etiquetar productos basado en contenido visual

```sql
create table public.video_objects_detected (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  
  object_type text not null, -- 'product', 'person', 'text', 'logo', etc.
  label text not null,
  confidence numeric(3,2) not null, -- 0.00 a 1.00
  
  -- Ubicación en frame (para bounding box)
  x_start numeric(5,3),
  y_start numeric(5,3),
  x_end numeric(5,3),
  y_end numeric(5,3),
  
  -- Cuándo aparece
  timestamp_ms integer,
  
  created_at timestamptz not null default now()
);

create index idx_video_objects_detected_asset_id on public.video_objects_detected(asset_id);
create index idx_video_objects_detected_label on public.video_objects_detected(label);
```

**TODOs**:
- [ ] Integración con ML model (TensorFlow.js, cloud vision API)
- [ ] Detectar productos, personas, colores dominantes
- [ ] Generar tags automáticos para SEO
- [ ] Crear visual search por objetos detectados en videos

---

## Fase 4: CDN y Performance (Estrategia D - Global Scale)

### 4.1 CDN Distribution
**TODOs**:
- [ ] Configurar Cloudflare Stream o Bunny CDN
- [ ] Multi-region caching de videos
- [ ] Geo-routing para latencia mínima
- [ ] Analytics de edge servers
- [ ] Fallback chains si una región falla

### 4.2 Progressive Enhancement
**TODOs**:
- [ ] Thumbnail generation on-upload
- [ ] Poster frame extraction (primera frame del video)
- [ ] Video preview (3-5 segundos al hover)
- [ ] WEBP thumbnail fallback
- [ ] Lazy-load de players

### 4.3 Bandwidth Optimization
**TODOs**:
- [ ] Soporte para video quality selector basado en conexión
- [ ] Detección automática de calidad (Network Information API)
- [ ] Progressive buffering
- [ ] Adaptive streaming (HLS/DASH con dash.js)

---

## Fase 5: Monetización y Derechos (Estrategia E - Rights Management)

### 5.1 Media Rights & Licensing
```sql
create table public.media_licenses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.multimedia_assets(id) on delete cascade,
  
  license_type text not null, -- 'creative_commons', 'proprietary', 'royalty_free', etc.
  license_url text,
  
  -- Atribución requerida
  attribution_required boolean default true,
  attribution_text text,
  
  -- Restricciones
  allow_commercial_use boolean default false,
  allow_modifications boolean default false,
  allow_distribution boolean default false,
  
  created_at timestamptz not null default now()
);
```

**TODOs**:
- [ ] Implementar widget de información de licencia
- [ ] Watermarking automático de videos
- [ ] DRM para contenido premium
- [ ] Detectar uso no autorizado (reverse image search)

### 5.2 Digital Rights Management (DRM)
**TODOs**:
- [ ] Integración con Widevine/PlayReady
- [ ] Encriptación de contenido
- [ ] Restricción de descarga
- [ ] Tracking de distribución no autorizada
- [ ] DMCA compliance

---

## Fase 6: Social & Sharing (Estrategia F - Viral Growth)

### 6.1 Social Media Optimization
**TODOs**:
- [ ] Auto-generate social media clips (TikTok, Instagram Reels format)
- [ ] Thumbnail optimization para diferentes plataformas
- [ ] Hashtag extraction from transcripts
- [ ] Trending audio library integration
- [ ] Share-to-social buttons con custom previews

### 6.2 Collaborative Features
**TODOs**:
- [ ] Video comments & reactions
- [ ] Collaborative playlists
- [ ] Watch parties (sincronización en tiempo real)
- [ ] User-generated content (UGC) moderation
- [ ] Creator recognition system

---

## Decisiones Arquitecturales Necesarias

### Storage Strategy
```
OPCIONES:
1. Supabase Storage (actual - simple, suficiente para MVP)
2. AWS S3 (escala, regions, compliance)
3. Cloudflare R2 (cheaper S3 alternative)
4. Bunny CDN (built-in transcoding)
5. Mux (video API with transcoding included)

RECOMENDACIÓN FUTURA: Migrar a Mux para producción (incluye transcoding, analytics, CDN integrado)
```

### Transcoding Service
```
OPCIONES:
1. FFmpeg en servidor (low cost, requires infrastructure)
2. AWS MediaConvert (managed, expensive)
3. Mux (managed, included in platform)
4. Bunny Stream (bueno para videos simples)

RECOMENDACIÓN: Mux o Bunny Stream (remove infrastructure burden)
```

### Analytics Backend
```
OPCIONES:
1. Supabase + PostgREST (actual approach)
2. Segment (data collection platform)
3. Mixpanel (video-specific analytics)
4. Custom solution con PostHog

RECOMENDACIÓN: Integrar con plataforma de videos elegida (Mux, Bunny)
```

---

## Checklist de Implementación

### Antes de Fase 2:
- [ ] Validar volumen de videos esperado
- [ ] Analizar requerimientos de bitrate/resolución
- [ ] Estimar presupuesto de storage/transcoding
- [ ] Investigar opciones de CDN
- [ ] Planeamiento de migración de datos

### Migraciones SQL necesarias:
- [ ] `20260505_create_multimedia_assets_table.sql`
- [ ] `20260505_create_video_transcoding_jobs_table.sql`
- [ ] `20260505_create_video_analytics_table.sql`
- [ ] `20260505_create_video_subtitles_table.sql`
- [ ] `20260505_create_video_transcripts_table.sql`

### Cambios en Frontend:
- [ ] Player component refactor (soporte para HLS/DASH)
- [ ] Quality selector UI
- [ ] Subtitle selector
- [ ] Video progress tracking
- [ ] Error recovery UI

### Cambios en Backend/API:
- [ ] Endpoints para transcoding job status
- [ ] Analytics ingestion API
- [ ] Subtitle management API
- [ ] Video search API
- [ ] Quality selection logic

---

## Notas Importantes

1. **No hacer prematuramente**: Evitar implementar todas estas características sin demanda real
2. **Validar antes de invertir**: Medir engagement de videos actuales primero
3. **Considerar outsourcing**: Servicios como Mux pueden ser más cost-effective que build-it-yourself
4. **Escalabilidad**: El storage y transcoding son los mayores costos - planificar bien
5. **Accesibilidad**: Subtítulos y captions no son lujos, son requisitos de accesibilidad

---

Última actualización: 2026-05-03
Documento de arquitectura: Estrategia A (implementada)
Próxima fase recomendada: Recopilar métricas de engagement de videos actuales
