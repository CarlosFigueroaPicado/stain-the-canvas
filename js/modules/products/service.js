import * as productsApi from "./api.js";
import { fail, ok } from "../../core/result.js";
import { getState, setState } from "../../core/store.js";
import { buildProductPayload, normalizeProduct, validateProductInput } from "../../shared/product-utils.js";
import { getAppConfigSync } from "../../core/config.js";

function normalizeProducts(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeProduct(row));
}

function setProducts(products) {
  console.assert(Array.isArray(products), "setProducts esperaba un arreglo");
  setState({
    products,
    productsLoaded: true,
    productsRequest: null
  });
}

export async function getProducts(options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const state = getState();

  if (!config.force && state.productsLoaded) {
    return ok(state.products);
  }

  if (!config.force && state.productsRequest) {
    return state.productsRequest;
  }

  const request = (async () => {
    try {
      const result = await productsApi.fetchProducts();
      if (result.error) {
        setState({
          productsLoaded: false,
          productsRequest: null
        });
        return fail(result.error.message || "No se pudieron cargar productos.");
      }

      const products = normalizeProducts(result.data || []);
      setProducts(products);
      return ok(products);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setState({
        productsLoaded: false,
        productsRequest: null
      });
      return fail("No se pudieron cargar productos.");
    }
  })();

  setState({ productsRequest: request });
  return request;
}

export async function getFeaturedProducts(options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const limit = Number.isInteger(config.limit) && config.limit > 0 ? config.limit : 3;
  const productsResult = await getProducts({ force: config.force === true });

  if (!productsResult.success) {
    return productsResult;
  }

  const allProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
  const featuredProducts = allProducts.filter((product) => product.featured);
  const fallbackProducts = featuredProducts.length > 0 ? featuredProducts : allProducts;

  return ok(fallbackProducts.slice(0, limit));
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function uploadFiles(files, prefix) {
  try {
    const selected = Array.isArray(files) ? files : [];
    const uploaded = [];
    const batchId = Date.now();

    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      const rawExtension = (file.name.split(".").pop() || "jpg").toLowerCase();
      const extension = /^[a-z0-9]+$/.test(rawExtension) ? rawExtension : "jpg";
      const base = toSlug(`${prefix || "producto"}-${index + 1}`) || "producto";
      const path = `catalogo/${batchId}-${base}.${extension}`;
      const upload = await productsApi.uploadImage(path, file);

      if (upload.error) {
        return fail(upload.error.message || "No se pudo subir la imagen.");
      }

      const publicUrl = await productsApi.getPublicUrl(path);
      if (!publicUrl) {
        return fail("No se pudo generar URL pública de la imagen.");
      }

      uploaded.push(publicUrl);
    }

    return ok(uploaded);
  } catch (error) {
    console.error("Error al subir imágenes:", error);
    return fail("No se pudieron subir las imágenes.");
  }
}

export async function createProduct(productInput) {
  try {
    const validationError = validateProductInput(productInput);
    if (validationError) {
      return fail(validationError);
    }

    const result = await productsApi.insertProduct(buildProductPayload(productInput));
    if (result.error) {
      return fail(result.error.message || "No se pudo crear el producto.");
    }

    await getProducts({ force: true });
    return ok(true);
  } catch (error) {
    console.error("Error al crear producto:", error);
    return fail("No se pudo crear el producto.");
  }
}

export async function updateProduct(productId, productInput) {
  try {
    if (!String(productId || "").trim()) {
      return fail("No se encontro el identificador del producto para actualizar.");
    }

    const validationError = validateProductInput(productInput);
    if (validationError) {
      return fail(validationError);
    }

    const result = await productsApi.updateProduct(productId, buildProductPayload(productInput));
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar el producto.");
    }

    await getProducts({ force: true });
    return ok(true);
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
    const config = getAppConfigSync();
    const marker = `/storage/v1/object/public/${config.bucket}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return "";
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return "";
  }
}

async function isImageReferencedElsewhere(currentProductId, url) {
  if (!url) {
    return false;
  }

  const [mainRef, galleryRef] = await Promise.all([
    productsApi.countImageRefByMain(url, currentProductId),
    productsApi.countImageRefByGallery(url, currentProductId)
  ]);

  if (mainRef.error || galleryRef.error) {
    return true;
  }

  return Number(mainRef.count || 0) + Number(galleryRef.count || 0) > 0;
}

export async function deleteProduct(productId, currentProduct) {
  try {
    const result = await productsApi.deleteProduct(productId);
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

    const removablePaths = [];
    let skipped = 0;

    for (const url of imageUrls) {
      const path = extractStoragePathFromPublicUrl(url);
      if (!path) {
        continue;
      }

      if (await isImageReferencedElsewhere(productId, url)) {
        skipped += 1;
      } else {
        removablePaths.push(path);
      }
    }

    let cleanupError = false;
    if (removablePaths.length > 0) {
      const removal = await productsApi.removeStorage(removablePaths);
      cleanupError = Boolean(removal.error);
    }

    await getProducts({ force: true });
    return ok({ skipped, cleanupError });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return fail("No se pudo eliminar el producto.");
  }
}
