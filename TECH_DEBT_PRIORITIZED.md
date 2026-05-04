## 📊 DEUDA TÉCNICA PRIORIZADA

**Total**: ~96 horas ($4,800 costo)  
**Timeframe**: 3-6 meses @ 1 dev fulltime  
**Critical Path**: 1→2→3→4  

---

## PRIORIDAD 1: CRÍTICO (Haz AHORA - Sprint 0-1)

### 1.1 Duplicación UI: 30% Código

**Problema**: Mismo patrón en 5 UI files (products, categories, subcategories, etc.)  
**Impacto**: Bugs se replican, mantenimiento 5x  
**Effort**: 16h  
**ROI**: 5x  

```javascript
// ANTES: Copiar-pegar en cada módulo
const refs = { form, status, tableBody, ... }
const state = { initialized, editingId, ... }
function getAlertClass(kind) { ... }
function setStatus(msg, kind) { ... }

// DESPUÉS: Clase base compartida
export class AdminForm { ... }
class ProductsForm extends AdminForm { ... }
```

**Action**: Extract helper en Sprint 2

---

### 1.2 Query Fallbacks: 12 Intentos en Loop

**Problema**: product_media migration aún en transición  
**Impacto**: 50% slower en peor caso, debug imposible  
**Effort**: 4h  
**ROI**: 6x  

```javascript
// ANTES: 12 attempts secuencial
for (let i = 0; i < attempts.length; i++) {
  if (!result.error) return result;
}

// DESPUÉS: Query única clara
SELECT ... FROM productos 
LEFT JOIN product_media pm ON p.id = pm.product_id
```

**Action**: Limpiar en Sprint 1 (post product_media deploy)

---

### 1.3 Sin Logging Remoto

**Problema**: Errores en producción = "probá el navegador"  
**Impacto**: MTTR 2-8 horas, root cause imposible  
**Effort**: 8h  
**ROI**: 10x  

```javascript
// ANTES: Solo console.error()
catch (error) { console.error(error); }

// DESPUÉS: Sentry + contexto
Sentry.captureException(error, {
  tags: { module: 'products', user_id: user.id }
});
```

**Action**: Implementar Sentry en Sprint 1

---

### 1.4 Memory Leaks en Listeners

**Problema**: Store.subscribe() no cleanup  
**Impacto**: +10-20MB/hora memory leak  
**Effort**: 1h  
**ROI**: 4x  

```javascript
// ANTES: No hay unsubscribe
subscribe(listener) { listeners.add(listener); }

// DESPUÉS: Retorna función cleanup
subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
```

**Action**: Fix ESTA SEMANA (Win #1)

---

## PRIORIDAD 2: IMPORTANTE (Sprint 2-3)

### 2.1 Sin TypeScript

**Problema**: Sin type safety, refactoring frágil  
**Impacto**: Runtime errors, onboarding difícil  
**Effort**: 40h  
**ROI**: 3x  

**Phases**:
- Phase 1: Setup tsconfig (5h)
- Phase 2: Core modules (10h)
- Phase 3: All modules (10h)
- Phase 4: Type fixing (10h)
- Phase 5: CI checks (5h)

**Action**: Start Sprint 3

---

### 2.2 Caching: TTL Duro vs. ETag

**Problema**: 5min TTL fijo, siempre query a BD  
**Impacto**: -70% unnecessary requests  
**Effort**: 3h  
**ROI**: 2x  

```javascript
// ANTES: Hardcoded 5 min
const TTL = 5 * 60 * 1000;
if (now - cached.timestamp < TTL) return cached;

// DESPUÉS: HTTP ETag
if (header['If-None-Match'] === etag) return 304;
```

**Action**: Win #2 ESTA SEMANA

---

### 2.3 Lazy Load Imágenes

**Problema**: Todas las imágenes del catálogo se cargan  
**Impacto**: -60% initial load time  
**Effort**: 2h  
**ROI**: 3x  

```javascript
// IntersectionObserver
observer.observe(img);
if (entry.isIntersecting) img.src = img.dataset.src;
```

**Action**: Win #4 ESTA SEMANA

---

## PRIORIDAD 3: IMPORTANTE (Sprint 4)

### 3.1 Bundle & Minification

**Problema**: 15 JS files sin bundling  
**Impacto**: -40% bundle size  
**Effort**: 3h  
**ROI**: 2x  

**Solución**: Vite/Rollup setup

---

### 3.2 Performance Monitoring

**Problema**: Sin visibilidad en Web Vitals  
**Impacto**: No sé si es rápido  
**Effort**: 2h  
**ROI**: 2x  

**Métrica**s:
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)

---

### 3.3 Service Worker

**Problema**: Sin offline support, sin cache  
**Impacto**: Funciona offline, 3x repeat  
**Effort**: 4h  
**ROI**: 1.5x  

---

## PRIORIDAD 4: MEDIA (Sprint 5)

### 4.1 Dashboard Real (Actualmente Disabled)

**Problema**: No hay visibility en métricas  
**Impacto**: Business intelligence  
**Effort**: 3h (debug) + 5h (feature)  
**ROI**: 2x  

**Métricas**:
- Total productos
- Visitas/día
- Click-through rate
- Top 5 productos

**Action**: Win #3 ESTA SEMANA

---

### 4.2 Drag-Drop Media Reordering

**Problema**: No hay forma de reordenar imágenes  
**Impacto**: Admin UX, positioning  
**Effort**: 12h  
**ROI**: 1.5x  

**Dependencia**: product_media.position field (ya existe)

---

### 4.3 Bulk Operations

**Problema**: Solo CRUD individual  
**Impacto**: Escalabilidad admin  
**Effort**: 8h  
**ROI**: 2x  

**Operaciones**:
- Bulk edit
- Bulk categorize
- Bulk delete
- Batch pricing

---

## PRIORIDAD 5: BAJA (Nice-to-Have)

### 5.1 Video Transcoding

**Problema**: Solo MP4 directo, max 100MB  
**Impacto**: Futuro (Phase 2)  
**Effort**: 20h  
**ROI**: High (pero futuro)  

---

### 5.2 Cleanup Orphaned Storage

**Problema**: Archivos huérfanos en storage  
**Impacto**: Costo storage  
**Effort**: 2h  
**ROI**: Low  

**Solución**: Cron job Supabase que elimina no referenciados

---

## PRIORIZACIÓN VISUAL

```
URGENCIA (Impacto Business)
     ↑
     │ 🔴 CRITICAL       🟠 HIGH
     │ ✓ Duplicación     ✓ Sin logging
     │ ✓ Fallbacks       ✓ Sin TypeScript
     │ ✓ Memory leaks    ✓ TTL caching
     │ 
     │ 🟡 MEDIUM         🟢 LOW
     │ ✓ Lazy load       ✓ Transcoding
     │ ✓ Dashboard       ✓ Cleanup
     │ ✓ Drag-drop       
     │
     └────────────────────────────────────→
        1 week  1 month  3 months  Future
                    TIMEFRAME
```

---

## DEUDA POR CATEGORÍA

| Categoría | Items | Effort | Total |
|-----------|-------|--------|-------|
| **Code Quality** | 3 | 25h | 🔴 |
| **Performance** | 4 | 12h | 🟡 |
| **Observability** | 1 | 8h | 🔴 |
| **Features** | 3 | 20h | 🟡 |
| **Infrastructure** | 2 | 5h | 🟢 |
| **Security** | 1 | 8h | 🟡 |

**TOTAL**: 96h = ~3 meses @ 1 dev fulltime

---

## CRITICAL PATH

```
Sprint 0    → Quick wins (9h)
    ↓
Sprint 1    → Observability (23h)
    ↓
Sprint 2    → Maintainability (28h)
    ├─ Extract AdminForm
    └─ E2E tests
    ↓
Sprint 3    → TypeScript (35h)
    ↓
Sprint 4    → Performance (11h)
    ↓
Sprint 5+   → Features & Marketplace
```

**Dependencies**: Cada sprint unblockea el siguiente  
**No parallelizable**: TypeScript DEBE venir after AdminForm  

---

## DECISION MATRIX: QUÉ HACER PRIMERO?

```
┌─────────────────┬───────────┬────────┬──────────┬─────────┐
│ Task            │ Impact    │ Effort │ Risk     │ Priority│
├─────────────────┼───────────┼────────┼──────────┼─────────┤
│ Duplicación     │ ⭐⭐⭐⭐⭐ │ 16h    │ Low      │ 🔴      │
│ Fallbacks       │ ⭐⭐⭐⭐   │ 4h     │ Low      │ 🔴      │
│ Logging         │ ⭐⭐⭐⭐⭐ │ 8h     │ Low      │ 🔴      │
│ Memory leaks    │ ⭐⭐⭐⭐   │ 1h     │ Low      │ 🔴      │
│ TypeScript      │ ⭐⭐⭐⭐   │ 40h    │ Medium   │ 🟡      │
│ Caching         │ ⭐⭐⭐    │ 3h     │ Low      │ 🟡      │
│ Lazy load       │ ⭐⭐⭐    │ 2h     │ Low      │ 🟡      │
│ Dashboard       │ ⭐⭐⭐    │ 8h     │ Low      │ 🟡      │
│ Transcoding     │ ⭐⭐     │ 20h    │ Medium   │ 🟢      │
│ Cleanup storage │ ⭐        │ 2h     │ Low      │ 🟢      │
└─────────────────┴───────────┴────────┴──────────┴─────────┘
```

---

## RECOMMENDED EXECUTION ORDER

### PHASE 1: CRITICAL (1 week)
1. Memory leak cleanup (1h)
2. ETag caching (3h)
3. Dashboard enable (3h)
4. Lazy load images (2h)

**Result**: 9h = Stable, fast, observable

### PHASE 2: IMPORTANT (2 weeks)
5. Sentry logging (8h)
6. Cleanup 12 fallbacks (4h)
7. RLS audit (2h)
8. Error handler (4h)

**Result**: 23h = Fully observable, no blind spots

### PHASE 3: IMPROVEMENT (4 weeks)
9. Extract AdminForm (16h)
10. E2E tests (8h)
11. Documentation (4h)

**Result**: 28h = Maintainable, testable

### PHASE 4: MODERNIZATION (4 weeks)
12. TypeScript migration (35h)
13. TypeScript fixes (5h)

**Result**: 40h = Type-safe, IDE support

### PHASE 5: SCALE (2 weeks)
14. Bundling (3h)
15. Performance budgets (2h)
16. Service Worker (4h)

**Result**: 11h = Fast, reliable, offline

---

**Debt Prioritization Complete**: 2026-05-03  
**Recommendation**: ✅ Start Phase 1 THIS WEEK
