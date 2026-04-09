/* global supabase */

(function initSupabase() {
  const SUPABASE_URL = "https://mmfpivsfjolohoowhgit.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZnBpdnNmam9sb2hvb3doZ2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjQ3MTAsImV4cCI6MjA5MTE0MDcxMH0.7eIIhxG3tfZTGQ2DB8kA-OHl86NYZfQfaV0cGjemu6w";
  const SUPABASE_BUCKET = "productos";
  const PRODUCTS_TABLE = "productos";
  const CATEGORY_PINATAS = "Pi\u00f1atas";

  const appConfig = Object.freeze({
    url: SUPABASE_URL,
    bucket: SUPABASE_BUCKET,
    productsTable: PRODUCTS_TABLE,
    whatsappNumber: "50589187562"
  });

  function toNumber(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    const amount = toNumber(value, 0);
    return new Intl.NumberFormat("es-NI", {
      style: "currency",
      currency: "NIO",
      minimumFractionDigits: 2
    }).format(amount);
  }

  function pickFirst(source, keys, fallback) {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null) {
        return source[key];
      }
    }
    return fallback;
  }

  function normalizeCategory(value) {
    const raw = String(value || "General").trim() || "General";
    const normalized = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const compact = normalized.replace(/[^a-z]/g, "");

    if (compact === "pinatas" || compact === "piatas" || compact.includes("pinata")) {
      return CATEGORY_PINATAS;
    }

    return raw;
  }

  function normalizeProduct(row) {
    const safeRow = row || {};
    const rawId = pickFirst(safeRow, ["id", "uuid", "product_id"], "");
    const id = String(rawId || "");

    const nombre = String(
      pickFirst(safeRow, ["nombre", "name", "titulo", "title"], "Producto artesanal")
    );

    const categoriaRaw = String(pickFirst(safeRow, ["categoria", "category", "tipo"], "General"));
    const categoria = normalizeCategory(categoriaRaw);

    const descripcion = String(
      pickFirst(
        safeRow,
        ["descripcion", "description", "detalle", "detalles", "resumen"],
        "Sin descripcion disponible."
      )
    );

    const precioValue = pickFirst(safeRow, ["precio", "price", "valor"], 0);
    const precio = toNumber(precioValue, 0);

    const imagenUrl = String(
      pickFirst(
        safeRow,
        ["imagen_url", "image_url", "imagen", "foto", "thumbnail_url", "public_url"],
        ""
      )
    );

    const createdAt = String(pickFirst(safeRow, ["created_at", "fecha_creacion"], ""));

    return {
      id,
      nombre,
      categoria,
      descripcion,
      precio,
      imagenUrl,
      createdAt,
      raw: safeRow
    };
  }

  function buildProductPayload(productInput) {
    const input = productInput || {};
    const nombre = String(input.nombre || "").trim();
    const categoria = normalizeCategory(input.categoria);
    const descripcion = String(input.descripcion || "").trim();
    const precio = toNumber(input.precio, 0);
    const imagenUrl = String(input.imagenUrl || "").trim();

    return {
      nombre,
      categoria,
      descripcion,
      precio,
      imagen_url: imagenUrl
    };
  }

  function buildPlaceholderImage(label, size) {
    const safeSize = String(size || "900x700").trim() || "900x700";
    const text = encodeURIComponent((label || "Producto") + " artesanal");
    return `https://placehold.co/${safeSize}/F5E8DA/2B2B2B?text=${text}`;
  }

  function resolveProductImageUrl(productInput) {
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

    if (/^https?:\/\//i.test(rawImage)) {
      return rawImage;
    }

    const encodedPath = rawImage
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join("/");

    return `${appConfig.url}/storage/v1/object/public/${appConfig.bucket}/${encodedPath}`;
  }

  function buildWhatsappProductMessage(productInput) {
    const isObject = productInput && typeof productInput === "object";
    const cleanName = isObject
      ? String(productInput.nombre || "").trim() || "producto"
      : String(productInput || "").trim() || "producto";

    const imageUrl = resolveProductImageUrl(productInput);

    const lines = ["Hola, me interesa este producto:", `Producto: ${cleanName}`];

    if (imageUrl) {
      lines.push(`Imagen: ${imageUrl}`);
    }

    return lines.join("\n");
  }

  function buildWhatsappLink(productInput) {
    const text = buildWhatsappProductMessage(productInput);
    return `https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  window.appConfig = appConfig;
  window.productUtils = Object.freeze({
    normalizeProduct,
    buildProductPayload,
    buildPlaceholderImage,
    formatCurrency,
    buildWhatsappLink,
    escapeHtml
  });

  if (SUPABASE_ANON_KEY.startsWith("sb_secret_")) {
    console.error("La clave configurada parece secreta. Usa una clave publica anon/publishable.");
    window.supabaseClient = null;
    window.getSupabaseClient = function getSupabaseClient() {
      return null;
    };
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase SDK no se cargo correctamente.");
    window.supabaseClient = null;
    window.getSupabaseClient = function getSupabaseClient() {
      return null;
    };
    return;
  }

  if (!window.supabaseClient) {
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false
      }
    });
  }

  window.getSupabaseClient = function getSupabaseClient() {
    return window.supabaseClient;
  };
})();


