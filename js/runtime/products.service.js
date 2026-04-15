(function productsService() {
  const api = window.stcApis && window.stcApis.products;

  function success(data) {
    return { success: true, data: data == null ? null : data };
  }

  function ok(data) {
    return success(data);
  }

  function fail(message) {
    return { success: false, error: String(message || "Operacion no completada.") };
  }

  function isHttpUrl(value) {
    try {
      const parsed = new URL(String(value || ""));
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function validateProductPayload(payload) {
    const input = payload && typeof payload === "object" ? payload : {};
    const nombre = String(input.nombre || "").trim();
    const categoria = String(input.categoria || "").trim();
    const descripcion = String(input.descripcion || "").trim();
    const precio = Number.parseFloat(input.precio);
    const imageUrl = String(input.imagen_url || input.imagenUrl || "").trim();

    if (nombre.length < 3) {
      return "El nombre debe tener al menos 3 caracteres.";
    }

    if (!categoria) {
      return "Selecciona una categoria valida.";
    }

    if (!Number.isFinite(precio) || precio < 0) {
      return "El precio debe ser un numero mayor o igual a 0.";
    }

    if (descripcion.length < 10) {
      return "La descripcion debe tener al menos 10 caracteres.";
    }

    if (imageUrl && !isHttpUrl(imageUrl)) {
      return "La URL de imagen debe iniciar con http:// o https://";
    }

    return "";
  }

  function toSlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  function normalizeProducts(rows) {
    const source = Array.isArray(rows) ? rows : [];
    return source.map((row) => window.productUtils.normalizeProduct(row));
  }

  async function getProducts() {
    try {
      if (!api) {
        return fail("No se pudo conectar a Supabase.");
      }

      const result = await api.fetchProducts();
      if (result.error) {
        return fail(result.error.message || "No se pudieron cargar productos.");
      }

      return ok(normalizeProducts(result.data || []));
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return fail("No se pudieron cargar productos.");
    }
  }

  async function uploadFiles(files, prefix) {
    try {
      if (!api) {
        return fail("No se pudo conectar a Supabase para subir imagenes.");
      }

      const selected = Array.isArray(files) ? files : [];
      const uploaded = [];

      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
        const base = toSlug(`${prefix || "producto"}-${index + 1}`) || "producto";
        const path = `catalogo/${Date.now()}-${base}.${extension}`;
        const upload = await api.uploadImage(path, file);

        if (upload.error) {
          return fail(upload.error.message || "No se pudo subir la imagen.");
        }

        const publicUrl = api.getPublicUrl(path);
        if (!publicUrl) {
          return fail("No se pudo generar URL publica de la imagen.");
        }

        uploaded.push(publicUrl);
      }

      return ok(uploaded);
    } catch (error) {
      console.error("Error al subir imagenes:", error);
      return fail("No se pudieron subir las imagenes.");
    }
  }

  async function createProduct(payload) {
    try {
      if (!api) {
        return fail("No se pudo conectar a Supabase.");
      }

      const validationError = validateProductPayload(payload);
      if (validationError) {
        return fail(validationError);
      }

      const result = await api.insertProduct(payload);
      if (result.error) {
        return fail(result.error.message || "No se pudo crear el producto.");
      }

      return success();
    } catch (error) {
      console.error("Error al crear producto:", error);
      return fail("No se pudo crear el producto.");
    }
  }

  async function updateProduct(editingId, payload) {
    try {
      if (!api) {
        return fail("No se pudo conectar a Supabase.");
      }

      if (!String(editingId || "").trim()) {
        return fail("No se encontro el identificador del producto para actualizar.");
      }

      const validationError = validateProductPayload(payload);
      if (validationError) {
        return fail(validationError);
      }

      const result = await api.updateProduct(editingId, payload);
      if (result.error) {
        return fail(result.error.message || "No se pudo actualizar el producto.");
      }

      return success();
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      return fail("No se pudo actualizar el producto.");
    }
  }

  function extractStoragePathFromPublicUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) {
      return "";
    }

    if (!/^https?:\/\//i.test(raw)) {
      return raw.replace(/^\/+/, "");
    }

    try {
      const parsed = new URL(raw);
      const marker = `/storage/v1/object/public/${window.appConfig.bucket}/`;
      const path = parsed.pathname;
      const markerIndex = path.indexOf(marker);
      if (markerIndex === -1) {
        return "";
      }

      return decodeURIComponent(path.slice(markerIndex + marker.length));
    } catch (_) {
      return "";
    }
  }

  async function isImageReferencedElsewhere(currentProductId, url) {
    if (!url) {
      return false;
    }

    const [mainRef, galleryRef] = await Promise.all([
      api.countImageRefByMain(url, currentProductId),
      api.countImageRefByGallery(url, currentProductId)
    ]);

    if (mainRef.error || galleryRef.error) {
      return true;
    }

    return Number(mainRef.count || 0) + Number(galleryRef.count || 0) > 0;
  }

  async function deleteProduct(productId, currentProduct) {
    try {
      if (!api) {
        return fail("No se pudo conectar a Supabase.");
      }

      const result = await api.deleteProduct(productId);
      if (result.error) {
        return fail(result.error.message || "No se pudo eliminar el producto.");
      }

      const imageUrls = new Set();
      if (currentProduct && currentProduct.imagenUrl) {
        imageUrls.add(currentProduct.imagenUrl);
      }
      if (currentProduct && Array.isArray(currentProduct.galleryUrls)) {
        currentProduct.galleryUrls.forEach((url) => {
          if (url) {
            imageUrls.add(url);
          }
        });
      }

      const paths = [];
      let skipped = 0;
      for (const url of imageUrls) {
        const path = extractStoragePathFromPublicUrl(url);
        if (!path) {
          continue;
        }

        const referenced = await isImageReferencedElsewhere(productId, url);
        if (referenced) {
          skipped += 1;
        } else {
          paths.push(path);
        }
      }

      let cleanupError = false;
      if (paths.length > 0) {
        const removal = await api.removeStorage(paths);
        cleanupError = Boolean(removal.error);
      }

      return success({ skipped, cleanupError });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      return fail("No se pudo eliminar el producto.");
    }
  }

  async function fetchFeaturedProducts(featuredDefaults) {
    try {
      const productsResult = await getProducts();
      if (!productsResult.success) {
        return fail(productsResult.error || "No se pudieron cargar productos destacados.");
      }

      const all = productsResult.data || [];
      const byId = new Map(all.map((item) => [String(item.id || ""), item]));
      const defaults = Array.isArray(featuredDefaults) ? featuredDefaults : [];

      const merged = defaults.map((fallback) => {
        const row = byId.get(String(fallback.id || ""));
        return row
          ? {
              ...fallback,
              ...row,
              imagenUrl: row.imagenUrl || fallback.imagenUrl
            }
          : fallback;
      });

      return ok(merged);
    } catch (error) {
      console.error("Error al cargar destacados:", error);
      return fail("No se pudieron cargar productos destacados.");
    }
  }

  function getModule() {
    return window.productosModule || null;
  }

  function ensureInitialized() {
    try {
      const module = getModule();
      if (!module || typeof module.initProductos !== "function") {
        return fail("Modulo de productos no disponible.");
      }

      return ok(Boolean(module.initProductos()));
    } catch (error) {
      console.error("Error inicializando modulo de productos:", error);
      return fail("No se pudo inicializar el modulo de productos.");
    }
  }

  async function loadProducts() {
    try {
      const module = getModule();
      if (!module || typeof module.cargarProductos !== "function") {
        return fail("Modulo de productos no disponible.");
      }

      await module.cargarProductos();
      return ok(true);
    } catch (error) {
      console.error("Error cargando modulo de productos:", error);
      return fail("No se pudieron cargar productos.");
    }
  }

  const service = Object.freeze({
    getProducts,
    uploadFiles,
    createProduct,
    updateProduct,
    deleteProduct,
    fetchFeaturedProducts,
    ensureInitialized,
    loadProducts
  });

  window.stcServices = window.stcServices || {};
  window.stcServices.products = service;
})();
