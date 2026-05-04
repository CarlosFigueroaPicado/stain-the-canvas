import { getState, subscribe } from "../../../core/store.js";
import { createProduct, deleteProduct, getProducts, updateProduct, uploadFiles, uploadVideo } from "../service.js";
import { buildPlaceholderImage, escapeHtml, formatCurrency, normalizeCategory } from "../../../shared/product-utils.js";
import { shouldUseCarousel } from "./shared.js";
import {
  getCategoriesWithCache,
  getSubcategoriesForCategory,
  getSubcategoriesForCategoryId
} from "../../subcategories/service.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jfif"
]);

// Video support (Estrategia A: Minimal implementation)
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime"
]);

const refs = {
  section: null,
  form: null,
  status: null,
  tableBody: null,
  productId: null,
  nombre: null,
  categoria: null,
  subcategory: null,
  precio: null,
  descripcion: null,
  featured: null,
  imagen: null,
  imagePreviewContainer: null,
  video: null,
  videoPreviewContainer: null,
  saveBtn: null,
  resetBtn: null
};

const state = {
  initialized: false,
  editingId: null,
  categoryOptionsLoaded: false,
  previewObjectUrls: []
};

function getAlertClass(kind) {
  switch (kind) {
    case "success":
      return "alert alert-success";
    case "danger":
      return "alert alert-danger";
    default:
      return "alert alert-brand-subtle";
  }
}

function setStatus(message, kind) {
  if (!refs.status) {
    return;
  }

  refs.status.className = getAlertClass(kind);
  refs.status.textContent = message;
}

function clearPreviewObjectUrls() {
  state.previewObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // No rompemos el flujo si el browser ya limpio la URL.
    }
  });

  state.previewObjectUrls = [];
}

function setImagePreview(urls, label) {
  if (!refs.imagePreviewContainer) {
    return;
  }

  const source = Array.isArray(urls) ? urls : [urls];
  const cleaned = Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean)));

  if (cleaned.length === 0) {
    refs.imagePreviewContainer.classList.add("d-none");
    refs.imagePreviewContainer.innerHTML = "";
    return;
  }

  const safeLabel = escapeHtml(String(label || "Preview"));

  if (!shouldUseCarousel(cleaned)) {
    refs.imagePreviewContainer.innerHTML = `
      <img class="admin-image-preview" src="${escapeHtml(cleaned[0])}" alt="${safeLabel}" />
    `;
    refs.imagePreviewContainer.classList.remove("d-none");
    return;
  }

  const carouselId = "adminPreviewCarousel";
  refs.imagePreviewContainer.innerHTML = `
    <div id="${carouselId}" class="carousel slide admin-preview-carousel" data-bs-ride="false">
      <div class="carousel-indicators">
        ${cleaned
          .map((_, index) => {
            const activeClass = index === 0 ? "active" : "";
            const ariaCurrent = index === 0 ? 'aria-current="true"' : "";
            return `
              <button
                type="button"
                data-bs-target="#${carouselId}"
                data-bs-slide-to="${index}"
                class="${activeClass}"
                ${ariaCurrent}
                aria-label="Imagen ${index + 1} de ${cleaned.length}"
              ></button>
            `;
          })
          .join("")}
      </div>
      <div class="carousel-inner">
        ${cleaned
          .map((url, index) => {
            const activeClass = index === 0 ? "active" : "";
            return `
              <div class="carousel-item ${activeClass}">
                <img class="d-block w-100 admin-image-preview" src="${escapeHtml(url)}" alt="${safeLabel} ${index + 1}" />
              </div>
            `;
          })
          .join("")}
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" aria-label="Imagen previa">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next" aria-label="Imagen siguiente">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
      </button>
    </div>
  `;
  refs.imagePreviewContainer.classList.remove("d-none");
}

function setVideoPreview(url, label) {
  if (!refs.videoPreviewContainer) {
    return;
  }

  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) {
    refs.videoPreviewContainer.classList.add("d-none");
    refs.videoPreviewContainer.innerHTML = "";
    return;
  }

  const safeLabel = escapeHtml(String(label || "Preview de video"));

  refs.videoPreviewContainer.innerHTML = `
    <div class="admin-video-preview-wrapper">
      <p class="form-text small text-muted-brand mb-2">Preview del video:</p>
      <video class="admin-video-preview" controls style="max-width: 100%; max-height: 300px; border-radius: 0.5rem;">
        <source src="${escapeHtml(cleanUrl)}" type="video/mp4" />
        Tu navegador no soporta reproducción de videos HTML5.
      </video>
    </div>
  `;
  refs.videoPreviewContainer.classList.remove("d-none");
}

function setLoading(loading) {
  refs.saveBtn.disabled = loading;
  refs.resetBtn.disabled = loading;
  refs.saveBtn.textContent = loading
    ? "Guardando..."
    : state.editingId
      ? "Actualizar producto"
      : "Guardar producto";
}

function resetForm() {
  refs.form.reset();
  state.editingId = null;
  refs.productId.value = "";
  refs.featured.checked = false;
  refs.saveBtn.textContent = "Guardar producto";
  refs.subcategory.value = "";
  clearPreviewObjectUrls();
  setImagePreview([]);
  setVideoPreview("");
  populateCategoryOptions().then(() => populateSubcategoriesForCategory(refs.categoria.value));
}

function ensureCategoryOption(category) {
  const normalized = normalizeCategory(category);
  if (!normalized || !refs.categoria) {
    return;
  }

  const exists = Array.from(refs.categoria.options).some(
    (option) => String(option.value || "").trim() === normalized
  );

  if (!exists) {
    const option = document.createElement("option");
    option.value = normalized;
    option.textContent = normalized;
    refs.categoria.appendChild(option);
  }
}

async function populateCategoryOptions(selectedCategory = "") {
  if (!refs.categoria) {
    return;
  }

  const previousValue = normalizeCategory(selectedCategory || refs.categoria.value);
  const fallbackCategories = ["Bisutería", "Accesorios", "Manualidades y Arreglos", "Decoraciones"];

  try {
    const result = await getCategoriesWithCache();
    const source =
      result.success && Array.isArray(result.data) && result.data.length
        ? result.data.map((category) => category.nombre)
        : fallbackCategories;
    const categories = Array.from(new Set(source.map((item) => normalizeCategory(item)).filter(Boolean)));

    refs.categoria.innerHTML = categories
      .map((category) => {
        const categoryInfo =
          result.success && Array.isArray(result.data)
            ? result.data.find((item) => normalizeCategory(item.nombre) === category)
            : null;
        const categoryId = categoryInfo && categoryInfo.id ? ` data-category-id="${escapeHtml(categoryInfo.id)}"` : "";
        return `<option value="${escapeHtml(category)}"${categoryId}>${escapeHtml(category)}</option>`;
      })
      .join("");

    if (previousValue) {
      ensureCategoryOption(previousValue);
      refs.categoria.value = previousValue;
    }

    state.categoryOptionsLoaded = true;
  } catch (error) {
    console.error("No se pudieron cargar categorias para productos:", error);
    if (!refs.categoria.options.length) {
      refs.categoria.innerHTML = fallbackCategories
        .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
        .join("");
    }
  }
}

function fillForm(product) {
  state.editingId = product.id;
  refs.productId.value = product.id;
  refs.nombre.value = product.nombre;
  const normalizedCategory = normalizeCategory(product.categoria);
  ensureCategoryOption(normalizedCategory);
  refs.categoria.value = normalizedCategory;
  refs.precio.value = String(product.precio);
  refs.descripcion.value = product.descripcion;
  refs.featured.checked = product.featured === true;
  refs.imagen.value = "";
  refs.video.value = "";
  refs.saveBtn.textContent = "Actualizar producto";
  setImagePreview(product.galleryUrls.length ? product.galleryUrls : [product.imagenUrl], product.nombre);
  
  // Show video preview if video_url exists (Estrategia A)
  if (product.videoUrl) {
    setVideoPreview(product.videoUrl, product.nombre);
  } else {
    setVideoPreview("");
  }
  
  // Load subcategories for this category and set the current subcategory
  populateSubcategoriesForCategory(normalizedCategory, product.subcategory_id);
}

function getFormInput() {
  return {
    nombre: refs.nombre.value,
    categoria: refs.categoria.value,
    subcategory_id: refs.subcategory.value || null,
    precio: refs.precio.value,
    descripcion: refs.descripcion.value,
    featured: refs.featured.checked
  };
}

function validateSelectedFile(file) {
  if (!file) {
    return "";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "La imagen supera 5MB. Sube un archivo más liviano.";
  }

  const type = String(file.type || "").toLowerCase();
  if (type && !ALLOWED_IMAGE_TYPES.has(type) && !type.startsWith("image/")) {
    return "Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.";
  }

  return "";
}

// Validate single video file (Estrategia A)
function validateSelectedVideoFile(file) {
  if (!file) {
    return "";
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return `El video supera 100MB (tu archivo: ${sizeMB}MB). Sube un archivo más liviano o comprimido.`;
  }

  const type = String(file.type || "").toLowerCase();
  if (type && !ALLOWED_VIDEO_TYPES.has(type) && !type.startsWith("video/")) {
    return `Formato de video no permitido: "${type}". Usa MP4, WEBM, OGG o MOV.`;
  }

  // TODO: Validate video codec, bitrate, resolution
  // - [ ] In future: ensure compatibility with different devices
  // - [ ] Consider: transcode on upload vs on-demand streaming

  return "";
}

function validateSelectedFiles(files) {
  const selected = Array.isArray(files) ? files : [];
  for (let index = 0; index < selected.length; index += 1) {
    const fileError = validateSelectedFile(selected[index]);
    if (fileError) {
      return fileError;
    }
  }

  return "";
}

function renderTable() {
  const products = getState().products;

  if (!products.length) {
    refs.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted-brand py-4">No hay productos registrados.</td>
      </tr>
    `;
    return;
  }

  refs.tableBody.innerHTML = products
    .map((product, index) => {
      const imageSrc = product.imagenUrl || buildPlaceholderImage(product.nombre, "320x240");
      const featuredBadge = product.featured
        ? '<span class="badge rounded-pill text-bg-warning ms-2">Destacado</span>'
        : "";

      return `
        <tr>
          <td>
            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.nombre)}" class="admin-table-image" loading="lazy" />
          </td>
          <td>
            <strong>${escapeHtml(product.nombre)}</strong>${featuredBadge}
            <div class="small text-muted-brand">${escapeHtml(product.descripcion)}</div>
          </td>
          <td>${escapeHtml(product.categoria)}</td>
          <td>${formatCurrency(product.precio)}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-sm btn-outline-brand rounded-pill" data-action="edit" data-index="${index}">
                Editar
              </button>
              <button type="button" class="btn btn-sm btn-danger rounded-pill" data-action="delete" data-index="${index}">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function refreshProducts() {
  const result = await getProducts();
  if (!result.success) {
    setStatus(result.error || "No se pudieron cargar productos.", "danger");
    return;
  }

  renderTable();
  setStatus(`Productos cargados: ${result.data.length}.`, "success");
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!refs.form.checkValidity()) {
    refs.form.reportValidity();
    return;
  }

  setLoading(true);

  try {
    const input = getFormInput();
    const selectedFiles = refs.imagen.files ? Array.from(refs.imagen.files) : [];
    const selectedVideo = refs.video.files && refs.video.files.length > 0 ? refs.video.files[0] : null;
    
    const fileError = validateSelectedFiles(selectedFiles);
    if (fileError) {
      setStatus(fileError, "danger");
      return;
    }

    const videoError = validateSelectedVideoFile(selectedVideo);
    if (videoError) {
      setStatus(videoError, "danger");
      return;
    }

    let imageUrl = "";
    let galleryUrls = [];
    let videoUrl = "";

    // Handle image uploads
    if (selectedFiles.length > 0) {
      const uploadResult = await uploadFiles(selectedFiles, input.nombre);
      if (!uploadResult.success) {
        setStatus(uploadResult.error || "No se pudieron subir las imágenes.", "danger");
        return;
      }

      galleryUrls = uploadResult.data || [];
      imageUrl = galleryUrls[0] || "";
    } else if (state.editingId) {
      const current = getState().products.find((item) => item.id === state.editingId);
      galleryUrls = current && Array.isArray(current.galleryUrls) ? current.galleryUrls.slice() : [];
      imageUrl = current ? current.imagenUrl : "";
    }

    // Handle video upload (Estrategia A: Single video per product)
    if (selectedVideo) {
      const uploadVideoResult = await uploadVideo(selectedVideo, input.nombre);
      if (!uploadVideoResult.success) {
        setStatus(uploadVideoResult.error || "No se pudo subir el video.", "danger");
        return;
      }
      videoUrl = uploadVideoResult.data || "";
    } else if (state.editingId) {
      const current = getState().products.find((item) => item.id === state.editingId);
      videoUrl = current ? (current.videoUrl || "") : "";
    }

    const payload = {
      ...input,
      imagenUrl: imageUrl,
      galleryUrls,
      videoUrl: videoUrl || null
    };

    const saveResult = state.editingId
      ? await updateProduct(state.editingId, payload)
      : await createProduct(state.editingId, payload);

    if (!saveResult.success) {
      setStatus(saveResult.error || "No se pudo guardar el producto.", "danger");
      return;
    }

    setStatus(state.editingId ? "Producto actualizado correctamente." : "Producto creado correctamente.", "success");
    resetForm();
    renderTable();
  } catch (error) {
    console.error("No se pudo guardar el producto:", error);
    setStatus(`No se pudo guardar el producto: ${error.message || "Error inesperado."}`, "danger");
  } finally {
    setLoading(false);
  }
}

async function handleDelete(productId) {
  if (!productId) {
    setStatus("No se encontro el identificador del producto.", "danger");
    return;
  }

  if (!globalThis.confirm("Se eliminara este producto. Deseas continuar?")) {
    return;
  }

  try {
    setLoading(true);
    const currentProduct = getState().products.find((item) => item.id === productId);
    const cleanupResult = await deleteProduct(productId, currentProduct);

    if (!cleanupResult.success) {
      setStatus(cleanupResult.error || "No se pudo eliminar el producto.", "danger");
      return;
    }

    const cleanupInfo = cleanupResult.data || { skipped: 0, cleanupError: false };
    let warningMessage = "";

    if (cleanupInfo.cleanupError) {
      warningMessage = " El producto se eliminó, pero algunas imágenes no pudieron borrarse del storage.";
    }

    if (cleanupInfo.skipped > 0) {
      warningMessage += ` ${cleanupInfo.skipped} imagen(es) se conservaron por estar asociadas a otros productos.`;
    }

    if (state.editingId === productId) {
      resetForm();
    }

    setStatus(`Producto eliminado correctamente.${warningMessage}`, "success");
    renderTable();
  } catch (error) {
    console.error("No se pudo eliminar el producto:", error);
    setStatus(`No se pudo eliminar el producto: ${error.message}`, "danger");
  } finally {
    setLoading(false);
  }
}

async function populateSubcategoriesForCategory(categoria, selectedSubcategoryId = null) {
  const normalizedCategory = normalizeCategory(categoria);
  if (!normalizedCategory) {
    refs.subcategory.innerHTML = '<option value="">-- Sin subcategoria --</option>';
    return;
  }

  try {
    const selectedOption = refs.categoria.options[refs.categoria.selectedIndex];
    const categoryId = selectedOption ? String(selectedOption.dataset.categoryId || "").trim() : "";
    const result = categoryId
      ? await getSubcategoriesForCategoryId(categoryId)
      : await getSubcategoriesForCategory(normalizedCategory);
    if (!result.success || !Array.isArray(result.data)) {
      refs.subcategory.innerHTML = '<option value="">-- Sin subcategoria --</option>';
      return;
    }

    const subcategories = result.data;
    const selectedId = String(selectedSubcategoryId || "").trim();
    let html = '<option value="">-- Sin subcategoria --</option>';
    
    subcategories.forEach((sub) => {
      const isSelected = selectedId && String(sub && sub.id ? sub.id : "").trim() === selectedId ? "selected" : "";
      html += `<option value="${escapeHtml(sub.id)}" ${isSelected}>${escapeHtml(sub.nombre)}</option>`;
    });

    refs.subcategory.innerHTML = html;
    refs.subcategory.value = selectedId || "";

    if (refs.subcategory.value !== (selectedId || "")) {
      refs.subcategory.value = "";
    }
  } catch (error) {
    console.error("Error al cargar subcategorías:", error);
    refs.subcategory.innerHTML = '<option value="">-- Sin subcategoria --</option>';
  }
}

function bindEvents() {
  refs.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const index = Number.parseInt(button.dataset.index || "-1", 10);
    const product = getState().products[index];
    if (!product) {
      return;
    }

    if (button.dataset.action === "edit") {
      fillForm(product);
      setStatus("Modo edicion activado.", "info");
      return;
    }

    if (button.dataset.action === "delete") {
      handleDelete(product.id);
    }
  });

  refs.resetBtn.addEventListener("click", () => {
    resetForm();
    setStatus("Formulario reiniciado.", "info");
  });

  refs.categoria.addEventListener("change", () => {
    populateSubcategoriesForCategory(refs.categoria.value);
  });

  refs.imagen.addEventListener("change", () => {
    clearPreviewObjectUrls();

    if (!refs.imagen.files || refs.imagen.files.length === 0) {
      setImagePreview([], refs.nombre.value.trim() || "Preview");
      return;
    }

    const selected = Array.from(refs.imagen.files);
    const fileError = validateSelectedFiles(selected);

    if (fileError) {
      setStatus(fileError, "danger");
      refs.imagen.value = "";
      return;
    }

    const previewUrls = selected.map((file) => URL.createObjectURL(file));
    state.previewObjectUrls = previewUrls;
    setImagePreview(previewUrls, refs.nombre.value.trim() || "Preview");
  });

  refs.form.addEventListener("submit", handleSubmit);
}

function cacheRefs() {
  refs.section = document.getElementById("productosSection");
  refs.form = document.getElementById("productForm");
  refs.status = document.getElementById("productosStatus");
  refs.tableBody = document.getElementById("productsTableBody");
  refs.productId = document.getElementById("productId");
  refs.nombre = document.getElementById("nombre");
  refs.categoria = document.getElementById("categoria");
  refs.subcategory = document.getElementById("subcategory");
  refs.precio = document.getElementById("precio");
  refs.descripcion = document.getElementById("descripcion");
  refs.featured = document.getElementById("featured");
  refs.imagen = document.getElementById("imagen");
  refs.imagePreviewContainer = document.getElementById("imagePreviewContainer");
  refs.video = document.getElementById("video");
  refs.videoPreviewContainer = document.getElementById("videoPreviewContainer");
  refs.saveBtn = document.getElementById("saveBtn");
  refs.resetBtn = document.getElementById("resetBtn");

  return Object.values(refs).every(Boolean);
}

export function initProductsAdminUI() {
  if (state.initialized) {
    return true;
  }

  if (!cacheRefs()) {
    console.error("Productos no pudo inicializarse: faltan elementos en admin.html");
    return false;
  }

  bindEvents();
  subscribe(() => {
    renderTable();
  });
  state.initialized = true;
  return true;
}

export async function openProductsAdmin() {
  if (!initProductsAdminUI()) {
    return;
  }

  await populateCategoryOptions();
  await populateSubcategoriesForCategory(refs.categoria.value);
  await refreshProducts();
}
