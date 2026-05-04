-- Pre-migration: Asegurar que columna video_url existe
-- Ejecutar ANTES de: 20260503_migrate_product_data_to_media.sql
-- Propósito: Crear video_url si no existe (safe idempotent)

-- 1. Agregar columna si no existe
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS video_url text;

-- 2. Comentario en la columna para documentación
COMMENT ON COLUMN public.productos.video_url IS 'URL del video principal del producto (DEPRECATED - usar product_media en su lugar)';

-- 3. Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_productos_video_url 
ON public.productos (video_url) 
WHERE video_url IS NOT NULL;

-- 4. Verificación: Mostrar si la columna fue agregada exitosamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'productos' 
  AND column_name = 'video_url';

-- Si la query anterior retorna 1 fila: ✅ Listo
-- Si retorna 0 filas: ❌ Hubo problema

-- Nota: Esta es una operación SEGURA. Si la columna ya existe, no hace nada.
