import {
  fetchAllCategoriesAPI,
  fetchCategoryByIdAPI,
  createCategoryAPI,
  updateCategoryAPI,
  deleteCategoryAPI
} from "./api.js";

/**
 * Service layer for categories
 * Validates, caches, and processes category data
 */

const CACHE_KEY = "stc_categories_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get all active categories (with caching)
 * @param {boolean} useCache - Use cached data if available
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function fetchAllCategories(useCache = true) {
  try {
    // Check cache
    if (useCache) {
      const cached = getCachedCategories();
      if (cached) {
        return { success: true, data: cached };
      }
    }

    // Fetch from API
    const result = await fetchAllCategoriesAPI();

    if (result.success) {
      // Cache only active categories
      const activeCategories = result.data.filter(c => c.is_active);
      setCachedCategories(activeCategories);
      return { success: true, data: activeCategories };
    }

    return result;
  } catch (error) {
    console.error("Fetch all categories error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get single category by ID
 * @param {string} categoryId
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function fetchCategoryById(categoryId) {
  try {
    if (!categoryId) {
      return { success: false, error: "Category ID required" };
    }

    const result = await fetchCategoryByIdAPI(categoryId);
    return result;
  } catch (error) {
    console.error("Fetch category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create new category with validation
 * @param {Object} data - {nombre, orden}
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createCategory(data) {
  try {
    // Validate input
    if (!data.nombre || !data.nombre.trim()) {
      return { success: false, error: "Nombre is required" };
    }

    const nombre = data.nombre.trim();
    const orden = data.orden || 0;

    const result = await createCategoryAPI(nombre, orden);

    if (result.success) {
      // Invalidate cache
      clearCachedCategories();
    }

    return result;
  } catch (error) {
    console.error("Create category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update category with validation
 * @param {string} categoryId
 * @param {Object} updates
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateCategory(categoryId, updates) {
  try {
    if (!categoryId) {
      return { success: false, error: "Category ID required" };
    }

    // Validate updates
    const validUpdates = {};
    if (updates.nombre !== undefined) {
      const nombre = updates.nombre.trim();
      if (!nombre) {
        return { success: false, error: "Nombre cannot be empty" };
      }
      validUpdates.nombre = nombre;
    }
    if (updates.orden !== undefined) {
      validUpdates.orden = parseInt(updates.orden);
    }
    if (updates.is_active !== undefined) {
      validUpdates.is_active = Boolean(updates.is_active);
    }

    const result = await updateCategoryAPI(categoryId, validUpdates);

    if (result.success) {
      // Invalidate cache
      clearCachedCategories();
    }

    return result;
  } catch (error) {
    console.error("Update category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete category
 * @param {string} categoryId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteCategory(categoryId) {
  try {
    if (!categoryId) {
      return { success: false, error: "Category ID required" };
    }

    const result = await deleteCategoryAPI(categoryId);

    if (result.success) {
      // Invalidate cache
      clearCachedCategories();
    }

    return result;
  } catch (error) {
    console.error("Delete category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Refresh categories cache
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function refreshCategories() {
  clearCachedCategories();
  return fetchAllCategories(false);
}

// ============================================================================
// Cache helpers
// ============================================================================

function getCachedCategories() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache expired
    if (now - timestamp > CACHE_TTL) {
      clearCachedCategories();
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error reading cache:", error);
    clearCachedCategories();
    return null;
  }
}

function setCachedCategories(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.warn("Error saving cache:", error);
  }
}

function clearCachedCategories() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn("Error clearing cache:", error);
  }
}
