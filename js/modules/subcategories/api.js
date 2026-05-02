import { getSupabaseClient } from "../../core/supabase-client.js";

export async function fetchAllCategories(options = {}) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  const config = options && typeof options === "object" ? options : {};
  let query = client
    .from("categorias")
    .select("*")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (config.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  return query;
}

export async function createCategory(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from("categorias").insert([payload]).select("*").single();
}

export async function updateCategory(id, updates) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from("categorias").update(updates).eq("id", id).select("*").single();
}

export async function deleteCategory(id) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from("categorias").delete().eq("id", id);
}

/**
 * Fetch all active subcategories
 */
export async function fetchAllSubcategories(options = {}) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  const config = options && typeof options === "object" ? options : {};
  let query = client
    .from("subcategorias")
    .select("*")
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });

  if (config.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  return query;
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

export async function fetchSubcategoriesByCategoryId(categoriaId) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  return client
    .from("subcategorias")
    .select("*")
    .eq("categoria_id", categoriaId)
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
    .insert([payload])
    .select("*")
    .single();
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
    .eq("id", id)
    .select("*")
    .single();
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
