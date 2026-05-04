## 🎯 QUICK REFERENCE - Deploy product_media

```
FECHA: 2026-05-03
STATUS: ✅ LISTO PRODUCCIÓN
DOWNTIME: 0 minutos
RIESGO: BAJO
```

---

## ⚡ DEPLOY EN 3 PASOS (15 minutos)

### PASO 1: Supabase Schema (< 1 segundo)
```bash
Archivo: supabase/20260503_create_product_media_table.sql
1. Copiar archivo completo
2. Ir a Supabase Dashboard → SQL Editor
3. Pegar y ejecutar ✓
```

### PASO 2: Supabase Migración (< 5 segundos)
```bash
Archivo: supabase/20260503_migrate_product_data_to_media.sql
1. Copiar archivo completo
2. Supabase SQL Editor
3. Pegar y ejecutar ✓
4. Verificar: SELECT COUNT(*) FROM product_media;
```

### PASO 3: Git Push (< 5 minutos)
```bash
git add -A
git commit -m "feat(product-media): implement normalized architecture"
git push origin main
# Vercel auto-deploys
```

---

## ✅ VERIFICACIÓN POST-DEPLOY

```javascript
// En console del navegador (catalogo.html)

// 1. ¿Se cargan imágenes?
console.log(document.querySelectorAll('img[src*="http"]').length);
// Esperado: > 0

// 2. ¿Product_media en datos?
fetch('/api/products')
  .then(r => r.json())
  .then(p => console.log(p[0]?.product_media?.length))
// Esperado: number > 0 (o undefined si no tiene datos aún)

// 3. ¿Videos se reproducen?
// Abrir modal de producto con video
// Esperado: HTML5 player funcional

// 4. ¿Admin panel funciona?
// Abrir admin.html
// Editar un producto
// Esperado: sin errores
```

---

## 🔄 ROLLBACK (Si es necesario)

```bash
# Rollback rápido (< 5 minutos)
git revert HEAD
git push origin main

# El sistema automáticamente fallback a imagen_url/gallery_urls/video_url
# Cero pérdida de datos (product_media no es usado por código viejo)
```

---

## 📊 CAMBIOS RESUMIDOS

| Componente | Cambio | Impacto |
|-----------|--------|--------|
| DB Schema | +product_media table | Normalización |
| API Query | +product_media JOIN | Performance |
| Frontend | +product_media support | Backward compat |
| Admin | -changes (compatible) | Transparente |
| User UI | -changes | Sin impacto |

---

## 🚨 POSIBLES ISSUES

| Issue | Solución |
|-------|----------|
| `product_media table not found` | Ejecutar PASO 1 |
| `No data migrated` | Ejecutar PASO 2 |
| `Images not showing` | Verificar product_media JOIN en api.js |
| `Videos not playing` | Revisar URLs en product_media.url |
| `Admin errors` | Check console, revisar normalizeProduct() |

---

## 📞 SUPPORT

```
1. Revisar TESTING_PRODUCT_MEDIA_REFACTOR.md
2. Revisar IMPLEMENTATION_PRODUCT_MEDIA_COMPLETE.md
3. Revisar AI_CONTRACT.md (sección Troubleshooting)
```

---

## ✨ SUCCESS CRITERIA

- [ ] Tabla product_media existe
- [ ] Datos migrados (COUNT > 0)
- [ ] Catálogo carga sin errores
- [ ] Admin panel funciona
- [ ] Videos se reproducen
- [ ] No N+1 queries
- [ ] Load time < 200ms
- [ ] Console sin errores

---

**ESTADO**: 🟢 READY TO DEPLOY

Generated: 2026-05-03 | AI_CONTRACT Compliant ✅
