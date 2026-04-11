# Stain the Canvas

## 📌 Descripción
Catálogo digital para productos artesanales personalizados.  
El proyecto permite mostrar productos, consultar detalles, contactar por WhatsApp y administrar el inventario con integración a Supabase.

## 🚀 Tecnologías utilizadas
- HTML
- CSS
- JavaScript
- Bootstrap
- Supabase

## 🎯 Funcionalidades
- Catálogo de productos
- Vista de detalle por producto
- Botón de WhatsApp con mensaje prellenado
- Panel admin protegido con Supabase Auth
- Gestión de productos (crear, editar y eliminar)
- Subida de imágenes a Supabase Storage

## 🗄️ Base de datos
Tabla `productos`:
- `id`
- `nombre`
- `descripcion`
- `precio`
- `imagen_url`
- `categoria`

Nota: en este proyecto también se usan campos de soporte como `created_at` y `updated_at`.

## 🎨 Diseño
Colores principales:
- `#C86B4A`
- `#F5E8DA`
- `#2B2B2B`

Tipografía:
- Cormorant Garamond
- Noto Sans

## ⚙️ Instalación
1. Clonar repositorio:
   ```bash
   git clone https://github.com/CarlosFigueroaPicado/stain-the-canvas.git
   ```
2. Entrar al proyecto:
   ```bash
   cd stain-the-canvas
   ```
3. Abrir `index.html` en el navegador.

## 🔗 Integración Supabase
Este proyecto utiliza Supabase para base de datos, autenticación del panel admin y almacenamiento de imágenes.

Configura en `js/supabase.js`:
- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_ANON_KEY`: clave pública `anon/publishable`
- `SUPABASE_BUCKET`: bucket de imágenes (`productos`)

### Seguridad de claves
- `SUPABASE_ANON_KEY` es pública por diseño en apps frontend.
- Nunca uses `service_role` ni `sb_secret` en cliente web.
- La seguridad real se aplica con RLS/policies en base de datos y Storage.

### Usuario administrador
1. Crea un usuario en **Supabase Auth > Users**.
2. Usa ese correo y contraseña en `login.html`.
3. Aplica `supabase/setup.sql` para que solo usuarios autenticados puedan escribir.

### Bucket PRODUCTOS
Debes crear un bucket público llamado `productos` (PRODUCTOS) en Supabase Storage para servir imágenes del catálogo.

## 📸 Funcionalidad de imágenes
- Upload de imágenes a Supabase Storage desde el panel admin.
- Obtención de URL pública para persistirla en `imagen_url`.
- Renderizado automático de la imagen en catálogo y detalle en modal.

## 📁 Estructura del proyecto
```text
.
├── admin.html
├── catalogo.html
├── index.html
├── login.html
├── css/
├── js/
├── assets/
└── supabase/
```

## 👨‍💻 Autor
Nombre del equipo
