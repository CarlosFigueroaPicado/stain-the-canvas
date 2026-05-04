import { getAppConfigSync } from "../../core/config.js";
import { getSupabaseClient } from "../../core/supabase-client.js";

function getTable() {
  return "categorias";
}

/**
 * Fetch all categories from Supabase
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function fetchAllCategoriesAPI() {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "No Supabase client" };
    }

    const { data, error } = await client
      .from(getTable())
      .select("id, nombre, orden, is_active, created_at")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error("Categories API error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch single category by ID
 * @param {string} categoryId
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function fetchCategoryByIdAPI(categoryId) {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "No Supabase client" };
    }

    const { data, error } = await client
      .from(getTable())
      .select("id, nombre, orden, is_active, created_at")
      .eq("id", categoryId)
      .single();

    if (error) {
      console.error("Error fetching category:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("Category API error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create new category (admin only)
 * @param {string} nombre
 * @param {number} orden
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createCategoryAPI(nombre, orden = 0) {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "No Supabase client" };
    }

    const { data, error } = await client
      .from(getTable())
      .insert([
        {
          nombre,
          orden,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Create category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update category (admin only)
 * @param {string} categoryId
 * @param {Object} updates
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateCategoryAPI(categoryId, updates) {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "No Supabase client" };
    }

    const { data, error } = await client
      .from(getTable())
      .update(updates)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      console.error("Error updating category:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Update category error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete category (admin only)
 * @param {string} categoryId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteCategoryAPI(categoryId) {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "No Supabase client" };
    }

    const { error } = await client
      .from(getTable())
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("Error deleting category:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete category error:", error);
    return { success: false, error: error.message };
  }
}
