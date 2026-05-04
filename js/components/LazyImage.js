/**
 * LazyImage - Carga diferida de imágenes con Intersection Observer
 * Proporciona carga perezosa de imágenes para optimizar performance
 * 
 * Uso:
 * <img 
 *   class="lazy-image"
 *   data-src="https://example.com/image.jpg"
 *   src="data:image/svg+xml,..." (placeholder SVG)
 *   alt="Descripción"
 * />
 * 
 * Script de inicialización en </body>:
 * import { initLazyImages } from './js/components/LazyImage.js';
 * document.addEventListener('DOMContentLoaded', () => {
 *   initLazyImages();
 * });
 */

class LazyImageLoader {
  constructor() {
    this.observer = null;
    this.initObserver();
  }

  /**
   * Inicializa el IntersectionObserver para detectar imágenes en viewport
   */
  initObserver() {
    const options = {
      root: null,           // Viewport
      rootMargin: '50px',   // Cargar 50px antes de que sea visible
      threshold: 0.01       // 1% de la imagen debe ser visible
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Si la imagen es visible o cercana a viewport
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
        }
      });
    }, options);
  }

  /**
   * Carga una imagen individual
   * @param {HTMLImageElement} img - Elemento imagen
   */
  loadImage(img) {
    const src = img.dataset.src;
    
    // Si no tiene data-src, ya fue cargada
    if (!src) return;

    // Pre-cargar imagen en memoria
    const tempImg = new Image();
    
    tempImg.onload = () => {
      // Éxito: actualizar src de la imagen
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.add('lazy-loaded');
      this.observer.unobserve(img);
    };

    tempImg.onerror = () => {
      // Error al cargar imagen
      img.classList.add('lazy-error');
      this.observer.unobserve(img);
      console.warn(`Lazy image failed to load: ${src}`);
    };

    // Iniciar carga de imagen
    tempImg.src = src;
  }

  /**
   * Observar una imagen para lazy loading
   * @param {HTMLImageElement} img - Elemento imagen
   */
  observe(img) {
    this.observer.observe(img);
  }

  /**
   * Observar todas las imágenes con selector
   * @param {string} selector - Selector CSS para imágenes lazy
   */
  observeAll(selector = '.lazy-image') {
    document.querySelectorAll(selector).forEach(img => {
      // Solo observar si tiene data-src y no tiene src real
      if (!img.src && img.dataset.src) {
        this.observe(img);
      }
    });
  }
}

// Instancia global del loader
const lazyLoader = new LazyImageLoader();

/**
 * Inicializar lazy loading de imágenes
 * @param {string} selector - Selector CSS para imágenes lazy (default: '.lazy-image')
 */
export function initLazyImages(selector = '.lazy-image') {
  lazyLoader.observeAll(selector);
}

export { lazyLoader };
