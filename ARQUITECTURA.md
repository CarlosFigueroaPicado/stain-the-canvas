# Diseño de Arquitectura - Stain The Canvas

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura Cliente-Servidor](#arquitectura-cliente-servidor)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Componentes Principales](#componentes-principales)
5. [Flujo de Datos](#flujo-de-datos)
6. [Base de Datos](#base-de-datos)
7. [Hosting y Dominio](#hosting-y-dominio)
8. [Seguridad](#seguridad)

---

## 🎯 Visión General

**Stain The Canvas** es un catálogo web artesanal con panel administrativo, gestión dinámica de productos y dashboard de analítica. La aplicación implementa una arquitectura **cliente-servidor moderna** con una única fuente de verdad para los datos, separación clara de responsabilidades y seguridad a nivel de base de datos.

**Características principales:**
- ✅ Catálogo público de productos
- ✅ Panel administrativo con autenticación
- ✅ Dashboard de analítica en tiempo real
- ✅ Gestión de usuarios administrativos
- ✅ Almacenamiento de imágenes
- ✅ Rate limiting y auditoría de eventos

---

## 🏗️ Arquitectura Cliente-Servidor

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE (Frontend)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HTML + CSS + JavaScript                             │  │
│  │  (index.html, catalogo.html, admin.html, login.html) │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  JavaScript Modular (js/)                            │  │
│  │  ├─ core/: Config, Store, Cliente Supabase           │  │
│  │  ├─ modules/: Auth, Products, Dashboard, Analytics   │  │
│  │  └─ shared/: Helpers reutilizables                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↕
                    HTTPS (REST API)
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     SERVIDOR (Backend)                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase (Backend-as-a-Service)                     │  │
│  │  ├─ Auth: Autenticación JWT                          │  │
│  │  ├─ API Gateway: Acceso a PostgreSQL                 │  │
│  │  └─ Storage: Almacenamiento de imágenes              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Config (Vercel Serverless)                      │  │
│  │  └─ Expone configuración pública                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Base de Datos)                          │  │
│  │  ├─ Tablas: productos, visitas, eventos              │  │
│  │  ├─ RLS: Row Level Security                          │  │
│  │  └─ Policies: Control de acceso                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Características de la Arquitectura

| Aspecto | Descripción |
|--------|------------|
| **Modelo** | Cliente-Servidor REST |
| **Autenticación** | JWT (Supabase Auth) |
| **Protocolo** | HTTPS |
| **Stateless** | Servidor sin sesiones persistentes |
| **Escalabilidad** | Backend manejado por Supabase |
| **Seguridad** | RLS en BD + CSP en headers |

---

## 🛠️ Stack Tecnológico

### Frontend

```
┌─────────────────────────────────┐
│     HTML5 + CSS3 + ES6 JS       │
└─────────────────────────────────┘
         ↓         ↓         ↓
      HTML      Bootstrap 5    CSS
   Semantico    Framework      Modular
   
┌─────────────────────────────────┐
│   JavaScript Modular Nativo     │
│  (Sin bundler, módulos ES6)     │
└─────────────────────────────────┘
     ├─ No requiere build
     ├─ Carga directa del navegador
     └─ Fácil debugging
     
┌─────────────────────────────────┐
│   Cliente Supabase JavaScript    │
│   (@supabase/supabase-js)        │
└─────────────────────────────────┘
     ├─ Auth
     ├─ Database (PostgREST)
     └─ Storage
```

**Especificaciones:**
- **Lenguaje:** JavaScript ES6 (módulos nativos)
- **Framework CSS:** Bootstrap 5
- **Gestión de Estado:** Store.js (singleton simple)
- **Testing:** Vitest
- **Sin build tools:** App ejecutada directamente en navegador

### Backend

```
┌──────────────────────────────────────┐
│    Supabase (Backend-as-a-Service)   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│     Supabase Authentication          │
│  ├─ OAuth 2.0                        │
│  ├─ JWT Tokens                       │
│  ├─ Session Management               │
│  └─ Role-based Access Control        │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│    Supabase Realtime Database        │
│  ├─ PostgREST API                    │
│  ├─ Real-time Subscriptions          │
│  └─ Automatic CRUD Operations        │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│      Supabase Storage                │
│  ├─ Almacenamiento de imágenes       │
│  ├─ CDN integrado                    │
│  └─ Control de acceso RLS            │
└──────────────────────────────────────┘
```

**Características:**
- Base de datos PostgreSQL gestionada
- APIs automáticas REST/GraphQL
- Autenticación integrada
- Real-time subscriptions
- Almacenamiento de objetos
- Backups automáticos

### Base de Datos

```
PostgreSQL (en Supabase)
    ├─ Tablas:
    │  ├─ productos (catálogo, featured)
    │  ├─ visitas (analítica de página)
    │  ├─ eventos (tracking de acciones)
    │  └─ admin_users (control de acceso)
    │
    ├─ RLS (Row Level Security):
    │  ├─ Productos: públicos lectura, admin escritura
    │  ├─ Eventos: inserción pública, lectura admin
    │  └─ Admin_users: acceso según rol
    │
    ├─ Policies: Reglas de acceso por usuario
    │
    ├─ Triggers: Auditoría y rate limiting
    │
    └─ RPC: Funciones almacenadas
       └─ get_dashboard_metrics()
```

**Tablas principales:**

#### Productos
```sql
CREATE TABLE productos (
  id BIGINT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  image_url TEXT,
  gallery_urls TEXT[],
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Visitas
```sql
CREATE TABLE visitas (
  id BIGINT PRIMARY KEY,
  page TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ
);
```

#### Eventos
```sql
CREATE TABLE eventos (
  id BIGINT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ
);
```

#### Admin Users
```sql
CREATE TABLE admin_users (
  id BIGINT PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ
);
```

### Hosting

```
┌──────────────────────────────────────┐
│            Vercel                    │
│  (Plataforma de Hosting)             │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   Frontend (Static Site)             │
│  ├─ HTML, CSS, JavaScript            │
│  ├─ Assets (imágenes, fuentes)       │
│  ├─ CDN Global                       │
│  └─ Serverless (Next.js optional)    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   API Edge Functions                 │
│  ├─ api/config.js                    │
│  ├─ Ejecución en edge                │
│  └─ Baja latencia global             │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   Integración con Supabase           │
│  ├─ Variables de entorno             │
│  ├─ CORS configurado                 │
│  └─ SSL/TLS automático               │
└──────────────────────────────────────┘
```

---

## 🎪 Componentes Principales

### 1. Core (Núcleo de la Aplicación)

**`js/core/`** - Servicios fundamentales

| Archivo | Función |
|---------|---------|
| **config.js** | Carga configuración pública desde Vercel |
| **supabase-client.js** | Inicializa cliente Supabase con validaciones |
| **store.js** | Estado global centralizado (singleton) |
| **result.js** | Wrapper para resultados con éxito/error |

```javascript
// Uso típico
import { getSupabaseClient } from "./core/supabase-client.js";
import Store from "./core/store.js";

const client = await getSupabaseClient();
const user = Store.getUser();
```

### 2. Módulos de Funcionalidad

**`js/modules/`** - Separación por dominio

#### Auth (Autenticación)
- **api.js** - Llamadas a Supabase Auth
- **service.js** - Lógica de autenticación y validación
- **ui/** - Componentes de login/admin

```javascript
// Flujo: UI → Service → API → Supabase
handleLoginClick() 
  → authService.login(email, password)
  → authApi.loginWithPassword()
  → supabase.auth.signInWithPassword()
```

#### Products (Productos)
- **api.js** - CRUD de productos en Supabase
- **service.js** - Validación y transformación de datos
- **ui/** - Componentes de catálogo, admin, home

```
Lectura Pública:
  Catálogo (GET productos) 
  → API → Supabase (RLS permite lectura)

Escritura Admin:
  Admin Panel (POST/PUT/DELETE)
  → API → Supabase (RLS verifica admin)
```

#### Dashboard (Analítica)
- **api.js** - Consultas para métricas
- **service.js** - Procesamiento de datos
- **ui/** - Gráficos y tablas

#### Analytics (Rastreo de eventos)
- **api.js** - Inserción de eventos en BD
- **service.js** - Registro de visitas y acciones

### 3. Shared (Utilidades reutilizables)

**`js/shared/`** - Funciones puras sin estado

- **chart-colors.js** - Paleta de colores para gráficos
- **dashboard-helpers.js** - Formateo y cálculos
- **product-utils.js** - Validación y transformación de productos

---

## 🔄 Flujo de Datos

### Flujo de Lectura de Productos

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario visita catalogo.html                         │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. JavaScript se ejecuta (catalogo.js)                  │
│    - Carga módulo de productos                          │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. productService.getPublicProducts()                   │
│    - Valida parámetros (paginación, filtros)            │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. productApi.getPublicProducts()                       │
│    - Llama a Supabase PostgREST                         │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Supabase - RLS Policy verifica:                      │
│    - SELECT * FROM productos WHERE is_published = true  │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Datos JSON retornan al cliente                       │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 7. UI renderiza productos (HTML dinámico)               │
│    - renderProductCard() por cada producto              │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Creación de Producto (Admin)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin llena formulario en admin.html                 │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. productUi.handleCreateProduct() detecta click        │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. productService.createProduct()                       │
│    - Valida nombre, precio, descripción, imagen         │
│    - Retorna Result { success, error?, data? }          │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Si validación OK: productApi.createProduct()         │
│    - Sube imagen a Storage si existe                    │
│    - Inserta fila en tabla productos                    │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Supabase - RLS Policy verifica:                      │
│    - ¿El user_id está en admin_users?                   │
│    - ¿Tiene token JWT válido?                           │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Si authorized: INSERT ejecutado                      │
│    Si denied: Error 403 retornado                       │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 7. UI actualiza (recarga tabla de productos)            │
│    - Toast muestra éxito o error                        │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario visita login.html                            │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Introduce email + password, click LOGIN              │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. authService.loginWithPassword(email, password)       │
│    - Valida formato email                               │
│    - Valida longitud password                           │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. authApi.loginWithPassword()                          │
│    - Llama supabase.auth.signInWithPassword()           │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Supabase valida credenciales en BD                   │
│    - Hash verificado                                    │
│    - User activo                                        │
└─────────────────────────────────────────────────────────┘
                      ↓
        ╔═══════════════════════════════════╗
        ║ ¿User está en admin_users?        ║
        ╚═══════════════════════════════════╝
                ↙                 ↘
           SÍ (Admin)          NO (Público)
                ↓                   ↓
        ┌─────────────────┐  ┌──────────────┐
        │ Retorna JWT     │  │ Retorna      │
        │ + metadata      │  │ JWT (básico) │
        │ { role: admin } │  │              │
        └─────────────────┘  └──────────────┘
                ↓                   ↓
        ┌─────────────────────────────────────┐
        │ 6. Store.setUser(user, session)     │
        │    - Guarda en memoria              │
        └─────────────────────────────────────┘
                      ↓
        ┌─────────────────────────────────────┐
        │ 7. Redirect a /admin o /catalogo    │
        └─────────────────────────────────────┘
```

---

## 📊 Base de Datos

### Esquema de RLS y Políticas

```sql
-- TABLA: productos
-- RLS: Habilitado

-- Policy: Lectura pública
CREATE POLICY "Productos públicos legibles" ON productos
  FOR SELECT USING (true);

-- Policy: Admin puede insertar/actualizar/eliminar
CREATE POLICY "Admin puede gestionar productos" ON productos
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users
    )
  );

-- TABLA: eventos
-- RLS: Habilitado

-- Policy: Usuarios pueden insertar eventos propios
CREATE POLICY "Usuarios insertan eventos" ON eventos
  FOR INSERT WITH CHECK (true);

-- Policy: Admin puede leer todos los eventos
CREATE POLICY "Admin lee eventos" ON eventos
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- TABLA: admin_users
-- RLS: Habilitado (acceso restringido)

-- Policy: Solo admins ven lista
CREATE POLICY "Admin users visible a admins" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
```

### Funciones Almacenadas (RPC)

```sql
-- get_dashboard_metrics()
-- Retorna: { total_users, total_visits, total_events, ... }
-- Uso en dashboard

CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE (
  total_visits BIGINT,
  total_events BIGINT,
  unique_visitors BIGINT,
  featured_products BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_visits,
    (SELECT COUNT(*) FROM eventos)::BIGINT,
    (SELECT COUNT(DISTINCT user_id) FROM eventos)::BIGINT,
    (SELECT COUNT(*) FROM productos WHERE featured = true)::BIGINT;
END;
$$ LANGUAGE plpgsql;
```

### Triggers de Auditoría

```sql
-- Trigger: Log automático de actualizaciones
CREATE TRIGGER audit_productos_update
AFTER UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION log_product_change();

-- Trigger: Rate limiting de inserciones
CREATE TRIGGER rate_limit_eventos
BEFORE INSERT ON eventos
FOR EACH ROW
EXECUTE FUNCTION enforce_rate_limit();
```

---

## 🌐 Hosting y Dominio

### Vercel (Frontend + Edge API)

```
Proyecto: stain-the-canvas
Repositorio: github.com/CarlosFigueroaPicado/stain-the-canvas

Configuración (vercel.json):
├─ Seguridad Headers:
│  ├─ X-Content-Type-Options: nosniff
│  ├─ X-Frame-Options: DENY
│  ├─ CSP: Strict
│  └─ Permissions-Policy: Restrictiva
│
├─ Rutas de API:
│  └─ /api/* → Edge Functions
│
└─ Dominio:
   └─ stain-the-canvas.vercel.app (default)
```

### Configuración de Variables de Entorno

```bash
# .env.local (desarrollo local)
STC_SUPABASE_URL=https://[project-ref].supabase.co
STC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
STC_SUPABASE_BUCKET=productos
STC_PRODUCTS_TABLE=productos
STC_WHATSAPP_NUMBER=50589187562

# En Vercel Dashboard también se definen
# Fallback: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

### Pipeline de Deployment

```
┌─────────────────────┐
│  Push a rama main   │
│   (GitHub)          │
└────────────┬────────┘
             ↓
┌─────────────────────┐
│  Webhook Vercel     │
└────────────┬────────┘
             ↓
┌─────────────────────┐
│  Build Job          │
│  (npm install, etc) │
└────────────┬────────┘
             ↓
┌─────────────────────┐
│  Deploy a CDN       │
│  (global)           │
└────────────┬────────┘
             ↓
┌─────────────────────┐
│  Live en            │
│  *.vercel.app       │
└─────────────────────┘
```

### CDN y Almacenamiento

| Recurso | Ubicación | CDN |
|---------|-----------|-----|
| HTML, CSS, JS | Vercel | Automático |
| Imágenes de productos | Supabase Storage | CDN integrado |
| Assets estáticos | /assets/ | Vercel CDN |
| Fuentes | CDN jsdelivr/Google | Externo |

---

## 🔒 Seguridad

### Niveles de Seguridad

```
┌─────────────────────────────────────────────────────────┐
│ Nivel 1: HTTPS / TLS                                    │
│ ├─ Todo tráfico encriptado                              │
│ └─ Certificados automáticos en Vercel                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Nivel 2: Headers de Seguridad (CSP, CORS)              │
│ ├─ Content-Security-Policy                              │
│ ├─ X-Frame-Options: DENY                                │
│ ├─ X-Content-Type-Options: nosniff                      │
│ └─ Permissions-Policy: sin acceso a cámara, GPS, etc   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Nivel 3: Autenticación JWT                              │
│ ├─ Firmado por Supabase                                 │
│ ├─ Validado en cada solicitud                           │
│ └─ Expiración automática                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Nivel 4: Row Level Security (RLS)                       │
│ ├─ Policies por tabla                                   │
│ ├─ Validación a nivel BD                                │
│ ├─ Admin vs Usuario público                             │
│ └─ Imposible eludir desde app                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Nivel 5: Validación en Frontend                         │
│ ├─ Validación de email                                  │
│ ├─ Longitud de contraseña                               │
│ ├─ Formato de datos                                     │
│ └─ Tipo de archivos de imagen                           │
└─────────────────────────────────────────────────────────┘
```

### Protecciones Implementadas

| Protección | Descripción | Ubicación |
|-----------|-------------|----------|
| **HTTPS** | Encriptación de tránsito | Vercel + Supabase |
| **CORS** | Solo orígenes permitidos | Supabase + Headers |
| **CSP** | Scripts solo autorizados | vercel.json headers |
| **JWT** | Autenticación stateless | Supabase Auth |
| **RLS** | Control en BD | PostgreSQL policies |
| **Validación Input** | Previene inyecciones | authService, productService |
| **Rate Limiting** | Protege de abuse | Triggers en BD |
| **CSRF** | No aplica (SPA stateless) | Por diseño |

### Secretos y Variables

```javascript
// ❌ NUNCA en código
const ADMIN_KEY = "sb_secret_xxxxx";

// ✅ SIEMPRE en variables de entorno
const SUPABASE_KEY = process.env.STC_SUPABASE_PUBLISHABLE_KEY;

// ✅ Validación en supabase-client.js
if (isUnsafeKey(key)) {
  throw new Error("Key type not allowed");
}
```

---

## 🚀 Resumen de Flujo End-to-End

### Caso: Usuario compra producto y admin ve venta

```
1. VISITA CATÁLOGO
   Usuario → index.html
   ↓
   JavaScript carga productos desde Supabase
   ↓
   RLS verifica: SELECT (público) = PERMITIDO
   ↓
   Productos renderizados

2. USUARIO INTERACTÚA
   Click en producto
   ↓
   Evento registrado en tabla "eventos"
   ↓
   RLS: INSERT eventos (público) = PERMITIDO

3. ADMIN VE DASHBOARD
   Admin → login.html
   ↓
   Login: authService → authApi → Supabase Auth
   ↓
   JWT generado (incluye metadata admin)
   ↓
   Dashboard: dashboardService.getMetrics()
   ↓
   RPC get_dashboard_metrics() ejecutado
   ↓
   RLS: Admin en admin_users = PERMITIDO
   ↓
   Gráficos actualizados con ventas en tiempo real
```

---

## 📁 Estructura de Archivos Resumida

```
stain-the-canvas/
│
├─ index.html              # Página de inicio
├─ catalogo.html           # Catálogo público
├─ admin.html              # Panel administrativo
├─ login.html              # Página de login
│
├─ js/
│  ├─ core/
│  │  ├─ config.js         # Configuración pública
│  │  ├─ supabase-client.js # Cliente Supabase
│  │  ├─ store.js          # Estado global
│  │  └─ result.js         # Wrapper de resultados
│  │
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ products/
│  │  ├─ dashboard/
│  │  └─ analytics/
│  │
│  ├─ shared/
│  │  ├─ chart-colors.js
│  │  ├─ dashboard-helpers.js
│  │  └─ product-utils.js
│  │
│  ├─ index.js             # Inicio app
│  ├─ catalogo.js          # Lógica catálogo
│  ├─ admin.js             # Lógica admin
│  └─ login.js             # Lógica login
│
├─ css/
│  └─ styles.css           # Estilos globales
│
├─ assets/
│  └─ images/              # Imágenes estáticas
│
├─ supabase/
│  └─ setup.sql            # Schema + RLS + Triggers
│
├─ api/
│  └─ config.js            # Edge Function de config
│
├─ tests/
│  ├─ dashboard.colors.test.js
│  ├─ products.service.test.js
│  └─ ...
│
├─ vercel.json             # Configuración Vercel
├─ package.json            # Scripts y deps
└─ README.md               # Documentación
```

---

## 📞 Contacto y Variables de Configuración

### WhatsApp Integration
```
STC_WHATSAPP_NUMBER=50589187562
Uso: Botón de contacto en catálogo
URL: https://wa.me/50589187562?text=Mensaje
```

### Para comenzar
1. Clonar repositorio
2. Crear archivo `.env.local` con variables
3. Aplicar `supabase/setup.sql` en Supabase
4. Ejecutar `vercel dev` localmente
5. Deploy: `git push origin main`

---

**Versión:** 1.0
**Última actualización:** Abril 2026
**Estado:** En producción
