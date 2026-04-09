-- Stain the Canvas - Supabase setup
-- Run in Supabase SQL Editor.
-- Security model:
-- - Public read for catalog browsing.
-- - Authenticated write for admin actions.

create extension if not exists pgcrypto;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  descripcion text not null,
  precio numeric(10,2) not null default 0 check (precio >= 0),
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
before update on public.productos
for each row execute function public.set_updated_at();

alter table public.productos enable row level security;

drop policy if exists "Public can read productos" on public.productos;
create policy "Public can read productos"
on public.productos
for select
using (true);

drop policy if exists "Public can insert productos" on public.productos;
drop policy if exists "Authenticated can insert productos" on public.productos;
create policy "Authenticated can insert productos"
on public.productos
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Public can update productos" on public.productos;
drop policy if exists "Authenticated can update productos" on public.productos;
create policy "Authenticated can update productos"
on public.productos
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can delete productos" on public.productos;
drop policy if exists "Authenticated can delete productos" on public.productos;
create policy "Authenticated can delete productos"
on public.productos
for delete
using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
using (bucket_id = 'productos');

drop policy if exists "Public can upload product images" on storage.objects;
drop policy if exists "Authenticated can upload product images" on storage.objects;
create policy "Authenticated can upload product images"
on storage.objects
for insert
with check (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "Public can update product images" on storage.objects;
drop policy if exists "Authenticated can update product images" on storage.objects;
create policy "Authenticated can update product images"
on storage.objects
for update
using (bucket_id = 'productos' and auth.role() = 'authenticated')
with check (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "Public can delete product images" on storage.objects;
drop policy if exists "Authenticated can delete product images" on storage.objects;
create policy "Authenticated can delete product images"
on storage.objects
for delete
using (bucket_id = 'productos' and auth.role() = 'authenticated');
