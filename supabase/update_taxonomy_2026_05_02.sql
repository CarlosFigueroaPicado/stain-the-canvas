-- Replace catalog taxonomy with the 4 grouped categories requested.
-- Safe to run more than once.

insert into public.categorias (nombre, orden, is_active)
values
  ('Bisutería', 1, true),
  ('Accesorios', 2, true),
  ('Manualidades y Arreglos', 3, true),
  ('Decoraciones', 4, true)
on conflict (nombre) do update
set orden = excluded.orden,
    is_active = excluded.is_active;

update public.categorias
set is_active = false
where nombre not in ('Bisutería', 'Accesorios', 'Manualidades y Arreglos', 'Decoraciones');

update public.subcategorias
set categoria = 'Bisutería'
where categoria = 'Bisuteria';

update public.subcategorias
set nombre = 'Aretes',
    categoria = 'Bisutería',
    orden = 4,
    is_active = true
where categoria in ('Bisuteria', 'Bisutería')
  and nombre in ('Artes', 'Aretes');

insert into public.subcategorias (nombre, categoria, categoria_id, orden, is_active)
select item.nombre, item.categoria, c.id, item.orden, true
from (
  values
    ('Collares', 'Bisutería', 1),
    ('Pulseras', 'Bisutería', 2),
    ('Anillos', 'Bisutería', 3),
    ('Aretes', 'Bisutería', 4),
    ('Gargantillas', 'Bisutería', 5),
    ('Sets de bisutería', 'Bisutería', 6),
    ('Rosarios', 'Bisutería', 7),
    ('Llaveros', 'Accesorios', 1),
    ('Porta lentes', 'Accesorios', 2),
    ('Porta mascarillas', 'Accesorios', 3),
    ('Colgantes de celular', 'Accesorios', 4),
    ('Accesorios para mascotas', 'Accesorios', 5),
    ('Cajas decoradas', 'Manualidades y Arreglos', 1),
    ('Ramos', 'Manualidades y Arreglos', 2),
    ('Flores', 'Manualidades y Arreglos', 3),
    ('Detalles personalizados', 'Manualidades y Arreglos', 4),
    ('Tarjetas personalizadas', 'Manualidades y Arreglos', 5),
    ('Murales', 'Manualidades y Arreglos', 6),
    ('Piñatas', 'Manualidades y Arreglos', 7),
    ('Artículos decorativos religiosos', 'Manualidades y Arreglos', 8),
    ('Decoraciones para cumpleaños infantiles', 'Decoraciones', 1),
    ('Decoraciones para 15 años', 'Decoraciones', 2),
    ('Decoraciones cumpleaños', 'Decoraciones', 3)
) as item(nombre, categoria, orden)
join public.categorias c on c.nombre = item.categoria
on conflict (categoria, nombre) do update
set categoria_id = excluded.categoria_id,
    orden = excluded.orden,
    is_active = excluded.is_active;

update public.subcategorias
set categoria = 'Manualidades y Arreglos'
where categoria in ('Manualidades', 'Arreglos');

update public.subcategorias s
set categoria_id = c.id
from public.categorias c
where s.categoria = c.nombre;

update public.subcategorias
set is_active = false
where (categoria, nombre) not in (
  ('Bisutería', 'Collares'),
  ('Bisutería', 'Pulseras'),
  ('Bisutería', 'Anillos'),
  ('Bisutería', 'Aretes'),
  ('Bisutería', 'Gargantillas'),
  ('Bisutería', 'Sets de bisutería'),
  ('Bisutería', 'Rosarios'),
  ('Accesorios', 'Llaveros'),
  ('Accesorios', 'Porta lentes'),
  ('Accesorios', 'Porta mascarillas'),
  ('Accesorios', 'Colgantes de celular'),
  ('Accesorios', 'Accesorios para mascotas'),
  ('Manualidades y Arreglos', 'Cajas decoradas'),
  ('Manualidades y Arreglos', 'Ramos'),
  ('Manualidades y Arreglos', 'Flores'),
  ('Manualidades y Arreglos', 'Detalles personalizados'),
  ('Manualidades y Arreglos', 'Tarjetas personalizadas'),
  ('Manualidades y Arreglos', 'Murales'),
  ('Manualidades y Arreglos', 'Piñatas'),
  ('Manualidades y Arreglos', 'Artículos decorativos religiosos'),
  ('Decoraciones', 'Decoraciones para cumpleaños infantiles'),
  ('Decoraciones', 'Decoraciones para 15 años'),
  ('Decoraciones', 'Decoraciones cumpleaños')
);

update public.productos
set categoria = 'Bisutería'
where lower(trim(categoria)) = 'bisuteria';

update public.productos
set categoria = 'Manualidades y Arreglos'
where lower(trim(categoria)) in ('manualidades', 'arreglos')
   or lower(trim(categoria)) like '%pinata%'
   or lower(trim(categoria)) like '%piñata%';

update public.productos p
set categoria_id = c.id
from public.categorias c
where p.categoria = c.nombre;

update public.eventos
set categoria = 'Manualidades y Arreglos'
where lower(trim(categoria)) in ('manualidades', 'arreglos')
   or lower(trim(categoria)) like '%pinata%'
   or lower(trim(categoria)) like '%piñata%';

update public.eventos
set categoria = 'Bisutería'
where lower(trim(categoria)) = 'bisuteria';

update public.eventos e
set categoria_id = c.id
from public.categorias c
where e.categoria = c.nombre;
