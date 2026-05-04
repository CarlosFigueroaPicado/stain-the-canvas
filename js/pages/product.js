/**
 * Producto Detail Page
 * Maneja carga, renderizado y SEO de página individual
 */

import { fetchProductById, fetchProductsByCategory } from '../modules/products/service.js';
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
        data-src="${escapeHtml(images[0] || '')}"
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
      </div>

      <div class="product-price mb-4">
        <span class="h3 text-brand">${formatCurrency(state.product.precio)}</span>
      </div>

      <p class="product-description lead mb-4">
        ${escapeHtml(state.product.descripcion || '')}
      </p>

      <div class="product-stats mb-4 border-top border-bottom py-3">
        <small class="text-muted">
          👀 ${state.product.vistas || 0} personas han visto este producto
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

  // Update WhatsApp button
  if (refs.whatsappBtn) {
    refs.whatsappBtn.href = whatsappLink;
  }

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
          data-src="${escapeHtml(getProductImageUrls(product)[0] || '')}"
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
        <li class="breadcrumb-item"><a href="catalogo.html">Catálogo</a></li>
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
