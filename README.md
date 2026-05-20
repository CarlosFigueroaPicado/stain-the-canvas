# STAIN THE CANVAS

Catálogo digital artesanal construido con Astro y Supabase. El proyecto incluye un catálogo público, panel administrativo, autenticación, carga de medios y taxonomías funcionales.

## Resumen

Este repositorio contiene la versión actual del sitio para el catálogo de productos de Stain The Canvas. La aplicación está pensada para mostrar productos al público y administrar contenido desde un panel privado con control de acceso por Supabase Auth y RLS.

### Funcionalidades principales

- Catálogo público con listado de productos.
- Búsqueda y filtrado por categorías y subcategorías.
- Vista de producto con medios asociados.
- Login de administración con Supabase Auth.
- CRUD de productos, categorías y subcategorías.
- Subida de imágenes y videos a Supabase Storage.
- Registro de visitas y eventos para analítica.

## Stack tecnico

- Astro 4
- TypeScript
- Supabase JS
- PostgreSQL con RLS
- Supabase Storage

## Estructura del proyecto

```text
src/
  components/        Componentes públicos y del panel admin
  layouts/           Layout base de la app
  lib/               Cliente Supabase, carga y repositorio de datos
  pages/             Rutas públicas y administrativas
  scripts/           Interaccion del lado del cliente
  styles/            Variables visuales y estilos globales

supabase/
  setup.sql                             Esquema principal de la base de datos
  update_taxonomy_2026_05_02.sql        Normalización de categorías y subcategorías
  delete_taxonomy_data.sql              Limpieza segura de taxonomias
  20260503_*.sql                        Migraciones de medios y video
```

## Variables de entorno

Crea un archivo `.env` en la raíz con los valores de Supabase:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_SUPABASE_BUCKET=productos
PUBLIC_PRODUCTS_TABLE=productos
PUBLIC_WHATSAPP_NUMBER=
```

`PUBLIC_SUPABASE_BUCKET` y `PUBLIC_PRODUCTS_TABLE` tienen valores por defecto, pero conviene declararlos para dejar la instalación cerrada.

## Instalación local

1. Instala dependencias.

```bash
pnpm install
```

2. Crea y configura el archivo `.env`.

3. Ejecuta el entorno de desarrollo.

```bash
pnpm dev
```

4. Verifica el build de producción.

```bash
pnpm build
```

## Scripts disponibles

- `pnpm dev`: inicia Astro en modo desarrollo.
- `pnpm build`: genera el build de producción.
- `pnpm preview`: previsualiza el build.
- `pnpm test`: ejecuta chequeo y build.
- `pnpm test:ci`: mismo flujo para CI.

## Base de datos en Supabase

La base está organizada en tres bloques:

### 1. Catálogo

- `productos`: tabla central del catálogo.
- `categorias`: categorías principales activas.
- `subcategorias`: taxonomía secundaria con FK opcional a categorías.
- `producto_imagenes`: historial/galería normalizada de medios por producto.

### 2. Analítica

- `visitas`: captura visitas del sitio.
- `eventos`: registra vistas de producto y clics de WhatsApp.
- Triggers anti-spam y trigger de sincronización de métricas.

### 3. Administración

- `admin_users`: lista de usuarios autorizados.
- Función `public.is_admin_user()` para validar permisos.
- RLS para lectura publica y escritura limitada a administradores.

## Medios y archivos

Los productos usan Supabase Storage en el bucket `productos`. El frontend soporta:

- una imagen principal,
- una galería compatible por compatibilidad,
- un video por producto.

Además existe una migración futura para un modelo más normalizado de multimedia en `product_media`.

## Rutas principales

- `/`: catálogo público.
- `/login`: acceso al panel.
- `/admin`: panel administrativo principal.
- `/admin/categorias`: gestión de categorías.
- `/admin/subcategorias`: gestión de subcategorías.

## Flujo de trabajo

1. El catálogo público carga datos desde Supabase con fallback local.
2. El login autentica con Supabase Auth.
3. El panel valida sesión y permisos desde el navegador.
4. Los formularios del admin crean, editan y eliminan registros en la base.
5. Los archivos se suben a Storage y se guardan como URL publica.

## Notas de despliegue

- Asegura que las variables de entorno estén definidas en el entorno de hosting.
- Verifica que el bucket `productos` exista en Supabase.
- Aplica primero `supabase/setup.sql` y luego las migraciones incrementales.
- Ejecuta `pnpm build` antes de publicar cambios.

## Estado actual

La aplicación ya está orientada a producción: catálogo funcional, panel admin funcional, taxonomías activas y soporte de imágenes/video. El siguiente paso habitual es publicar el proyecto en GitHub y conectar el repositorio al flujo de despliegue.
