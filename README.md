# Stain the Canvas

Catálogo web artesanal con panel admin, productos dinámicos y dashboard de analítica sobre Supabase.

## Stack

- HTML + CSS + JavaScript modular nativo
- Bootstrap 5
- Supabase Auth, Database y Storage
- Vitest para pruebas unitarias ligeras
- Vercel para deploy estático + `api/config`

## Arquitectura

La app usa una sola fuente de verdad en `js/`:

```text
js/
  core/
    config.js
    result.js
    store.js
    supabase-client.js
  shared/
    chart-colors.js
    dashboard-helpers.js
    product-utils.js
  modules/
    auth/
      api.js
      service.js
      ui/
    analytics/
      api.js
      service.js
    dashboard/
      api.js
      service.js
      ui/
    products/
      api.js
      service.js
      ui/
```

Separación aplicada:

- `api`: acceso a Supabase
- `service`: validación y lógica de negocio
- `ui`: renderizado y eventos del DOM
- `core`: configuración, cliente y store global
- `shared`: helpers puros reutilizables

## Seguridad

- La autenticación admin usa `supabase.auth.getSession()` y validación de rol real.
- El frontend no usa `localStorage` para conceder acceso admin.
- La seguridad real depende de RLS y policies en `supabase/setup.sql`.
- El cliente rechaza claves tipo `service_role` o `sb_secret`.
- Las inserciones de productos validan nombre, precio, descripción, imagen y `featured`.

## Variables de entorno

Crea tus variables a partir de `.env.example`:

```env
STC_SUPABASE_URL=https://your-project-ref.supabase.co
STC_SUPABASE_PUBLISHABLE_KEY=your-public-anon-or-publishable-key
STC_SUPABASE_BUCKET=productos
STC_PRODUCTS_TABLE=productos
STC_WHATSAPP_NUMBER=50589187562
```

`api/config.js` expone solo configuración pública. También acepta `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como fallback para compatibilidad local.

## Supabase

Aplica `supabase/setup.sql` en el SQL Editor. Ese script crea:

- `productos` con soporte para `gallery_urls` y `featured`
- `visitas` y `eventos` para analítica
- `admin_users` para control de acceso
- RLS, policies y triggers de rate limit básicos
- RPC `get_dashboard_metrics`

Para crear un admin:

1. Crea el usuario en Supabase Auth.
2. Marca `app_metadata.role = "admin"` o registra su `user_id` en `admin_users`.
3. Inicia sesión desde `login.html`.

## Desarrollo

Para correr pruebas:

```bash
pnpm test:ci
```

Para desarrollo local con variables de Vercel, usa `vercel dev` o cualquier servidor estático que también sirva `api/config`.

## Deploy en Vercel

- `vercel.json` agrega headers de seguridad y CSP.
- `api/config.js` entrega la configuración pública de Supabase.
- Las páginas consumen `/api/config`, así que no dependen de valores hardcodeados.

## Notas

- Los productos destacados del home salen de base de datos usando el campo `featured`.
- Si no hay productos destacados, el home usa los productos más recientes cargados.
- El store global centraliza `user` y `products` para evitar llamadas duplicadas.
