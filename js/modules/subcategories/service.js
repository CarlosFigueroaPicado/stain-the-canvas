import * as subcategoriesApi from "./api.js";
import { fail, ok } from "../../core/result.js";

let allSubcategoriesCache = [];
let allCategoriesCache = [];
let subcategoriesCacheTimestamp = 0;
let categoriesCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function clearCaches() {
  allSubcategoriesCache = [];
  allCategoriesCache = [];
  subcategoriesCacheTimestamp = 0;
  categoriesCacheTimestamp = 0;
}

function toOrder(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeCategoryRow(row) {
  const safe = row && typeof row === "object" ? row : {};
  return {
    id: String(safe.id || "").trim(),
    nombre: String(safe.nombre || safe.categoria || "").trim(),
    orden: toOrder(safe.orden),
    is_active: safe.is_active !== false,
    raw: safe
  };
}

function normalizeSubcategoryRow(row) {
  const safe = row && typeof row === "object" ? row : {};
  return {
    ...safe,
    id: String(safe.id || "").trim(),
    nombre: String(safe.nombre || "").trim(),
    categoria: String(safe.categoria || "").trim(),
    categoria_id: String(safe.categoria_id || "").trim() || null,
    descripcion: String(safe.descripcion || "").trim(),
    orden: toOrder(safe.orden),
    is_active: safe.is_active !== false
  };
}

function validateCategoryPayload(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const nombre = String(safe.nombre || "").trim();
  const orden = toOrder(safe.orden);

  if (nombre.length < 2) {
    return fail("El nombre de categoria debe tener al menos 2 caracteres.");
  }

  if (nombre.length > 50) {
    return fail("El nombre de categoria es demasiado largo.");
  }

  return ok({
    nombre,
    orden,
    is_active: safe.is_active !== false
  });
}

function validateSubcategoryPayload(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const nombre = String(safe.nombre || "").trim();
  const categoria = String(safe.categoria || "").trim();
  const categoriaId = String(safe.categoria_id || "").trim() || null;
  const orden = toOrder(safe.orden);

  if (nombre.length < 2) {
    return fail("El nombre de subcategoria debe tener al menos 2 caracteres.");
  }

  if (nombre.length > 100) {
    return fail("El nombre de subcategoria es demasiado largo.");
  }

  if (categoria.length < 2) {
    return fail("La categoria es requerida.");
  }

  if (categoria.length > 50) {
    return fail("El nombre de categoria es demasiado largo.");
  }

  return ok({
    nombre,
    categoria,
    categoria_id: categoriaId,
    orden,
    descripcion: String(safe.descripcion || "").trim().slice(0, 500) || null,
    is_active: safe.is_active !== false
  });
}

export async function getCategoriesWithCache() {
  const now = Date.now();
  if (allCategoriesCache.length > 0 && now - categoriesCacheTimestamp < CACHE_DURATION) {
    return ok(allCategoriesCache);
  }

  try {
    const result = await subcategoriesApi.fetchAllCategories({ activeOnly: true });
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar categorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeCategoryRow).filter((row) => row.nombre) : [];
    allCategoriesCache = data;
    categoriesCacheTimestamp = now;
    return ok(data);
  } catch (error) {
    console.error("Error al cargar categorias:", error);
    return fail("No se pudieron cargar categorias.");
  }
}

export async function getAllCategories() {
  const result = await getCategoriesWithCache();
  if (!result.success) {
    return result;
  }

  return ok(result.data.map((row) => row.nombre).filter(Boolean));
}

export async function getCategoriesForAdmin() {
  try {
    const result = await subcategoriesApi.fetchAllCategories({ activeOnly: false });
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar categorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeCategoryRow).filter((row) => row.nombre) : [];
    return ok(data);
  } catch (error) {
    console.error("Error al cargar categorias para admin:", error);
    return fail("No se pudieron cargar categorias.");
  }
}

export async function getSubcategoriesWithCache() {
  const now = Date.now();
  if (allSubcategoriesCache.length > 0 && now - subcategoriesCacheTimestamp < CACHE_DURATION) {
    return ok(allSubcategoriesCache);
  }

  try {
    const result = await subcategoriesApi.fetchAllSubcategories({ activeOnly: true });
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeSubcategoryRow) : [];
    allSubcategoriesCache = data;
    subcategoriesCacheTimestamp = now;
    return ok(data);
  } catch (error) {
    console.error("Error inesperado al cargar subcategorias:", error);
    return fail("No se pudieron cargar subcategorias.");
  }
}

export async function getSubcategoriesForAdmin() {
  try {
    const result = await subcategoriesApi.fetchAllSubcategories({ activeOnly: false });
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeSubcategoryRow) : [];
    return ok(data);
  } catch (error) {
    console.error("Error al cargar subcategorias para admin:", error);
    return fail("No se pudieron cargar subcategorias.");
  }
}

export async function getSubcategoriesForCategory(categoria) {
  if (!categoria || typeof categoria !== "string") {
    return fail("Categoria invalida.");
  }

  try {
    const result = await subcategoriesApi.fetchSubcategoriesByCategory(categoria);
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeSubcategoryRow) : [];
    return ok(data);
  } catch (error) {
    console.error("Error al cargar subcategorias para categoria:", error);
    return fail("No se pudieron cargar subcategorias.");
  }
}

export async function getSubcategoriesForCategoryId(categoriaId) {
  if (!categoriaId || typeof categoriaId !== "string") {
    return fail("Categoria invalida.");
  }

  try {
    const result = await subcategoriesApi.fetchSubcategoriesByCategoryId(categoriaId);
    if (result.error) {
      return fail(result.error.message || "No se pudieron cargar subcategorias.");
    }

    const data = Array.isArray(result.data) ? result.data.map(normalizeSubcategoryRow) : [];
    return ok(data);
  } catch (error) {
    console.error("Error al cargar subcategorias por categoria:", error);
    return fail("No se pudieron cargar subcategorias.");
  }
}

export async function createCategory(payload) {
  try {
    const validation = validateCategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.createCategory(validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo crear categoria.");
    }

    clearCaches();
    return ok(result.data ? normalizeCategoryRow(result.data) : true);
  } catch (error) {
    console.error("Error inesperado al crear categoria:", error);
    return fail("No se pudo crear categoria.");
  }
}

export async function updateCategory(id, payload) {
  if (!id || typeof id !== "string") {
    return fail("ID de categoria invalido.");
  }

  try {
    const validation = validateCategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.updateCategory(id, validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar categoria.");
    }

    clearCaches();
    return ok(result.data ? normalizeCategoryRow(result.data) : true);
  } catch (error) {
    console.error("Error inesperado al actualizar categoria:", error);
    return fail("No se pudo actualizar categoria.");
  }
}

export async function deleteCategory(id) {
  if (!id || typeof id !== "string") {
    return fail("ID de categoria invalido.");
  }

  try {
    const result = await subcategoriesApi.deleteCategory(id);
    if (result.error) {
      return fail(result.error.message || "No se pudo eliminar categoria.");
    }

    clearCaches();
    return ok({ deleted: true });
  } catch (error) {
    console.error("Error inesperado al eliminar categoria:", error);
    return fail("No se pudo eliminar categoria.");
  }
}

export async function createSubcategory(payload) {
  try {
    const validation = validateSubcategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.createSubcategory(validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo crear subcategoria.");
    }

    clearCaches();
    return ok(result.data ? normalizeSubcategoryRow(result.data) : true);
  } catch (error) {
    console.error("Error inesperado al crear subcategoria:", error);
    return fail("No se pudo crear subcategoria.");
  }
}

export async function updateSubcategory(id, payload) {
  if (!id || typeof id !== "string") {
    return fail("ID de subcategoria invalido.");
  }

  try {
    const validation = validateSubcategoryPayload(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await subcategoriesApi.updateSubcategory(id, validation.data);
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar subcategoria.");
    }

    clearCaches();
    return ok(result.data ? normalizeSubcategoryRow(result.data) : true);
  } catch (error) {
    console.error("Error inesperado al actualizar subcategoria:", error);
    return fail("No se pudo actualizar subcategoria.");
  }
}

export async function deleteSubcategory(id) {
  if (!id || typeof id !== "string") {
    return fail("ID de subcategoria invalido.");
  }

  try {
    const result = await subcategoriesApi.deleteSubcategory(id);
    if (result.error) {
      return fail(result.error.message || "No se pudo eliminar subcategoria.");
    }

    clearCaches();
    return ok({ deleted: true });
  } catch (error) {
    console.error("Error inesperado al eliminar subcategoria:", error);
    return fail("No se pudo eliminar subcategoria.");
  }
}
