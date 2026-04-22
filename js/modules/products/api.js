import { getAppConfigSync } from "../../core/config.js";
import { getSupabaseClient } from "../../core/supabase-client.js";

let preferredFetchAttemptIndex = 0;

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
  const attempts = [
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at,featured,clicks,vistas",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at,featured",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at",
      orders: [["created_at", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,featured",
      orders: [["featured", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls"
    }
  ];

  let lastResult = null;
  const orderedAttempts = [
    ...attempts.slice(preferredFetchAttemptIndex),
    ...attempts.slice(0, preferredFetchAttemptIndex)
  ];

  for (let index = 0; index < orderedAttempts.length; index += 1) {
    const attempt = orderedAttempts[index];
    let query = client.from(table).select(attempt.select);

    (attempt.orders || []).forEach(([column, options]) => {
      query = query.order(column, options);
    });

    const result = await query;
    lastResult = result;

    if (!result.error) {
      preferredFetchAttemptIndex = attempts.findIndex((candidate) => candidate.select === attempt.select);
      return result;
    }
  }

  return lastResult || { data: [], error: { message: "No se pudieron cargar productos." } };
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
