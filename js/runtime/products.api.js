(function productsApi() {
  function getClient() {
    return window.getSupabaseClient && typeof window.getSupabaseClient === "function"
      ? window.getSupabaseClient()
      : null;
  }

  function getTable() {
    return (window.appConfig && window.appConfig.productsTable) || "productos";
  }

  function getBucket() {
    return (window.appConfig && window.appConfig.bucket) || "productos";
  }

  async function fetchProducts() {
    const client = getClient();
    if (!client) {
      return { data: [], error: { message: "no_client" } };
    }

    const table = getTable();
    let result = await client
      .from(table)
      .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at")
      .order("created_at", { ascending: false });

    if (result.error && String(result.error.message || "").includes("created_at")) {
      result = await client
        .from(table)
        .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at");
    }

    return result;
  }

  async function insertProduct(payload) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.from(getTable()).insert(payload);
  }

  async function updateProduct(id, payload) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.from(getTable()).update(payload).eq("id", id);
  }

  async function deleteProduct(id) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.from(getTable()).delete().eq("id", id);
  }

  async function countImageRefByMain(url, excludeId) {
    const client = getClient();
    if (!client) {
      return { count: 0, error: { message: "no_client" } };
    }

    return client.from(getTable()).select("id", { count: "exact", head: true }).eq("imagen_url", url).neq("id", excludeId);
  }

  async function countImageRefByGallery(url, excludeId) {
    const client = getClient();
    if (!client) {
      return { count: 0, error: { message: "no_client" } };
    }

    return client
      .from(getTable())
      .select("id", { count: "exact", head: true })
      .contains("gallery_urls", [url])
      .neq("id", excludeId);
  }

  async function uploadImage(path, file) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.storage.from(getBucket()).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });
  }

  function getPublicUrl(path) {
    const client = getClient();
    if (!client) {
      return "";
    }

    const data = client.storage.from(getBucket()).getPublicUrl(path);
    return data && data.data ? data.data.publicUrl : "";
  }

  async function removeStorage(paths) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.storage.from(getBucket()).remove(paths);
  }

  window.stcApis = window.stcApis || {};
  window.stcApis.products = Object.freeze({
    fetchProducts,
    insertProduct,
    updateProduct,
    deleteProduct,
    countImageRefByMain,
    countImageRefByGallery,
    uploadImage,
    getPublicUrl,
    removeStorage
  });
})();
