# SATIN THE CANVAS

Catalogo digital artesanal construido con Astro y Supabase. El proyecto incluye un catalogo publico, panel administrativo, autenticacion, carga de medios y taxonomias funcionales.

## Resumen

Este repositorio contiene la version actual del sitio para el catalogo de productos de Satin The Canvas. La aplicacion esta pensada para mostrar productos al publico y administrar contenido desde un panel privado con control de acceso por Supabase Auth y RLS.

### Funcionalidades principales

- Catalogo publico con listado de productos.
- Busqueda y filtrado por categorias y subcategorias.
- Vista de producto con medios asociados.
- Login de administracion con Supabase Auth.
- CRUD de productos, categorias y subcategorias.
- Subida de imagenes y videos a Supabase Storage.
- Registro de visitas y eventos para analitica.

## Stack tecnico

- Astro 4
- TypeScript
- Supabase JS
- PostgreSQL con RLS
- Supabase Storage

## Estructura del proyecto

```text
src/
  components/        Componentes publicos y del panel admin
  layouts/           Layout base de la app
  lib/               Cliente Supabase, carga y repositorio de datos
  pages/             Rutas publicas y administrativas
  scripts/           Interaccion del lado del cliente
  styles/            Variables visuales y estilos globales

supabase/
  setup.sql                             Esquema principal de la base de datos
  update_taxonomy_2026_05_02.sql        Normalizacion de categorias y subcategorias
  delete_taxonomy_data.sql              Limpieza segura de taxonomias
  20260503_*.sql                        Migraciones de medios y video
```

## Variables de entorno

Crea un archivo `.env` en la raiz con los valores de Supabase:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_SUPABASE_BUCKET=productos
PUBLIC_PRODUCTS_TABLE=productos
PUBLIC_WHATSAPP_NUMBER=
```

`PUBLIC_SUPABASE_BUCKET` y `PUBLIC_PRODUCTS_TABLE` tienen valores por defecto, pero conviene declararlos para dejar la instalacion cerrada.

## Instalacion local

1. Instala dependencias.

```bash
pnpm install
```

2. Crea y configura el archivo `.env`.

3. Ejecuta el entorno de desarrollo.

```bash
pnpm dev
```

4. Verifica el build de produccion.

```bash
pnpm build
```

## Scripts disponibles

- `pnpm dev`: inicia Astro en modo desarrollo.
- `pnpm build`: genera el build de produccion.
- `pnpm preview`: previsualiza el build.
- `pnpm test`: ejecuta chequeo y build.
- `pnpm test:ci`: mismo flujo para CI.

## Base de datos en Supabase

La base esta organizada en tres bloques:

### 1. Catalogo

- `productos`: tabla central del catalogo.
- `categorias`: categorias principales activas.
- `subcategorias`: taxonomia secundaria con FK opcional a categorias.
- `producto_imagenes`: historial/galeria normalizada de medios por producto.

### 2. Analitica

- `visitas`: captura visitas del sitio.
- `eventos`: registra vistas de producto y clicks de WhatsApp.
- Triggers anti-spam y trigger de sincronizacion de metricas.

### 3. Administracion

- `admin_users`: lista de usuarios autorizados.
- Funcion `public.is_admin_user()` para validar permisos.
- RLS para lectura publica y escritura limitada a administradores.

## Medios y archivos

Los productos usan Supabase Storage en el bucket `productos`. El frontend soporta:

- una imagen principal,
- una galeria compatible por compatibilidad,
- un video por producto.

Ademas existe una migracion futura para un modelo mas normalizado de multimedia en `product_media`.

## Rutas principales

- `/`: catalogo publico.
- `/login`: acceso al panel.
- `/admin`: panel administrativo principal.
- `/admin/categorias`: gestion de categorias.
- `/admin/subcategorias`: gestion de subcategorias.

## Flujo de trabajo

1. El catalogo publico carga datos desde Supabase con fallback local.
2. El login autentica con Supabase Auth.
3. El panel valida sesion y permisos desde el navegador.
4. Los formularios del admin crean, editan y eliminan registros en la base.
5. Los archivos se suben a Storage y se guardan como URL publica.

## Notas de despliegue

- Asegura que las variables de entorno esten definidas en el entorno de hosting.
- Verifica que el bucket `productos` exista en Supabase.
- Aplica primero `supabase/setup.sql` y luego las migraciones incrementales.
- Ejecuta `pnpm build` antes de publicar cambios.

## Estado actual

La aplicacion ya esta orientada a produccion: catalogo funcional, panel admin funcional, taxonomias activas y soporte de imagenes/video. El siguiente paso habitual es publicar el proyecto en GitHub y conectar el repositorio al flujo de despliegue.
