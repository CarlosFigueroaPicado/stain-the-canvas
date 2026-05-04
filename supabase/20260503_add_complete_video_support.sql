-- Stain the Canvas - Complete Video Support (v1)
-- Date: 2026-05-03
-- Purpose: Add comprehensive video support to products table
-- Strategy: Minimal implementation - single video per product, HTML5 video player
-- TODOs: See end of file for future multimedia architecture improvements

-- Ensure video_url column exists with proper constraints
alter table public.productos
add column if not exists video_url text default null;

-- Add index on video_url for queries filtering/showing only products with videos
create index if not exists idx_productos_video_url_notnull 
  on public.productos (video_url) 
  where video_url is not null;

-- Validate that video URLs, if present, are proper HTTP(S) URLs
-- Note: In the future, this could be enforced at application layer or with PostgreSQL constraints
-- For now, relying on application-level validation in JS

-- TODOs for future multimedia architecture:
-- 1. [ ] Migrate to dedicated multimedia_assets table (videos, images, 3D models)
--    Schema: id, producto_id, type (video|image|model), storage_path, mime_type, duration, size_bytes, position_order, created_at
-- 2. [ ] Add video metadata: duration, width, height, codec, bitrate
-- 3. [ ] Create video_transcoding table: original_format, transcoded_formats[], quality_levels, status
-- 4. [ ] Implement CDN caching strategy with edge locations
-- 5. [ ] Add video analytics: views, watch_duration, engagement_segments
-- 6. [ ] Support multiple video formats (adaptive bitrate streaming - HLS/DASH)
-- 7. [ ] Add video search by transcript (speech-to-text indexing)
-- 8. [ ] Support subtitle/caption storage and syncing
-- 9. [ ] Create product_media_gallery table for carousel with mixed media types
-- 10. [ ] Implement media rights/licensing metadata

comment on column public.productos.video_url is 'Single video URL per product (HTML5 compatible). Supports MP4, WEBM, MOV. Max 100MB. Displayed below main gallery.';
