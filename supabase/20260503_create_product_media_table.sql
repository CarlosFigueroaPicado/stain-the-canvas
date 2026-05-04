-- Migración: Crear tabla product_media para arquitectura multimedia normalizada
-- Fecha: 2026-05-03
-- Propósito: Reemplazar gallery_urls JSONB + imagen_url + video_url con tabla relacional
-- Nota: BACKWARD COMPATIBLE - mantiene columnas viejas como fallback

-- 1. Crear tabla product_media
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.productos(id) on delete cascade,
  
  -- Tipo de media: 'image' o 'video'
  type text not null check (type in ('image', 'video')),
  
  -- URL pública del media (Piñata, S3, etc)
  url text not null,
  
  -- Orden en galería/carrusel (0 = primera, 1 = segunda, etc)
  position integer not null default 0 check (position >= 0),
  
  -- Media principal de su tipo (true = es la portada)
  is_primary boolean not null default false,
  
  -- Timestamps para auditoría
  created_at timestamptz not null default now(),
  
  -- Constraints: evitar duplicados y múltiples primarias
  unique(product_id, url),
  constraint unique_primary_per_type unique(product_id, type) where is_primary = true
);

-- 2. Crear índices para performance
-- Búsqueda rápida de medios por producto
create index if not exists idx_product_media_product_id 
  on public.product_media(product_id);

-- Ordenamiento eficiente por posición
create index if not exists idx_product_media_product_position 
  on public.product_media(product_id, position);

-- Acceso rápido a media primaria
create index if not exists idx_product_media_primary 
  on public.product_media(product_id) 
  where is_primary = true;

-- Filtrado por tipo (para analytics futuro)
create index if not exists idx_product_media_type 
  on public.product_media(type);

-- 3. Habilitar RLS
alter table public.product_media enable row level security;

-- 4. RLS Policies
-- Lectura pública (todos pueden ver medios de productos públicos)
create policy if not exists "product_media_select_public" 
  on public.product_media
  for select
  using (true);

-- Escritura solo para admins
create policy if not exists "product_media_write_admin" 
  on public.product_media
  for insert
  with check (
    auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
    or auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
  );

-- Actualización solo para admins
create policy if not exists "product_media_update_admin" 
  on public.product_media
  for update
  using (
    auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
    or auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
  )
  with check (
    auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
    or auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
  );

-- Borrado solo para admins
create policy if not exists "product_media_delete_admin" 
  on public.product_media
  for delete
  using (
    auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
    or auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
  );

-- 5. Grant permisos básicos
grant select on public.product_media to anon, authenticated;
grant insert, update, delete on public.product_media to authenticated;
