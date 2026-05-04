/**
 * CatalogFilters - Gestor de filtros jerárquicos para catálogo
 * Maneja filtros por categoría y subcategoría con sincronización de URL
 */

import { getAllCategories } from '../subcategories/service.js';
import { getSubcategoriesForCategoryId } from '../subcategories/service.js';

class CatalogFilters {
  constructor(categorySelect, subcategorySelect, onFilterChange) {
    this.categorySelect = categorySelect;
    this.subcategorySelect = subcategorySelect;
    this.onFilterChange = onFilterChange;
    
    this.categories = [];
    this.subcategoriesMap = {};
    this.selectedCategory = null;
    this.selectedSubcategory = null;
  }

  async init() {
    try {
      // Cargar todas las categorías
      const result = await getAllCategories();
      if (!result.success) {
        console.error('Error cargando categorías:', result.error);
        return;
      }

      this.categories = result.data.filter(c => c.is_active);
      this.renderCategories();
      this.bindEvents();
      
      // Restaurar filtros de URL si existen
      await this.restoreFromURL();
    } catch (error) {
      console.error('Error inicializando CatalogFilters:', error);
    }
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

    try {
      const result = await getSubcategoriesForCategoryId(categoryId);
      if (!result.success) {
        console.error('Error cargando subcategorías:', result.error);
        return;
      }

      const subcats = result.data.filter(sc => sc.is_active);
      const html = subcats.map(sc => 
        `<option value="${sc.id}">${sc.nombre}</option>`
      ).join('');

      this.subcategorySelect.innerHTML = '<option value="">Todas las subcategorías</option>' + html;
      this.subcategorySelect.disabled = false;
      
      // Cache para búsqueda posterior
      this.subcategoriesMap[categoryId] = subcats;
    } catch (error) {
      console.error('Error al cargar subcategorías:', error);
    }
  }

  bindEvents() {
    this.categorySelect.addEventListener('change', async (e) => {
      const categoryId = e.target.value;
      this.selectedCategory = categoryId;
      
      await this.loadSubcategories(categoryId);
      this.subcategorySelect.value = '';
      this.selectedSubcategory = '';
      
      this.updateURL();
      if (this.onFilterChange) {
        this.onFilterChange({
          categoryId: categoryId,
          categoryName: this.getCategoryName(categoryId),
          subcategoryId: '',
          subcategoryName: ''
        });
      }
    });

    this.subcategorySelect.addEventListener('change', (e) => {
      const subcategoryId = e.target.value;
      this.selectedSubcategory = subcategoryId;
      
      this.updateURL();
      if (this.onFilterChange) {
        this.onFilterChange({
          categoryId: this.selectedCategory,
          categoryName: this.getCategoryName(this.selectedCategory),
          subcategoryId: subcategoryId,
          subcategoryName: this.getSubcategoryName(subcategoryId)
        });
      }
    });
  }

  getCategoryName(categoryId) {
    if (!categoryId) return '';
    const cat = this.categories.find(c => c.id === categoryId);
    return cat ? cat.nombre : '';
  }

  getSubcategoryName(subcategoryId) {
    if (!subcategoryId) return '';
    
    // Buscar en el mapa de subcategorías cacheadas
    for (const subcats of Object.values(this.subcategoriesMap)) {
      const subcat = subcats.find(sc => sc.id === subcategoryId);
      if (subcat) return subcat.nombre;
    }
    
    return '';
  }

  updateURL() {
    const params = new URLSearchParams();
    
    const categoryName = this.getCategoryName(this.selectedCategory);
    if (categoryName) {
      params.set('categoria', categoryName);
    }
    
    const subcategoryName = this.getSubcategoryName(this.selectedSubcategory);
    if (subcategoryName) {
      params.set('subcategoria', subcategoryName);
    }
    
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newURL);
  }

  async restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const subcategoria = params.get('subcategoria');

    if (categoria) {
      // Encontrar y seleccionar categoría por nombre
      const catOption = this.categories.find(c => c.nombre === categoria);
      if (catOption) {
        this.categorySelect.value = catOption.id;
        this.selectedCategory = catOption.id;
        
        // Cargar subcategorías de esta categoría
        await this.loadSubcategories(catOption.id);
      }
    }

    if (subcategoria && this.selectedCategory) {
      // Esperar a que subcategorías se carguen y luego seleccionar
      setTimeout(() => {
        const subcatOption = Array.from(this.subcategorySelect.options)
          .find(opt => opt.text === subcategoria);
        
        if (subcatOption) {
          this.subcategorySelect.value = subcatOption.value;
          this.selectedSubcategory = subcatOption.value;
          
          if (this.onFilterChange) {
            this.onFilterChange({
              categoryId: this.selectedCategory,
              categoryName: this.getCategoryName(this.selectedCategory),
              subcategoryId: this.selectedSubcategory,
              subcategoryName: subcategoria
            });
          }
        }
      }, 100);
    }
  }

  getFilters() {
    return {
      categoryId: this.categorySelect.value,
      categoryName: this.getCategoryName(this.categorySelect.value),
      subcategoryId: this.subcategorySelect.value,
      subcategoryName: this.getSubcategoryName(this.subcategorySelect.value)
    };
  }
}

export { CatalogFilters };
