import * as productsApi from "./api.js";
import { fail, ok } from "../../core/result.js";
import { getState, setState } from "../../core/store.js";
import { buildProductPayload, normalizeProduct, validateProductInput } from "../../shared/product-utils.js";
import { reportFailure } from "../../core/observability.js";
import { formatFailureMessage, normalizeErrorMessage } from "../../shared/service-errors.js";
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

function failWithTrace(scope, fallbackMessage, error, context = {}) {
  const traceId = reportFailure(scope, error, context);
  return fail(formatFailureMessage(normalizeErrorMessage(error, fallbackMessage), traceId));
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
        return failWithTrace("products.getProducts.api", "No se pudieron cargar productos.", result.error);
      }

      const products = normalizeProducts(result.data || []);
      setProducts(products);
      return ok(products);
    } catch (error) {
      setState({
        productsLoaded: false,
        productsRequest: null
      });
      return failWithTrace("products.getProducts.catch", "No se pudieron cargar productos.", error);
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
        return failWithTrace("products.uploadFiles.upload", "No se pudo subir la imagen.", upload.error, {
          path
        });
      }

      const publicUrl = await productsApi.getPublicUrl(path);
      if (!publicUrl) {
        return failWithTrace("products.uploadFiles.publicUrl", "No se pudo generar URL publica de la imagen.", "public_url_vacia", {
          path
        });
      }

      uploaded.push(publicUrl);
    }

    return ok(uploaded);
  } catch (error) {
    return failWithTrace("products.uploadFiles.catch", "No se pudieron subir las imagenes.", error);
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
      return failWithTrace("products.createProduct.api", "No se pudo crear el producto.", result.error);
    }

    await getProducts({ force: true });
    return ok(true);
  } catch (error) {
    return failWithTrace("products.createProduct.catch", "No se pudo crear el producto.", error);
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
      return failWithTrace("products.updateProduct.api", "No se pudo actualizar el producto.", result.error, {
        productId
      });
    }

    await getProducts({ force: true });
    return ok(true);
  } catch (error) {
    return failWithTrace("products.updateProduct.catch", "No se pudo actualizar el producto.", error, {
      productId
    });
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
      return failWithTrace("products.deleteProduct.api", "No se pudo eliminar el producto.", result.error, {
        productId
      });
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
      if (cleanupError) {
        reportFailure("products.deleteProduct.cleanup", removal.error, {
          productId,
          removablePaths
        });
      }
    }

    await getProducts({ force: true });
    return ok({ skipped, cleanupError });
  } catch (error) {
    return failWithTrace("products.deleteProduct.catch", "No se pudo eliminar el producto.", error, {
      productId
    });
  }
}
