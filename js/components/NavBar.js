/**
 * NavBar Manager - Renderiza navbar dinámica con dropdowns
 * Conectado a categorías de Supabase
 * 
 * Uso:
 *   import { initNavBar } from './components/NavBar.js';
 *   await initNavBar();
 */

import { fetchAllCategories } from "../modules/categories/service.js";
import { fetchSubcategoriesByCategory } from "../modules/subcategories/service.js";

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
      if (!result.success) {
        console.warn("Failed to load categories:", result.error);
        return;
      }
      
      this.categories = result.data || [];
      this.categories.sort((a, b) => a.orden - b.orden);
      
      this.render();
      this.bindEvents();
      this.initialized = true;
    } catch (error) {
      console.error("NavBar init error:", error);
    }
  }

  async getSubcategoriesForCategory(categoryName) {
    try {
      const result = await fetchSubcategoriesByCategory(categoryName);
      if (!result.success) return [];
      const subcats = result.data || [];
      return subcats.filter(sc => sc.is_active).sort((a, b) => a.orden - b.orden);
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
            data-category-name="${escapeHtml(cat.nombre)}"
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
      <li class="nav-item"><a class="nav-link" href="catalogo.html">Catálogo completo</a></li>
      ${categoryItems}
    `;

    // Insertar en el navbar
    // Buscar item WhatsApp para insertar antes de él
    const whatsappItem = this.navUlElement.querySelector('a[id*="Whatsapp"]')?.closest('.nav-item');
    if (whatsappItem) {
      // Insertar antes del WhatsApp
      whatsappItem.insertAdjacentHTML('beforebegin', navbarHtml);
    } else {
      // Insertar al final si no hay WhatsApp
      this.navUlElement.insertAdjacentHTML('beforeend', navbarHtml);
    }
  }

  bindEvents() {
    // Al mostrar dropdown, cargar subcategorías
    const dropdowns = this.navbarElement.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(toggle => {
      toggle.addEventListener('show.bs.dropdown', async (event) => {
        const categoryId = toggle.dataset.categoryId;
        const categoryName = toggle.dataset.categoryName;
        const dropdownMenu = toggle.nextElementSibling;
        
        if (dropdownMenu && dropdownMenu.querySelector('.dropdown-item-text')) {
          // Ya tiene "Cargando...", reemplazar con datos
          const subcategories = await this.getSubcategoriesForCategory(categoryName);
          
          if (subcategories.length === 0) {
            dropdownMenu.innerHTML = '<li><span class="dropdown-item-text text-muted small">Sin subcategorías</span></li>';
            return;
          }
          
          const html = subcategories.map(sc => `
            <li>
              <a 
                class="dropdown-item" 
                href="catalogo.html?categoria=${encodeURIComponent(categoryName)}&subcategoria=${encodeURIComponent(sc.nombre)}"
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
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Initialize NavBar component
 * Call this from your page entry point
 */
export async function initNavBar() {
  const navbar = document.querySelector('.navbar');
  const navUl = document.querySelector('.navbar-nav');
  
  if (!navbar || !navUl) {
    console.warn("NavBar elements not found. Make sure navbar has class 'navbar' and ul has class 'navbar-nav'");
    return;
  }
  
  const navBar = new NavBar(navbar, navUl);
  await navBar.init();
}

export { NavBar };
