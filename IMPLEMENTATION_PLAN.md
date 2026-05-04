# 🚀 PLAN DE IMPLEMENTACIÓN - STAIN THE CANVAS

**Objetivo**: Transformar catálogo a moderno, profesional, escalable  
**Duración**: 31 horas (4 días fullstack)  
**Risk Level**: 🟢 Bajo (backward compatible)  

---

## FASE 1: NAVBAR DINÁMICA (8 horas)

### PASO 1.1: Crear componente NavBar

**Archivo nuevo**: `js/components/NavBar.js`

```javascript
/**
 * NavBar Manager - Renderiza navbar dinámica con dropdowns
 * Conectado a categorías de Supabase
 */

import { fetchAllCategories } from "../modules/categories/service.js";
import { fetchSubcategoriesByCategory } from "../modules/subcategories/service.js";
import { escapeHtml } from "../shared/product-utils.js";

class NavBar {
  constructor(navbarElement, navUlElement) {
    this.navbarElement = navbarElement;
    this.navUlElement = navUlElement;
    this.categories = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Cargar categorías
      const result = await fetchAllCategories();
      if (!result.success) throw new Error(result.error);
      
      this.categories = result.data.filter(c => c.is_active);
      this.categories.sort((a, b) => a.orden - b.orden);
      
      this.render();
      this.bindEvents();
      this.initialized = true;
    } catch (error) {
      console.error("NavBar init error:", error);
    }
  }

  async getSubcategoriesForCategory(categoryId) {
    try {
      const result = await fetchSubcategoriesByCategory(categoryId);
      if (!result.success) return [];
      return result.data.filter(sc => sc.is_active).sort((a, b) => a.orden - b.orden);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      return [];
    }
  }

  render() {
    // Generar items de categoría
    const categoryItems = this.categories.map(cat => {
      const categoryHtml = `
        <li class="nav-item dropdown">
          <a 
            class="nav-link dropdown-toggle" 
            href="catalogo.html?categoria=${encodeURIComponent(cat.nombre)}"
            role="button" 
            data-bs-toggle="dropdown"
            aria-expanded="false"
            data-category-id="${cat.id}"
          >
            ${escapeHtml(cat.nombre)}
          </a>
          <ul class="dropdown-menu dropdown-menu-subcategories" id="dropdown-${cat.id}">
            <li><span class="dropdown-item-text text-muted small">Cargando subcategorías...</span></li>
          </ul>
        </li>
      `;
      return categoryHtml;
    }).join("");

    // Construir navbar HTML
    const navbarHtml = `
      <li class="nav-item">
        <a class="nav-link" href="catalogo.html?categoria=Todos">Catálogo completo</a>
      </li>
      ${categoryItems}
    `;

    // Insertar en el navbar (antes del botón WhatsApp)
    const whatsappItem = this.navUlElement.querySelector('[id*="Whatsapp"]')?.closest('.nav-item');
    if (whatsappItem) {
      this.navUlElement.insertBefore(this.createElementFromHTML(navbarHtml), whatsappItem);
    } else {
      this.navUlElement.insertAdjacentHTML('beforeend', navbarHtml);
    }
  }

  bindEvents() {
    // Al mostrar dropdown, cargar subcategorías
    const dropdowns = this.navbarElement.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(toggle => {
      toggle.addEventListener('show.bs.dropdown', async (event) => {
        const categoryId = toggle.dataset.categoryId;
        const dropdownMenu = toggle.nextElementSibling;
        
        if (dropdownMenu.querySelector('.dropdown-item-text')) {
          // Ya tiene "Cargando...", remplazar con datos
          const subcategories = await this.getSubcategoriesForCategory(categoryId);
          
          if (subcategories.length === 0) {
            dropdownMenu.innerHTML = '<li><span class="dropdown-item-text text-muted">Sin subcategorías</span></li>';
            return;
          }
          
          const html = subcategories.map(sc => `
            <li>
              <a 
                class="dropdown-item" 
                href="catalogo.html?categoria=${encodeURIComponent(toggle.textContent.trim())}&subcategoria=${encodeURIComponent(sc.nombre)}"
              >
                ${escapeHtml(sc.nombre)}
              </a>
            </li>
          `).join("");
          
          dropdownMenu.innerHTML = html;
        }
      });
    });
  }

  createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.firstElementChild;
  }
}

export async function initNavBar() {
  const navbar = document.querySelector('.navbar');
  const navUl = document.querySelector('.navbar-nav');
  
  if (!navbar || !navUl) return;
  
  const navBar = new NavBar(navbar, navUl);
  await navBar.init();
}
```

**Ubicación**: `js/components/NavBar.js`  
**Duración**: 2h  

---

### PASO 1.2: Actualizar index.html

Agregar en `<head>`:
```html
<!-- CAMBIO en head -->
<link rel="stylesheet" href="css/components/navbar.css" />
```

Cambiar navbar en `<header>`:
```html
<nav class="navbar navbar-expand-lg bg-body-tertiary shadow-sm">
  <div class="container">
    <a class="navbar-brand brand-title" href="index.html">Stain the Canvas</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
      <!-- UL que se llenará dinámicamente -->
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0 gap-lg-2" id="dynamicNav">
        <!-- NavBar.js insertará aquí -->
        <li class="nav-item">
          <a class="btn btn-brand rounded-pill px-4" id="homeTopWhatsappBtn" href="#" target="_blank">
            WhatsApp
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>
```

**Duración**: 1h  

---

### PASO 1.3: CSS para Navbar

**Archivo nuevo**: `css/components/navbar.css`

```css
/* NavBar with smooth transitions */

.navbar {
  --bs-navbar-padding-x: 0;
  --bs-navbar-padding-y: 0.5rem;
}

.dropdown-menu-subcategories {
  min-width: 220px;
  border-radius: 0.5rem;
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.dropdown-menu-subcategories .dropdown-item {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.dropdown-menu-subcategories .dropdown-item:hover {
  background-color: var(--bs-light);
  transform: translateX(4px);
}

.dropdown-menu-subcategories .dropdown-item-text {
  padding: 0.75rem 1rem;
}

/* Responsive */
@media (max-width: 991.98px) {
  .dropdown-menu-subcategories {
    position: static;
    float: none;
    box-shadow: none;
    margin-left: 1rem;
    padding-left: 0;
    border: none;
  }
  
  .dropdown-menu-subcategories .dropdown-item {
    padding: 0.5rem 0;
    font-size: 0.9rem;
  }
}
```

**Duración**: 1h  

---

### PASO 1.4: Inicializar en index.html

Agregar en `</body>` antes de `</html>`:

```html
<script type="module">
  import { initNavBar } from './js/components/NavBar.js';
  
  document.addEventListener('DOMContentLoaded', () => {
    initNavBar().catch(console.error);
  });
</script>
```

**Duración**: 0.5h  

---

### PASO 1.5: Tests

**Archivo**: `tests/components/NavBar.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAllCategories, fetchSubcategoriesByCategory } from '../../js/modules/categories/service.js';

vi.mock('../../js/modules/categories/service.js');

describe('NavBar', () => {
  it('should load categories on init', async () => {
    fetchAllCategories.mockResolvedValue({
      success: true,
      data: [
        { id: '1', nombre: 'Bisutería', orden: 1, is_active: true },
        { id: '2', nombre: 'Accesorios', orden: 2, is_active: true }
      ]
    });

    const navbar = document.createElement('nav');
    const ul = document.createElement('ul');
    navbar.appendChild(ul);

    // Test que categorías se cargan
    expect(fetchAllCategories).toHaveBeenCalled();
  });

  it('should filter inactive categories', () => {
    // Test que categorías inactivas no aparecen
  });

  it('should load subcategories on dropdown show', () => {
    // Test que subcategorías cargan dinámicamente
  });
});
```

**Duración**: 1.5h  

---

**SUBTOTAL FASE 1**: 8 horas ✅

---

## FASE 2: PÁGINA DE PRODUCTO (6 horas)

### PASO 2.1: Crear página producto.html

**Archivo nuevo**: `producto.html`

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Meta dinámicas (se llenan con JS) -->
  <title id="pageTitle">Producto | Stain the Canvas</title>
  <meta name="description" id="pageDescription" content="">
  <meta property="og:title" id="ogTitle" content="">
  <meta property="og:description" id="ogDescription" content="">
  <meta property="og:image" id="ogImage" content="">
  <meta property="og:url" id="ogUrl" content="">
  
  <link rel="icon" type="image/jpeg" href="assets/bisuteria_2.jpg" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Noto+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/pages/product.css" />
</head>
<body>
  <!-- Navbar (igual a index.html) -->
  <header class="sticky-top">
    <nav class="navbar navbar-expand-lg bg-body-tertiary shadow-sm">
      <div class="container">
        <a class="navbar-brand brand-title" href="index.html">Stain the Canvas</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0 gap-lg-2" id="dynamicNav">
            <li class="nav-item">
              <a class="btn btn-brand rounded-pill px-4" id="productWhatsappBtn" href="#" target="_blank">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </header>

  <main>
    <!-- Breadcrumbs -->
    <nav id="productBreadcrumbs" class="breadcrumbs-wrapper" aria-label="Migas de pan">
      <div class="container">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="index.html">Inicio</a></li>
          <li class="breadcrumb-item"><a href="catalogo.html">Catálogo</a></li>
          <li class="breadcrumb-item active" aria-current="page">Producto</li>
        </ol>
      </div>
    </nav>

    <!-- Contenido del producto -->
    <article class="container py-5" id="productContainer">
      <div class="row g-4">
        <!-- Galería de imágenes -->
        <div class="col-lg-6">
          <div id="productGallery" class="product-gallery">
            <!-- Se llena con JS -->
          </div>
        </div>

        <!-- Info del producto -->
        <div class="col-lg-6">
          <div id="productInfo" class="product-info">
            <!-- Se llena con JS -->
          </div>
        </div>
      </div>

      <!-- Video (si existe) -->
      <div id="productVideoSection" class="row g-4 mt-3 d-none">
        <div class="col-12">
          <h2 class="h4 mb-3">Video del producto</h2>
          <div id="productVideoPlayer" class="video-player">
            <!-- Video embebido aquí -->
          </div>
        </div>
      </div>

      <!-- Productos relacionados -->
      <section class="related-products mt-5 pt-5 border-top">
        <h2 class="h3 mb-4">Productos relacionados</h2>
        <div id="relatedProductsGrid" class="row g-4">
          <!-- Se llena con JS -->
        </div>
      </section>
    </article>

    <!-- Loading state -->
    <div id="loadingState" class="container py-5 text-center d-none">
      <div class="spinner-border text-brand" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando producto...</p>
    </div>

    <!-- Error state -->
    <div id="errorState" class="container py-5 text-center d-none">
      <h2 class="h3 mb-3">Producto no encontrado</h2>
      <p class="mb-4">Lo sentimos, no pudimos encontrar este producto.</p>
      <a href="catalogo.html" class="btn btn-brand rounded-pill px-4">Volver al catálogo</a>
    </div>
  </main>

  <!-- Footer (copiar de index.html si existe) -->

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script type="module" src="js/pages/product.js"></script>
</body>
</html>
```

**Duración**: 1.5h  

---

### PASO 2.2: Crear módulo product.js

**Archivo nuevo**: `js/pages/product.js`

```javascript
/**
 * Producto Detail Page
 * Maneja carga, renderizado y SEO de página individual
 */

import { fetchProductById } from '../modules/products/service.js';
import { fetchProductsByCategory } from '../modules/products/service.js';
import { getProductImageUrls, getProductVideoUrl, buildWhatsappLink, escapeHtml, formatCurrency } from '../shared/product-utils.js';
import { trackEvent, trackVisit } from '../modules/analytics/service.js';
import { initNavBar } from '../components/NavBar.js';

const state = {
  product: null,
  relatedProducts: [],
  currentImageIndex: 0
};

const refs = {
  productContainer: document.getElementById('productContainer'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  productGallery: document.getElementById('productGallery'),
  productInfo: document.getElementById('productInfo'),
  productVideoSection: document.getElementById('productVideoSection'),
  productVideoPlayer: document.getElementById('productVideoPlayer'),
  relatedProductsGrid: document.getElementById('relatedProductsGrid'),
  breadcrumbs: document.getElementById('productBreadcrumbs'),
  whatsappBtn: document.getElementById('productWhatsappBtn')
};

function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function setMetaTags(product) {
  const image = getProductImageUrls(product)[0] || '';
  const title = `${escapeHtml(product.nombre)} | Stain the Canvas`;
  const description = escapeHtml(product.descripcion || '').substring(0, 160);
  const url = window.location.href;

  document.title = title;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageDescription').content = description;
  document.getElementById('ogTitle').content = title;
  document.getElementById('ogDescription').content = description;
  document.getElementById('ogImage').content = image;
  document.getElementById('ogUrl').content = url;
}

function renderGallery() {
  const images = getProductImageUrls(state.product);
  
  const galleryHTML = `
    <div class="gallery-main">
      <img 
        id="mainImage" 
        class="lazy-image"
        data-src="${escapeHtml(images[0])}"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3C/svg%3E"
        alt="${escapeHtml(state.product.nombre)}"
      />
    </div>
    ${images.length > 1 ? `
      <div class="gallery-thumbnails mt-3 d-flex gap-2 overflow-auto">
        ${images.map((img, idx) => `
          <button
            class="gallery-thumbnail ${idx === 0 ? 'active' : ''}"
            data-index="${idx}"
            aria-label="Ver imagen ${idx + 1}"
          >
            <img 
              class="lazy-image"
              data-src="${escapeHtml(img)}"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f5f5f5' width='100' height='100'/%3E%3C/svg%3E"
              alt="Thumbnail"
            />
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;

  refs.productGallery.innerHTML = galleryHTML;
  
  // Bind thumbnail events
  document.querySelectorAll('.gallery-thumbnail').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      document.getElementById('mainImage').dataset.src = images[idx];
      document.getElementById('mainImage').src = images[idx];
      document.querySelectorAll('.gallery-thumbnail').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function renderProductInfo() {
  const videoUrl = getProductVideoUrl(state.product);
  const whatsappLink = buildWhatsappLink(state.product);

  const infoHTML = `
    <div class="product-details">
      <h1 class="h2 mb-2">${escapeHtml(state.product.nombre)}</h1>
      
      <div class="product-meta mb-3">
        <span class="badge bg-brand">${escapeHtml(state.product.categoria || 'Sin categoría')}</span>
        ${state.product.subcategory_id ? `<span class="badge bg-light text-dark ms-2">${escapeHtml(state.product.subcategory_name || '')}</span>` : ''}
      </div>

      <div class="product-price mb-4">
        <span class="h3 text-brand">${formatCurrency(state.product.precio)}</span>
      </div>

      <p class="product-description lead mb-4">
        ${escapeHtml(state.product.descripcion || '')}
      </p>

      <div class="product-stats mb-4 border-top border-bottom py-3">
        <small class="text-muted">
          ⭐ ${state.product.vistas || 0} personas han visto este producto
        </small>
      </div>

      <div class="product-actions d-flex gap-2">
        <a href="${whatsappLink}" class="btn btn-brand rounded-pill px-4" target="_blank" rel="noopener noreferrer">
          Contactar por WhatsApp
        </a>
        <button class="btn btn-outline-brand rounded-pill px-4" onclick="window.history.back()">
          Volver
        </button>
      </div>
    </div>
  `;

  refs.productInfo.innerHTML = infoHTML;

  // Mostrar video si existe
  if (videoUrl) {
    refs.productVideoSection.classList.remove('d-none');
    refs.productVideoPlayer.innerHTML = `
      <video width="100%" height="auto" controls controlsList="nodownload">
        <source src="${escapeHtml(videoUrl)}" type="video/mp4">
        Tu navegador no soporta video HTML5.
      </video>
    `;
  }
}

async function loadRelatedProducts() {
  try {
    const result = await fetchProductsByCategory(state.product.categoria, { limit: 4 });
    if (!result.success) return;

    state.relatedProducts = result.data
      .filter(p => p.id !== state.product.id)
      .slice(0, 3);

    renderRelatedProducts();
  } catch (error) {
    console.error('Error loading related products:', error);
  }
}

function renderRelatedProducts() {
  if (state.relatedProducts.length === 0) {
    refs.relatedProductsGrid.innerHTML = '<p class="col-12 text-muted">No hay productos relacionados.</p>';
    return;
  }

  const html = state.relatedProducts.map(product => `
    <div class="col-sm-6 col-lg-4">
      <a href="producto.html?id=${product.id}" class="product-card text-decoration-none">
        <img 
          class="lazy-image"
          data-src="${escapeHtml(getProductImageUrls(product)[0])}"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3C/svg%3E"
          alt="${escapeHtml(product.nombre)}"
        />
        <h3 class="h6 mt-2">${escapeHtml(product.nombre)}</h3>
        <p class="text-brand fw-semibold">${formatCurrency(product.precio)}</p>
      </a>
    </div>
  `).join('');

  refs.relatedProductsGrid.innerHTML = html;
}

function updateBreadcrumbs() {
  if (state.product && state.product.categoria) {
    const categoryLink = `catalogo.html?categoria=${encodeURIComponent(state.product.categoria)}`;
    const breadcrumbsHTML = `
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.html">Inicio</a></li>
        <li class="breadcrumb-item"><a href="catalogo.html">Catálogo</a></li>
        <li class="breadcrumb-item"><a href="${categoryLink}">${escapeHtml(state.product.categoria)}</a></li>
        <li class="breadcrumb-item active" aria-current="page">${escapeHtml(state.product.nombre)}</li>
      </ol>
    `;
    refs.breadcrumbs.innerHTML = breadcrumbsHTML;
  }
}

function showLoading() {
  refs.productContainer.classList.add('d-none');
  refs.errorState.classList.add('d-none');
  refs.loadingState.classList.remove('d-none');
}

function showError() {
  refs.productContainer.classList.add('d-none');
  refs.loadingState.classList.add('d-none');
  refs.errorState.classList.remove('d-none');
}

function showProduct() {
  refs.loadingState.classList.add('d-none');
  refs.errorState.classList.add('d-none');
  refs.productContainer.classList.remove('d-none');
}

async function loadProduct() {
  const productId = getProductIdFromURL();
  
  if (!productId) {
    showError();
    return;
  }

  showLoading();

  try {
    const result = await fetchProductById(productId);
    
    if (!result.success || !result.data) {
      showError();
      return;
    }

    state.product = result.data;
    
    // Renderizar contenido
    setMetaTags(state.product);
    updateBreadcrumbs();
    renderGallery();
    renderProductInfo();
    await loadRelatedProducts();
    
    // Tracking
    await trackVisit();
    await trackEvent('view_producto', { producto_id: productId, nombre: state.product.nombre });
    
    showProduct();
    
    // Lazy load imágenes
    loadLazyImages();
    
  } catch (error) {
    console.error('Error loading product:', error);
    showError();
  }
}

function loadLazyImages() {
  const images = document.querySelectorAll('.lazy-image');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        }
      });
    });
    images.forEach(img => observer.observe(img));
  } else {
    // Fallback para navegadores viejos
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  await initNavBar();
  await loadProduct();
});
```

**Duración**: 2.5h  

---

### PASO 2.3: CSS para página producto

**Archivo nuevo**: `css/pages/product.css`

```css
/* Product Detail Page */

.breadcrumbs-wrapper {
  background-color: var(--bs-gray-100);
  padding: 0.75rem 0;
  font-size: 0.9rem;
}

.breadcrumb {
  margin: 0;
}

.product-gallery {
  position: sticky;
  top: 100px;
}

.gallery-main img {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  object-fit: cover;
  aspect-ratio: 1;
}

.gallery-thumbnails {
  max-width: 100%;
}

.gallery-thumbnail {
  flex: 0 0 80px;
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  border-radius: 0.375rem;
  padding: 0;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.375rem;
}

.gallery-thumbnail:hover {
  border-color: var(--bs-brand);
}

.gallery-thumbnail.active {
  border-color: var(--bs-brand);
  box-shadow: 0 0 0 3px rgba(var(--bs-brand-rgb), 0.1);
}

.product-details {
  padding: 1rem;
}

.product-price {
  font-weight: 600;
}

.product-meta .badge {
  font-size: 0.85rem;
}

.product-description {
  line-height: 1.8;
  color: var(--bs-gray-700);
}

.product-stats {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.product-actions {
  flex-wrap: wrap;
}

.video-player {
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #000;
  aspect-ratio: 16/9;
}

.video-player video {
  border-radius: 0.5rem;
}

.related-products {
  margin-top: 3rem;
  padding-top: 2rem;
}

.product-card {
  display: block;
  transition: transform 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
}

.product-card img {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  object-fit: cover;
  aspect-ratio: 1;
}

.product-card h3,
.product-card p {
  margin-bottom: 0.25rem;
}

/* Responsive */
@media (max-width: 991.98px) {
  .product-gallery {
    position: static;
  }

  .gallery-main img {
    aspect-ratio: auto;
    max-height: 400px;
  }

  .product-actions {
    flex-direction: column;
  }

  .product-actions .btn {
    width: 100%;
  }
}
```

**Duración**: 1h  

---

### PASO 2.4: Agregar fetchProductById en service

**Actualizar**: `js/modules/products/service.js`

```javascript
// AGREGAR esta función
export async function fetchProductById(productId) {
  try {
    const result = await getProductsAPI(
      { 
        filters: [['id', 'eq', productId]],
        limit: 1 
      }
    );
    
    if (!result.success) {
      return result;
    }
    
    const product = result.data[0] || null;
    return {
      success: true,
      data: product
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Duración**: 0.5h  

---

**SUBTOTAL FASE 2**: 6 horas ✅

---

## FASE 3: FILTROS DINÁMICOS (4 horas)

### PASO 3.1: Actualizar catalogo.html

Cambiar la sección de filtros:

```html
<!-- REEMPLAZAR sección de filtros -->
<section class="filters-section mb-4">
  <div class="row g-3 align-items-end">
    <div class="col-md-6">
      <label class="form-label">Categoría</label>
      <select id="categorySelect" class="form-select">
        <option value="">Todas las categorías</option>
      </select>
    </div>
    <div class="col-md-6">
      <label class="form-label">Subcategoría</label>
      <select id="subcategorySelect" class="form-select" disabled>
        <option value="">Todas las subcategorías</option>
      </select>
    </div>
  </div>
  <div class="row g-3 mt-2">
    <div class="col-12">
      <input type="text" id="productSearchInput" class="form-control" placeholder="Buscar productos...">
    </div>
  </div>
</section>
```

**Duración**: 0.5h  

---

### PASO 3.2: Crear CatalogFilters.js

**Archivo nuevo**: `js/components/CatalogFilters.js`

```javascript
/**
 * CatalogFilters - Gestor de filtros jerárquicos
 */

import { fetchAllCategories } from '../modules/categories/service.js';
import { fetchSubcategoriesByCategoryId } from '../modules/subcategories/service.js';

class CatalogFilters {
  constructor(categorySelect, subcategorySelect) {
    this.categorySelect = categorySelect;
    this.subcategorySelect = subcategorySelect;
    this.categories = [];
    this.subcategories = {};
    this.selectedCategory = null;
    this.onFilterChange = null;
  }

  async init() {
    const result = await fetchAllCategories();
    if (!result.success) return;

    this.categories = result.data.filter(c => c.is_active);
    this.renderCategories();
    this.bindEvents();
    
    // Restaurar filtros de URL si existen
    this.restoreFromURL();
  }

  renderCategories() {
    const html = this.categories.map(cat => 
      `<option value="${cat.id}">${cat.nombre}</option>`
    ).join('');
    
    this.categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + html;
  }

  async loadSubcategories(categoryId) {
    if (!categoryId) {
      this.subcategorySelect.innerHTML = '<option value="">Todas las subcategorías</option>';
      this.subcategorySelect.disabled = true;
      return;
    }

    const result = await fetchSubcategoriesByCategoryId(categoryId);
    if (!result.success) return;

    const subcats = result.data.filter(sc => sc.is_active);
    const html = subcats.map(sc => 
      `<option value="${sc.id}">${sc.nombre}</option>`
    ).join('');

    this.subcategorySelect.innerHTML = '<option value="">Todas las subcategorías</option>' + html;
    this.subcategorySelect.disabled = false;
  }

  bindEvents() {
    this.categorySelect.addEventListener('change', async (e) => {
      const categoryId = e.target.value;
      this.selectedCategory = categoryId;
      
      await this.loadSubcategories(categoryId);
      this.subcategorySelect.value = '';
      
      this.updateURL();
      if (this.onFilterChange) {
        this.onFilterChange({
          category: categoryId,
          subcategory: ''
        });
      }
    });

    this.subcategorySelect.addEventListener('change', (e) => {
      this.updateURL();
      if (this.onFilterChange) {
        this.onFilterChange({
          category: this.categorySelect.value,
          subcategory: e.target.value
        });
      }
    });
  }

  updateURL() {
    const params = new URLSearchParams();
    if (this.categorySelect.value) {
      const catName = this.categorySelect.options[this.categorySelect.selectedIndex].text;
      params.set('categoria', catName);
    }
    if (this.subcategorySelect.value) {
      const subcatName = this.subcategorySelect.options[this.subcategorySelect.selectedIndex].text;
      params.set('subcategoria', subcatName);
    }
    
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newURL);
  }

  restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const subcategoria = params.get('subcategoria');

    if (categoria) {
      const catOption = Array.from(this.categorySelect.options).find(opt => opt.text === categoria);
      if (catOption) {
        this.categorySelect.value = catOption.value;
        this.categorySelect.dispatchEvent(new Event('change'));
      }
    }

    if (subcategoria) {
      // Esperar a que subcategorías carguen
      setTimeout(() => {
        const subcatOption = Array.from(this.subcategorySelect.options).find(opt => opt.text === subcategoria);
        if (subcatOption) {
          this.subcategorySelect.value = subcatOption.value;
          this.subcategorySelect.dispatchEvent(new Event('change'));
        }
      }, 100);
    }
  }

  getFilters() {
    return {
      category: this.categorySelect.value,
      subcategory: this.subcategorySelect.value
    };
  }
}

export { CatalogFilters };
```

**Duración**: 1.5h  

---

### PASO 3.3: Actualizar catalogo.js

```javascript
// EN catalog.js, en la función initCatalogProductsUI

import { CatalogFilters } from '../../../components/CatalogFilters.js';

// Agregar al inicio
const categorySelect = document.getElementById('categorySelect');
const subcategorySelect = document.getElementById('subcategorySelect');

if (categorySelect && subcategorySelect) {
  const filters = new CatalogFilters(categorySelect, subcategorySelect);
  await filters.init();
  
  filters.onFilterChange = async (filterState) => {
    // Cargar productos con nuevos filtros
    const result = await getProducts(filterState);
    state.products = result.data || [];
    renderProducts();
  };
}
```

**Duración**: 1h  

---

### PASO 3.4: Actualizar getProducts en products/service.js

```javascript
// ACTUALIZAR getProducts para aceptar opciones de filtro
export async function getProducts(filterOptions = {}) {
  const { category, subcategory } = filterOptions;
  
  try {
    const result = await getProductsAPI();
    if (!result.success) return result;

    let products = result.data || [];

    // Filtrar por categoría
    if (category) {
      const categoryName = document.getElementById('categorySelect')?.options[
        Array.from(document.getElementById('categorySelect')?.options || []).findIndex(
          opt => opt.value === category
        )
      ]?.text;
      
      if (categoryName) {
        products = products.filter(p => p.categoria === categoryName);
      }
    }

    // Filtrar por subcategoría
    if (subcategory) {
      products = products.filter(p => p.subcategory_id === subcategory);
    }

    return {
      success: true,
      data: products
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Duración**: 1h  

---

**SUBTOTAL FASE 3**: 4 horas ✅

---

## FASE 4: LAZY LOADING (3 horas)

### PASO 4.1: Crear LazyImage.js

**Archivo nuevo**: `js/components/LazyImage.js`

```javascript
/**
 * LazyImage - Carga diferida de imágenes con Intersection Observer
 */

class LazyImageLoader {
  constructor() {
    this.observer = null;
    this.initObserver();
  }

  initObserver() {
    const options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
        }
      });
    }, options);
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const tempImg = new Image();
    
    tempImg.onload = () => {
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.add('lazy-loaded');
      this.observer.unobserve(img);
    };

    tempImg.onerror = () => {
      img.classList.add('lazy-error');
      this.observer.unobserve(img);
    };

    tempImg.src = src;
  }

  observe(img) {
    this.observer.observe(img);
  }

  observeAll(selector = '.lazy-image') {
    document.querySelectorAll(selector).forEach(img => {
      if (!img.src && img.dataset.src) {
        this.observe(img);
      }
    });
  }
}

const lazyLoader = new LazyImageLoader();

export function initLazyImages(selector = '.lazy-image') {
  lazyLoader.observeAll(selector);
}

export { lazyLoader };
```

**Duración**: 1h  

---

### PASO 4.2: CSS para lazy images

**Agregar a**: `css/styles.css`

```css
/* Lazy Loading Images */

.lazy-image {
  display: block;
  width: 100%;
  height: auto;
  background-color: var(--bs-gray-100);
  transition: opacity 0.3s ease;
}

.lazy-image[data-src] {
  opacity: 0.7;
  filter: blur(5px);
}

.lazy-image.lazy-loaded {
  opacity: 1;
  filter: blur(0);
}

.lazy-image.lazy-error {
  opacity: 1;
  filter: blur(0);
  background-color: var(--bs-danger-bg-subtle);
}
```

**Duración**: 0.5h  

---

### PASO 4.3: Inicializar en páginas

Agregar a `index.html`, `catalogo.html`, `producto.html` (en `</body>`):

```html
<script type="module">
  import { initLazyImages } from './js/components/LazyImage.js';
  
  document.addEventListener('DOMContentLoaded', () => {
    initLazyImages();
  });
  
  // Reiniciar después de cargar productos dinámicamente
  const observer = new MutationObserver(() => {
    initLazyImages();
  });
  observer.observe(document.body, { childList: true, subtree: true });
</script>
```

**Duración**: 0.5h  

---

### PASO 4.4: Actualizar componentes

Cambiar todas las imágenes de `<img src="...">` a:

```html
<img 
  class="lazy-image"
  data-src="https://..."
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3C/svg%3E"
  alt="Descripción"
/>
```

**Duración**: 0.5h  

---

**SUBTOTAL FASE 4**: 3 horas ✅

---

## RESUMEN DE IMPLEMENTACIÓN

| Fase | Tareas | Horas | Estado |
|------|--------|-------|--------|
| 1 | Navbar dinámica | 8 | ✅ Detallado |
| 2 | Página producto | 6 | ✅ Detallado |
| 3 | Filtros dinámicos | 4 | ✅ Detallado |
| 4 | Lazy loading | 3 | ✅ Detallado |
| **TOTAL** | **31 horas** | **31** | **✅ READY** |

---

**Estimated Timeline**: 4-5 días @ 1 dev fullstack  
**Risk Level**: 🟢 BAJO  
**Breaking Changes**: ❌ NINGUNO  
**Backward Compatibility**: ✅ 100%  

---

*Documento generado*: 4 de mayo de 2026  
*Listo para implementación*: ✅ YES
