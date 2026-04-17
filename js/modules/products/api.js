import { getAppConfigSync } from "../../core/config.js";
import { getSupabaseClient } from "../../core/supabase-client.js";

function getTable() {
  return getAppConfigSync().productsTable || "productos";
}

function getBucket() {
  return getAppConfigSync().bucket || "productos";
}

export async function fetchProducts() {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  const table = getTable();
  let result = await client
    .from(table)
    .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at,featured")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (result.error) {
    const message = String(result.error.message || "");
    const missingCreatedAt = message.includes("created_at");
    const missingFeatured = message.includes("featured");

    if (missingCreatedAt || missingFeatured) {
      result = await client
        .from(table)
        .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at")
        .order("created_at", { ascending: false });
    }
  }

  if (result.error && String(result.error.message || "").includes("created_at")) {
    result = await client
      .from(table)
      .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls");
  }

  return result;
}

export async function insertProduct(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from(getTable()).insert(payload);
}

export async function updateProduct(id, payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from(getTable()).update(payload).eq("id", id);
}

export async function deleteProduct(id) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from(getTable()).delete().eq("id", id);
}

export async function countImageRefByMain(url, excludeId) {
  const client = await getSupabaseClient();
  if (!client) {
    return { count: 0, error: { message: "no_client" } };
  }

  return client
    .from(getTable())
    .select("id", { count: "exact", head: true })
    .eq("imagen_url", url)
    .neq("id", excludeId);
}

export async function countImageRefByGallery(url, excludeId) {
  const client = await getSupabaseClient();
  if (!client) {
    return { count: 0, error: { message: "no_client" } };
  }

  return client
    .from(getTable())
    .select("id", { count: "exact", head: true })
    .contains("gallery_urls", [url])
    .neq("id", excludeId);
}

export async function uploadImage(path, file) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.storage.from(getBucket()).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
}

export async function getPublicUrl(path) {
  const client = await getSupabaseClient();
  if (!client) {
    return "";
  }

  const data = client.storage.from(getBucket()).getPublicUrl(path);
  return data && data.data ? data.data.publicUrl : "";
}

export async function removeStorage(paths) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.storage.from(getBucket()).remove(paths);
}
