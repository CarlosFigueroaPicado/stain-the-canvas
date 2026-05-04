-- Migration: Add basic video support to productos table
-- Date: 2026-05-02
-- Strategy: Minimal (Estrategia A)
-- Description: Add nullable video_url column to productos table
--              Maintains 100% backward compatibility with gallery_urls

-- ============================================================================
-- STEP 1: Add video_url column
-- ============================================================================

ALTER TABLE IF EXISTS public.productos
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- ============================================================================
-- STEP 2: Create index for video_url queries (optional but recommended)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productos_video_url 
ON public.productos(video_url) 
WHERE video_url IS NOT NULL;

-- ============================================================================
-- STEP 3: Add column comment for documentation
-- ============================================================================

COMMENT ON COLUMN public.productos.video_url IS 
'Nullable URL of product video file stored in Supabase Storage. 
Supported formats: MP4, WEBM, MOV. 
Max size: 100 MB. 
Note: Currently limited to 1 video per product (Estrategia A).
Future: Will be migrated to product_media table (Estrategia B).';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check if column was added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'productos' AND column_name = 'video_url';

-- Check if index was created
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE tablename = 'productos' AND indexname LIKE '%video%';

-- Count products with videos
-- SELECT COUNT(*) as productos_con_video FROM productos WHERE video_url IS NOT NULL;
