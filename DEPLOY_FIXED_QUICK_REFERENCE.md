## 🚀 DEPLOYMENT CORREGIDO: 4 PASOS (15 min)

**Status**: ✅ LISTO PARA EJECUTAR  
**Prerequisito**: Supabase SQL Editor abierto  

---

## Step 0: Asegurar que video_url Existe (FIX PARA MISSING COLUMN)

**File**: [`supabase/20260503_ensure_video_url_column.sql`](supabase/20260503_ensure_video_url_column.sql)

```sql
-- Copiar todo el contenido de este archivo
-- Pegar en Supabase SQL Editor
-- Ejecutar
```

✅ **Resultado esperado**: 
- Columna video_url creada o verificada
- Índice creado
- 1 fila en información_schema (verificación)
- Sin errores

**¿Por qué?** Tu BD no tenía video_url. Este script lo crea de forma segura.

---

## Step 1: Crear Tabla product_media

**File**: [`supabase/20260503_create_product_media_table.sql`](supabase/20260503_create_product_media_table.sql)

```sql
-- Copiar todo el contenido
-- Pegar en Supabase SQL Editor
-- Ejecutar
```

✅ **Resultado esperado**:
- Tabla `product_media` creada
- 4 índices creados
- RLS policies activas
- Sin errores

**Tiempo**: < 1 segundo

---

## Step 2: Migrar Datos (imagen_url + gallery_urls + video_url)

**File**: [`supabase/20260503_migrate_product_data_to_media.sql`](supabase/20260503_migrate_product_data_to_media.sql)

```sql
-- Copiar todo el contenido
-- Pegar en Supabase SQL Editor
-- Ejecutar
```

✅ **Resultado esperado**:
- INSERT ejecutados sin errores
- product_media table tiene datos ahora
- No hay errores de integridad

**Tiempo**: < 5 segundos

**Verificación**: Ejecuta al final del script (descomentar):
```sql
SELECT COUNT(*) FROM product_media;  -- Debería ser > 0
```

---

## Step 3: Git Push

```bash
git add -A
git commit -m "feat(product-media): implement normalized multimedia architecture"
git push origin main
```

✅ **Resultado esperado**:
- Cambios pushed a GitHub
- CI/CD pipeline inicia (si configurado)

**Tiempo**: < 1 minuto

---

## 🔍 VERIFICACIÓN POST-DEPLOY

### 1. En Supabase, ejecutar:

```sql
-- Verificar table existe
SELECT COUNT(*) as media_items FROM product_media;

-- Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'product_media'
ORDER BY indexname;

-- Verificar RLS
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'product_media';

-- Verificar datos migrados
SELECT 
  type,
  COUNT(*) as count
FROM product_media
GROUP BY type;
```

### 2. En Frontend (ejecutar en console):

```javascript
// Verificar que código carga los datos
const products = await fetch('/api/config'); // Obtener config
// Los productos deben tener .product_media array

// Verificar función helper
import { getProductVideoUrl } from './js/shared/product-utils.js';
const product = { 
  product_media: [{ type: 'video', url: 'test.mp4', is_primary: true }]
};
const videoUrl = getProductVideoUrl(product); // No debe fallar
console.log(videoUrl); // Debe retornar URL válida
```

### 3. En Admin Panel:

```
1. Ir a /admin.html
2. Editar un producto
3. Verificar que galería + video cargan correctamente
4. Guardar cambios
5. Recargar
6. Verificar que datos persisten
```

---

## ⚠️ SI ALGO FALLA

### Error: "Column video_url does not exist"
✅ **Solución**: Ejecutar Step 0 primero (ensure_video_url_column.sql)

### Error: "Relation product_media does not exist"
✅ **Solución**: Ejecutar Step 1 (create_product_media_table.sql)

### Error: "Duplicate key value"
✅ **Solución**: Normal. Script usa ON CONFLICT. Re-ejecutar es seguro.

### Error: "Permission denied"
✅ **Solución**: Necesitas ser admin en Supabase. Verifica JWT token.

### Datos no aparecen en frontend
✅ **Solución**:
1. Verificar que product_media tiene datos (SQL query arriba)
2. Limpiar cache del navegador (Ctrl+Shift+Del)
3. Recargar admin.html
4. Revisar console para errores JS

---

## 📊 CHECKLIST FINAL

- [ ] Step 0 ejecutado (video_url ensured)
- [ ] Step 1 ejecutado (product_media table created)
- [ ] Step 2 ejecutado (data migrated)
- [ ] Step 3 ejecutado (git push)
- [ ] Verificación SQL OK (COUNT > 0)
- [ ] Verificación Frontend OK (no errors)
- [ ] Admin Panel OK (galería + video)
- [ ] Datos persisten tras recargar

---

## 🎯 PRÓXIMOS PASOS

Después de deploy exitoso:

1. **Implement Quick Win #1** (1h): Memory leak cleanup
2. **Implement Quick Win #2** (3h): ETag caching
3. **Implement Quick Win #3** (3h): Dashboard enable
4. **Implement Quick Win #4** (2h): Lazy load images

Total: 9 horas = Plataforma estable + rápida + observable

Ver: [`QUICK_WINS_9HOURS.md`](QUICK_WINS_9HOURS.md)

---

**Status**: 🟢 LISTO  
**Estimated Duration**: 15 minutos  
**Risk Level**: 🟢 BAJO (operaciones idempotent, no destructivas)
