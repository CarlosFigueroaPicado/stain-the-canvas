import * as subcategoriesApi from "./api.js";
import { fail, ok } from "../../core/result.js";

let allSubcategoriesCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all subcategories with caching
 * Returns { success, data } or { success: false, error }
 */
export async function getSubcategoriesWithCache() {
  const now = Date.now();
  if (allSubcategoriesCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return ok(allSubcategoriesCache);
  }

  try {
    const result = await subcategoriesApi.fetchAllSubcategories();
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorías.");
    }

    const data = Array.isArray(result.data) ? result.data : [];
    allSubcategoriesCache = data;
    cacheTimestamp = now;
    return ok(data);
  } catch (error) {
    console.error("Error inesperado al cargar subcategorías:", error);
    return fail("No se pudieron cargar subcategorías.");
  }
}

/**
 * Get subcategories for a specific category
 * Returns { success, data } or { success: false, error }
 */
export async function getSubcategoriesForCategory(categoria) {
  if (!categoria || typeof categoria !== "string") {
    return fail("Categoría inválida.");
  }

  try {
    const result = await subcategoriesApi.fetchSubcategoriesByCategory(categoria);
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorías.");
    }

    const data = Array.isArray(result.data) ? result.data : [];
    return ok(data);
  } catch (error) {
    console.error("Error al cargar subcategorías para categoría:", error);
    return fail("No se pudieron cargar subcategorías.");
  }
}

/**
 * Get all unique categories
 * Returns { success, data } or { success: false, error }
 */
export async function getAllCategories() {
  try {
    const result = await subcategoriesApi.fetchAllCategories();
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar categorías.");
    }

    const data = Array.isArray(result.data) ? result.data : [];
    const categories = data.map((row) => String(row.categoria || "").trim()).filter(Boolean);
    return ok([...new Set(categories)].sort());
  } catch (error) {
    console.error("Error al cargar categorías:", error);
    return fail("No se pudieron cargar categorías.");
  }
}

/**
 * Validate subcategory payload
 */
function validateSubcategoryPayload(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const nombre = String(safe.nombre || "").trim();
  const categoria = String(safe.categoria || "").trim();
  const orden = Number.isInteger(safe.orden) ? safe.orden : 0;

  if (!nombre || nombre.length < 2) {
    return fail("El nombre de subcategoría debe tener al menos 2 caracteres.");
  }

  if (nombre.length > 100) {
    return fail("El nombre de subcategoría es demasiado largo.");
  }

  if (!categoria || categoria.length < 2) {
    return fail("La categoría es requerida.");
  }

  if (categoria.length > 50) {
    return fail("El nombre de categoría es demasiado largo.");
  }

  if (orden < 0) {
    return fail("El orden debe ser un número positivo.");
  }

  return ok({
    nombre,
    categoria,
    orden,
    descripcion: String(safe.descripcion || "").trim().slice(0, 500) || null,
    is_active: safe.is_active !== false
  });
}

/**
 * Create a new subcategory (admin only)
 * Returns { success, data } or { success: false, error }
 */
export async function createSubcategory(payload) {
  try {
    const validation = validateSubcategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.createSubcategory(validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo crear subcategoría.");
    }

    // Invalidate cache
    allSubcategoriesCache = [];
    return ok(result.data);
  } catch (error) {
    console.error("Error inesperado al crear subcategoría:", error);
    return fail("No se pudo crear subcategoría.");
  }
}

/**
 * Update a subcategory (admin only)
 * Returns { success, data } or { success: false, error }
 */
export async function updateSubcategory(id, payload) {
  if (!id || typeof id !== "string") {
    return fail("ID de subcategoría inválido.");
  }

  try {
    const validation = validateSubcategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.updateSubcategory(id, validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar subcategoría.");
    }

    // Invalidate cache
    allSubcategoriesCache = [];
    return ok(result.data);
  } catch (error) {
    console.error("Error inesperado al actualizar subcategoría:", error);
    return fail("No se pudo actualizar subcategoría.");
  }
}

/**
 * Delete a subcategory (admin only)
 * Returns { success } or { success: false, error }
 */
export async function deleteSubcategory(id) {
  if (!id || typeof id !== "string") {
    return fail("ID de subcategoría inválido.");
  }

  try {
    const result = await subcategoriesApi.deleteSubcategory(id);
    if (result.error) {
      return fail(result.error.message || "No se pudo eliminar subcategoría.");
    }

    // Invalidate cache
    allSubcategoriesCache = [];
    return ok({ deleted: true });
  } catch (error) {
    console.error("Error inesperado al eliminar subcategoría:", error);
    return fail("No se pudo eliminar subcategoría.");
  }
}
