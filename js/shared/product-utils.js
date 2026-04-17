import { getAppConfigSync } from "../core/config.js";

const CATEGORY_PINATAS = "Pinatas";

function pickFirst(source, keys, fallback) {
  const input = source && typeof source === "object" ? source : {};

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] != null) {
      return input[key];
    }
  }

  return fallback;
}

export function toNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoolean(value) {
  return value === true || String(value || "").toLowerCase() === "true" || value === 1 || value === "1";
}

export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatCurrency(value) {
  const amount = toNumber(value, 0);
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2
  }).format(amount);
}

export function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeCategory(value) {
  const raw = String(value || "General").trim() || "General";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, "");

  if (compact === "pinatas" || compact.includes("pinata")) {
    return CATEGORY_PINATAS;
  }

  return raw;
}

export function buildPlaceholderImage(label, size) {
  const safeSize = String(size || "900x700").trim() || "900x700";
  const text = encodeURIComponent((label || "Producto") + " artesanal");
  return `https://placehold.co/${safeSize}/F5E8DA/2B2B2B?text=${text}`;
}

function resolveStorageAssetUrl(rawPath) {
  const config = getAppConfigSync();
  if (!config.url || !config.bucket) {
    return rawPath;
  }

  const encodedPath = String(rawPath || "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${config.url}/storage/v1/object/public/${config.bucket}/${encodedPath}`;
}

export function resolveProductImageUrl(productInput) {
  if (!productInput || typeof productInput !== "object") {
    return "";
  }

  const rawImage = String(
    pickFirst(
      productInput,
      ["imagenUrl", "imagen_url", "image_url", "imagen", "foto", "thumbnail_url", "public_url"],
      ""
    )
  ).trim();

  if (!rawImage) {
    return "";
  }

  if (isHttpUrl(rawImage)) {
    return rawImage;
  }

  return resolveStorageAssetUrl(rawImage);
}

export function getProductGalleryUrls(productInput) {
  if (!productInput || typeof productInput !== "object") {
    return [];
  }

  const rawGallery = pickFirst(productInput, ["galleryUrls", "gallery_urls", "galeria", "imagenes"], []);
  if (!Array.isArray(rawGallery)) {
    return [];
  }

  return rawGallery
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((url) => (isHttpUrl(url) ? url : resolveStorageAssetUrl(url)));
}

export function getProductImageUrls(productInput, placeholderSize) {
  const imageUrl = resolveProductImageUrl(productInput);
  const gallery = getProductGalleryUrls(productInput);
  const unique = Array.from(new Set([imageUrl, ...gallery].filter(Boolean)));

  if (unique.length > 0) {
    return unique;
  }

  const label =
    productInput && typeof productInput === "object" && productInput.nombre
      ? productInput.nombre
      : "Producto";

  return [buildPlaceholderImage(label, placeholderSize || "900x700")];
}

export function validateProductInput(productInput) {
  const input = productInput && typeof productInput === "object" ? productInput : {};
  const nombre = String(input.nombre || "").trim();
  const categoria = String(input.categoria || "").trim();
  const descripcion = String(input.descripcion || "").trim();
  const precio = toNumber(input.precio, Number.NaN);
  const imagenUrl = String(input.imagenUrl || input.imagen_url || "").trim();
  const galleryUrls = Array.isArray(input.galleryUrls)
    ? input.galleryUrls.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

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

  if (
    input.featured != null &&
    typeof input.featured !== "boolean" &&
    !["true", "false", "1", "0"].includes(String(input.featured))
  ) {
    return "El campo featured debe ser booleano.";
  }

  if (imagenUrl && !isHttpUrl(imagenUrl)) {
    return "La URL de imagen debe iniciar con http:// o https://";
  }

  const invalidGalleryUrl = galleryUrls.find((url) => !isHttpUrl(url));
  if (invalidGalleryUrl) {
    return "Las imagenes de galeria deben usar URLs http:// o https://";
  }

  return "";
}

export function buildProductPayload(productInput) {
  const input = productInput && typeof productInput === "object" ? productInput : {};
  const nombre = String(input.nombre || "").trim();
  const categoria = normalizeCategory(input.categoria);
  const descripcion = String(input.descripcion || "").trim();
  const precio = toNumber(input.precio, 0);
  const imagenUrl = String(input.imagenUrl || "").trim();
  const featured = toBoolean(input.featured);
  const galleryUrls = Array.isArray(input.galleryUrls)
    ? input.galleryUrls.map((item) => String(item || "").trim()).filter(Boolean)
    : imagenUrl
      ? [imagenUrl]
      : [];

  return {
    nombre,
    categoria,
    descripcion,
    precio,
    imagen_url: imagenUrl,
    gallery_urls: galleryUrls,
    featured
  };
}

export function normalizeProduct(row) {
  const safeRow = row || {};
  const rawId = pickFirst(safeRow, ["id", "uuid", "product_id"], "");
  const id = String(rawId || "");
  const nombre = String(pickFirst(safeRow, ["nombre", "name", "titulo", "title"], "Producto artesanal"));
  const categoria = normalizeCategory(
    String(pickFirst(safeRow, ["categoria", "category", "tipo"], "General"))
  );
  const descripcion = String(
    pickFirst(
      safeRow,
      ["descripcion", "description", "detalle", "detalles", "resumen"],
      "Sin descripcion disponible."
    )
  );
  const precio = toNumber(pickFirst(safeRow, ["precio", "price", "valor"], 0), 0);
  const imagenUrl = resolveProductImageUrl(safeRow);
  const galleryUrls = getProductGalleryUrls(safeRow);
  const createdAt = String(pickFirst(safeRow, ["created_at", "fecha_creacion"], ""));
  const featured = toBoolean(pickFirst(safeRow, ["featured", "destacado"], false));

  return {
    id,
    nombre,
    categoria,
    descripcion,
    precio,
    imagenUrl,
    galleryUrls: galleryUrls.length > 0 ? galleryUrls : imagenUrl ? [imagenUrl] : [],
    createdAt,
    featured,
    raw: safeRow
  };
}

function pickWhatsappPreviewImage(productInput) {
  const images = getProductImageUrls(productInput, "900x700");
  const preferred = images.find((url) => /\.(jpe?g|png)(\?|$)/i.test(url));
  return preferred || images[0] || "";
}

export function buildWhatsappLink(productInput) {
  const config = getAppConfigSync();
  const cleanName =
    productInput && typeof productInput === "object"
      ? String(productInput.nombre || "").trim() || "producto"
      : String(productInput || "").trim() || "producto";
  const imageUrl = pickWhatsappPreviewImage(productInput);
  const lines = ["Hola, me interesa este producto:", `Producto: ${cleanName}`];

  if (imageUrl) {
    lines.push("");
    lines.push(imageUrl);
  }

  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}
