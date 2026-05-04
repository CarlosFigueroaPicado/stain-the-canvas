-- Migración: Migrar datos de imagen_url/gallery_urls/video_url a product_media
-- Fecha: 2026-05-03
-- Propósito: Copiar datos existentes sin perder información
-- Nota: SEGURO - no modifica ni elimina columnas viejas

-- 1. Migrar imagen_url como imagen primaria
INSERT INTO public.product_media (product_id, type, url, position, is_primary, created_at)
SELECT 
  id as product_id,
  'image' as type,
  imagen_url as url,
  0 as position,
  true as is_primary,
  created_at
FROM public.productos
WHERE imagen_url IS NOT NULL
  AND LENGTH(TRIM(imagen_url)) > 0
ON CONFLICT (product_id, url) DO NOTHING;

-- 2. Migrar gallery_urls como imágenes adicionales
INSERT INTO public.product_media (product_id, type, url, position, is_primary, created_at)
SELECT 
  p.id as product_id,
  'image' as type,
  gallery_item as url,
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY gallery_item) as position,
  false as is_primary,
  p.created_at
FROM public.productos p,
LATERAL jsonb_array_elements_text(p.gallery_urls) AS gallery_item
WHERE p.gallery_urls IS NOT NULL
  AND jsonb_array_length(p.gallery_urls) > 0
  AND LENGTH(TRIM(gallery_item)) > 0
  AND gallery_item != p.imagen_url  -- Evitar duplicar la imagen principal
ON CONFLICT (product_id, url) DO NOTHING;

-- 3. Migrar video_url como video primario (si la columna existe y tiene datos)
INSERT INTO public.product_media (product_id, type, url, position, is_primary, created_at)
SELECT 
  id as product_id,
  'video' as type,
  video_url as url,
  0 as position,
  true as is_primary,
  created_at
FROM public.productos
WHERE video_url IS NOT NULL
  AND LENGTH(TRIM(video_url)) > 0
  AND EXISTS (
    -- Verificar que la columna video_url existe en la tabla
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'productos' 
      AND column_name = 'video_url'
  )
ON CONFLICT (product_id, url) DO NOTHING;

-- 4. Verificación de integridad post-migración
-- Este query no modifica datos, solo verifica
-- Descomentar para revisar resultados:
/*
SELECT 
  'Total medios migrados' as check_type,
  COUNT(*) as count,
  COUNT(DISTINCT product_id) as affected_products
FROM public.product_media;

SELECT 
  type,
  COUNT(*) as count,
  COUNT(DISTINCT product_id) as affected_products
FROM public.product_media
GROUP BY type
ORDER BY type;

-- Verificar que cada producto tenga máximo 1 imagen/video primaria
SELECT 
  product_id,
  type,
  COUNT(*) as primary_count
FROM public.product_media
WHERE is_primary = true
GROUP BY product_id, type
HAVING COUNT(*) > 1;  -- Debería retornar 0 filas

-- Verificar productos sin medios (deberían ser 0 o muy pocos)
SELECT 
  p.id,
  p.nombre,
  COALESCE(p.imagen_url IS NOT NULL, false) as has_old_imagen,
  COALESCE(p.gallery_urls IS NOT NULL AND jsonb_array_length(p.gallery_urls) > 0, false) as has_old_gallery,
  COALESCE(p.video_url IS NOT NULL, false) as has_old_video,
  COALESCE(COUNT(pm.id) > 0, false) as has_new_media
FROM public.productos p
LEFT JOIN public.product_media pm ON p.id = pm.product_id
GROUP BY p.id
HAVING COUNT(pm.id) = 0 AND (p.imagen_url IS NOT NULL OR p.gallery_urls IS NOT NULL OR p.video_url IS NOT NULL);
*/

-- 5. Nota: No eliminar columnas viejas todavía
-- El código frontend verificará product_media primero, luego fallback a viejas
-- Esto permite rollback seguro si hay problemas
