-- Delete taxonomy data (categories and subcategories) but keep tables
-- Safe to run multiple times
-- Important: First remove foreign key references, then delete subcategorias, then delete categorias

-- Step 1: Clear foreign key references from productos and eventos
update public.productos set categoria_id = null;
update public.eventos set categoria_id = null;

-- Step 2: Delete subcategorias
delete from public.subcategorias;

-- Step 3: Delete categorias
delete from public.categorias;
