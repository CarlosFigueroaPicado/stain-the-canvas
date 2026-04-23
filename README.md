# Stain the Canvas

Catalogo web artesanal con panel admin, productos dinamicos y dashboard de analitica sobre Supabase.

## Stack

- HTML + CSS + JavaScript modular nativo
- Bootstrap 5
- Supabase Auth, Database y Storage
- Vitest para pruebas unitarias ligeras
- Vercel para deploy estatico + `api/config`

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

Diagrama operativo (alto nivel):

```text
UI (pages + modules/*/ui)
  -> Service (modules/*/service)
    -> API (modules/*/api)
      -> Supabase (Auth, DB, Storage)
  -> Core (config/store/result/supabase-client)
```

Separacion aplicada:

- `api`: acceso a Supabase
- `service`: validacion y logica de negocio
- `ui`: renderizado y eventos del DOM
- `core`: configuracion, cliente y store global
- `shared`: helpers puros reutilizables

## Seguridad

- La autenticacion admin usa `supabase.auth.getSession()` y validacion de rol real.
- El frontend no usa `localStorage` para conceder acceso admin.
- La seguridad real depende de RLS y policies en `supabase/setup.sql`.
- El cliente rechaza claves tipo `service_role` o `sb_secret`.
- El cliente no incluye URL/keys hardcodeadas: solo carga config publica desde `window.__STC_CONFIG__` o `/api/config`.
- Las inserciones de productos validan nombre, precio, descripcion, imagen y `featured`.

## Variables de entorno

Crea tus variables a partir de `.env.example`:

```env
STC_SUPABASE_URL=https://your-project-ref.supabase.co
STC_SUPABASE_PUBLISHABLE_KEY=your-public-anon-or-publishable-key
STC_SUPABASE_BUCKET=productos
STC_PRODUCTS_TABLE=productos
STC_WHATSAPP_NUMBER=50589187562
```

`api/config.js` expone solo configuracion publica desde variables de entorno del entorno de ejecucion.

## Supabase

Aplica `supabase/setup.sql` en el SQL Editor. Ese script crea:

- `productos` con soporte para `gallery_urls` y `featured`
- `visitas` y `eventos` para analitica
- `admin_users` para control de acceso
- RLS, policies y triggers de rate limit basicos
- RPC `get_dashboard_metrics`

Para crear un admin:

1. Crea el usuario en Supabase Auth.
2. Marca `app_metadata.role = "admin"` o registra su `user_id` en `admin_users`.
3. Inicia sesion desde `login.html`.

## Desarrollo

1. Instala dependencias:

```bash
npm ci
```

2. Ejecuta pruebas:

```bash
npm run test:ci
```

3. Corre en modo local con `api/config`:

```bash
npm run dev
```

4. Servidor estatico rapido (sin API serverless):

```bash
npm run serve
```

Para desarrollo con autenticacion real, define variables publicas en tu entorno local de Vercel.

## CI

- Se ejecuta Vitest en cada Pull Request via `.github/workflows/ci.yml`.
- Si los tests fallan, el workflow falla y el merge debe bloquearse con branch protection en GitHub.

## Deploy en Vercel

- `vercel.json` agrega headers de seguridad y CSP.
- `api/config.js` entrega la configuracion publica de Supabase.
- Las paginas consumen `/api/config`, asi que no dependen de valores hardcodeados.

## Notas

- Los productos destacados del home salen de base de datos usando el campo `featured`.
- Si no hay productos destacados, el home usa los productos mas recientes cargados.
- El store global centraliza `user` y `products` para evitar llamadas duplicadas.

## Reglas de contribucion

- Mantener separacion por capas: `ui -> service -> api`.
- No hardcodear credenciales ni secretos en cliente.
- Agregar/actualizar pruebas Vitest en cambios de logica de negocio.
- Priorizar mensajes de error claros y trazables (incluyendo referencia de error cuando aplique).
- Evitar cambios fuera del alcance del issue/PR.
