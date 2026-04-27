-- Propuesta de migracion V2 (idempotente y compatible)
-- Objetivo: normalizar categorias y galeria sin romper codigo actual.

create extension if not exists pgcrypto;

-- Reutiliza funcion existente si ya esta en setup.sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Tabla categorias
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categorias_activa_orden
  on public.categorias (is_active, orden, nombre);

drop trigger if exists trg_categorias_updated_at on public.categorias;
create trigger trg_categorias_updated_at
before update on public.categorias
for each row execute function public.set_updated_at();

-- Seed base
insert into public.categorias (nombre, orden, is_active)
values
  ('Bisuteria', 1, true),
  ('Accesorios', 2, true),
  ('Arreglos', 3, true),
  ('Decoraciones', 4, true),
  ('Manualidades', 5, true)
on conflict (nombre) do update
set orden = excluded.orden,
    is_active = excluded.is_active;

-- 2) Relacionar subcategorias -> categorias
alter table public.subcategorias
  add column if not exists categoria_id uuid references public.categorias(id) on delete restrict;

update public.subcategorias s
set categoria_id = c.id
from public.categorias c
where s.categoria_id is null
  and lower(trim(s.categoria)) = lower(trim(c.nombre));

create unique index if not exists uq_subcategorias_categoria_id_nombre
  on public.subcategorias (categoria_id, nombre)
  where categoria_id is not null;

create index if not exists idx_subcategorias_categoria_id_orden
  on public.subcategorias (categoria_id, orden);

-- 3) Relacionar productos -> categorias
alter table public.productos
  add column if not exists categoria_id uuid references public.categorias(id) on delete restrict;

update public.productos p
set categoria_id = c.id
from public.categorias c
where p.categoria_id is null
  and lower(trim(p.categoria)) = lower(trim(c.nombre));

create index if not exists idx_productos_categoria_id_featured_created
  on public.productos (categoria_id, featured, created_at desc);

-- 4) Tabla normalizada para imagenes de producto
create table if not exists public.producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  url text not null,
  orden integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_producto_imagenes_producto_orden
  on public.producto_imagenes (producto_id, orden);

-- Backfill inicial desde gallery_urls e imagen_url
with expanded as (
  select
    p.id as producto_id,
    e.value::text as raw_url,
    e.ordinality - 1 as orden
  from public.productos p,
  lateral jsonb_array_elements_text(coalesce(p.gallery_urls, '[]'::jsonb)) with ordinality as e(value, ordinality)
), cleaned as (
  select
    producto_id,
    trim(both '"' from raw_url) as url,
    orden
  from expanded
  where coalesce(trim(both '"' from raw_url), '') <> ''
)
insert into public.producto_imagenes (producto_id, url, orden, is_cover)
select c.producto_id, c.url, c.orden, (c.orden = 0)
from cleaned c
where not exists (
  select 1
  from public.producto_imagenes pi
  where pi.producto_id = c.producto_id
    and pi.url = c.url
);

insert into public.producto_imagenes (producto_id, url, orden, is_cover)
select p.id, p.imagen_url, 0, true
from public.productos p
where coalesce(trim(p.imagen_url), '') <> ''
  and not exists (
    select 1 from public.producto_imagenes pi
    where pi.producto_id = p.id and pi.url = p.imagen_url
  );

-- 5) Extender eventos con categoria_id (sin romper categoria texto)
alter table public.eventos
  add column if not exists categoria_id uuid references public.categorias(id) on delete set null;

update public.eventos e
set categoria_id = c.id
from public.categorias c
where e.categoria_id is null
  and coalesce(trim(e.categoria), '') <> ''
  and lower(trim(e.categoria)) = lower(trim(c.nombre));

create index if not exists idx_eventos_categoria_id_fecha
  on public.eventos (categoria_id, fecha desc);

-- 6) RLS sugerida para nuevas tablas (lectura publica, escritura admin)
alter table public.categorias enable row level security;
alter table public.producto_imagenes enable row level security;

drop policy if exists "Public can read categorias" on public.categorias;
create policy "Public can read categorias"
on public.categorias
for select
using (is_active = true);

drop policy if exists "Admins can write categorias" on public.categorias;
create policy "Admins can write categorias"
on public.categorias
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Public can read producto_imagenes" on public.producto_imagenes;
create policy "Public can read producto_imagenes"
on public.producto_imagenes
for select
using (true);

drop policy if exists "Admins can write producto_imagenes" on public.producto_imagenes;
create policy "Admins can write producto_imagenes"
on public.producto_imagenes
for all
using (public.is_admin_user())
with check (public.is_admin_user());

-- Nota: no se elimina categoria ni gallery_urls para compatibilidad.
-- Fase 2 (posterior): migrar frontend/backend y luego retirar columnas legacy.
