import { getSupabaseClient } from "../../core/supabase-client.js";

/**
 * Fetch all active subcategories
 */
export async function fetchAllSubcategories() {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .select("*")
    .eq("is_active", true)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });
}

/**
 * Fetch subcategories by category name
 * @param {string} categoria - Category name (e.g., "Bisuteria")
 */
export async function fetchSubcategoriesByCategory(categoria) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .select("*")
    .eq("categoria", categoria)
    .eq("is_active", true)
    .order("orden", { ascending: true });
}

/**
 * Create a new subcategory (admin only)
 * @param {Object} payload - { nombre, categoria, descripcion?, orden? }
 */
export async function createSubcategory(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .insert([payload]);
}

/**
 * Update a subcategory (admin only)
 * @param {string} id - Subcategory UUID
 * @param {Object} updates - Fields to update
 */
export async function updateSubcategory(id, updates) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .update(updates)
    .eq("id", id);
}

/**
 * Delete a subcategory (admin only)
 * @param {string} id - Subcategory UUID
 */
export async function deleteSubcategory(id) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .delete()
    .eq("id", id);
}

/**
 * Get all unique categories (for UI filtering)
 */
export async function fetchAllCategories() {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .select("categoria", { distinct: true })
    .eq("is_active", true)
    .order("categoria", { ascending: true });
}
