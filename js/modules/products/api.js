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
  // Nuevas queries con soporte a product_media (JOIN left implícito en Supabase)
  const attempts = [
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,clicks,vistas,product_media(id,type,url,position,is_primary,created_at)",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,clicks,vistas,product_media(id,type,url,position,is_primary,created_at)",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,product_media(id,type,url,position,is_primary)",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,product_media(id,type,url,position,is_primary)",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,product_media(id,type,url,position,is_primary)",
      orders: [["created_at", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,product_media(id,type,url,position,is_primary)",
      orders: [["created_at", { ascending: false }]]
    },
    // Fallback a queries viejas (por si product_media tabla no existe aún)
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas",
      orders: [
        ["featured", { ascending: false }],
        ["created_at", { ascending: false }]
      ]
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured",
      orders: [["featured", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,featured",
      orders: [["featured", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url"
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url"
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

export async function fetchProductById(productId) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: "no_client" } };
  }

  const table = getTable();
  // Intentar queries con producto_media join
  const attempts = [
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,clicks,vistas,product_media(id,type,url,position,is_primary,created_at)"
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,created_at,featured,clicks,vistas,product_media(id,type,url,position,is_primary)"
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured,product_media(id,type,url,position,is_primary)"
    },
    // Fallback sin product_media
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas"
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas"
    }
  ];

  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const query = client.from(table).select(attempts[i].select).eq("id", productId).single();
      const { data, error } = await query;
      
      if (error) {
        console.debug(`Query attempt ${i + 1} failed:`, error.message);
        continue;
      }

      return { data, error: null };
    } catch (err) {
      console.debug(`Query attempt ${i + 1} error:`, err.message);
      continue;
    }
  }

  return { data: null, error: { message: "Producto no encontrado." } };
}

export async function insertProduct(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from(getTable()).insert(payload);
}

export async function fetchProductsByCategory(categoryName, options = {}) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  const table = getTable();
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 10;
  
  // Intentar queries
  const attempts = [
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas,product_media(id,type,url,position,is_primary)",
      orders: [["featured", { ascending: false }], ["created_at", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,featured,clicks,vistas,product_media(id,type,url,position,is_primary)",
      orders: [["featured", { ascending: false }], ["created_at", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,video_url,featured",
      orders: [["featured", { ascending: false }]]
    },
    {
      select: "id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,video_url,featured",
      orders: [["featured", { ascending: false }]]
    }
  ];

  for (let i = 0; i < attempts.length; i += 1) {
    try {
      let query = client.from(table).select(attempts[i].select).eq("categoria", categoryName);
      
      // Aplicar órdenes
      if (Array.isArray(attempts[i].orders)) {
        for (let j = 0; j < attempts[i].orders.length; j += 1) {
          const [field, orderOptions] = attempts[i].orders[j];
          query = query.order(field, orderOptions);
        }
      }
      
      query = query.limit(limit);
      const { data, error } = await query;
      
      if (error) {
        console.debug(`Query attempt ${i + 1} for category "${categoryName}" failed:`, error.message);
        continue;
      }

      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.debug(`Query attempt ${i + 1} for category "${categoryName}" error:`, err.message);
      continue;
    }
  }

  return { data: [], error: { message: "No se pudieron cargar productos." } };
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
