# Modelo de Datos V2 (Propuesta)

Este documento propone una version normalizada del esquema actual en Supabase/PostgreSQL, manteniendo compatibilidad con la app.

## 1) ERD (dbdiagram.io)

```dbml
Table categorias {
  id uuid [pk]
  nombre text [not null, unique]
  orden integer [not null, default: 0]
  is_active boolean [not null, default: true]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

Table subcategorias {
  id uuid [pk]
  categoria_id uuid [not null]
  nombre text [not null]
  descripcion text
  orden integer [not null, default: 0]
  is_active boolean [not null, default: true]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  Indexes {
    (categoria_id, nombre) [unique]
  }
}

Table productos {
  id uuid [pk]
  nombre text [not null]
  categoria text [not null]
  categoria_id uuid
  subcategory_id uuid
  descripcion text [not null]
  precio numeric(10,2) [not null]
  imagen_url text
  gallery_urls jsonb [not null]
  featured boolean [not null, default: false]
  vistas integer [not null, default: 0]
  clicks integer [not null, default: 0]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

Table producto_imagenes {
  id uuid [pk]
  producto_id uuid [not null]
  url text [not null]
  orden integer [not null, default: 0]
  is_cover boolean [not null, default: false]
  created_at timestamptz [not null]
}

Table eventos {
  id uuid [pk]
  tipo text [not null]
  producto_id uuid
  categoria text
  categoria_id uuid
  session_id text [not null]
  fecha timestamptz [not null]
}

Table visitas {
  id uuid [pk]
  fecha timestamptz [not null]
  session_id text [not null]
  user_agent text
}

Table admin_users {
  id bigint [pk, increment]
  user_id uuid [not null, unique]
  email text
  is_active boolean [not null, default: true]
  created_at timestamptz [not null]
}

Ref: subcategorias.categoria_id > categorias.id
Ref: productos.categoria_id > categorias.id
Ref: productos.subcategory_id > subcategorias.id
Ref: producto_imagenes.producto_id > productos.id
Ref: eventos.producto_id > productos.id
Ref: eventos.categoria_id > categorias.id
```

## 2) Modelo relacional (resumen)

- categorias(id PK, nombre UQ, orden, is_active, created_at, updated_at)
- subcategorias(id PK, categoria_id FK, nombre, descripcion, orden, is_active, created_at, updated_at, UQ(categoria_id,nombre))
- productos(id PK, nombre, categoria (legacy), categoria_id FK, subcategory_id FK, descripcion, precio, imagen_url, gallery_urls (legacy), featured, vistas, clicks, created_at, updated_at)
- producto_imagenes(id PK, producto_id FK, url, orden, is_cover, created_at)
- eventos(id PK, tipo, producto_id FK, categoria (legacy), categoria_id FK, session_id, fecha)
- visitas(id PK, fecha, session_id, user_agent)
- admin_users(id PK, user_id UQ)

## 3) Relaciones

- categorias 1:N subcategorias
- categorias 1:N productos
- subcategorias 1:N productos
- productos 1:N producto_imagenes
- productos 1:N eventos
- categorias 1:N eventos

No hay N:M explicita en el modelo propuesto.

## 4) PK/FK

### PK
- categorias.id
- subcategorias.id
- productos.id
- producto_imagenes.id
- eventos.id
- visitas.id
- admin_users.id

### FK
- subcategorias.categoria_id -> categorias.id
- productos.categoria_id -> categorias.id
- productos.subcategory_id -> subcategorias.id
- producto_imagenes.producto_id -> productos.id
- eventos.producto_id -> productos.id
- eventos.categoria_id -> categorias.id

## 5) Normalizacion

Estado actual:
- Categoria se repite como texto en varias tablas (redundancia).
- Subcategoria ya esta normalizada parcialmente via subcategory_id.
- Gallery de imagenes en JSONB funciona, pero mezcla almacenamiento semiestructurado con datos relacionales.

Mejoras propuestas:
- Normalizar categorias en tabla propia.
- Mantener columnas legacy de texto durante transicion (compatibilidad).
- Migrar gradualmente gallery_urls -> producto_imagenes.

## 6) Sugerencias de optimizacion

1. Integridad y consistencia
- Forzar FK en categoria_id/subcategory_id para evitar categorias invalidas.
- Agregar constraints unicos y checks por dominio.

2. Rendimiento
- Indices recomendados:
  - productos(categoria_id, featured, created_at desc)
  - productos(subcategory_id)
  - eventos(tipo, fecha desc)
  - eventos(session_id, fecha desc)
  - producto_imagenes(producto_id, orden)

3. Analitica
- Crear vista materializada para dashboard (top productos, conversion, series por dia) y refresco programado.

4. Migracion segura
- Mantener campos legacy (categoria, gallery_urls) hasta completar despliegue frontend/backend.
- Luego eliminar legacy en una fase 2.
