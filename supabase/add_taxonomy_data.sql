-- Add categories and subcategories
-- Insert categories first
insert into public.categorias (nombre, orden, is_active)
values
  ('Bisutería', 1, true),
  ('Accesorios', 2, true),
  ('Manualidades y Arreglos', 3, true),
  ('Decoraciones', 4, true)
on conflict (nombre) do nothing;

-- Insert subcategories with correct orden and categoria_id
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
on conflict (categoria, nombre) do nothing;
