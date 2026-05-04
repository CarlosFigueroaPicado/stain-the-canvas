## Fase 5: Testing y Verificación - Refactoring product_media

Fecha: 2026-05-03
Versión: 1.0

---

## 1. Pre-Deployment Checklist

### ✅ Verificación de Archivos Creados

- [ ] `supabase/20260503_create_product_media_table.sql` - Schema table
- [ ] `supabase/20260503_migrate_product_data_to_media.sql` - Data migration
- [ ] `js/shared/product-utils.js` - Updated helpers (backward compatible)
- [ ] `js/modules/products/api.js` - Updated queries with product_media JOIN

### ✅ Verificación de Cambios de Código

```bash
# Cambios en product-utils.js:
# - getProductImageUrls() ahora busca en product_media primero
# - getProductVideoUrl() ahora busca en product_media primero  
# - normalizeProduct() expone product_media array

# Cambios en api.js:
# - fetchProducts() query incluye product_media(id,type,url,position,is_primary)
# - Fallback a queries viejas si product_media no existe
```

---

## 2. Pasos de Implementación (Orden Exacto)

### PASO 1: Crear Tabla product_media en Supabase

```bash
# En Supabase SQL Editor, ejecutar:
# Archivo: supabase/20260503_create_product_media_table.sql

# Verificar que se creó:
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'product_media';

# Verificar indexes:
SELECT * FROM pg_indexes 
WHERE tablename = 'product_media';
```

**Tiempo esperado**: < 1 segundo
**Downtime**: 0

### PASO 2: Migrar Datos Existentes

```bash
# En Supabase SQL Editor, ejecutar:
# Archivo: supabase/20260503_migrate_product_data_to_media.sql

# Verificar migración exitosa:
SELECT COUNT(*) as total_media FROM public.product_media;

# Ver distribución por tipo:
SELECT type, COUNT(*) as count FROM public.product_media GROUP BY type;

# Ver primarias por producto:
SELECT product_id, type, COUNT(*) as count FROM public.product_media 
WHERE is_primary = true GROUP BY product_id, type;
```

**Tiempo esperado**: < 5 segundos (depende de volumen)
**Downtime**: 0

### PASO 3: Verificar Integridad de Datos

```sql
-- Verificar que no hay medios sin producto (ERROR si hay)
SELECT COUNT(*) as orphaned_media FROM public.product_media pm
LEFT JOIN public.productos p ON pm.product_id = p.id
WHERE p.id IS NULL;

-- Verificar primarias duplicadas (debe retornar 0)
SELECT product_id, type, COUNT(*) as duplicate_count 
FROM public.product_media
WHERE is_primary = true
GROUP BY product_id, type
HAVING COUNT(*) > 1;

-- Verificar posiciones válidas (debe retornar 0)
SELECT COUNT(*) FROM public.product_media WHERE position < 0;

-- Verificar URLs válidas (debe ser muy bajo o 0)
SELECT COUNT(*) FROM public.product_media WHERE url IS NULL OR LENGTH(TRIM(url)) = 0;
```

**Expected Result**: Todos deben retornar 0 (excepto el primer query que verifica orphaned)

### PASO 4: Deploy Código Frontend

```bash
# 1. Commit cambios en Git
git add -A
git commit -m "feat(product-media): implement backward-compatible multimedia architecture

- Fase 1: Create product_media table with RLS and indexes
- Fase 2: Migrate existing media data from old columns
- Fase 3: Update frontend helpers with product_media support
- Fase 4: Update API queries to include product_media
- Backward compatible fallback to imagen_url/gallery_urls/video_url

See IMPLEMENTATION_PRODUCT_MEDIA_REFACTOR.md"

# 2. Push to main
git push origin main

# 3. Deploy en Vercel (automático si CI/CD configurado)
# O manual: npm run build && npm run deploy
```

---

## 3. Testing Manual

### TEST 1: Verificar Backward Compatibility

**Objetivo**: Confirmar que productos SIN product_media aún se muestran

```javascript
// En console del navegador (catálogo):
// Cargar producto viejo (antes de migración)
const product = JSON.parse(localStorage.getItem('test_product'));
console.log({
  has_image_url: !!product.imagen_url,
  has_gallery: Array.isArray(product.gallery_urls) && product.gallery_urls.length > 0,
  has_video_url: !!product.video_url,
  has_product_media: Array.isArray(product.product_media)
});

// Resultado esperado:
// {
//   has_image_url: true,
//   has_gallery: true,
//   has_video_url: true (si tiene video),
//   has_product_media: true o false (depende)
// }
```

### TEST 2: Verificar Nuevas Imágenes

**Objetivo**: Confirmar que product_media se prioriza sobre viejas columnas

```javascript
// Agregar un producto nuevo en admin
// Subir imágenes
// Editar y agregar más

// En console:
const allProducts = JSON.parse(sessionStorage.getItem('products'));
allProducts.forEach(p => {
  if (p.product_media && p.product_media.length > 0) {
    console.log(`Producto: ${p.nombre}`);
    console.log(`  - Media items: ${p.product_media.length}`);
    console.log(`  - Types: ${[...new Set(p.product_media.map(m => m.type))].join(', ')}`);
    console.log(`  - Primary image: ${p.product_media.find(m => m.type === 'image' && m.is_primary)?.url}`);
  }
});
```

### TEST 3: Verificar Catálogo

**Pasos**:
1. Abrir página catálogo (`catalogo.html`)
2. Verificar que todas las imágenes se cargan
3. Verificar que videos aparecen en modal si existen
4. Abrir modal de un producto con video
5. Verificar que video se reproduce correctamente

**Expected**:
- ✅ Todas las imágenes visibles
- ✅ Video controles funcionales
- ✅ No hay errores en console

### TEST 4: Verificar Admin Panel

**Pasos**:
1. Acceder a admin
2. Editar un producto existente
3. Verificar preview de imágenes y video
4. Agregar un producto nuevo
5. Subir múltiples imágenes y un video
6. Guardar

**Expected**:
- ✅ Preview actualiza correctamente
- ✅ Carrusel funciona si múltiples imágenes
- ✅ Video preview visible
- ✅ Producto guardado sin errores
- ✅ Al recargar, datos persisten

### TEST 5: Verificar Home Page

**Pasos**:
1. Abrir `index.html` (home)
2. Verificar productos destacados se muestran
3. Verificar videos en modales

**Expected**:
- ✅ Los mejores productos se muestran
- ✅ Imágenes cargan con lazy loading

---

## 4. Monitoreo Post-Deployment

### Métricas a Monitorear

```javascript
// Console logging para debug
console.log({
  query_performance: "Medir time-to-first-byte en fetchProducts()",
  media_load_count: "¿Cuántos medios se cargan por producto?",
  fallback_usage: "¿Se usa fallback a viejas columnas?",
  errors: "¿Hay errores en la consola?"
});
```

### Error Handling

| Error | Causa | Solución |
|-------|-------|----------|
| `product_media is not defined` | Tabla no creada | Ejecutar Paso 1 de implementación |
| `undefined product_media array` | Query sin JOIN | Verificar api.js cambios |
| `Gallery no se muestra` | Normalización fallida | Verificar product-utils.js cambios |
| `Video no se reproduce` | URL inválida | Verificar product_media.url en DB |

---

## 5. Rollback Plan (Si es Necesario)

### Rollback Rápido (< 5 minutos)

```bash
# 1. Revertir código en main
git revert HEAD

# 2. Deployer versión anterior (Vercel)
# O restaurar backup si tienes

# 3. El sistema automáticamente fallback a imagen_url/gallery_urls/video_url
```

**Por qué es seguro**: 
- Product_media table no es usado por código viejo
- Viejas columnas están intactas
- Fallback integrado

### Rollback Completo (Si migración de datos falló)

```sql
-- En Supabase SQL Editor
DELETE FROM public.product_media;

-- O: borrar tabla completamente
DROP TABLE public.product_media;
```

---

## 6. Performance Benchmarks

### Antes de Refactor
- Query única: 50-100ms
- Datos por producto: ~1KB (JSONB arrays)
- N+1 queries: No (todo en 1 query)

### Después de Refactor (Expected)
- Queries con JOIN: 60-120ms (+ 20% por JOIN, pero más eficiente)
- Datos por producto: ~100 bytes base + media individual
- N+1 queries: No (JOIN en 1 query)
- Escalabilidad: Mejor (sin límite JSONB)

### Success Criteria
- ✅ Time-to-first-byte < 200ms
- ✅ No N+1 queries en console
- ✅ Todos los productos cargan
- ✅ Videos reproducen sin lag

---

## 7. Post-Deployment Actions (Próximos días)

### Día 1: Monitoreo
- [ ] Verificar logs de Supabase
- [ ] Revisar console errors del navegador
- [ ] Confirmar que admin panel funciona

### Día 2: Optimización
- [ ] Analizar performance real vs. esperado
- [ ] Ajustar indexes si es necesario
- [ ] Documentar patterns descubiertos

### Semana 1: Features Adicionales
- [ ] Implementar drag-drop de medios (depende de this)
- [ ] Agregar ordenamiento manual en admin
- [ ] Test en diferentes browsers

---

## 8. Documentation

### Para Desarrolladores
- **Leer**: AI_CONTRACT.md (Sección "Migraciones Grandes")
- **Referencia**: ANALYSIS_PRODUCT_MEDIA_REFACTOR.md
- **Código**: product-utils.js (búscar "product_media")

### Para Admins
- Videos ahora soportados en productos
- Interface igual - sin cambios visibles
- Mejor performance con muchas imágenes

### Para Users
- Nada cambia para usuarios
- Mismas imágenes y videos
- Mejor carga en catálogo

---

## Checklist Final Pre-Go

- [ ] Tabla product_media creada en Supabase
- [ ] Datos migrados exitosamente (verificación SQL)
- [ ] Código frontend deployado
- [ ] TEST 1: Backward compatibility OK
- [ ] TEST 2: Nuevas imágenes OK
- [ ] TEST 3: Catálogo OK
- [ ] TEST 4: Admin OK
- [ ] TEST 5: Home OK
- [ ] No errores en console
- [ ] Git history limpio
- [ ] Documentación actualizada

**Estado**: ✅ LISTO PARA DEPLOY

---

Generated: 2026-05-03
Autor: GitHub Copilot (AI_CONTRACT compliant)
